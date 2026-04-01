import { NextRequest } from 'next/server'
import { MatchSearchCandidate } from '@/features/match-analysis/types'

const NEXON_API_KEY = process.env.NEXON_API_KEY!
const nexonHeaders = { 'x-nxopen-api-key': NEXON_API_KEY }

const SEARCH_MODES = [
  { key: '1vs1', label: '1vs1 랭킹' },
  { key: '2vs2', label: '2vs2 랭킹' },
  { key: 'manager', label: '감독모드 랭킹' },
] as const

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
  const cleaned = value.replace(/,/g, '').trim()
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

function parseResult(candidateHtml: string, modeLabel: string): MatchSearchCandidate | null {
  const nickname = stripTags(
    candidateHtml.match(/<span class="name profile_pointer"[^>]*>[\s\S]*?<\/span>/)?.[0] ?? ''
  )
  const nexonSn = candidateHtml.match(/data-sn="(\d+)"/)?.[1] ?? ''

  if (!nickname || !nexonSn) return null

  const level = parseNumber(
    stripTags(
      candidateHtml.match(
        /<span class="txt">\d+<\/span><\/span>\s*<span class="name profile_pointer"/
      )?.[0] ?? ''
    )
      .match(/\d+/)?.[0] ?? null
  )
  const rank = parseNumber(
    stripTags(candidateHtml.match(/<span class="td rank_no">[\s\S]*?<\/span>/)?.[0] ?? '')
  )
  const elo = parseNumber(
    stripTags(candidateHtml.match(/<span class="td rank_r_win_point">[\s\S]*?<\/span>/)?.[0] ?? '')
  )
  const rankIconUrl = candidateHtml.match(/<span class="ico_rank"><img src="([^"]+)"/)?.[1] ?? null
  const winRate = parseNumber(
    stripTags(candidateHtml.match(/<span class="top">[\s\S]*?%[\s\S]*?<\/span>/)?.[0] ?? '').replace('%', '')
  )
  const winLossText = stripTags(candidateHtml.match(/<span class="bottom">[\s\S]*?<\/span>/)?.[0] ?? '')
  const [wins, draws, losses] = winLossText.split('|').map((part) => parseNumber(part))
  const teamColors = [...candidateHtml.matchAll(/<span class="inner">([\s\S]*?)<\/span>/g)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)
  const formation =
    stripTags(candidateHtml.match(/<span class="td formation">[\s\S]*?<\/span>/)?.[0] ?? '') || null
  const price =
    stripTags(candidateHtml.match(/<span class="price"[^>]*>[\s\S]*?<\/span>/)?.[0] ?? '') || null

  return {
    nickname,
    nexonSn,
    ouid: null,
    level,
    rank,
    elo,
    rankLabel: elo !== null ? '공식 랭킹 점수' : null,
    rankIconUrl,
    winRate,
    wins: wins ?? null,
    draws: draws ?? null,
    losses: losses ?? null,
    teamColors,
    formation,
    price,
    modes: [modeLabel],
    source: 'rank',
  }
}

function parseCandidates(html: string, modeLabel: string) {
  return [...html.matchAll(/<div class="tr">([\s\S]*?)<\/div>\s*<\/div>/g)]
    .map((match) => parseResult(match[0], modeLabel))
    .filter((candidate): candidate is MatchSearchCandidate => candidate !== null)
}

function normalizeNickname(value: string) {
  return value.trim().toLowerCase()
}

export async function GET(req: NextRequest) {
  const nickname = req.nextUrl.searchParams.get('nickname')?.trim()

  if (!nickname) {
    return Response.json({ error: 'nickname required' }, { status: 400 })
  }

  const encodedNickname = encodeURIComponent(nickname)
  const [exactResult, rankResults] = await Promise.allSettled([
    fetchWithTimeout(
      `https://open.api.nexon.com/fconline/v1/id?nickname=${encodedNickname}`,
      {
        headers: nexonHeaders,
        next: { revalidate: 300 },
      },
      5000
    ),
    Promise.all(
      SEARCH_MODES.map(async (mode) => {
        try {
          const res = await fetchWithTimeout(
            `https://fconline.nexon.com/datacenter/rank_inner?rt=${mode.key}&strCharacterName=${encodedNickname}&n4seasonno=0&n4pageno=1`,
            {
              headers: {
                'user-agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
              },
              next: { revalidate: 300 },
            },
            4000
          )

          const html = await res.text()
          return parseCandidates(html, mode.label)
        } catch {
          return []
        }
      })
    ),
  ])

  let exactCandidate: MatchSearchCandidate | null = null

  if (exactResult.status === 'fulfilled' && exactResult.value.ok) {
    const exactData = await exactResult.value.json().catch(() => null)
    if (exactData?.ouid) {
      exactCandidate = {
        nickname,
        nexonSn: `exact:${exactData.ouid}`,
        ouid: exactData.ouid,
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
        modes: ['정확일치'],
        source: 'exact',
      }
    }
  }

  const merged = new Map<string, MatchSearchCandidate>()
  const results = rankResults.status === 'fulfilled' ? rankResults.value : []

  for (const candidates of results) {
    for (const candidate of candidates) {
      const key = `${candidate.nexonSn}:${candidate.nickname}`
      const existing = merged.get(key)

      if (!existing) {
        merged.set(key, candidate)
        continue
      }

      existing.modes = Array.from(new Set([...existing.modes, ...candidate.modes]))
      existing.rank =
        existing.rank === null
          ? candidate.rank
          : candidate.rank === null
            ? existing.rank
            : Math.min(existing.rank, candidate.rank)
      existing.elo = existing.elo ?? candidate.elo
      existing.rankLabel = existing.rankLabel ?? candidate.rankLabel
      existing.rankIconUrl = existing.rankIconUrl ?? candidate.rankIconUrl
      existing.winRate = existing.winRate ?? candidate.winRate
      existing.wins = existing.wins ?? candidate.wins
      existing.draws = existing.draws ?? candidate.draws
      existing.losses = existing.losses ?? candidate.losses
      existing.formation = existing.formation ?? candidate.formation
      existing.price = existing.price ?? candidate.price
      existing.level = existing.level ?? candidate.level
      existing.teamColors = existing.teamColors.length > 0 ? existing.teamColors : candidate.teamColors
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

  if (exactCandidate) {
    const matchedRankCandidate =
      candidates.find(
        (candidate) =>
          normalizeNickname(candidate.nickname) === normalizeNickname(exactCandidate?.nickname ?? '')
      ) ?? null

    if (matchedRankCandidate) {
      exactCandidate = {
        ...exactCandidate,
        level: matchedRankCandidate.level,
        rank: matchedRankCandidate.rank,
        elo: matchedRankCandidate.elo,
        rankLabel: matchedRankCandidate.rankLabel,
        rankIconUrl: matchedRankCandidate.rankIconUrl,
        winRate: matchedRankCandidate.winRate,
        wins: matchedRankCandidate.wins,
        draws: matchedRankCandidate.draws,
        losses: matchedRankCandidate.losses,
        teamColors: matchedRankCandidate.teamColors,
        formation: matchedRankCandidate.formation,
        price: matchedRankCandidate.price,
        modes: Array.from(new Set([...exactCandidate.modes, ...matchedRankCandidate.modes])),
      }
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
