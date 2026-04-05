import https from 'node:https'
import { NextRequest } from 'next/server'
import { MatchData } from '@/features/match-analysis/types'
import { getNexonHeaders, getSeasonMetaItem, getSpidMetaItem } from '@/lib/nexon'

const headers = getNexonHeaders()
const FETCH_TIMEOUT_MS = 7000
const DETAIL_CONCURRENCY = 3
const MATCH_CACHE_TTL_MS = 1000 * 60 * 5
const DETAIL_MAX_RETRIES = 4
const DETAIL_RETRY_DELAY_MS = 250

type MatchIdsCacheEntry = {
  expiresAt: number
  value: string[]
}

type MatchDetailCacheEntry = {
  expiresAt: number
  value: MatchData
}

const matchIdsCache = new Map<string, MatchIdsCacheEntry>()
const matchDetailCache = new Map<string, MatchDetailCacheEntry>()
const matchIdsPromiseCache = new Map<string, Promise<string[]>>()
const matchDetailPromiseCache = new Map<string, Promise<MatchData | null>>()

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

function isMatchData(value: unknown): value is MatchData {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<MatchData>
  return typeof candidate.matchId === 'string' && Array.isArray(candidate.matchInfo)
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = FETCH_TIMEOUT_MS) {
  return new Promise<string>((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: init.method ?? 'GET',
        headers: init.headers as Record<string, string>,
      },
      (res) => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          res.resume()
          reject(new Error(`Request failed with status ${res.statusCode ?? 0}`))
          return
        }

        let raw = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          raw += chunk
        })
        res.on('end', () => resolve(raw))
      },
    )

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Request timeout'))
    })
    req.on('error', reject)
    req.end()
  })
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchMatchDetailRaw(matchId: string) {
  try {
    const raw = await fetchWithTimeout(
      `https://open.api.nexon.com/fconline/v1/match-detail?matchid=${matchId}`,
      {
        headers,
      },
    )
    const detail = JSON.parse(raw) as MatchData | null
    return isMatchData(detail) ? detail : null
  } catch (error) {
    console.warn(
      `[matches/list] match-detail fetch failed: matchId=${matchId} reason="${getErrorMessage(error)}"`,
    )
    return null
  }
}

async function enrichMatchDetail(detail: MatchData) {
  const enrichedMatchInfo = await Promise.all(
    detail.matchInfo.map(async (player) => {
      const cardPlayer = player.player?.[0]
      const spId =
        typeof cardPlayer?.spId === 'number'
          ? cardPlayer.spId
          : typeof player.spId === 'number'
            ? player.spId
            : null
      const enhancement =
        typeof cardPlayer?.spGrade === 'number' && Number.isFinite(cardPlayer.spGrade)
          ? cardPlayer.spGrade
          : typeof player.spGrade === 'number' && Number.isFinite(player.spGrade)
            ? player.spGrade
            : null

      if (!spId) {
        return {
          ...player,
          spId: null,
          spGrade: enhancement,
          spPosition: typeof cardPlayer?.spPosition === 'number' ? cardPlayer.spPosition : null,
          cardInfo: null,
        }
      }

      const seasonId = Math.floor(spId / 1000000)
      const [spidMeta, seasonMeta] = await Promise.all([
        getSpidMetaItem(spId),
        getSeasonMetaItem(seasonId),
      ])

      return {
        ...player,
        spId,
        spGrade: enhancement,
        spPosition:
          typeof cardPlayer?.spPosition === 'number'
            ? cardPlayer.spPosition
            : typeof player.spPosition === 'number'
              ? player.spPosition
              : null,
        cardInfo: {
          playerName: spidMeta?.name ?? null,
          seasonName: seasonMeta?.className ?? null,
          enhancement,
        },
      }
    }),
  )

  return {
    ...detail,
    matchInfo: enrichedMatchInfo,
  }
}

async function fetchMatchIdsRaw(ouid: string, matchtype: string, offset: string, limit: string) {
  try {
    const raw = await fetchWithTimeout(
      `https://open.api.nexon.com/fconline/v1/user/match?ouid=${ouid}&matchtype=${matchtype}&offset=${offset}&limit=${limit}`,
      { headers },
    )
    return JSON.parse(raw) as string[]
  } catch (error) {
    console.warn(
      `[matches/list] match-id fetch failed: ouid=${ouid} matchtype=${matchtype} offset=${offset} limit=${limit} reason="${getErrorMessage(error)}"`,
    )
    return []
  }
}

