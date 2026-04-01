import { NextRequest } from 'next/server'
import { MatchSearchCandidate } from '@/features/match-analysis/types'

const NEXON_API_KEY = process.env.NEXON_API_KEY!
const nexonHeaders = { 'x-nxopen-api-key': NEXON_API_KEY }

const SEARCH_MODES = [
  { key: '1vs1', label: '1vs1 랭킹' },
  { key: '2vs2', label: '2vs2 랭킹' },
  { key: 'manager', label: '감독모드 랭킹' },
] as const

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

async function fetchTextWithRetry(url: string, init: RequestInit, timeoutMs: number, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetchWithTimeout(url, init, timeoutMs)
      if (res.ok) {
        return await res.text()
      }
    } catch {}

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
  }

  return null
}

async function fetchJsonWithRetry<T>(url: string, init: RequestInit, timeoutMs: number, retries = 1): Promise<T | null> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetchWithTimeout(url, init, timeoutMs)
      if (res.ok) {
        return (await res.json().catch(() => null)) as T | null
      }
    } catch {}

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 150))
    }
  }

  return null
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function stripTags(value: string) {
  return decodeHtml(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseNumber(value: string | null) {
  if (!value) return null
  const cleaned = value.replace(/,/g, '').replace(/%/g, '').trim()
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeNickname(value: string) {
  return value.trim().toLowerCase()
}

function createEmptyCandidate(nickname: string, nexonSn: string, source: 'exact' | 'rank'): MatchSearchCandidate {
  return {
    nickname,
    nexonSn,
    ouid: null,
    level: null,
    rank: null,
    elo: null,
    rankLabel: null,
    rankIconUrl: null,
    winRate: null,
    wins: null,
    draws: null,
    losses: null,
    teamColors: [],
    formation: null,
    price: null,
    modes: [],
    source,
    voltaRank: null,
    voltaRankPoint: null,
    voltaRankIconUrl: null,
    voltaWinRate: null,
    voltaWins: null,
    voltaDraws: null,
    voltaLosses: null,
    voltaAverageRating: null,
    voltaMomCount: null,
    voltaGoals: null,
    voltaAssists: null,
    voltaTackleRate: null,
    voltaBlockRate: null,
    voltaEffectiveShots: null,
    voltaPassRate: null,
    voltaDribbleRate: null,
    voltaMainPosition: null,
  }
}

function parseOfficialRankResult(candidateHtml: string, modeLabel: string): MatchSearchCandidate | null {
  const nickname = stripTags(
    candidateHtml.match(/<span class="name profile_pointer"[^>]*>[\s\S]*?<\/span>/)?.[0] ?? ''
  )
  const nexonSn = candidateHtml.match(/data-sn="(\d+)"/)?.[1] ?? ''

  if (!nickname || !nexonSn) return null

  const candidate = createEmptyCandidate(nickname, nexonSn, 'rank')
  const winLossText = stripTags(candidateHtml.match(/<span class="bottom">[\s\S]*?<\/span>/)?.[0] ?? '')
  const [wins, draws, losses] = winLossText.split('|').map((part) => parseNumber(part))

  candidate.level = parseNumber(
    stripTags(
      candidateHtml.match(/<span class="txt">\d+<\/span><\/span>\s*<span class="name profile_pointer"/)?.[0] ?? ''
    ).match(/\d+/)?.[0] ?? null
  )
  candidate.rank = parseNumber(
    stripTags(candidateHtml.match(/<span class="td rank_no">[\s\S]*?<\/span>/)?.[0] ?? '')
  )
  candidate.elo = parseNumber(
    stripTags(candidateHtml.match(/<span class="td rank_r_win_point">[\s\S]*?<\/span>/)?.[0] ?? '')
  )
  candidate.rankLabel = candidate.elo !== null ? '공식 랭킹 점수' : null
  candidate.rankIconUrl = candidateHtml.match(/<span class="ico_rank"><img src="([^"]+)"/)?.[1] ?? null
  candidate.winRate = parseNumber(
    stripTags(candidateHtml.match(/<span class="top">[\s\S]*?%[\s\S]*?<\/span>/)?.[0] ?? '')
  )
  candidate.wins = wins ?? null
  candidate.draws = draws ?? null
  candidate.losses = losses ?? null
  candidate.teamColors = [...candidateHtml.matchAll(/<span class="inner">([\s\S]*?)<\/span>/g)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)
  candidate.formation =
    stripTags(candidateHtml.match(/<span class="td formation">[\s\S]*?<\/span>/)?.[0] ?? '') || null
  candidate.price =
    stripTags(candidateHtml.match(/<span class="price"[^>]*>[\s\S]*?<\/span>/)?.[0] ?? '') || null
  candidate.modes = [modeLabel]

  return candidate
}

function parseOfficialCandidates(html: string, modeLabel: string) {
  return [...html.matchAll(/<div class="tr">([\s\S]*?)<\/div>\s*<\/div>/g)]
    .map((match) => parseOfficialRankResult(match[0], modeLabel))
    .filter((candidate): candidate is MatchSearchCandidate => candidate !== null)
}

function parseVoltaExactCandidate(html: string, nickname: string): Partial<MatchSearchCandidate> | null {
  const normalizedTarget = normalizeNickname(nickname)
  const nicknameMatch = new RegExp(
    `<span class="name profile_pointer"[^>]*>[\\s\\S]*?${escapeRegExp(nickname)}[\\s\\S]*?<\\/span>`
  ).exec(html)

  if (!nicknameMatch || nicknameMatch.index === undefined) {
    return null
  }

  const rowStart = html.lastIndexOf('<div class="tr">', nicknameMatch.index)
  const paginationStart = html.indexOf('<div class="pagination">', nicknameMatch.index)

  if (rowStart === -1 || paginationStart === -1) {
    return null
  }

  const rowHtml = html.slice(rowStart, paginationStart)
  const rowNickname = stripTags(
    rowHtml.match(/<span class="name profile_pointer"[^>]*>[\s\S]*?<\/span>/)?.[0] ?? ''
  )

  if (!rowNickname || normalizeNickname(rowNickname) !== normalizedTarget) {
    return null
  }

  const getCellValue = (cellClass: string) =>
    stripTags(rowHtml.match(new RegExp(`<div class="td ${cellClass}[^"]*">([\\s\\S]*?)<\\/div>`))?.[0] ?? '') ||
    null

  return {
    price:
      stripTags(rowHtml.match(/<span class="price"[^>]*>[\s\S]*?<\/span>/)?.[0] ?? '') || null,
    voltaRank: parseNumber(getCellValue('no')),
    voltaRankIconUrl: rowHtml.match(/<span class="ico_rank"><img src="([^"]+)"/)?.[1] ?? null,
    voltaRankPoint: parseNumber(getCellValue('small s1')),
    voltaWins: parseNumber(getCellValue('small s2')),
    voltaDraws: parseNumber(getCellValue('small s3')),
    voltaLosses: parseNumber(getCellValue('small s4')),
    voltaWinRate: parseNumber(getCellValue('small s5')),
    voltaAverageRating: parseNumber(getCellValue('small s6')),
    voltaMomCount: parseNumber(getCellValue('small s7')),
    voltaGoals: parseNumber(getCellValue('small s8')),
    voltaAssists: parseNumber(getCellValue('small s9')),
    voltaTackleRate: getCellValue('medium m1 usebr'),
    voltaBlockRate: getCellValue('medium m2 usebr'),
    voltaEffectiveShots: getCellValue('medium m3 usebr'),
    voltaPassRate: getCellValue('medium m5 usebr'),
    voltaDribbleRate: getCellValue('medium m6 usebr'),
    voltaMainPosition: getCellValue('large usebr'),
  }
}

function mergeCandidate(base: MatchSearchCandidate, incoming: Partial<MatchSearchCandidate>) {
  return {
    ...base,
    ...incoming,
    modes:
      incoming.modes && incoming.modes.length > 0
        ? Array.from(new Set([...base.modes, ...incoming.modes]))
        : base.modes,
    teamColors:
      incoming.teamColors && incoming.teamColors.length > 0 ? incoming.teamColors : base.teamColors,
  }
}

export async function GET(req: NextRequest) {
  const nickname = req.nextUrl.searchParams.get('nickname')?.trim()

  if (!nickname) {
    return Response.json({ error: 'nickname required' }, { status: 400 })
  }

  const encodedNickname = encodeURIComponent(nickname)
  const [exactData, rankResults, voltaHtml] = await Promise.all([
    fetchJsonWithRetry<{ ouid?: string }>(
      `https://open.api.nexon.com/fconline/v1/id?nickname=${encodedNickname}`,
      { headers: nexonHeaders, next: { revalidate: 300 } },
      10000,
      2
    ),
    Promise.all(
      SEARCH_MODES.map(async (mode) => {
        const html = await fetchTextWithRetry(
          `https://fconline.nexon.com/datacenter/rank_inner?rt=${mode.key}&strCharacterName=${encodedNickname}&n4seasonno=0&n4pageno=1`,
          {
            headers: {
              'user-agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
            },
            next: { revalidate: 300 },
          },
          8000,
          1
        )

        return html ? parseOfficialCandidates(html, mode.label) : []
      })
    ),
    fetchTextWithRetry(
      `https://fconline.nexon.com/datacenter/rank_volta?rtype=all&strCharacterName=${encodedNickname}`,
      {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        },
        next: { revalidate: 300 },
      },
      8000,
      1
    ),
  ])

  let exactCandidate: MatchSearchCandidate | null = null

  if (exactData?.ouid) {
    exactCandidate = {
      ...createEmptyCandidate(nickname, `exact:${exactData.ouid}`, 'exact'),
      ouid: exactData.ouid,
      modes: ['정확일치'],
    }
  }

  const merged = new Map<string, MatchSearchCandidate>()

  for (const candidates of rankResults) {
    for (const candidate of candidates) {
      const key = `${candidate.nexonSn}:${candidate.nickname}`
      merged.set(key, merged.has(key) ? mergeCandidate(merged.get(key)!, candidate) : candidate)
    }
  }

  const candidates = [...merged.values()]
    .sort((a, b) => {
      if (a.rank === null && b.rank === null) return a.nickname.localeCompare(b.nickname, 'ko')
      if (a.rank === null) return 1
      if (b.rank === null) return -1
      return a.rank - b.rank
    })
    .slice(0, 20)

  const voltaCandidate = voltaHtml ? parseVoltaExactCandidate(voltaHtml, nickname) : null

  if (!exactCandidate && voltaCandidate) {
    exactCandidate = {
      ...createEmptyCandidate(nickname, `volta:${nickname}`, 'exact'),
      modes: ['볼타 랭킹'],
    }
  }

  if (exactCandidate) {
    const exactNickname = exactCandidate.nickname
    const matchedRankCandidate =
      candidates.find(
        (candidate) => normalizeNickname(candidate.nickname) === normalizeNickname(exactNickname)
      ) ?? null

    if (matchedRankCandidate) {
      exactCandidate = mergeCandidate(exactCandidate, matchedRankCandidate)
    }

    if (voltaCandidate) {
      exactCandidate = mergeCandidate(exactCandidate, voltaCandidate)
    }
  }

  const finalCandidates = exactCandidate
    ? [
        exactCandidate,
        ...candidates.filter(
          (candidate) => candidate.nickname !== exactCandidate.nickname || candidate.source !== 'exact'
        ),
      ]
    : candidates

  return Response.json({
    nickname,
    candidates: finalCandidates,
    exactMatch: exactCandidate,
    source: 'official-rank-search',
  })
}
