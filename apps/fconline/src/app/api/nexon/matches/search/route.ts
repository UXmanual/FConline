import { NextRequest } from 'next/server'
import { MatchSearchCandidate } from '@/features/match-analysis/types'

const NEXON_API_KEY = process.env.NEXON_API_KEY!
const nexonHeaders = { 'x-nxopen-api-key': NEXON_API_KEY }
const ouidCache = new Map<string, string>()
const SEARCH_CACHE_TTL_MS = 1000 * 60 * 5
const DAILY_SQUAD_URL = 'https://fconline.nexon.com/datacenter/dailysquad'
const TEAM_ASSET_PATTERN =
  /((?:https?:)?\/\/[^"'\s>]*(?:crests\/light\/medium\/[^"'\s>]+\.png|countries\/largeflags\/[^"'\s>]+\.png))/g

const SEARCH_MODES = [
  { key: '1vs1', label: '1vs1' },
  { key: '2vs2', label: '2vs2' },
  { key: 'manager', label: 'manager' },
] as const

type SearchModeKey = (typeof SEARCH_MODES)[number]['key']
type RankSearchModeResult = {
  mode: SearchModeKey
  candidates: MatchSearchCandidate[]
}

type MatchSearchResponse = {
  nickname: string
  candidates: MatchSearchCandidate[]
  exactMatch: MatchSearchCandidate | null
  source: string
}

type TeamEmblemCacheEntry = {
  expiresAt: number
  map: Map<string, string>
}

const searchCache = new Map<
  string,
  {
    expiresAt: number
    value: MatchSearchResponse
  }
>()

const searchPromiseCache = new Map<string, Promise<MatchSearchResponse>>()
let teamEmblemCache: TeamEmblemCacheEntry | null = null
let teamEmblemPromise: Promise<Map<string, string>> | null = null

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