async function fetchMatchIds(ouid: string, matchtype: string, offset: string, limit: string) {
  const key = `${ouid}:${matchtype}:${offset}:${limit}`
  const now = Date.now()
  const cached = matchIdsCache.get(key)

  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  const pending = matchIdsPromiseCache.get(key)
  if (pending) {
    return pending
  }

  const request = fetchMatchIdsRaw(ouid, matchtype, offset, limit)
    .then((value) => {
      matchIdsCache.set(key, {
        expiresAt: Date.now() + MATCH_CACHE_TTL_MS,
        value,
      })
      return value
    })
    .finally(() => {
      matchIdsPromiseCache.delete(key)
    })

  matchIdsPromiseCache.set(key, request)
  return request
}

async function fetchMatchDetail(matchId: string) {
  const now = Date.now()
  const cached = matchDetailCache.get(matchId)

  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  const pending = matchDetailPromiseCache.get(matchId)
  if (pending) {
    return pending
  }

  const request = (async () => {
    for (let attempt = 1; attempt <= DETAIL_MAX_RETRIES; attempt += 1) {
      const value = await fetchMatchDetailRaw(matchId)

      if (value) {
        const enriched = await enrichMatchDetail(value)
        matchDetailCache.set(matchId, {
          expiresAt: Date.now() + MATCH_CACHE_TTL_MS,
          value: enriched,
        })
        return enriched
      }

      if (attempt < DETAIL_MAX_RETRIES) {
        console.info(
          `[matches/list] retrying match-detail: matchId=${matchId} attempt=${attempt + 1}/${DETAIL_MAX_RETRIES}`,
        )
        await delay(DETAIL_RETRY_DELAY_MS * attempt)
      }
    }

    console.warn(
      `[matches/list] match-detail permanently failed after retries: matchId=${matchId} attempts=${DETAIL_MAX_RETRIES}`,
    )
    return null
  })().finally(() => {
    matchDetailPromiseCache.delete(matchId)
  })

  matchDetailPromiseCache.set(matchId, request)
  return request
}

export async function GET(req: NextRequest) {
  const ouid = req.nextUrl.searchParams.get('ouid')
  const matchtype = req.nextUrl.searchParams.get('matchtype') ?? '214'
  const offset = Number(req.nextUrl.searchParams.get('offset') ?? '0')
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '10')

  if (!ouid) {
    return Response.json({ error: 'ouid required' }, { status: 400 })
  }

  if (!Number.isFinite(offset) || offset < 0 || !Number.isFinite(limit) || limit <= 0) {
    return Response.json({ error: 'invalid pagination params' }, { status: 400 })
  }

  const targetLimit = Math.min(Math.floor(limit), 50)
  const normalizedOffset = Math.floor(offset)
  const matchIds = await fetchMatchIds(
    ouid,
    matchtype,
    String(normalizedOffset),
    String(targetLimit),
  )

  console.info(
    `[matches/list] fetched match IDs: ouid=${ouid} offset=${normalizedOffset} requested=${targetLimit} received=${matchIds.length}`,
  )

  if (!matchIds.length) {
    return Response.json([])
  }

  const matchDetails: MatchData[] = []

  for (let index = 0; index < matchIds.length && matchDetails.length < targetLimit; index += DETAIL_CONCURRENCY) {
    const chunk = matchIds.slice(index, index + DETAIL_CONCURRENCY)
    const settled = await Promise.allSettled(chunk.map((matchId) => fetchMatchDetail(matchId)))
    const resolvedChunk = settled
      .filter((result): result is PromiseFulfilledResult<MatchData | null> => result.status === 'fulfilled')
      .map((result) => result.value)
      .filter((detail): detail is MatchData => detail !== null)

    const remaining = targetLimit - matchDetails.length
    matchDetails.push(...resolvedChunk.slice(0, remaining))

    console.info(
      `[matches/list] resolved recent match details: ouid=${ouid} chunkSize=${chunk.length} success=${resolvedChunk.length} accumulated=${matchDetails.length}/${Math.min(targetLimit, matchIds.length)}`,
    )
  }

  if (!matchDetails.length) {
    return Response.json([])
  }

  return Response.json(matchDetails.slice(0, targetLimit))
}