async function fetchTextWithRetry(url: string, init: RequestInit, timeoutMs: number, retries = 0) {
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

async function fetchJsonWithRetry<T>(url: string, init: RequestInit, timeoutMs: number, retries = 0): Promise<T | null> {
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

function cleanTeamColorName(value: string) {
  return value.replace(/\s*\(\d+명\)\s*$/u, '').trim()
}

function normalizeNickname(value: string) {
  return value.trim().toLowerCase()
}

function normalizeTeamName(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function formatOwnerSince(value: string | null) {
  if (!value) return null

  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return value.trim() || null
  }

  const [, year, month, day] = match
  return `${year}.${month}.${day}`
}

function createEmptyCandidate(nickname: string, nexonSn: string, source: 'exact' | 'rank'): MatchSearchCandidate {
  return {
    nickname,
    nexonSn,
    ouid: null,
    representativeTeamEmblemUrl: null,
    teamColorEmblemUrl: null,
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
    officialRank: null,
    officialRankPoint: null,
    officialRankLabel: null,
    officialRankIconUrl: null,
    officialWinRate: null,
    officialWins: null,
    officialDraws: null,
    officialLosses: null,
    officialTeamColors: [],
    officialFormation: null,
    managerRank: null,
    managerRankPoint: null,
    managerRankIconUrl: null,
    managerWinRate: null,
    managerWins: null,
    managerDraws: null,
    managerLosses: null,
    managerTeamColors: [],
    managerFormation: null,
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
  const rowHtml = candidateHtml
  const getCellValue = (cellClass: string) =>
    stripTags(rowHtml.match(new RegExp(`<span class="td ${cellClass}[^"]*">([\\s\\S]*?)<\\/span>`))?.[0] ?? '') ||
    null
  const nickname = stripTags(rowHtml.match(/<span class="name profile_pointer"[^>]*>[\s\S]*?<\/span>/)?.[0] ?? '')
  const nexonSn = rowHtml.match(/data-sn="(\d+)"/)?.[1] ?? ''

  if (!nickname || !nexonSn) return null

  const candidate = createEmptyCandidate(nickname, nexonSn, 'rank')
  const winLossText = stripTags(rowHtml.match(/<span class="bottom">[\s\S]*?<\/span>/)?.[0] ?? '')
  const [wins, draws, losses] = winLossText.split('|').map((part) => parseNumber(part))

  candidate.level = parseNumber(stripTags(rowHtml.match(/<span class="level">[\s\S]*?<\/span>/)?.[0] ?? '').match(/\d+/)?.[0] ?? null)
  candidate.rank = parseNumber(getCellValue('rank_no'))
  candidate.elo = parseNumber(getCellValue('rank_r_win_point'))
  candidate.rankLabel = candidate.elo !== null ? modeLabel : null
  candidate.rankIconUrl = rowHtml.match(/<span class="ico_rank"><img src="([^"]+)"/)?.[1] ?? null
  candidate.winRate = parseNumber(
    stripTags(rowHtml.match(/<span class="top">[\s\S]*?%[\s\S]*?<\/span>/)?.[0] ?? ''),
  )
  candidate.wins = wins ?? null
  candidate.draws = draws ?? null
  candidate.losses = losses ?? null
  candidate.teamColors = [...rowHtml.matchAll(/<span class="inner">([\s\S]*?)<\/span>/g)]
    .map((match) => cleanTeamColorName(stripTags(match[1])))
    .filter(Boolean)
  candidate.formation = stripTags(rowHtml.match(/<span class="td formation">[\s\S]*?<\/span>/)?.[0] ?? '') || null
  candidate.price = stripTags(rowHtml.match(/<span class="price"[^>]*>[\s\S]*?<\/span>/)?.[0] ?? '') || null
  candidate.modes = [modeLabel]

  return candidate
}

function parseOfficialCandidates(html: string, modeLabel: string) {
  return html
    .split('<div class="tr">')
    .slice(1)
    .map((chunk) => parseOfficialRankResult(`<div class="tr">${chunk}`, modeLabel))
    .filter((candidate): candidate is MatchSearchCandidate => candidate !== null)
}

function parseVoltaExactCandidate(html: string, nickname: string): Partial<MatchSearchCandidate> | null {
  const normalizedTarget = normalizeNickname(nickname)
  const nicknameMatch = new RegExp(
    `<span class="name profile_pointer"[^>]*>[\\s\\S]*?${escapeRegExp(nickname)}[\\s\\S]*?<\\/span>`,
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
    rowHtml.match(/<span class="name profile_pointer"[^>]*>[\s\S]*?<\/span>/)?.[0] ?? '',
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

function extractOwnerProfileIdFromRows(html: string, nickname: string) {
  const normalizedTarget = normalizeNickname(nickname)
  const rows = [...html.matchAll(/<div class="tr">([\s\S]*?)<\/div>\s*<\/div>/g)]

  for (const row of rows) {
    const rowHtml = row[0]
    const rowNickname = stripTags(
      rowHtml.match(/<span class="name profile_pointer"[^>]*>[\s\S]*?<\/span>/)?.[0] ?? '',
    )

    if (normalizeNickname(rowNickname) !== normalizedTarget) {
      continue
    }

    const ownerProfileId = rowHtml.match(/data-sn="(\d+)"/)?.[1] ?? null
    if (ownerProfileId) {
      return ownerProfileId
    }
  }

  return null
}

async function fetchOwnerProfile(ownerProfileId: string) {
  const html = await fetchTextWithRetry(
    `https://fconline.nexon.com/profile/owner/popup/${ownerProfileId}`,
    {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      },
      cache: 'no-store',
    },
    4000,
    0,
  )

  if (!html) {
    return { ownerSince: null, representativeTeam: null, representativeTeamEmblemUrl: null }
  }

  const representativeSection = html.match(/<div class="major">([\s\S]*?)<\/div>\s*<\/div>/i)?.[1] ?? ''
  const representativeTeam =
    stripTags(representativeSection.match(/<span>([^<]+)<\/span>/i)?.[0] ?? '') || null
  const representativeTeamEmblemUrl = [...representativeSection.matchAll(TEAM_ASSET_PATTERN)].at(-1)?.[1] ?? null
  const ownerSinceRaw =
    stripTags(html.match(/<div class="since">[\s\S]*?<div class="text">([^<]+)<\/div>/i)?.[1] ?? '') || null

  return {
    ownerSince: formatOwnerSince(ownerSinceRaw),
    representativeTeam,
    representativeTeamEmblemUrl,
  }
}

async function fetchRepresentativeSquadSummary(ownerProfileId: string) {
  const headers = {
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  }
  const popupUrl = `https://fconline.nexon.com/profile/squad/popup/${ownerProfileId}`
  const popupHtml = await fetchTextWithRetry(
    popupUrl,
    {
      headers,
      cache: 'no-store',
    },
    4000,
    0,
  )

  if (!popupHtml) {
    return { formation: null, teamColors: [] as string[] }
  }

  const contextMatch = popupHtml.match(
    new RegExp(
      `SquadProfile\\.SetSquadInfo\\("([^"]+)",\\s*"([^"]+)",\\s*"${escapeRegExp(ownerProfileId)}",\\s*"([^"]+)"\\)`,
    ),
  )

  if (!contextMatch) {
    return { formation: null, teamColors: [] as string[] }
  }

  const squadText = await fetchTextWithRetry(
    `https://fconline.nexon.com/datacenter/SquadGetUserInfo?strTeamType=${encodeURIComponent(contextMatch[1])}&n1Type=${encodeURIComponent(contextMatch[2])}&n8NexonSN=${encodeURIComponent(ownerProfileId)}&strCharacterID=${encodeURIComponent(contextMatch[3])}`,
    {
      headers: {
        ...headers,
        referer: popupUrl,
        'X-Requested-With': 'XMLHttpRequest',
        accept: 'application/json, text/javascript, */*; q=0.01',
      },
      cache: 'no-store',
    },
    4000,
    0,
  )

  if (!squadText) {
    return { formation: null, teamColors: [] as string[] }
  }

  const squadData = JSON.parse(squadText) as {
    formation?: string | null
    players?: Array<{
      teamColor?: {
        teamColor1?: { name?: string | null }
        teamColor2?: { name?: string | null }
        teamColor3?: { name?: string | null }
      }
    }>
  }

  const teamColors = new Set<string>()
  for (const player of squadData.players ?? []) {
    for (const key of ['teamColor1', 'teamColor2', 'teamColor3'] as const) {
      const name = player.teamColor?.[key]?.name?.trim() ?? ''
      if (name && !/물결/u.test(name)) {
        teamColors.add(name)
      }
    }
  }

  return {
    formation: squadData.formation?.trim() || null,
    teamColors: [...teamColors],
  }
}

async function fetchRecentOfficialFormation(ouid: string | null | undefined) {
  if (!ouid) {
    return null
  }

  const matchIds = await fetchJsonWithRetry<string[]>(
    `https://open.api.nexon.com/fconline/v1/user/match?ouid=${encodeURIComponent(ouid)}&matchtype=50&offset=0&limit=1`,
    { headers: nexonHeaders, cache: 'no-store' },
    3500,
    0,
  )

  const matchId = Array.isArray(matchIds) && matchIds.length > 0 ? matchIds[0] : null
  if (!matchId) {
    return null
  }

  const detail = await fetchJsonWithRetry<{
    matchInfo?: Array<{
      ouid?: string
      player?: Array<{ spPosition?: number | null }>
    }>
  }>(
    `https://open.api.nexon.com/fconline/v1/match-detail?matchid=${encodeURIComponent(matchId)}`,
    { headers: nexonHeaders, cache: 'no-store' },
    3500,
    0,
  )

  const userTeam = detail?.matchInfo?.find((info) => info.ouid === ouid)
  const positions = (userTeam?.player ?? [])
    .map((player) => player.spPosition)
    .filter((position): position is number => typeof position === 'number' && position >= 0 && position <= 27)

  return deriveFormation(positions) || null
}

function deriveFormation(positions: number[]) {
  const defPositions = new Set([1, 2, 3, 4, 5, 6, 7, 8])
  const midPositions = new Set([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19])
  const fwdPositions = new Set([20, 21, 22, 23, 24, 25, 26, 27])

  const def = positions.filter((p) => defPositions.has(p)).length
  const mid = positions.filter((p) => midPositions.has(p)).length
  const fwd = positions.filter((p) => fwdPositions.has(p)).length

  if (def === 0 && mid === 0 && fwd === 0) {
    return ''
  }

  return [def, mid, fwd].filter((count) => count > 0).join('-')
}

function buildTeamEmblemMap(html: string) {
  const map = new Map<string, string>()
  const names = Array.from(
    new Set(
      [...html.matchAll(/<span[^>]*>([^<]+)<\/span>/g)]
        .map((match) => cleanTeamColorName(stripTags(match[1])))
        .filter(Boolean),
    ),
  )

  for (const name of names) {
    const markerIndex = html.indexOf(name)
    if (markerIndex < 0) continue

    const lookbehind = html.slice(Math.max(0, markerIndex - 700), markerIndex)
    const assetMatches = [...lookbehind.matchAll(TEAM_ASSET_PATTERN)]
    const emblemUrl = assetMatches.at(-1)?.[1] ?? null

    if (emblemUrl) {
      map.set(normalizeTeamName(name), emblemUrl)
    }
  }

  return map
}

async function getTeamEmblemMap() {
  const now = Date.now()

  if (teamEmblemCache && teamEmblemCache.expiresAt > now) {
    return teamEmblemCache.map
  }

  if (teamEmblemPromise) {
    return teamEmblemPromise
  }

  teamEmblemPromise = (async () => {
    const html = await fetchTextWithRetry(
      DAILY_SQUAD_URL,
      {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        },
        cache: 'no-store',
      },
      5000,
      0,
    )

    const map = html ? buildTeamEmblemMap(html) : new Map<string, string>()
    teamEmblemCache = {
      expiresAt: Date.now() + 1000 * 60 * 30,
      map,
    }
    return map
  })().finally(() => {
    teamEmblemPromise = null
  })

  return teamEmblemPromise
}

async function resolveRepresentativeTeamEmblem(representativeTeam: string | null | undefined) {
  if (!representativeTeam) return null

  const map = await getTeamEmblemMap()
  return map.get(normalizeTeamName(representativeTeam)) ?? null
}

async function resolveOwnerProfileId(nickname: string, voltaHtml: string | null) {
  const fromVolta = voltaHtml ? extractOwnerProfileIdFromRows(voltaHtml, nickname) : null
  if (fromVolta) {
    return fromVolta
  }

  const encodedNickname = encodeURIComponent(nickname)

  for (const mode of SEARCH_MODES) {
    const rankHtml = await fetchTextWithRetry(
      `https://fconline.nexon.com/datacenter/rank_inner?rt=${mode.key}&strCharacterName=${encodedNickname}&n4seasonno=0&n4pageno=1`,
      {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        },
        cache: 'no-store',
      },
      3000,
      0,
    )

    const ownerProfileId = rankHtml ? extractOwnerProfileIdFromRows(rankHtml, nickname) : null
    if (ownerProfileId) {
      return ownerProfileId
    }
  }

  return null
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
    officialRank: incoming.officialRank ?? base.officialRank,
    officialRankPoint: incoming.officialRankPoint ?? base.officialRankPoint,
    officialRankLabel: incoming.officialRankLabel ?? base.officialRankLabel ?? null,
    officialRankIconUrl: incoming.officialRankIconUrl ?? base.officialRankIconUrl,
    officialWinRate: incoming.officialWinRate ?? base.officialWinRate,
    officialWins: incoming.officialWins ?? base.officialWins,
    officialDraws: incoming.officialDraws ?? base.officialDraws,
    officialLosses: incoming.officialLosses ?? base.officialLosses,
    officialTeamColors:
      incoming.officialTeamColors && incoming.officialTeamColors.length > 0
        ? incoming.officialTeamColors
        : base.officialTeamColors,
    officialFormation: incoming.officialFormation ?? base.officialFormation,
    managerRank: incoming.managerRank ?? base.managerRank,
    managerRankPoint: incoming.managerRankPoint ?? base.managerRankPoint,
    managerRankIconUrl: incoming.managerRankIconUrl ?? base.managerRankIconUrl,
    managerWinRate: incoming.managerWinRate ?? base.managerWinRate,
    managerWins: incoming.managerWins ?? base.managerWins,
    managerDraws: incoming.managerDraws ?? base.managerDraws,
    managerLosses: incoming.managerLosses ?? base.managerLosses,
    managerTeamColors:
      incoming.managerTeamColors && incoming.managerTeamColors.length > 0
        ? incoming.managerTeamColors
        : base.managerTeamColors,
    managerFormation: incoming.managerFormation ?? base.managerFormation,
  }
}

function applyModeSpecificFields(candidate: MatchSearchCandidate, mode: SearchModeKey): MatchSearchCandidate {
  if (mode === '1vs1') {
    return {
      ...candidate,
      officialRank: candidate.rank,
      officialRankPoint: candidate.elo,
      officialRankLabel: candidate.rankLabel ?? null,
      officialRankIconUrl: candidate.rankIconUrl ?? null,
      officialWinRate: candidate.winRate,
      officialWins: candidate.wins,
      officialDraws: candidate.draws,
      officialLosses: candidate.losses,
      officialTeamColors: candidate.teamColors,
      officialFormation: candidate.formation,
    }
  }

  if (mode === 'manager') {
    return {
      ...candidate,
      managerRank: candidate.rank,
      managerRankPoint: candidate.elo,
      managerRankIconUrl: candidate.rankIconUrl ?? null,
      managerWinRate: candidate.winRate,
      managerWins: candidate.wins,
      managerDraws: candidate.draws,
      managerLosses: candidate.losses,
      managerTeamColors: candidate.teamColors,
      managerFormation: candidate.formation,
    }
  }

  return candidate
}

function mergeRankCandidates(rankResults: RankSearchModeResult[]) {
  const merged = new Map<string, MatchSearchCandidate>()

  for (const result of rankResults) {
    for (const rawCandidate of result.candidates) {
      const candidate = applyModeSpecificFields(rawCandidate, result.mode)
      const key = `${candidate.nexonSn}:${candidate.nickname}`
      merged.set(key, merged.has(key) ? mergeCandidate(merged.get(key)!, candidate) : candidate)
    }
  }

  return [...merged.values()]
    .sort((a, b) => {
      if (a.rank === null && b.rank === null) return a.nickname.localeCompare(b.nickname, 'ko')
      if (a.rank === null) return 1
      if (b.rank === null) return -1
      return a.rank - b.rank
    })
    .slice(0, 20)
}

async function getMatchSearchData(nickname: string): Promise<MatchSearchResponse> {
  const normalizedNickname = normalizeNickname(nickname)
  const now = Date.now()
  const cached = searchCache.get(normalizedNickname)

  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  const pending = searchPromiseCache.get(normalizedNickname)
  if (pending) {
    return pending
  }

  const request = (async () => {
    const encodedNickname = encodeURIComponent(nickname)
    const [exactData, voltaHtml] = await Promise.all([
      fetchJsonWithRetry<{ ouid?: string }>(
        `https://open.api.nexon.com/fconline/v1/id?nickname=${encodedNickname}`,
        { headers: nexonHeaders, cache: 'no-store' },
        3500,
        0,
      ),
      fetchTextWithRetry(
        `https://fconline.nexon.com/datacenter/rank_volta?rtype=all&strCharacterName=${encodedNickname}`,
        {
          headers: {
            'user-agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
          },
          cache: 'no-store',
        },
        4000,
        0,
      ),
    ])

    if (exactData?.ouid) {
      ouidCache.set(normalizedNickname, exactData.ouid)
    }

    const voltaCandidate = voltaHtml ? parseVoltaExactCandidate(voltaHtml, nickname) : null
    const ownerProfileId = await resolveOwnerProfileId(nickname, voltaHtml)
    const ownerProfile = ownerProfileId
      ? await fetchOwnerProfile(ownerProfileId)
      : { ownerSince: null, representativeTeam: null, representativeTeamEmblemUrl: null }
    const representativeSquadSummary = ownerProfileId
      ? await fetchRepresentativeSquadSummary(ownerProfileId)
      : { formation: null, teamColors: [] as string[] }
    const recentOfficialFormation = await fetchRecentOfficialFormation(exactData?.ouid)
    const resolvedOfficialFormation = representativeSquadSummary.formation ?? recentOfficialFormation
    const firstTeamColor = representativeSquadSummary.teamColors[0] ?? null
    const teamColorEmblemUrl = firstTeamColor
      ? ((await getTeamEmblemMap()).get(normalizeTeamName(firstTeamColor)) ?? null)
      : null
    let exactCandidate: MatchSearchCandidate | null = null
    const rankResults = await Promise.all(
      SEARCH_MODES.map(async (mode) => {
        const html = await fetchTextWithRetry(
          `https://fconline.nexon.com/datacenter/rank_inner?rt=${mode.key}&strCharacterName=${encodedNickname}&n4seasonno=0&n4pageno=1`,
          {
            headers: {
              'user-agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
            },
            cache: 'no-store',
          },
          3000,
          0,
        )

        return {
          mode: mode.key,
          candidates: html ? parseOfficialCandidates(html, mode.label) : [],
        } satisfies RankSearchModeResult
      }),
    )
    const mergedRankCandidates = mergeRankCandidates(rankResults)

    if (exactData?.ouid) {
      exactCandidate = {
        ...createEmptyCandidate(nickname, ownerProfileId ?? `exact:${exactData.ouid}`, 'exact'),
        ouid: exactData.ouid,
        ownerSince: ownerProfile.ownerSince,
        representativeTeam: ownerProfile.representativeTeam,
        representativeTeamEmblemUrl:
          ownerProfile.representativeTeamEmblemUrl ??
          (await resolveRepresentativeTeamEmblem(ownerProfile.representativeTeam)),
        modes: ['exact'],
        formation: resolvedOfficialFormation,
        officialFormation: resolvedOfficialFormation,
        officialTeamColors: representativeSquadSummary.teamColors,
        teamColorEmblemUrl,
      }
    } else if (voltaCandidate) {
      exactCandidate = {
        ...createEmptyCandidate(nickname, ownerProfileId ?? `volta:${nickname}`, 'exact'),
        ownerSince: ownerProfile.ownerSince,
        representativeTeam: ownerProfile.representativeTeam,
        representativeTeamEmblemUrl:
          ownerProfile.representativeTeamEmblemUrl ??
          (await resolveRepresentativeTeamEmblem(ownerProfile.representativeTeam)),
        modes: ['volta'],
        formation: resolvedOfficialFormation,
        officialFormation: resolvedOfficialFormation,
        officialTeamColors: representativeSquadSummary.teamColors,
        teamColorEmblemUrl,
      }
    }

    if (exactCandidate && voltaCandidate) {
      exactCandidate = mergeCandidate(exactCandidate, voltaCandidate)
    }

    const exactOfficialCandidate =
      mergedRankCandidates.find((candidate) => normalizeNickname(candidate.nickname) === normalizedNickname) ?? null

    if (exactCandidate && exactOfficialCandidate) {
      exactCandidate = {
        ...mergeCandidate(exactCandidate, exactOfficialCandidate),
        officialFormation:
          exactOfficialCandidate.officialFormation ??
          exactCandidate.officialFormation ??
          resolvedOfficialFormation,
        source: 'exact',
      }
    }

    if (exactCandidate) {
      return {
        nickname,
        candidates: mergedRankCandidates.filter(
          (candidate) => normalizeNickname(candidate.nickname) !== normalizedNickname,
        ),
        exactMatch: exactCandidate,
        source: 'official-rank-search',
      }
    }

    return {
      nickname,
      candidates: mergedRankCandidates,
      exactMatch: null,
      source: 'official-rank-search',
    }
  })()
    .then((value) => {
      searchCache.set(normalizedNickname, {
        expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
        value,
      })
      return value
    })
    .finally(() => {
      searchPromiseCache.delete(normalizedNickname)
    })

  searchPromiseCache.set(normalizedNickname, request)
  return request
}

export async function GET(req: NextRequest) {
  const nickname = req.nextUrl.searchParams.get('nickname')?.trim()

  if (!nickname) {
    return Response.json({ error: 'nickname required' }, { status: 400 })
  }

  return Response.json(await getMatchSearchData(nickname))
}
