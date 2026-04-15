'use client'

import { ReactNode, useEffect, useEffectEvent, useRef, useState } from 'react'
import { ArrowLeft, LinkSimple, MagnifyingGlass, XLogo } from '@phosphor-icons/react'
import LoadingDots from '@/components/ui/LoadingDots'
import OfficialFormationMetaCard from '@/features/match-analysis/components/OfficialFormationMetaCard'
import OfficialTeamColorMetaCard from '@/features/match-analysis/components/OfficialTeamColorMetaCard'
import OfficialTopRankCard from '@/features/match-analysis/components/OfficialTopRankCard'
import VoltaPopularCoachCard from '@/features/match-analysis/components/VoltaPopularCoachCard'
import VoltaTopRankCard from '@/features/match-analysis/components/VoltaTopRankCard'
import PlayerImage from '@/features/player-search/components/PlayerImage'
import {
  calcPassTotal,
  MatchData,
  MatchPlayerInfo,
  MatchSearchCandidate,
  OfficialFormationMetaItem,
  OfficialTeamColorMetaItem,
  OfficialTopRankItem,
  VoltaTopRankItem,
} from '@/features/match-analysis/types'

const OUID_CACHE_KEY = 'fconline.match.ouid-cache'
const MATCH_SEARCH_CACHE_KEY = 'fconline.match.search-cache.v6'
const MATCH_RESULTS_CACHE_KEY = 'fconline.match.results-cache.v5'
const OFFICIAL_FORMATION_META_CACHE_KEY = 'fconline.match.official-formation-meta-cache.v2'
const OFFICIAL_TEAM_COLOR_META_CACHE_KEY = 'fconline.match.official-team-color-meta-cache.v7'
const OFFICIAL_TOP_CACHE_KEY = 'fconline.match.official-top-cache.v3'
const VOLTA_TOP_CACHE_KEY = 'fconline.match.volta-top-cache.v3'
const LEGACY_MATCH_CACHE_KEYS = ['fconline.match.official-top-cache.v2', 'fconline.match.volta-top-cache.v2'] as const
const MATCH_LIST_LIMIT = 10
const MATCH_LIST_TIMEOUT_MS = 10000
const INITIAL_VISIBLE_MATCHES = 3
const MATCH_RESULTS_CACHE_TTL_MS = 1000 * 60 * 10
const TOP_RANK_CACHE_TTL_MS = 1000 * 60 * 5
const POSITION_BADGE_STYLES: Record<string, { backgroundColor: string; color: string }> = {
  FW: { backgroundColor: 'var(--app-position-fw-bg)', color: 'var(--app-position-fw-fg)' },
  MF: { backgroundColor: 'var(--app-position-mf-bg)', color: 'var(--app-position-mf-fg)' },
  DF: { backgroundColor: 'var(--app-position-df-bg)', color: 'var(--app-position-df-fg)' },
}

const SHARE_CHANNELS = [
  { label: 'X 공유', icon: XLogo, key: 'x' },
  { label: '링크 복사', icon: LinkSimple, key: 'copy' },
] as const

type MatchSearchCacheEntry = {
  exactCandidate: MatchSearchCandidate | null
  candidates: MatchSearchCandidate[]
}

type MatchSearchCacheStore = Record<string, MatchSearchCacheEntry>
type MatchResultsCacheEntry = {
  cachedAt: number
  matches: MatchData[]
}
type MatchResultsCacheStore = Record<string, MatchResultsCacheEntry>
type VoltaTopRankCacheEntry = {
  cachedAt: number
  items: VoltaTopRankItem[]
}
type OfficialTopRankCacheEntry = {
  cachedAt: number
  items: OfficialTopRankItem[]
}
type OfficialFormationMetaCacheEntry = {
  dateKey: string
  items: OfficialFormationMetaItem[]
  sampleSize: number
}
type OfficialTeamColorMetaCacheEntry = {
  dateKey: string
  items: OfficialTeamColorMetaItem[]
  sampleSize: number
}
type SearchMode = 'official1on1' | 'voltaLive' | 'manager'
type TopRankSeedItem = OfficialTopRankItem | VoltaTopRankItem

const SEARCH_MODE_OPTIONS: Array<{
  value: SearchMode
  label: string
  disabled?: boolean
}> = [
  {
    value: 'official1on1',
    label: '1:1 공식경기',
  },
  {
    value: 'voltaLive',
    label: '볼타 라이브',
  },
  {
    value: 'manager',
    label: '감독모드',
    disabled: true,
  },
]

function normalizeSearchMode(value: string | null | undefined): SearchMode {
  return value === 'voltaLive' || value === 'manager' ? value : 'official1on1'
}

function getMatchTypeForMode(mode: SearchMode) {
  return mode === 'official1on1' ? 50 : mode === 'manager' ? 52 : 214
}

function getModeLabel(mode: SearchMode) {
  return mode === 'official1on1' ? '1:1 공식경기' : mode === 'manager' ? '감독모드' : '볼타 공식 경기'
}

function buildMatchCacheKey(ouid: string, mode: SearchMode) {
  return `${ouid}:${mode}`
}

function createEmptySearchCandidate(nickname: string): MatchSearchCandidate {
  return {
    nickname,
    nexonSn: `seed:${nickname}`,
    ouid: null,
    ownerSince: null,
    representativeTeam: null,
    representativeTeamEmblemUrl: null,
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
    source: 'exact',
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

function buildTopRankSeedCandidate(mode: SearchMode, item: TopRankSeedItem): MatchSearchCandidate {
  const base = createEmptySearchCandidate(item.nickname)
  base.ouid = item.ouid ?? null

  if (mode === 'official1on1') {
    const officialItem = item as OfficialTopRankItem
    return {
      ...base,
      rank: officialItem.rank,
      elo: officialItem.rankPoint,
      rankLabel: '1vs1',
      rankIconUrl: officialItem.rankIconUrl,
      winRate: officialItem.winRate,
      wins: officialItem.wins,
      draws: officialItem.draws,
      losses: officialItem.losses,
      teamColors: officialItem.teamColors,
      formation: officialItem.formation,
      price: officialItem.price,
      modes: ['1vs1'],
      officialRank: officialItem.rank,
      officialRankPoint: officialItem.rankPoint,
      officialRankLabel: '1vs1',
      officialRankIconUrl: officialItem.rankIconUrl,
      officialWinRate: officialItem.winRate,
      officialWins: officialItem.wins,
      officialDraws: officialItem.draws,
      officialLosses: officialItem.losses,
      officialTeamColors: officialItem.teamColors,
      officialFormation: officialItem.formation,
    }
  }

  const voltaItem = item as VoltaTopRankItem
  return {
    ...base,
    price: voltaItem.price,
    modes: ['volta'],
    voltaRank: voltaItem.rank,
    voltaRankPoint: voltaItem.rankPoint,
    voltaRankIconUrl: voltaItem.rankIconUrl,
    voltaWinRate: voltaItem.winRate,
    voltaAverageRating: voltaItem.averageRating,
    voltaMainPosition: voltaItem.mainPositionDetail ?? voltaItem.mainPosition,
  }
}

function mergeSeedCandidate(
  candidate: MatchSearchCandidate | null,
  seed: MatchSearchCandidate | null,
): MatchSearchCandidate | null {
  if (!seed) {
    return candidate
  }

  if (!candidate) {
    return seed
  }

  return {
    ...seed,
    ...candidate,
    nexonSn: candidate.nexonSn || seed.nexonSn,
    ouid: candidate.ouid ?? seed.ouid,
    ownerSince: candidate.ownerSince ?? seed.ownerSince,
    representativeTeam: candidate.representativeTeam ?? seed.representativeTeam,
    representativeTeamEmblemUrl: candidate.representativeTeamEmblemUrl ?? seed.representativeTeamEmblemUrl,
    level: candidate.level ?? seed.level,
    rank: candidate.rank ?? seed.rank,
    elo: candidate.elo ?? seed.elo,
    rankLabel: candidate.rankLabel ?? seed.rankLabel,
    rankIconUrl: candidate.rankIconUrl ?? seed.rankIconUrl,
    winRate: candidate.winRate ?? seed.winRate,
    wins: candidate.wins ?? seed.wins,
    draws: candidate.draws ?? seed.draws,
    losses: candidate.losses ?? seed.losses,
    teamColors: candidate.teamColors.length > 0 ? candidate.teamColors : seed.teamColors,
    formation: candidate.formation ?? seed.formation,
    price: candidate.price ?? seed.price,
    modes: candidate.modes.length > 0 ? Array.from(new Set([...candidate.modes, ...seed.modes])) : seed.modes,
    source: candidate.source,
    officialRank: candidate.officialRank ?? seed.officialRank,
    officialRankPoint: candidate.officialRankPoint ?? seed.officialRankPoint,
    officialRankLabel: candidate.officialRankLabel ?? seed.officialRankLabel,
    officialRankIconUrl: candidate.officialRankIconUrl ?? seed.officialRankIconUrl,
    officialWinRate: candidate.officialWinRate ?? seed.officialWinRate,
    officialWins: candidate.officialWins ?? seed.officialWins,
    officialDraws: candidate.officialDraws ?? seed.officialDraws,
    officialLosses: candidate.officialLosses ?? seed.officialLosses,
    officialTeamColors:
      candidate.officialTeamColors.length > 0 ? candidate.officialTeamColors : seed.officialTeamColors,
    officialFormation: candidate.officialFormation ?? seed.officialFormation,
    voltaRank: candidate.voltaRank ?? seed.voltaRank,
    voltaRankPoint: candidate.voltaRankPoint ?? seed.voltaRankPoint,
    voltaRankIconUrl: candidate.voltaRankIconUrl ?? seed.voltaRankIconUrl,
    voltaWinRate: candidate.voltaWinRate ?? seed.voltaWinRate,
    voltaWins: candidate.voltaWins ?? seed.voltaWins,
    voltaDraws: candidate.voltaDraws ?? seed.voltaDraws,
    voltaLosses: candidate.voltaLosses ?? seed.voltaLosses,
    voltaAverageRating: candidate.voltaAverageRating ?? seed.voltaAverageRating,
    voltaMomCount: candidate.voltaMomCount ?? seed.voltaMomCount,
    voltaGoals: candidate.voltaGoals ?? seed.voltaGoals,
    voltaAssists: candidate.voltaAssists ?? seed.voltaAssists,
    voltaTackleRate: candidate.voltaTackleRate ?? seed.voltaTackleRate,
    voltaBlockRate: candidate.voltaBlockRate ?? seed.voltaBlockRate,
    voltaEffectiveShots: candidate.voltaEffectiveShots ?? seed.voltaEffectiveShots,
    voltaPassRate: candidate.voltaPassRate ?? seed.voltaPassRate,
    voltaDribbleRate: candidate.voltaDribbleRate ?? seed.voltaDribbleRate,
    voltaMainPosition: candidate.voltaMainPosition ?? seed.voltaMainPosition,
  }
}

function formatDate(dateStr: string) {
  const normalized = /Z$|[+-]\d{2}:\d{2}$/.test(dateStr) ? dateStr : `${dateStr}Z`
  const date = new Date(normalized)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}.${month}.${day} ${hour}:${minute}`
}

function formatDecimal(value: number | null | undefined, digits = 2) {
  if (value == null) return '-'
  return value.toFixed(digits)
}

function formatMetricNumber(value: number | null | undefined, digits = 0) {
  if (value == null || Number.isNaN(value)) return '-'
  if (digits > 0) return value.toFixed(digits)
  return String(value)
}

function formatRateWithFraction(rate: number | null, success: number | null, attempt: number | null) {
  if (rate == null || success == null || attempt == null || attempt <= 0) {
    return '-'
  }

  return `${formatPercent(rate)} (${formatMetricNumber(success)}/${formatMetricNumber(attempt)})`
}

function getKstDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function getDisplayScore(player: MatchPlayerInfo | undefined) {
  return player?.shoot.goalTotalDisplay ?? player?.shoot.goalTotal ?? 0
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`
}

function formatControllerLabel(value: string | null | undefined) {
  if (!value) return '-'
  const normalized = value.trim()
  if (!normalized) return '-'
  return normalized
}

function formatPlayerCardSummary(player: MatchPlayerInfo) {
  const playerName = player.cardInfo?.playerName?.trim()
  const enhancement = player.cardInfo?.enhancement
  const seasonName = player.cardInfo?.seasonName?.trim()
  const parts = [
    playerName || null,
    enhancement != null ? `${enhancement}강` : null,
    seasonName || null,
  ].filter((part): part is string => Boolean(part))

  return parts.length > 0 ? parts.join(' · ') : null
}

function getControllerDisplay(value: string | null | undefined) {
  const label = formatControllerLabel(value)

  if (label === '-' || !label) {
    return label
  }

  const normalized = label.toLowerCase()
  if (normalized.includes('keyboard') || normalized.includes('키보드')) {
    return `⌨️ ${label}`
  }

  if (
    normalized.includes('gamepad') ||
    normalized.includes('pad') ||
    normalized.includes('패드') ||
    normalized.includes('controller') ||
    normalized.includes('컨트롤러')
  ) {
    return `🎮 ${label}`
  }

  return label
}

function buildVoltaTeams(match: MatchData, myOuid: string) {
  const players = Array.isArray(match.matchInfo) ? match.matchInfo : []
  const me = players.find((player) => player.ouid === myOuid)

  if (!me) {
    return null
  }

  const myResult = me.matchDetail.matchResult
  const isDraw = myResult === '무'
  const teammates = isDraw
    ? players
    : players.filter((player) => player.matchDetail.matchResult === myResult)
  const opponents = isDraw
    ? []
    : players.filter((player) => player.matchDetail.matchResult !== myResult)

  return {
    me,
    isDraw,
    teammates: teammates.length > 0 ? teammates : [me],
    opponents,
    myScore: getDisplayScore(me),
    opponentScore: isDraw ? getDisplayScore(me) : getDisplayScore(opponents[0]),
  }
}

function summarizeMatches(matches: MatchData[], ouid: string | null | undefined) {
  if (!ouid) return null

  let wins = 0
  let draws = 0
  let losses = 0
  let goalsFor = 0
  let goalsAgainst = 0

  for (const match of matches) {
    const teams = buildVoltaTeams(match, ouid)
    if (!teams) continue

    const result = teams.me.matchDetail.matchResult
    if (result === '승') wins += 1
    else if (result === '무') draws += 1
    else if (result === '패') losses += 1

    goalsFor += teams.myScore
    goalsAgainst += teams.opponentScore
  }

  const total = wins + draws + losses
  if (total === 0) return null

  return { total, wins, draws, losses, goalsFor, goalsAgainst }
}

function getOfficialPlayerMetrics(player: MatchPlayerInfo) {
  const passTotals = calcPassTotal(player.pass)
  const blockTry = player.defence.blockTry ?? null
  const blockSuccess = player.defence.blockSuccess ?? null
  const blockRate =
    blockTry != null && blockTry > 0 && blockSuccess != null ? (blockSuccess / blockTry) * 100 : null
  const tackleTry = player.defence.tackleTry ?? null
  const tackleSuccess = player.defence.tackleSuccess ?? null
  const tackleRate =
    tackleTry != null && tackleTry > 0 && tackleSuccess != null ? (tackleSuccess / tackleTry) * 100 : null

  return {
    controller: formatControllerLabel(player.matchDetail.controller),
    possession: player.matchDetail.possession ?? 0,
    fouls: player.matchDetail.foul ?? 0,
    corners: player.matchDetail.cornerKick ?? 0,
    offsides: player.matchDetail.offsideCount ?? 0,
    yellowCards: player.matchDetail.yellowCards ?? 0,
    redCards: player.matchDetail.redCards ?? 0,
    rating: player.matchDetail.averageRating ?? 0,
    shots: player.shoot.shootTotal ?? 0,
    effectiveShots: player.shoot.effectiveShootTotal ?? 0,
    goals: getDisplayScore(player),
    passTry: passTotals.try,
    passSuccess: passTotals.success,
    passRate: passTotals.try > 0 ? (passTotals.success / passTotals.try) * 100 : null,
    blockTry,
    blockSuccess,
    blockRate,
    tackleTry,
    tackleSuccess,
    tackleRate,
  }
}

function buildOfficialTeams(match: MatchData, myOuid: string) {
  const players = Array.isArray(match.matchInfo) ? match.matchInfo : []
  const me = players.find((player) => player.ouid === myOuid)

  if (!me) {
    return null
  }

  const opponent = players.find((player) => player.ouid !== myOuid)

  if (!opponent) {
    return null
  }

  return {
    me,
    opponent,
    myScore: getDisplayScore(me),
    opponentScore: getDisplayScore(opponent),
  }
}

function summarizeOfficialMatches(matches: MatchData[], ouid: string | null | undefined) {
  if (!ouid) return null

  let wins = 0
  let draws = 0
  let losses = 0
  let goalsFor = 0
  let goalsAgainst = 0
  let cleanSheets = 0
  let possessionTotal = 0
  let shotTotal = 0
  let effectiveShotTotal = 0
  const passRates: number[] = []

  for (const match of matches) {
    const teams = buildOfficialTeams(match, ouid)
    if (!teams) continue

    const meMetrics = getOfficialPlayerMetrics(teams.me)
    const result = teams.me.matchDetail.matchResult

    if (result === '승') wins += 1
    else if (result === '무') draws += 1
    else if (result === '패') losses += 1

    goalsFor += teams.myScore
    goalsAgainst += teams.opponentScore
    possessionTotal += meMetrics.possession
    shotTotal += meMetrics.shots
    effectiveShotTotal += meMetrics.effectiveShots

    if (meMetrics.passRate != null) {
      passRates.push(meMetrics.passRate)
    }

    if (teams.opponentScore === 0) {
      cleanSheets += 1
    }
  }

  const total = wins + draws + losses
  if (total === 0) return null

  return {
    total,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    cleanSheets,
    averagePossession: possessionTotal / total,
    averageShots: shotTotal / total,
    averageEffectiveShots: effectiveShotTotal / total,
    averagePassRate: passRates.length > 0 ? average(passRates) : null,
  }
}

type OfficialRecentScoringSummary = {
  totalGoals: number
  inPenaltyGoals: number
  outPenaltyGoals: number
  headerGoals: number
  freekickGoals: number
  penaltyGoals: number
  multiGoalMatches: number
  cleanFinishes: number
}

type OfficialRecentPlayerLeader = {
  key: string
  spId: number
  spPosition: number | null
  enhancement: number | null
  playerName: string | null
  seasonName: string | null
  appearances: number
  goals: number
  assists: number
  effectiveShots: number
  shots: number
  averageRating: number
}

const FC_POSITION_LABELS: Record<number, string> = {
  0: 'GK',
  1: 'SW',
  2: 'RWB',
  3: 'RB',
  4: 'RCB',
  5: 'CB',
  6: 'LCB',
  7: 'LB',
  8: 'LWB',
  9: 'RDM',
  10: 'CDM',
  11: 'LDM',
  12: 'RM',
  13: 'RCM',
  14: 'CM',
  15: 'LCM',
  16: 'LM',
  17: 'RAM',
  18: 'CAM',
  19: 'LAM',
  20: 'RF',
  21: 'CF',
  22: 'LF',
  23: 'RW',
  24: 'RS',
  25: 'ST',
  26: 'LS',
  27: 'LW',
}

function summarizeOfficialScoringStyles(matches: MatchData[], ouid: string | null | undefined): OfficialRecentScoringSummary | null {
  if (!ouid) return null

  let totalGoals = 0
  let inPenaltyGoals = 0
  let outPenaltyGoals = 0
  let headerGoals = 0
  let freekickGoals = 0
  let penaltyGoals = 0
  let multiGoalMatches = 0
  let cleanFinishes = 0

  for (const match of matches) {
    const teams = buildOfficialTeams(match, ouid)
    if (!teams) continue

    const myGoals = teams.myScore
    totalGoals += myGoals
    if (myGoals >= 2) {
      multiGoalMatches += 1
    }

    inPenaltyGoals += teams.me.shoot.goalInPenalty ?? 0
    outPenaltyGoals += teams.me.shoot.goalOutPenalty ?? 0
    headerGoals += teams.me.shoot.goalHeading ?? 0
    freekickGoals += teams.me.shoot.goalFreekick ?? 0
    penaltyGoals += teams.me.shoot.goalPenaltyKick ?? 0

    const effectiveShots = teams.me.shoot.effectiveShootTotal ?? 0
    if (effectiveShots > 0 && myGoals > 0) {
      cleanFinishes += myGoals / effectiveShots >= 0.5 ? 1 : 0
    }
  }

  if (totalGoals === 0 && inPenaltyGoals === 0 && outPenaltyGoals === 0) {
    return null
  }

  return {
    totalGoals,
    inPenaltyGoals,
    outPenaltyGoals,
    headerGoals,
    freekickGoals,
    penaltyGoals,
    multiGoalMatches,
    cleanFinishes,
  }
}

function buildOfficialRecentPlayerLeaders(matches: MatchData[], ouid: string | null | undefined) {
  if (!ouid) return []

  const players = new Map<string, OfficialRecentPlayerLeader>()

  for (const match of matches) {
    const teams = buildOfficialTeams(match, ouid)
    const squad = teams?.me.player

    if (!teams || !Array.isArray(squad)) continue

    for (const squadPlayer of squad) {
      const spId = typeof squadPlayer?.spId === 'number' ? squadPlayer.spId : null
      if (!spId) continue

      const enhancement =
        typeof squadPlayer?.spGrade === 'number' && Number.isFinite(squadPlayer.spGrade)
          ? squadPlayer.spGrade
          : null
      const key = `${spId}:${enhancement ?? 0}`
      const status = squadPlayer.status
      const previous = players.get(key)
      const goals = status?.goal ?? 0
      const assists = status?.assist ?? 0
      const effectiveShots = status?.effectiveShoot ?? 0
      const shots = status?.shoot ?? 0
      const rating = status?.spRating ?? 0

      players.set(key, {
        key,
        spId,
        spPosition:
          typeof squadPlayer?.spPosition === 'number' ? squadPlayer.spPosition : previous?.spPosition ?? null,
        enhancement,
        playerName: squadPlayer.cardInfo?.playerName ?? previous?.playerName ?? null,
        seasonName: squadPlayer.cardInfo?.seasonName ?? previous?.seasonName ?? null,
        appearances: (previous?.appearances ?? 0) + 1,
        goals: (previous?.goals ?? 0) + goals,
        assists: (previous?.assists ?? 0) + assists,
        effectiveShots: (previous?.effectiveShots ?? 0) + effectiveShots,
        shots: (previous?.shots ?? 0) + shots,
        averageRating: (previous?.averageRating ?? 0) + rating,
      })
    }
  }

  return [...players.values()]
    .map((player) => ({
      ...player,
      averageRating: player.appearances > 0 ? player.averageRating / player.appearances : 0,
    }))
    .sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals
      if (b.assists !== a.assists) return b.assists - a.assists
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating
      return b.effectiveShots - a.effectiveShots
    })
    .slice(0, 5)
}

function getPlayerLeaderPositionLabel(player: OfficialRecentPlayerLeader) {
  return player.spPosition != null ? FC_POSITION_LABELS[player.spPosition] ?? `POS ${player.spPosition}` : null
}

function formatPlayerLeaderSubtitle(player: OfficialRecentPlayerLeader): ReactNode {
  const trailingParts = [
    player.enhancement != null ? `${player.enhancement}강` : null,
    player.seasonName || null,
  ].filter((part): part is string => Boolean(part))

  return trailingParts.join(' · ')
}

function getVoltaPlayerMetrics(player: MatchPlayerInfo) {
  const status = (player as MatchPlayerInfo & {
    player?: Array<{
      status?: {
        shoot?: number | null
        effectiveShoot?: number | null
        assist?: number | null
        goal?: number | null
        dribble?: number | null
        passTry?: number | null
        passSuccess?: number | null
        blockTry?: number | null
        block?: number | null
        tackleTry?: number | null
        tackle?: number | null
        yellowCards?: number | null
        redCards?: number | null
        spRating?: number | null
      }
    }>
  }).player?.[0]?.status

  const shotTotal = status?.shoot ?? player.shoot.shootTotal ?? 0
  const effectiveShotTotal = status?.effectiveShoot ?? player.shoot.effectiveShootTotal ?? 0
  const goalTotal = status?.goal ?? player.shoot.goalTotal ?? 0
  const passTry = status?.passTry ?? calcPassTotal(player.pass).try
  const passSuccess = status?.passSuccess ?? calcPassTotal(player.pass).success
  const passRate = passTry > 0 ? Math.round((passSuccess / passTry) * 100) : null
  const blockTry = status?.blockTry ?? player.defence.blockTry ?? null
  const blockSuccess = status?.block ?? player.defence.blockSuccess ?? null
  const blockRate =
    blockTry != null && blockTry > 0 && blockSuccess != null ? (blockSuccess / blockTry) * 100 : null
  const tackleTry = status?.tackleTry ?? player.defence.tackleTry ?? null
  const tackleSuccess = status?.tackle ?? player.defence.tackleSuccess ?? null
  const tackleRate =
    tackleTry != null && tackleTry > 0 && tackleSuccess != null ? (tackleSuccess / tackleTry) * 100 : null

  return {
    rating: status?.spRating ?? player.matchDetail.averageRating ?? 0,
    possession: player.matchDetail.possession ?? 0,
    controller: formatControllerLabel(player.matchDetail.controller),
    shots: shotTotal,
    effectiveShots: effectiveShotTotal,
    goals: goalTotal,
    passSuccess,
    passTry,
    passRate,
    dribble: status?.dribble ?? player.matchDetail.dribble ?? 0,
    blockSuccess,
    blockTry,
    blockRate,
    tackleSuccess,
    tackleTry,
    tackleRate,
    fouls: player.matchDetail.foul ?? 0,
    offsides: player.matchDetail.offsideCount ?? 0,
    yellowCards: status?.yellowCards ?? player.matchDetail.yellowCards ?? 0,
    redCards: status?.redCards ?? player.matchDetail.redCards ?? 0,
  }
}

function statValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '-'
  return value
}

function normalizeNicknameKey(value: string) {
  return value.trim().toLowerCase()
}

function readJsonStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJsonStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

function readCachedOuid(nickname: string) {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(OUID_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, string>
    return parsed[normalizeNicknameKey(nickname)] ?? null
  } catch {
    return null
  }
}

function writeCachedOuid(nickname: string, ouid: string) {
  if (typeof window === 'undefined') return

  try {
    const raw = window.localStorage.getItem(OUID_CACHE_KEY)
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {}
    parsed[normalizeNicknameKey(nickname)] = ouid
    window.localStorage.setItem(OUID_CACHE_KEY, JSON.stringify(parsed))
  } catch {}
}

function readCachedSearch(nickname: string) {
  const parsed = readJsonStorage<MatchSearchCacheStore>(MATCH_SEARCH_CACHE_KEY)
  if (!parsed) return null
  const entry = parsed[normalizeNicknameKey(nickname)] ?? null

  if (!entry) {
    return null
  }

  const mainPosition = entry.exactCandidate?.voltaMainPosition ?? ''
  const percentages = typeof mainPosition === 'string' ? mainPosition.match(/\d+(?:\.\d+)?%/g) ?? [] : []

  if (entry.exactCandidate && percentages.length < 3) {
    return null
  }

  if (
    entry.exactCandidate &&
    (!('ownerSince' in entry.exactCandidate) || !('representativeTeam' in entry.exactCandidate))
  ) {
    return null
  }

  return entry
}

function writeCachedSearch(nickname: string, entry: MatchSearchCacheEntry) {
  const parsed = readJsonStorage<MatchSearchCacheStore>(MATCH_SEARCH_CACHE_KEY) ?? {}
  parsed[normalizeNicknameKey(nickname)] = entry
  writeJsonStorage(MATCH_SEARCH_CACHE_KEY, parsed)
}

function readCachedMatches(cacheKey: string) {
  const parsed = readJsonStorage<MatchResultsCacheStore>(MATCH_RESULTS_CACHE_KEY)
  if (!parsed) return null

  const entry = parsed[cacheKey]
  if (!entry) return null

  if (Date.now() - entry.cachedAt > MATCH_RESULTS_CACHE_TTL_MS) {
    return null
  }

  return Array.isArray(entry.matches) ? entry.matches : null
}

function writeCachedMatches(cacheKey: string, matches: MatchData[]) {
  const parsed = readJsonStorage<MatchResultsCacheStore>(MATCH_RESULTS_CACHE_KEY) ?? {}
  parsed[cacheKey] = {
    cachedAt: Date.now(),
    matches,
  }
  writeJsonStorage(MATCH_RESULTS_CACHE_KEY, parsed)
}

function buildMatchesUrl(nickname: string | null, matchId?: string | null, mode: SearchMode = 'official1on1') {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)

  if (nickname?.trim()) {
    url.searchParams.set('nickname', nickname.trim())
  } else {
    url.searchParams.delete('nickname')
  }

  if (matchId?.trim()) {
    url.searchParams.set('matchId', matchId.trim())
  } else {
    url.searchParams.delete('matchId')
  }

  if (mode !== 'official1on1') {
    url.searchParams.set('mode', mode)
  } else {
    url.searchParams.delete('mode')
  }

  return `${url.pathname}${url.search}`
}

function updateMatchesUrl(nickname: string | null, matchId?: string | null, mode: SearchMode = 'official1on1') {
  if (typeof window === 'undefined') return
  const nextUrl = buildMatchesUrl(nickname, matchId, mode)
  if (!nextUrl) return
  window.history.replaceState({}, '', nextUrl)
}

function MutedDivider() {
  return <span className="app-theme-muted text-[11px] font-normal leading-none">|</span>
}

function MainPositionValue({ value }: { value: string }) {
  const { position, primaryShare } = parseMainPositionParts(value)
  const positionStyle = POSITION_BADGE_STYLES[position] ?? { color: 'var(--app-body-text)' }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-semibold tracking-[-0.02em]" style={{ color: positionStyle.color }}>
        {position}
      </span>
      <span className="text-sm font-semibold tracking-[-0.02em]" style={{ color: positionStyle.color }}>
        {primaryShare}
      </span>
    </div>
  )
}

function PlayerPositionBadge({ position }: { position: string }) {
  const upper = position.toUpperCase()
  const style = getPlayerPositionBadgeStyle(upper)

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-[2px] text-[11px] font-semibold leading-none"
      style={style}
    >
      {position}
    </span>
  )
}

function getPlayerPositionBadgeStyle(position: string) {
  if (['ST', 'CF', 'LW', 'RW', 'LF', 'RF'].includes(position)) {
    return { backgroundColor: 'var(--app-position-fw-bg)', color: 'var(--app-position-fw-fg)' }
  }

  if (['CAM', 'CM', 'CDM', 'LM', 'RM', 'LAM', 'RAM'].includes(position)) {
    return { backgroundColor: 'var(--app-position-mf-bg)', color: 'var(--app-position-mf-fg)' }
  }

  return { backgroundColor: 'var(--app-position-df-bg)', color: 'var(--app-position-df-fg)' }
}

function parseMainPositionParts(value: string) {
  const position = value.match(/\b(FW|MF|DF)\b/)?.[1] ?? '-'
  const percentages = value.match(/\d+(?:\.\d+)?%/g) ?? []
  const fw = percentages[0] ?? '-'
  const mf = percentages[1] ?? '-'
  const df = percentages[2] ?? '-'
  const primaryShare = position === 'MF' ? mf : position === 'DF' ? df : fw

  return {
    position,
    fw,
    mf,
    df,
    primaryShare,
  }
}

function DetailValueContent({
  label,
  rawValue,
}: {
  label: string
  rawValue: string | number | null | undefined
}): {
  primary: ReactNode
  secondary?: ReactNode
} {
  const value = statValue(rawValue)
  if (typeof value !== 'string') {
    return { primary: String(value) }
  }

  if (label === '주요 포지션') {
    const { position, fw, mf, df } = parseMainPositionParts(value)
    const secondaryParts =
      position === 'FW'
        ? [`MF ${mf}`, `DF ${df}`]
        : position === 'MF'
          ? [`FW ${fw}`, `DF ${df}`]
          : [`FW ${fw}`, `MF ${mf}`]

    return {
      primary: <MainPositionValue value={value} />,
      secondary: (
        <div className="app-theme-body flex items-center gap-1.5 text-[12px] leading-4">
          <span>{secondaryParts[0]}</span>
          <MutedDivider />
          <span>{secondaryParts[1]}</span>
        </div>
      ),
    }
  }

  if (label === '유효슛') {
    const match = value.match(/^(경기당\s*[^\s]+)\s+(\d+)\s*\|\s*(\d+)$/)
    if (!match) return { primary: value }
    const [, rate, success, attempt] = match
    return {
      primary: rate,
      secondary: (
        <div className="flex flex-wrap items-center gap-1.5">
          <span>총 유효슛 {success}</span>
          <MutedDivider />
          <span>경기수 {attempt}</span>
        </div>
      ),
    }
  }

  const match = value.match(/^(.+?%)\s+(\d+)\s*\|\s*(\d+)$/)
  if (!match) {
    return { primary: value }
  }

  const [, rate, success, attempt] = match
  return {
    primary: rate,
    secondary: (
      <div className="flex flex-wrap items-center gap-1.5">
        <span>성공 {success}</span>
        <MutedDivider />
        <span>시도 {attempt}</span>
      </div>
    ),
  }
}

function InfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--app-analysis-soft-bg)' }}>
      <div className="app-theme-muted text-[11px]">{label}</div>
      <div className="app-theme-title mt-1 text-sm font-semibold">{value}</div>
    </div>
  )
}

function SummaryPill({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--app-analysis-soft-bg)' }}>
      <div className="app-theme-muted text-[11px]">{label}</div>
      <div className="app-theme-title mt-1 text-sm font-semibold">{value}</div>
    </div>
  )
}

function SearchModeTabs({
  selectedMode,
  onSelect,
}: {
  selectedMode: SearchMode
  onSelect: (mode: SearchMode) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
      {SEARCH_MODE_OPTIONS.map((option) => {
        const active = option.value === selectedMode
        const activeStyle =
          option.value === 'voltaLive'
            ? {
                color: '#ffffff',
                background:
                  'linear-gradient(135deg, #5f36d9 0%, #4a2ab7 100%)',
                boxShadow: '0 10px 24px rgba(95, 54, 217, 0.22)',
              }
            : {
                color: '#ffffff',
                background:
                  'linear-gradient(135deg, #457ae5 0%, #256ef4 100%)',
                boxShadow: '0 10px 24px rgba(37, 110, 244, 0.2)',
              }

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              if (option.disabled) return
              onSelect(option.value)
            }}
            disabled={option.disabled}
            className="inline-flex h-9 items-center justify-center rounded-full px-3 text-[15px] font-semibold leading-none tracking-[-0.02em] transition"
            style={
              option.disabled
                ? {
                    color: 'var(--app-muted-text)',
                    backgroundColor: 'transparent',
                    opacity: 0.45,
                    cursor: 'not-allowed',
                  }
                : active
                ? activeStyle
                : {
                    color: 'var(--app-body-text)',
                    backgroundColor: 'transparent',
                  }
            }
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function SearchModePreviewCard({
  selectedMode,
  onSelectTopRankItem,
  officialFormationMetaItems,
  officialFormationMetaLoading,
  officialFormationMetaSampleSize,
  officialTeamColorMetaItems,
  officialTeamColorMetaLoading,
  officialTeamColorMetaSampleSize,
  officialTopItems,
  officialTopLoading,
  voltaTopItems,
  voltaTopLoading,
}: {
  selectedMode: SearchMode
  onSelectTopRankItem: (mode: SearchMode, item: TopRankSeedItem) => void
  officialFormationMetaItems: OfficialFormationMetaItem[]
  officialFormationMetaLoading: boolean
  officialFormationMetaSampleSize: number
  officialTeamColorMetaItems: OfficialTeamColorMetaItem[]
  officialTeamColorMetaLoading: boolean
  officialTeamColorMetaSampleSize: number
  officialTopItems: OfficialTopRankItem[]
  officialTopLoading: boolean
  voltaTopItems: VoltaTopRankItem[]
  voltaTopLoading: boolean
}) {
  if (selectedMode === 'official1on1') {
    return (
      <>
        <section className="mt-4 space-y-3">
          <p className="app-theme-muted text-[11px] font-medium leading-4">
            • 현재 시즌 1:1 공식경기 랭킹 기준
          </p>

          <OfficialTopRankCard
            items={officialTopItems}
            isLoading={officialTopLoading}
            onSelectItem={(item) => onSelectTopRankItem('official1on1', item)}
          />
        </section>

        <section className="mt-4">
          <OfficialTeamColorMetaCard
            items={officialTeamColorMetaItems}
            sampleSize={officialTeamColorMetaSampleSize}
            isLoading={officialTeamColorMetaLoading}
          />
        </section>

        <section className="mt-4">
          <OfficialFormationMetaCard
            items={officialFormationMetaItems}
            sampleSize={officialFormationMetaSampleSize}
            isLoading={officialFormationMetaLoading}
          />
        </section>
      </>
    )
  }

  if (selectedMode === 'manager') {
    return (
      <section className="app-theme-card rounded-lg border px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="app-theme-title text-base font-semibold">감독모드 준비 중</p>
            <p className="app-theme-body mt-1 text-sm leading-5">
              감독모드는 다음 단계에서 전적, 티어, 최근 경기 흐름에 맞춰 연결할 예정이에요.
            </p>
          </div>
          <span
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              backgroundColor: 'var(--app-analysis-soft-bg)',
              color: 'var(--app-title)',
            }}
          >
            Preview
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <InfoCard label="예정 정보" value="감독 티어" />
          <InfoCard label="예정 정보" value="승무패" />
          <InfoCard label="예정 정보" value="승률" />
          <InfoCard label="예정 정보" value="최근 경기" />
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="mt-4 space-y-3">
        <p className="app-theme-muted text-[11px] font-medium leading-4">
          • 현재 시즌 볼타 라이브 공식 랭킹 기준
        </p>

        {voltaTopLoading || voltaTopItems.length > 0 ? (
          <VoltaTopRankCard
            items={voltaTopItems}
            isLoading={voltaTopLoading}
            onSelectItem={(item) => onSelectTopRankItem('voltaLive', item)}
          />
        ) : null}
      </section>

      <section className="mt-4">
        <VoltaPopularCoachCard />
      </section>
    </>
  )
}

function MatchMetricCard({
  label,
  value,
  accent = 'default',
}: {
  label: string
  value: string | number
  accent?: 'default' | 'blue' | 'red' | 'green'
}) {
  const accentColor =
    accent === 'blue'
      ? 'var(--app-accent-blue)'
      : accent === 'red'
        ? 'var(--app-accent-red)'
        : accent === 'green'
          ? 'var(--app-accent-green)'
          : 'var(--app-title)'

  return (
    <div className="app-theme-card rounded-lg px-4 py-3">
      <p className="app-theme-muted text-[11px]">{label}</p>
      <p className="mt-1 text-sm font-semibold" style={{ color: accentColor }}>
        {value}
      </p>
    </div>
  )
}

function MatchSectionLabel({ children }: { children: ReactNode }) {
  return <p className="app-theme-muted text-[11px] font-medium uppercase tracking-[0.08em]">{children}</p>
}

function MatchPlayerSelectorButton({
  player,
  active,
  onClick,
}: {
  player: MatchPlayerInfo
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-9 max-w-[128px] items-center rounded-[8px] border px-2 py-1.5 align-middle text-left text-[12px] font-semibold break-words transition sm:min-h-7 sm:max-w-[112px] sm:py-[5px] ${
        active ? 'border-[var(--app-accent-blue)]' : 'app-theme-body'
      }`}
      style={
        active
          ? {
              color: 'var(--app-accent-blue)',
              backgroundColor: 'var(--app-card-bg)',
              boxShadow: '0 0 0 1px rgba(37,110,244,0.08)',
            }
          : {
              backgroundColor: 'transparent',
              borderColor: 'var(--app-input-border)',
            }
      }
      title={player.nickname}
    >
      <span className="block leading-[1.2] whitespace-normal sm:translate-y-[1px] sm:leading-[1.1]">
        {player.nickname}
      </span>
    </button>
  )
}

function MatchResultBadge({ result }: { result: string }) {
  const emoji = result === '승' ? '😆' : result === '패' ? '😭' : '😐'
  const badgeBackgroundColor =
    result === '승'
      ? 'var(--app-result-win-badge-soft)'
      : result === '패'
        ? 'var(--app-result-loss-badge-soft)'
        : 'var(--app-result-draw-badge-soft)'

  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: badgeBackgroundColor }}
    >
      <span className="text-[24px] leading-none" aria-label={result}>
        {emoji}
      </span>
    </div>
  )
}

function MatchResultLabel({ result }: { result: string }) {
  const label = result === '승' ? '승리' : result === '패' ? '패배' : '무승부'
  const className =
    result === '승'
      ? ''
      : result === '패'
        ? ''
        : 'app-theme-body'

  return (
    <span
      className={`text-sm font-bold ${className}`}
      style={
        result === '승'
          ? { color: 'var(--app-accent-blue)' }
          : result === '패'
            ? { color: 'var(--app-accent-red)' }
            : undefined
      }
    >
      {label}
    </span>
  )
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function rankDescending(value: number, values: number[]) {
  return values.filter((candidate) => candidate > value).length + 1
}

function formatRank(rank: number, total: number) {
  return `${total}명 중 ${rank}위`
}

function buildMatchInsight(
  teams: NonNullable<ReturnType<typeof buildVoltaTeams>>,
  focusPlayer: MatchPlayerInfo = teams.me,
) {
  const isFocusOnOriginalSide = teams.teammates.some((player) => player.ouid === focusPlayer.ouid)
  const perspectiveTeammates = isFocusOnOriginalSide ? teams.teammates : teams.opponents
  const perspectiveOpponents = isFocusOnOriginalSide ? teams.opponents : teams.teammates
  const perspectiveMyScore = isFocusOnOriginalSide ? teams.myScore : teams.opponentScore
  const perspectiveOpponentScore = isFocusOnOriginalSide ? teams.opponentScore : teams.myScore
  const meMetrics = getVoltaPlayerMetrics(focusPlayer)
  const teammateMetrics = perspectiveTeammates.map((player) => ({
    player,
    metrics: getVoltaPlayerMetrics(player),
  }))
  const opponentMetrics = perspectiveOpponents.map((player) => ({
    player,
    metrics: getVoltaPlayerMetrics(player),
  }))
  const otherTeammates = teammateMetrics.filter(({ player }) => player.ouid !== focusPlayer.ouid)

  const teammateGoalValues = teammateMetrics.map(({ metrics }) => metrics.goals)
  const teammateEffectiveShotValues = teammateMetrics.map(({ metrics }) => metrics.effectiveShots)
  const teammateDribbleValues = teammateMetrics.map(({ metrics }) => metrics.dribble)
  const teammateRatingValues = teammateMetrics.map(({ metrics }) => metrics.rating)
  const teamGoalTop = Math.max(...teammateGoalValues, 0)
  const teamEffectiveShotTop = Math.max(...teammateEffectiveShotValues, 0)
  const teamDribbleTop = Math.max(...teammateDribbleValues, 0)
  const opponentGoalTop = Math.max(...opponentMetrics.map(({ metrics }) => metrics.goals), 0)
  const opponentRatingTop = Math.max(...opponentMetrics.map(({ metrics }) => metrics.rating), 0)
  const opponentShotTop = Math.max(...opponentMetrics.map(({ metrics }) => metrics.shots), 0)
  const opponentDribbleTop = Math.max(...opponentMetrics.map(({ metrics }) => metrics.dribble), 0)
  const teammateAvgPassRate = average(
    otherTeammates
      .map(({ metrics }) => metrics.passRate)
      .filter((value): value is number => value !== null),
  )
  const teammateAvgRating = average(otherTeammates.map(({ metrics }) => metrics.rating))
  const teammateAvgDribble = average(otherTeammates.map(({ metrics }) => metrics.dribble))
  const teammateAvgShots = average(otherTeammates.map(({ metrics }) => metrics.shots))

  const teammateCount = teammateMetrics.length
  const goalRank = rankDescending(meMetrics.goals, teammateGoalValues)
  const effectiveShotRank = rankDescending(meMetrics.effectiveShots, teammateEffectiveShotValues)
  const dribbleRank = rankDescending(meMetrics.dribble, teammateDribbleValues)
  const ratingRank = rankDescending(meMetrics.rating, teammateRatingValues)
  const goalShare = perspectiveMyScore > 0 ? meMetrics.goals / perspectiveMyScore : 0
  const shotConversion =
    meMetrics.shots > 0 ? Math.round((meMetrics.goals / meMetrics.shots) * 100) : 0
  const effectiveShotRate =
    meMetrics.shots > 0 ? Math.round((meMetrics.effectiveShots / meMetrics.shots) * 100) : null
  const passVolumeShare =
    perspectiveTeammates.length > 0
      ? meMetrics.passTry / Math.max(1, average(teammateMetrics.map(({ metrics }) => metrics.passTry)))
      : 0
  const observations: Array<{ score: number; tone: 'good' | 'bad' | 'neutral'; text: string }> = []
  const seen = new Set<string>()

  const addObservation = (score: number, tone: 'good' | 'bad' | 'neutral', text: string) => {
    if (seen.has(text)) return
    seen.add(text)
    observations.push({ score, tone, text })
  }

  const isWin = perspectiveMyScore > perspectiveOpponentScore
  const isLoss = perspectiveMyScore < perspectiveOpponentScore
  const isHighScoring = perspectiveMyScore + perspectiveOpponentScore >= 5
  const isLowScoring = perspectiveMyScore + perspectiveOpponentScore <= 2
  const tackleCount = meMetrics.tackleSuccess ?? 0
  const blockCount = meMetrics.blockSuccess ?? 0
  const passAttempts = meMetrics.passTry ?? 0
  const effectiveShots = meMetrics.effectiveShots ?? 0

  if (meMetrics.goals > 0) {
    if (goalShare >= 0.5) {
      addObservation(
        99,
        'good',
        `${formatMetricNumber(meMetrics.goals)}골로 팀 득점의 ${Math.round(goalShare * 100)}%를 책임졌습니다. 마무리 비중이 절대적이었고, 이런 경기에선 같은 위치를 계속 밟기보다 주변 지원을 더 받아 슈팅 수까지 늘리면 영향력이 더 커질 수 있습니다.`,
      )
    } else if (meMetrics.goals === teamGoalTop) {
      addObservation(
        93,
        'good',
        `${formatMetricNumber(meMetrics.goals)}골로 팀 내 득점 ${formatRank(goalRank, teammateCount)}였습니다. 결정적인 장면을 살린 건 분명 강점이고, 다음 단계는 골 장면 외 빌드업 관여까지 넓혀 존재감을 경기 전체로 확장하는 것입니다.`,
      )
    } else {
      addObservation(
        78,
        'good',
        `${formatMetricNumber(meMetrics.goals)}골로 공격 포인트는 만들었습니다. 다만 득점 비중이 압도적이진 않아, 마무리 이후의 연계나 세컨드 액션까지 같이 만들면 더 높은 평가로 이어질 수 있습니다.`,
      )
    }
  } else if (meMetrics.shots >= 4) {
    addObservation(
      96,
      'bad',
      `슈팅 ${formatMetricNumber(meMetrics.shots)}회로 시도량은 충분했지만 무득점이었습니다. 공격 위치 선정은 나쁘지 않았다는 뜻이라, 마무리 각도와 첫 터치 안정감만 보완돼도 결과가 크게 달라질 경기였습니다.`,
    )
  } else if (meMetrics.shots <= 1 && passAttempts <= 5) {
    addObservation(
      90,
      'bad',
      `슈팅 ${formatMetricNumber(meMetrics.shots)}회, 패스 시도 ${formatMetricNumber(passAttempts)}회에 그쳐 공격 흐름에 깊게 개입하지 못했습니다. 다음 경기에서는 최소한 볼을 받는 위치를 한 줄 더 앞으로 잡을 필요가 있습니다.`,
    )
  }

  if (effectiveShotRate !== null && meMetrics.shots >= 3) {
    if (effectiveShotRate >= 70 && meMetrics.effectiveShots === teamEffectiveShotTop) {
      addObservation(
        87,
        'good',
        `유효슛 비율이 ${effectiveShotRate}%로 높았고 유효슛 수 역시 팀 내 ${formatRank(effectiveShotRank, teammateCount)}였습니다. 슈팅 질은 좋았고, 같은 빈도만 유지되면 득점 기대값도 계속 올라갈 경기력이었습니다.`,
      )
    } else if (effectiveShotRate <= 35) {
      addObservation(
        88,
        'bad',
        `슈팅 ${formatMetricNumber(meMetrics.shots)}회 중 유효슛이 ${formatMetricNumber(effectiveShots)}회뿐이었습니다. 무리한 각도에서 빠르게 마무리한 장면이 많았을 가능성이 높아, 한 템포 더 끌고 가는 선택이 필요합니다.`,
      )
    }
  }

  if (meMetrics.goals > 0 && meMetrics.shots >= 3) {
    if (shotConversion >= 50) {
      addObservation(
        82,
        'good',
        `슈팅 대비 득점 전환율이 ${shotConversion}%로 높았습니다. 많은 찬스를 요구하지 않고 결과를 냈다는 점이 장점이고, 이런 유형은 동료와의 연계가 붙으면 더 무서워집니다.`,
      )
    } else if (shotConversion <= 25) {
      addObservation(
        79,
        'bad',
        `득점은 있었지만 슈팅 대비 득점 전환율이 ${shotConversion}%에 그쳤습니다. 기록상으론 골 결정력보다 시도 누적에 가까워 보여, 마지막 선택의 정교함은 더 다듬을 여지가 있습니다.`,
      )
    }
  }

  if (meMetrics.passRate !== null && passAttempts >= 8) {
    if (teammateAvgPassRate > 0 && meMetrics.passRate >= teammateAvgPassRate + 8) {
      addObservation(
        81,
        'good',
        `패스 성공률 ${meMetrics.passRate}%로 팀 평균보다 연결 안정감이 높았습니다. 단순 안전 패스만 돌린 게 아니라면 빌드업 밸런서를 맡을 만한 기록이고, 전진 패스 비중만 더 붙으면 가치가 더 커집니다.`,
      )
    } else if (teammateAvgPassRate > 0 && meMetrics.passRate <= teammateAvgPassRate - 8) {
      addObservation(
        85,
        'bad',
        `패스 성공률 ${meMetrics.passRate}%는 팀 평균보다 확실히 낮았습니다. 볼을 오래 끌거나 무리한 찔러주기가 많았을 가능성이 있어, 리턴 패스와 방향 전환 패스를 먼저 안정화할 필요가 있습니다.`,
      )
    } else if (meMetrics.passRate < 75) {
      addObservation(
        74,
        'bad',
        `패스 참여도는 있었지만 성공률 ${meMetrics.passRate}%로 전개 완성도는 아쉬웠습니다. 같은 터치 수라도 한 번에 풀어가려 하기보다 짧게 끊어 주는 선택이 더 효율적이었을 경기입니다.`,
      )
    } else if (passAttempts >= 14 && passVolumeShare >= 1.3) {
      addObservation(
        72,
        'good',
        `패스 시도 ${formatMetricNumber(passAttempts)}회로 팀 평균보다 공을 더 많이 받았습니다. 전개 중심축 역할은 해냈고, 다음 단계는 그 점유를 공격 포인트로 연결하는 것입니다.`,
      )
    }
  } else if (passAttempts <= 4 && meMetrics.goals === 0 && meMetrics.dribble <= 1) {
    addObservation(
      82,
      'bad',
      `패스 관여와 전진 시도가 모두 적어 경기 흐름 안으로 충분히 들어오지 못했습니다. 오프더볼 움직임으로 패스 각을 먼저 만드는 접근이 필요해 보입니다.`,
    )
  }

  if (meMetrics.dribble >= Math.max(4, teammateAvgDribble + 2) && meMetrics.dribble === teamDribbleTop) {
    addObservation(
      75,
      'good',
      `드리블 ${formatMetricNumber(meMetrics.dribble)}회로 팀 내 ${formatRank(dribbleRank, teammateCount)}였습니다. 직접 전진해 공간을 여는 역할은 분명했고, 마지막 패스나 슈팅까지 이어졌다면 평가가 더 높아질 수 있었습니다.`,
    )
  } else if (meMetrics.dribble <= 1 && meMetrics.shots <= teammateAvgShots) {
    addObservation(
      71,
      'bad',
      `드리블 돌파와 직접 전진 시도가 적어 스스로 장면을 만드는 힘은 약했습니다. 볼을 받을 때 등을 지는 플레이보다 전방을 보고 받는 장면을 늘릴 필요가 있습니다.`,
    )
  }

  if (tackleCount >= 3) {
    addObservation(
      meMetrics.tackleRate !== null && meMetrics.tackleRate >= 55 ? 73 : 68,
      meMetrics.tackleRate !== null && meMetrics.tackleRate >= 55 ? 'good' : 'neutral',
      `태클 성공 ${formatMetricNumber(tackleCount)}회로 수비 경합 참여는 꾸준했습니다. 경합 빈도 자체는 장점이라, 압박 타이밍만 더 정리되면 수비 영향력을 한 단계 더 끌어올릴 수 있습니다.`,
    )
  } else if (meMetrics.tackleTry !== null && meMetrics.tackleTry > 0 && tackleCount === 0) {
    addObservation(
      76,
      'bad',
      `태클 시도는 있었지만 성공 기록이 남지 않았습니다. 수비 반응이 늦었다기보다 들어가는 각도가 좋지 않았을 가능성이 커, 정면 경합보다 커버 위치 조정이 우선입니다.`,
    )
  }

  if (meMetrics.blockRate !== null && meMetrics.blockTry >= 2) {
    if (meMetrics.blockRate >= 60) {
      addObservation(
        70,
        'good',
        `차단 성공률 ${formatPercent(meMetrics.blockRate)}로 상대 전개를 끊는 장면이 있었습니다. 적극적인 수비 개입이 보였고, 이후 세컨드볼 처리까지 붙으면 더 완성도 높은 수비가 됩니다.`,
      )
    } else if (meMetrics.blockRate <= 35) {
      addObservation(
        72,
        'bad',
        `차단 성공률 ${formatPercent(meMetrics.blockRate)}로 압박은 들어갔지만 실제 차단으로 이어지는 비율이 낮았습니다. 달려들기보다 패스길 예측을 먼저 가져가는 쪽이 더 효율적일 수 있습니다.`,
      )
    }
  } else if (blockCount >= 2) {
    addObservation(
      64,
      'good',
      `차단 성공 ${formatMetricNumber(blockCount)}회로 상대 패스 흐름을 실제로 끊어냈습니다. 수비 개입 타이밍은 나쁘지 않았고, 이후 볼 처리만 더 안정되면 역습 출발점 역할도 가능합니다.`,
    )
  }

  if (meMetrics.rating >= Math.max(7.5, teammateAvgRating + 0.5)) {
    addObservation(
      84,
      'good',
      `평점 ${formatMetricNumber(meMetrics.rating, 2)}로 팀 내 ${formatRank(ratingRank, teammateCount)}였습니다. 단순 수치가 아니라 경기 전반 존재감이 높았다는 뜻이라, 이 경기에서는 맡은 역할을 확실히 수행했습니다.`,
    )
  } else if (meMetrics.rating > 0 && meMetrics.rating <= Math.max(6.5, teammateAvgRating - 0.5)) {
    addObservation(
      88,
      'bad',
      `평점 ${formatMetricNumber(meMetrics.rating, 2)}로 팀 내 ${formatRank(ratingRank, teammateCount)}에 머물렀습니다. 기록 전반이 평균 이하였다는 뜻이라, 한 가지 강점 지표라도 뚜렷하게 만드는 방향이 필요합니다.`,
    )
  }

  if (isWin && meMetrics.rating >= teammateAvgRating && meMetrics.goals === 0 && passAttempts >= 8) {
    addObservation(
      67,
      'good',
      `득점 기록이 없어도 승리 경기에서 평균 이상 평점을 받았습니다. 마무리보다 연결과 운영 기여가 있었던 유형으로 볼 수 있어, 이런 경기는 보조 역할 완성도가 장점입니다.`,
    )
  }

  if (isLoss && meMetrics.goals > 0 && perspectiveOpponentScore - perspectiveMyScore >= 2) {
    addObservation(
      77,
      'neutral',
      `팀은 패했지만 득점 기록은 남겼습니다. 개인 마무리는 있었으나 경기 전체 흐름을 뒤집을 만큼 연결되진 못한 경기였고, 수비 전환이나 볼 소유 단계 기여가 더 필요했습니다.`,
    )
  }

  if (isHighScoring && meMetrics.goals === 0 && meMetrics.shots <= 1) {
    addObservation(
      83,
      'bad',
      `득점이 많이 나온 경기 흐름이었는데 공격 관여는 낮았습니다. 팀이 찬스를 만들던 날에 개인 기록이 비어 있다는 점은 아쉬워, 박스 근처 진입 타이밍을 더 공격적으로 가져갈 필요가 있습니다.`,
    )
  }

  if (isLowScoring && meMetrics.passRate !== null && meMetrics.passRate >= 85 && meMetrics.goals === 0) {
    addObservation(
      63,
      'neutral',
      `저득점 경기에서 패스 성공률 ${meMetrics.passRate}%로 실수는 적었습니다. 다만 안정감이 공격 압박으로 연결되진 않아, 다음에는 전진 패스 한두 번을 더 과감하게 시도해볼 만합니다.`,
    )
  }

  if (opponentGoalTop >= 2 && meMetrics.goals === 0) {
    addObservation(
      80,
      'bad',
      `상대 쪽에서는 다득점 선수가 나왔는데 이쪽은 공격 포인트가 없었습니다. 맞대응 카드가 되지 못한 경기라, 최소 슈팅 수부터 늘리는 방향이 우선입니다.`,
    )
  }

  if (opponentShotTop >= 4 && meMetrics.shots <= 1) {
    addObservation(
      69,
      'bad',
      `상대 핵심 자원은 슈팅을 계속 만들었는데 이쪽은 시도 자체가 적었습니다. 기록상 가장 큰 차이는 마무리보다 '장면 진입 횟수'였습니다.`,
    )
  }

  if (opponentDribbleTop >= 4 && meMetrics.dribble <= 1) {
    addObservation(
      64,
      'bad',
      `상대는 드리블로 경기 흐름을 흔들었지만 이쪽은 볼 운반이 거의 없었습니다. 압박을 받더라도 첫 터치 이후 전진 선택지를 더 만들어야 합니다.`,
    )
  }

  if (
    perspectiveOpponentScore >= 3 &&
    meMetrics.goals === 0 &&
    meMetrics.rating <= opponentRatingTop - 1
  ) {
    addObservation(
      83,
      'bad',
      `상대 핵심 자원들에 비해 존재감이 밀렸습니다. 다실점 경기에서 개인 영향력까지 낮으면 체감보다 기록 평가는 더 박해질 수밖에 없습니다.`,
    )
  }

  if (meMetrics.yellowCards > 0 || meMetrics.redCards > 0) {
    addObservation(
      78,
      'bad',
      '카드 관리는 분명한 감점 요소였습니다. 수비 기여를 하더라도 위험한 반칙이 섞이면 전체 평가는 바로 깎이기 때문에, 압박 타이밍 조절이 필요합니다.',
    )
  } else if (meMetrics.fouls >= 3) {
    addObservation(
      68,
      'bad',
      `파울 ${formatMetricNumber(meMetrics.fouls)}회로 수비 타이밍이 거칠었습니다. 적극성은 있었지만 불필요한 끊김이 많아, 몸을 먼저 붙이기보다 공간을 먼저 막는 선택이 더 나았을 경기입니다.`,
    )
  }

  if (meMetrics.goals === 0 && meMetrics.shots === 0 && passAttempts <= 3 && meMetrics.rating <= 6.5) {
    addObservation(
      95,
      'bad',
      '득점, 슈팅, 패스 관여가 모두 낮았습니다. 기록상으로는 경기 흐름에 실질적인 흔적을 거의 남기지 못한 편이고, 다음 경기에서는 한 가지 역할이라도 분명히 가져가는 게 중요합니다.',
    )
  }

  if (
    meMetrics.goals === 0 &&
    meMetrics.shots >= 2 &&
    meMetrics.passRate !== null &&
    meMetrics.passRate >= 80 &&
    meMetrics.rating >= 7
  ) {
    addObservation(
      66,
      'neutral',
      `공격 포인트는 없었지만 슈팅과 패스 지표는 일정 수준 이상이었습니다. 기록만 보면 '조금만 더 정교했으면 좋은 경기'에 가까워, 세부 마무리나 마지막 선택이 성과를 가른 경우로 보입니다.`,
    )
  }

  observations.sort((a, b) => b.score - a.score)

  const picked = observations.slice(0, 10).map((entry) => entry.text)
  if (picked.length > 0) {
    return picked
  }

  return ['기록 대부분이 팀 평균 부근에 모여 있어 눈에 띄는 장점과 약점이 크게 갈리진 않았습니다. 이런 경기는 한 가지 역할이라도 더 선명하게 만드는 쪽이 다음 평가를 바꿉니다.']
}

function buildOfficialMatchInsight(teams: NonNullable<ReturnType<typeof buildOfficialTeams>>) {
  const meMetrics = getOfficialPlayerMetrics(teams.me)
  const opponentMetrics = getOfficialPlayerMetrics(teams.opponent)
  const lines: string[] = []

  if (teams.myScore > teams.opponentScore) {
    if (meMetrics.effectiveShots > opponentMetrics.effectiveShots) {
      lines.push(
        `유효슛 ${formatMetricNumber(meMetrics.effectiveShots)}대${formatMetricNumber(opponentMetrics.effectiveShots)}로 마무리 질에서 앞섰고, 그 차이가 승리로 연결됐습니다.`,
      )
    } else {
      lines.push(
        `스코어는 ${teams.myScore}:${teams.opponentScore} 승리였고, 적은 찬스에서도 마무리를 살린 경기였습니다.`,
      )
    }
  } else if (teams.myScore < teams.opponentScore) {
    if (meMetrics.shots < opponentMetrics.shots) {
      lines.push(
        `슈팅 수가 ${formatMetricNumber(meMetrics.shots)}대${formatMetricNumber(opponentMetrics.shots)}로 밀려 공격 장면을 덜 만들었습니다. 이번 경기는 진입 횟수 자체가 아쉬웠습니다.`,
      )
    } else {
      lines.push(
        `기회 수는 크게 밀리지 않았지만 ${teams.myScore}:${teams.opponentScore}로 패했습니다. 마지막 결정 장면의 정교함이 결과를 갈랐습니다.`,
      )
    }
  } else {
    lines.push(
      `무승부 경기였고, 점수 차이는 없었지만 유효슛과 패스 완성도 같은 세부 지표에서 다음 승부 포인트가 보이는 경기였습니다.`,
    )
  }

  const possessionGap = meMetrics.possession - opponentMetrics.possession
  if (Math.abs(possessionGap) >= 8) {
    lines.push(
      possessionGap > 0
        ? `점유율 ${formatMetricNumber(meMetrics.possession)}%로 볼 소유는 더 길게 가져갔습니다. 다만 점유 우위를 유효슛으로 더 강하게 연결하면 체감이 더 좋아질 흐름입니다.`
        : `점유율이 ${formatMetricNumber(opponentMetrics.possession)}%까지 넘어가며 흐름을 상대에게 내준 시간대가 길었습니다. 빌드업 첫 패스 안정화가 우선 포인트입니다.`,
    )
  }

  if (meMetrics.passRate != null && opponentMetrics.passRate != null) {
    const passGap = meMetrics.passRate - opponentMetrics.passRate
    if (passGap >= 6) {
      lines.push(
        `패스 성공률은 ${formatPercent(meMetrics.passRate)}로 상대보다 안정적이었습니다. 전개 안정감은 좋았고, 박스 앞 선택만 더 날카로우면 같은 패턴이 더 큰 위협이 됩니다.`,
      )
    } else if (passGap <= -6) {
      lines.push(
        `패스 성공률이 ${formatPercent(meMetrics.passRate)}로 상대보다 낮았습니다. 이번 경기는 빠르게 풀려는 선택보다 한 템포 더 정리하는 운영이 더 유효했을 가능성이 큽니다.`,
      )
    }
  }

  const defensivePlays = (meMetrics.tackleSuccess ?? 0) + (meMetrics.blockSuccess ?? 0)
  if (defensivePlays >= 4) {
    lines.push(
      `태클/차단 성공이 합계 ${formatMetricNumber(defensivePlays)}회로 수비 개입은 꾸준했습니다. 압박 타이밍은 나쁘지 않았고, 탈취 직후 전개만 더 붙으면 역습 효율도 올라갑니다.`,
    )
  }

  return lines.slice(0, 3)
}

function formatOfficialTeamColors(teamColors: string[] | null | undefined) {
  if (!teamColors || teamColors.length === 0) {
    return '-'
  }

  return teamColors.slice(0, 3).join(' · ')
}

function getOfficialDisplayFields(candidate: MatchSearchCandidate | null) {
  return {
    rank: candidate?.officialRank ?? candidate?.rank ?? null,
    rankPoint: candidate?.officialRankPoint ?? candidate?.elo ?? null,
    rankLabel: candidate?.officialRankLabel ?? candidate?.rankLabel ?? null,
    rankIconUrl: candidate?.officialRankIconUrl ?? candidate?.rankIconUrl ?? null,
    winRate: candidate?.officialWinRate ?? candidate?.winRate ?? null,
    wins: candidate?.officialWins ?? candidate?.wins ?? null,
    draws: candidate?.officialDraws ?? candidate?.draws ?? null,
    losses: candidate?.officialLosses ?? candidate?.losses ?? null,
    formation: candidate?.officialFormation ?? candidate?.formation ?? null,
    teamColors:
      candidate?.officialTeamColors && candidate.officialTeamColors.length > 0
        ? candidate.officialTeamColors
        : candidate?.teamColors ?? [],
  }
}

function formatMatchRecordLine(wins: number | null, draws: number | null, losses: number | null) {
  if (wins == null || draws == null || losses == null) {
    return '-'
  }

  return `${wins}승 ${draws}무 ${losses}패`
}

function OfficialComparisonRow({
  label,
  myValue,
  opponentValue,
  myAccent = false,
  opponentAccent = false,
}: {
  label: string
  myValue: string
  opponentValue: string
  myAccent?: boolean
  opponentAccent?: boolean
}) {
  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 rounded-lg px-3 py-2.5"
      style={{ backgroundColor: 'var(--app-analysis-soft-bg)' }}
    >
      <p
        className="text-left text-sm font-semibold"
        style={{ color: myAccent ? 'var(--app-accent-blue)' : 'var(--app-title)' }}
      >
        {myValue}
      </p>
      <p className="app-theme-muted text-[11px] font-medium whitespace-nowrap">{label}</p>
      <p
        className="text-right text-sm font-semibold"
        style={{ color: opponentAccent ? 'var(--app-accent-red)' : 'var(--app-title)' }}
      >
        {opponentValue}
      </p>
    </div>
  )
}

function MatchRecordCard({
  match,
  teams,
  shareNickname,
  searchMode,
  shouldExpand,
  onExpandedChange,
}: {
  match: MatchData
  teams: NonNullable<ReturnType<typeof buildVoltaTeams>>
  shareNickname: string
  searchMode: SearchMode
  shouldExpand: boolean
  onExpandedChange: (matchId: string | null) => void
}) {
  const cardRef = useRef<HTMLElement | null>(null)
  const [selectedPlayerOuid, setSelectedPlayerOuid] = useState(teams.me.ouid)
  const [isExpandedInternal, setIsExpandedInternal] = useState(false)
  const expanded = shouldExpand || isExpandedInternal
  const result = teams.me.matchDetail.matchResult
  const scorelineLabel = `${teams.myScore} : ${teams.opponentScore}`
  const cardTintColor =
    result === '승'
      ? 'var(--app-result-win-soft)'
      : result === '패'
        ? 'var(--app-result-loss-soft)'
        : 'var(--app-result-draw-soft)'
  const viewButtonColor =
    result === '패' ? '#ef6b76' : result === '무' ? '#7a8793' : '#5e8fe8'
  const myPlayers = teams.teammates
  const opponentPlayers = teams.opponents
  const allPlayers = [...myPlayers, ...opponentPlayers].filter(
    (player, index, array) => array.findIndex((candidate) => candidate.ouid === player.ouid) === index,
  )
  const selectedPlayer = allPlayers.find((player) => player.ouid === selectedPlayerOuid) ?? teams.me
  const selectedMetrics = getVoltaPlayerMetrics(selectedPlayer)
  const isMyPlayer = selectedPlayer.ouid === teams.me.ouid
  const selectedSideLabel = isMyPlayer ? (teams.isDraw ? '참가자' : '내팀') : '상대팀'
  const selectedRatingValue = formatMetricNumber(selectedMetrics.rating, 2)
  const matchInsight = buildMatchInsight(teams, selectedPlayer)
  const selectedCardSummary = formatPlayerCardSummary(selectedPlayer)

  useEffect(() => {
    if (shouldExpand) {
      const timeoutId = window.setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
      return () => window.clearTimeout(timeoutId)
    }
  }, [shouldExpand])

  const handleShare = async (type: 'x' | 'copy') => {
    if (typeof window === 'undefined') return

    const relativeUrl = buildMatchesUrl(shareNickname, match.matchId, searchMode)
    const shareUrl = relativeUrl ? new URL(relativeUrl, window.location.origin).toString() : window.location.href
    const shareText = `${selectedPlayer.nickname} 경기 분석 ${scorelineLabel}`

    if (type === 'copy') {
      try {
        await navigator.clipboard.writeText(shareUrl)
        window.alert('링크가 복사되었습니다.')
      } catch {
        window.alert('링크 복사에 실패했습니다.')
      }
      return
    }

    const xIntentUrl = new URL('https://twitter.com/intent/tweet')
    xIntentUrl.searchParams.set('text', shareText)
    xIntentUrl.searchParams.set('url', shareUrl)
    window.open(xIntentUrl.toString(), '_blank', 'noopener,noreferrer')
  }

  return (
    <article
      ref={cardRef}
      className="rounded-lg px-4 py-4"
      style={{ backgroundColor: cardTintColor }}
      onClick={() => {
        const nextExpanded = !expanded
        setIsExpandedInternal(nextExpanded)
        onExpandedChange(nextExpanded ? match.matchId : null)
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <MatchResultBadge result={result} />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <MatchResultLabel result={result} />
              <MutedDivider />
              <span className="app-theme-body text-sm font-semibold">
                볼타 공식 경기
              </span>
            </div>
            <div className="app-theme-body mt-1 flex flex-wrap items-center gap-1.5 text-sm">
              <span className="app-theme-title font-semibold">{scorelineLabel}</span>
              <MutedDivider />
              <span>{formatDate(match.matchDate)}</span>
            </div>
          </div>
        </div>

        <div className="flex h-11 shrink-0 items-center">
          {!expanded ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setIsExpandedInternal(true)
                onExpandedChange(match.matchId)
              }}
              className="inline-flex h-7 items-center justify-center rounded-[8px] px-3 text-[12px] font-semibold leading-none whitespace-nowrap text-white"
              style={{ backgroundColor: viewButtonColor }}
            >
              <span>분석</span>
            </button>
          ) : null}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3" onClick={(event) => event.stopPropagation()}>
          <div className="app-theme-card rounded-lg px-4 py-4">
            <div className="space-y-4">
              <div>
                <p className="app-theme-title text-sm font-semibold">
                  {teams.isDraw ? '참가자' : '내팀'}
                </p>
                <div className="mt-2 flex flex-wrap items-start gap-2">
                  {myPlayers.map((player) => (
                    <MatchPlayerSelectorButton
                      key={player.ouid}
                      player={player}
                      active={player.ouid === selectedPlayer.ouid}
                      onClick={() => setSelectedPlayerOuid(player.ouid)}
                    />
                  ))}
                </div>
              </div>

              {!teams.isDraw && opponentPlayers.length > 0 && (
                <div>
                  <p className="app-theme-title text-sm font-semibold">상대팀</p>
                  <div className="mt-2 flex flex-wrap items-start gap-2">
                    {opponentPlayers.map((player) => (
                      <MatchPlayerSelectorButton
                        key={player.ouid}
                        player={player}
                        active={player.ouid === selectedPlayer.ouid}
                        onClick={() => setSelectedPlayerOuid(player.ouid)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="app-theme-card rounded-lg px-4 py-4">
            <div className="flex min-h-[44px] flex-wrap items-center justify-between gap-2">
              <div>
                <MatchSectionLabel>{selectedSideLabel}</MatchSectionLabel>
                <p className="app-theme-title mt-1 text-sm font-semibold">{selectedPlayer.nickname}</p>
              </div>
              <div
                className="inline-flex min-h-10 items-center rounded-lg px-3 py-2 text-right"
                style={{ backgroundColor: 'var(--app-analysis-soft-alt-bg)' }}
              >
                <p className="app-theme-title text-sm leading-[1.2] font-semibold">
                  {getControllerDisplay(selectedMetrics.controller)}
                </p>
              </div>
            </div>
          </div>

          <div className="app-theme-card rounded-lg px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="app-theme-muted text-[11px]">사용 카드</p>
                <p className="app-theme-title mt-1 break-words text-sm font-semibold">
                  {selectedCardSummary ?? '정보 없음'}
                </p>
              </div>
              {selectedPlayer.spId ? (
                <div
                  className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg"
                  style={{ backgroundColor: 'var(--app-analysis-soft-alt-bg)' }}
                >
                  <PlayerImage
                    spid={selectedPlayer.spId}
                    alt={selectedCardSummary ?? selectedPlayer.nickname}
                    className="object-contain"
                    sizes="56px"
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MatchMetricCard
              label="득점"
              value={formatMetricNumber(selectedMetrics.goals)}
              accent={isMyPlayer ? 'blue' : 'red'}
            />
            <MatchMetricCard
              label="유효슛 / 슛"
              value={`${formatMetricNumber(selectedMetrics.effectiveShots)} / ${formatMetricNumber(selectedMetrics.shots)}`}
            />
            <MatchMetricCard
              label="패스 성공률"
              value={formatRateWithFraction(
                selectedMetrics.passRate,
                selectedMetrics.passSuccess,
                selectedMetrics.passTry,
              )}
              accent="green"
            />
            <MatchMetricCard
              label="차단 성공률"
              value={formatRateWithFraction(
                selectedMetrics.blockRate,
                selectedMetrics.blockSuccess,
                selectedMetrics.blockTry,
              )}
            />
            <MatchMetricCard label="드리블" value={formatMetricNumber(selectedMetrics.dribble)} />
            <MatchMetricCard label="평점" value={selectedRatingValue} />
          </div>

          <div className="app-theme-card rounded-lg px-4 py-4">
            <p className="app-theme-title text-sm font-semibold">경기 분석</p>
            <div className="mt-2 space-y-1">
              {matchInsight.map((line, index) => (
                <p key={`${match.matchId}-insight-${index}`} className="app-theme-body text-sm leading-5">
                  {line}
                </p>
              ))}
            </div>
          </div>

          <div className="app-theme-card rounded-lg px-4 py-4">
            <p className="app-theme-title text-sm font-semibold">상세 분석 공유하기</p>
            <div className="mt-2.5 flex items-center gap-2">
              {SHARE_CHANNELS.map((channel) => {
                const Icon = channel.icon
                return (
                  <button
                    key={`${match.matchId}-${channel.label}`}
                    type="button"
                    aria-label={`${channel.label} 공유`}
                    onClick={() => void handleShare(channel.key)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border transition"
                    style={{
                      backgroundColor: 'transparent',
                      borderColor: 'var(--app-input-border)',
                      color: 'var(--app-title)',
                    }}
                  >
                    <Icon size={20} weight="bold" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

function OfficialMatchRecordCard({
  match,
  teams,
  shareNickname,
  searchMode,
  shouldExpand,
  onExpandedChange,
}: {
  match: MatchData
  teams: NonNullable<ReturnType<typeof buildOfficialTeams>>
  shareNickname: string
  searchMode: SearchMode
  shouldExpand: boolean
  onExpandedChange: (matchId: string | null) => void
}) {
  const cardRef = useRef<HTMLElement | null>(null)
  const [isExpandedInternal, setIsExpandedInternal] = useState(false)
  const expanded = shouldExpand || isExpandedInternal
  const result = teams.me.matchDetail.matchResult
  const scorelineLabel = `${teams.myScore} : ${teams.opponentScore}`
  const cardTintColor =
    result === '승'
      ? 'var(--app-result-win-soft)'
      : result === '패'
        ? 'var(--app-result-loss-soft)'
        : 'var(--app-result-draw-soft)'
  const viewButtonColor =
    result === '패' ? '#ef6b76' : result === '무' ? '#7a8793' : '#5e8fe8'
  const meMetrics = getOfficialPlayerMetrics(teams.me)
  const opponentMetrics = getOfficialPlayerMetrics(teams.opponent)
  const matchInsight = buildOfficialMatchInsight(teams)

  useEffect(() => {
    if (shouldExpand) {
      const timeoutId = window.setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
      return () => window.clearTimeout(timeoutId)
    }
  }, [shouldExpand])

  const handleShare = async (type: 'x' | 'copy') => {
    if (typeof window === 'undefined') return

    const relativeUrl = buildMatchesUrl(shareNickname, match.matchId, searchMode)
    const shareUrl = relativeUrl ? new URL(relativeUrl, window.location.origin).toString() : window.location.href
    const shareText = `${teams.me.nickname} 공식경기 분석 ${scorelineLabel}`

    if (type === 'copy') {
      try {
        await navigator.clipboard.writeText(shareUrl)
        window.alert('링크가 복사되었습니다.')
      } catch {
        window.alert('링크 복사에 실패했습니다.')
      }
      return
    }

    const xIntentUrl = new URL('https://twitter.com/intent/tweet')
    xIntentUrl.searchParams.set('text', shareText)
    xIntentUrl.searchParams.set('url', shareUrl)
    window.open(xIntentUrl.toString(), '_blank', 'noopener,noreferrer')
  }

  return (
    <article
      ref={cardRef}
      className="rounded-lg px-4 py-4"
      style={{ backgroundColor: cardTintColor }}
      onClick={() => {
        const nextExpanded = !expanded
        setIsExpandedInternal(nextExpanded)
        onExpandedChange(nextExpanded ? match.matchId : null)
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <MatchResultBadge result={result} />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <MatchResultLabel result={result} />
              <MutedDivider />
              <span className="app-theme-body text-sm font-semibold">1:1 공식경기</span>
            </div>
            <div className="app-theme-body mt-1 flex flex-wrap items-center gap-1.5 text-sm">
              <span className="app-theme-title font-semibold">{scorelineLabel}</span>
              <MutedDivider />
              <span>{formatDate(match.matchDate)}</span>
            </div>
            <div className="app-theme-muted mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span>점유율 {formatMetricNumber(meMetrics.possession)}%</span>
              <MutedDivider />
              <span>슛 {formatMetricNumber(meMetrics.shots)}</span>
              <MutedDivider />
              <span>유효슛 {formatMetricNumber(meMetrics.effectiveShots)}</span>
            </div>
          </div>
        </div>

        <div className="flex h-11 shrink-0 items-center">
          {!expanded ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setIsExpandedInternal(true)
                onExpandedChange(match.matchId)
              }}
              className="inline-flex h-7 items-center justify-center rounded-[8px] px-3 text-[12px] font-semibold leading-none whitespace-nowrap text-white"
              style={{ backgroundColor: viewButtonColor }}
            >
              <span>상세</span>
            </button>
          ) : null}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3" onClick={(event) => event.stopPropagation()}>
          <div className="app-theme-card rounded-lg px-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded-lg px-4 py-3"
                style={{ backgroundColor: 'var(--app-analysis-soft-alt-bg)' }}
              >
                <p className="app-theme-muted text-[11px]">내 구단주</p>
                <p className="app-theme-title mt-1 truncate text-sm font-semibold">{teams.me.nickname}</p>
                <p className="app-theme-body mt-1 text-xs">{getControllerDisplay(meMetrics.controller)}</p>
              </div>
              <div
                className="rounded-lg px-4 py-3 text-right"
                style={{ backgroundColor: 'var(--app-analysis-soft-alt-bg)' }}
              >
                <p className="app-theme-muted text-[11px]">상대 구단주</p>
                <p className="app-theme-title mt-1 truncate text-sm font-semibold">{teams.opponent.nickname}</p>
                <p className="app-theme-body mt-1 text-xs">{getControllerDisplay(opponentMetrics.controller)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MatchMetricCard label="득점" value={formatMetricNumber(meMetrics.goals)} accent="blue" />
            <MatchMetricCard
              label="유효슛 / 슛"
              value={`${formatMetricNumber(meMetrics.effectiveShots)} / ${formatMetricNumber(meMetrics.shots)}`}
            />
            <MatchMetricCard
              label="패스 성공률"
              value={meMetrics.passRate != null ? formatPercent(meMetrics.passRate) : '-'}
              accent="green"
            />
            <MatchMetricCard label="평점" value={formatMetricNumber(meMetrics.rating, 2)} />
          </div>

          <div className="app-theme-card rounded-lg px-4 py-4">
            <p className="app-theme-title text-sm font-semibold">경기 지표 비교</p>
            <div className="mt-3 space-y-2">
              <OfficialComparisonRow
                label="점유율"
                myValue={`${formatMetricNumber(meMetrics.possession)}%`}
                opponentValue={`${formatMetricNumber(opponentMetrics.possession)}%`}
                myAccent={meMetrics.possession > opponentMetrics.possession}
                opponentAccent={opponentMetrics.possession > meMetrics.possession}
              />
              <OfficialComparisonRow
                label="슈팅"
                myValue={formatMetricNumber(meMetrics.shots)}
                opponentValue={formatMetricNumber(opponentMetrics.shots)}
                myAccent={meMetrics.shots > opponentMetrics.shots}
                opponentAccent={opponentMetrics.shots > meMetrics.shots}
              />
              <OfficialComparisonRow
                label="유효슛"
                myValue={formatMetricNumber(meMetrics.effectiveShots)}
                opponentValue={formatMetricNumber(opponentMetrics.effectiveShots)}
                myAccent={meMetrics.effectiveShots > opponentMetrics.effectiveShots}
                opponentAccent={opponentMetrics.effectiveShots > meMetrics.effectiveShots}
              />
              <OfficialComparisonRow
                label="패스 성공률"
                myValue={meMetrics.passRate != null ? formatPercent(meMetrics.passRate) : '-'}
                opponentValue={opponentMetrics.passRate != null ? formatPercent(opponentMetrics.passRate) : '-'}
                myAccent={(meMetrics.passRate ?? -1) > (opponentMetrics.passRate ?? -1)}
                opponentAccent={(opponentMetrics.passRate ?? -1) > (meMetrics.passRate ?? -1)}
              />
              <OfficialComparisonRow
                label="태클 성공률"
                myValue={meMetrics.tackleRate != null ? formatPercent(meMetrics.tackleRate) : '-'}
                opponentValue={opponentMetrics.tackleRate != null ? formatPercent(opponentMetrics.tackleRate) : '-'}
                myAccent={(meMetrics.tackleRate ?? -1) > (opponentMetrics.tackleRate ?? -1)}
                opponentAccent={(opponentMetrics.tackleRate ?? -1) > (meMetrics.tackleRate ?? -1)}
              />
              <OfficialComparisonRow
                label="차단 성공률"
                myValue={meMetrics.blockRate != null ? formatPercent(meMetrics.blockRate) : '-'}
                opponentValue={opponentMetrics.blockRate != null ? formatPercent(opponentMetrics.blockRate) : '-'}
                myAccent={(meMetrics.blockRate ?? -1) > (opponentMetrics.blockRate ?? -1)}
                opponentAccent={(opponentMetrics.blockRate ?? -1) > (meMetrics.blockRate ?? -1)}
              />
              <OfficialComparisonRow
                label="파울"
                myValue={formatMetricNumber(meMetrics.fouls)}
                opponentValue={formatMetricNumber(opponentMetrics.fouls)}
              />
              <OfficialComparisonRow
                label="코너킥"
                myValue={formatMetricNumber(meMetrics.corners)}
                opponentValue={formatMetricNumber(opponentMetrics.corners)}
                myAccent={meMetrics.corners > opponentMetrics.corners}
                opponentAccent={opponentMetrics.corners > meMetrics.corners}
              />
            </div>
          </div>

          <div className="app-theme-card rounded-lg px-4 py-4">
            <p className="app-theme-title text-sm font-semibold">경기 분석</p>
            <div className="mt-2 space-y-1">
              {matchInsight.map((line, index) => (
                <p key={`${match.matchId}-official-insight-${index}`} className="app-theme-body text-sm leading-5">
                  {line}
                </p>
              ))}
            </div>
          </div>

          <div className="app-theme-card rounded-lg px-4 py-4">
            <p className="app-theme-title text-sm font-semibold">상세 분석 공유하기</p>
            <div className="mt-2.5 flex items-center gap-2">
              {SHARE_CHANNELS.map((channel) => {
                const Icon = channel.icon
                return (
                  <button
                    key={`${match.matchId}-${channel.label}`}
                    type="button"
                    aria-label={`${channel.label} 공유`}
                    onClick={() => void handleShare(channel.key)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border transition"
                    style={{
                      backgroundColor: 'transparent',
                      borderColor: 'var(--app-input-border)',
                      color: 'var(--app-title)',
                    }}
                  >
                    <Icon size={20} weight="bold" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

async function copyOwnerPageLink(nickname: string, searchMode: SearchMode) {
  if (typeof window === 'undefined') return

  const relativeUrl = buildMatchesUrl(nickname, null, searchMode)
  const shareUrl = relativeUrl ? new URL(relativeUrl, window.location.origin).toString() : window.location.href

  try {
    await navigator.clipboard.writeText(shareUrl)
    window.alert('구단주 페이지가 복사되었습니다.')
  } catch {
    window.alert('링크 복사에 실패했습니다.')
  }
}

function DetailStatCard({
  label,
  value,
}: {
  label: string
  value: string | number | null | undefined
}) {
  const content = DetailValueContent({ label, rawValue: value })

  return (
    <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'var(--app-analysis-soft-bg)' }}>
      <p className="app-theme-muted text-[11px]">{label}</p>
      <div className="app-theme-title mt-1 text-sm font-semibold tracking-[-0.02em]">
        {content.primary}
      </div>
      {content.secondary ? (
        <div className="app-theme-body mt-1 overflow-x-auto text-[12px] leading-4">
          {content.secondary}
        </div>
      ) : null}
    </div>
  )
}

function MatchRecordSkeletonList() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="app-theme-soft rounded-lg px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="home-image-shimmer h-11 w-11 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="home-image-shimmer h-4 w-28 rounded-full" />
                <div className="home-image-shimmer mt-2 h-3.5 w-40 rounded-full" />
              </div>
            </div>
            <div className="home-image-shimmer h-7 w-14 shrink-0 rounded-[8px]" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="home-image-shimmer h-[58px] rounded-lg" />
            <div className="home-image-shimmer h-[58px] rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

function MatchDetailSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <section className="app-theme-card rounded-lg border px-5 py-5">
        <div className="flex items-center gap-4">
          <div className="home-image-shimmer h-14 w-14 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <div className="home-image-shimmer h-7 w-32 rounded-full" />
            <div className="home-image-shimmer mt-2 h-4 w-40 rounded-full" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="app-theme-soft rounded-lg px-4 py-3">
              <div className="home-image-shimmer h-3 w-16 rounded-full" />
              <div className="home-image-shimmer mt-2 h-4 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </section>

      <section className="app-theme-card rounded-lg border px-5 py-5">
        <div className="home-image-shimmer h-5 w-20 rounded-full" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="app-theme-soft rounded-lg px-4 py-3">
              <div className="home-image-shimmer h-3 w-18 rounded-full" />
              <div className="home-image-shimmer mt-2 h-4 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </section>

      <section className="app-theme-card rounded-lg border px-5 py-5">
        <div className="home-image-shimmer mb-3 h-5 w-32 rounded-full" />
        <MatchRecordSkeletonList />
      </section>
    </div>
  )
}

function MatchNoResultState({ nickname }: { nickname: string }) {
  return (
    <div className="space-y-4">
      <section className="app-theme-card rounded-lg border px-5 py-5">
        <div className="flex items-start gap-4">
          <div className="app-theme-soft app-theme-body flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-lg font-bold">
            ?
          </div>

          <div className="min-w-0">
            <h2 className="app-theme-title text-[20px] font-bold tracking-[-0.03em]">
              검색 결과가 없어요
            </h2>
            <p className="app-theme-body mt-1 text-sm leading-5">
              <span className="app-theme-title font-semibold">{nickname}</span>
              {' 닉네임으로 조회되는 볼타 분석 데이터를 찾지 못했어요.'}
            </p>
          </div>
        </div>

        <div className="app-theme-soft mt-4 rounded-lg px-4 py-4">
          <p className="app-theme-muted text-[11px] font-medium uppercase tracking-[0.08em]">
            확인해 보세요
          </p>
          <div className="mt-3 grid gap-3">
            <div className="app-theme-card rounded-lg border px-4 py-3">
              <p className="app-theme-muted text-[11px]">닉네임 입력</p>
              <p className="app-theme-title mt-1 text-sm font-semibold">
                띄어쓰기와 특수문자까지 정확한지 확인해 주세요.
              </p>
            </div>
            <div className="app-theme-card rounded-lg border px-4 py-3">
              <p className="app-theme-muted text-[11px]">공개 데이터</p>
              <p className="app-theme-title mt-1 text-sm font-semibold">
                랭킹/전적 정보가 없는 계정은 분석 결과가 보이지 않을 수 있어요.
              </p>
            </div>
            <div className="app-theme-card rounded-lg border px-4 py-3">
              <p className="app-theme-muted text-[11px]">다시 검색</p>
              <p className="app-theme-title mt-1 text-sm font-semibold">
                다른 닉네임이나 정확한 철자로 다시 검색해 보세요.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

type Props = {
  initialNickname: string
  initialMatchId: string
  initialSearchMode: string
}

export default function MatchesPageClient({ initialNickname, initialMatchId, initialSearchMode }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const requestIdRef = useRef(0)
  const normalizedInitialMode = normalizeSearchMode(initialSearchMode)

  const [selectedSearchMode, setSelectedSearchMode] = useState<SearchMode>(normalizedInitialMode)
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false)
  const [hasPendingRouteSearch, setHasPendingRouteSearch] = useState(Boolean(initialNickname))
  const [query, setQuery] = useState(initialNickname)
  const [activeSearchQuery, setActiveSearchQuery] = useState(initialNickname)
  const [exactCandidate, setExactCandidate] = useState<MatchSearchCandidate | null>(null)
  const [candidates, setCandidates] = useState<MatchSearchCandidate[]>([])
  const [matches, setMatches] = useState<MatchData[]>([])
  const [officialFormationMetaItems, setOfficialFormationMetaItems] = useState<OfficialFormationMetaItem[]>([])
  const [officialFormationMetaSampleSize, setOfficialFormationMetaSampleSize] = useState(100)
  const [officialTeamColorMetaItems, setOfficialTeamColorMetaItems] = useState<OfficialTeamColorMetaItem[]>([])
  const [officialTeamColorMetaSampleSize, setOfficialTeamColorMetaSampleSize] = useState(4000)
  const [officialTopItems, setOfficialTopItems] = useState<OfficialTopRankItem[]>([])
  const [voltaTopItems, setVoltaTopItems] = useState<VoltaTopRankItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [matchLoading, setMatchLoading] = useState(false)
  const [officialFormationMetaLoading, setOfficialFormationMetaLoading] = useState(true)
  const [officialTeamColorMetaLoading, setOfficialTeamColorMetaLoading] = useState(true)
  const [officialTopLoading, setOfficialTopLoading] = useState(true)
  const [voltaTopLoading, setVoltaTopLoading] = useState(true)
  const [matchesError, setMatchesError] = useState('')
  const [visibleMatchCount, setVisibleMatchCount] = useState(INITIAL_VISIBLE_MATCHES)
  const [activeMatchId, setActiveMatchId] = useState(initialMatchId)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    for (const key of LEGACY_MATCH_CACHE_KEYS) {
      window.localStorage.removeItem(key)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadVoltaTopRanks = async () => {
      const cached = readJsonStorage<VoltaTopRankCacheEntry>(VOLTA_TOP_CACHE_KEY)
      const isCacheFresh =
        typeof cached?.cachedAt === 'number' && Date.now() - cached.cachedAt < TOP_RANK_CACHE_TTL_MS

      if (isCacheFresh && Array.isArray(cached?.items) && cached.items.length >= 5) {
        setVoltaTopItems(cached.items)
        setVoltaTopLoading(false)
        return
      }

      try {
        const res = await fetch('/api/nexon/matches/volta-top')
        if (!res.ok) {
          return
        }

        const data = await res.json().catch(() => null)
        const items = Array.isArray(data?.items) ? (data.items as VoltaTopRankItem[]) : []

        if (cancelled) {
          return
        }

        setVoltaTopItems(items)

        if (items.length > 0) {
          writeJsonStorage(VOLTA_TOP_CACHE_KEY, {
            cachedAt: Date.now(),
            items,
          } satisfies VoltaTopRankCacheEntry)
        }
      } finally {
        if (!cancelled) {
          setVoltaTopLoading(false)
        }
      }
    }

    const loadOfficialTopRanks = async () => {
      const cached = readJsonStorage<OfficialTopRankCacheEntry>(OFFICIAL_TOP_CACHE_KEY)
      const isCacheFresh =
        typeof cached?.cachedAt === 'number' && Date.now() - cached.cachedAt < TOP_RANK_CACHE_TTL_MS

      if (isCacheFresh && Array.isArray(cached?.items) && cached.items.length >= 3) {
        setOfficialTopItems(cached.items.slice(0, 3))
        setOfficialTopLoading(false)
        return
      }

      try {
        const res = await fetch('/api/nexon/matches/official-top')
        if (!res.ok) {
          return
        }

        const data = await res.json().catch(() => null)
        const items = Array.isArray(data?.items) ? (data.items as OfficialTopRankItem[]).slice(0, 3) : []

        if (cancelled) {
          return
        }

        setOfficialTopItems(items)

        if (items.length > 0) {
          writeJsonStorage(OFFICIAL_TOP_CACHE_KEY, {
            cachedAt: Date.now(),
            items,
          } satisfies OfficialTopRankCacheEntry)
        }
      } finally {
        if (!cancelled) {
          setOfficialTopLoading(false)
        }
      }
    }

    const loadOfficialFormationMeta = async () => {
      const todayKey = getKstDateKey()
      const cached = readJsonStorage<OfficialFormationMetaCacheEntry>(OFFICIAL_FORMATION_META_CACHE_KEY)

      if (cached?.dateKey === todayKey && Array.isArray(cached.items) && cached.items.length >= 3) {
        setOfficialFormationMetaItems(cached.items)
        setOfficialFormationMetaSampleSize(cached.sampleSize || 100)
        setOfficialFormationMetaLoading(false)
        return
      }

      try {
        const res = await fetch('/api/nexon/matches/official-formation-meta')
        if (!res.ok) {
          return
        }

        const data = await res.json().catch(() => null)
        const items = Array.isArray(data?.items) ? (data.items as OfficialFormationMetaItem[]) : []
        const sampleSize = typeof data?.sampleSize === 'number' ? data.sampleSize : 100

        if (cancelled) {
          return
        }

        setOfficialFormationMetaItems(items)
        setOfficialFormationMetaSampleSize(sampleSize)

        if (items.length > 0) {
          writeJsonStorage(OFFICIAL_FORMATION_META_CACHE_KEY, {
            dateKey: todayKey,
            items,
            sampleSize,
          } satisfies OfficialFormationMetaCacheEntry)
        }
      } finally {
        if (!cancelled) {
          setOfficialFormationMetaLoading(false)
        }
      }
    }

    const loadOfficialTeamColorMeta = async () => {
      const todayKey = getKstDateKey()
      const cached = readJsonStorage<OfficialTeamColorMetaCacheEntry>(OFFICIAL_TEAM_COLOR_META_CACHE_KEY)

      if (cached?.dateKey === todayKey && Array.isArray(cached.items) && cached.items.length >= 5) {
        setOfficialTeamColorMetaItems(cached.items)
        setOfficialTeamColorMetaSampleSize(cached.sampleSize || 100)
        setOfficialTeamColorMetaLoading(false)
        return
      }

      try {
        const res = await fetch('/api/nexon/matches/official-team-color-meta')
        if (!res.ok) {
          return
        }

        const data = await res.json().catch(() => null)
        const items = Array.isArray(data?.items) ? (data.items as OfficialTeamColorMetaItem[]) : []
        const sampleSize = typeof data?.sampleSize === 'number' ? data.sampleSize : 100

        if (cancelled) {
          return
        }

        setOfficialTeamColorMetaItems(items)
        setOfficialTeamColorMetaSampleSize(sampleSize)

        if (items.length > 0) {
          writeJsonStorage(OFFICIAL_TEAM_COLOR_META_CACHE_KEY, {
            dateKey: todayKey,
            items,
            sampleSize,
          } satisfies OfficialTeamColorMetaCacheEntry)
        }
      } finally {
        if (!cancelled) {
          setOfficialTeamColorMetaLoading(false)
        }
      }
    }

    void loadOfficialTeamColorMeta()
    void loadOfficialFormationMeta()
    void loadOfficialTopRanks()
    void loadVoltaTopRanks()

    return () => {
      cancelled = true
    }
  }, [])

  const loadMatches = async (targetOuid: string, searchMode: SearchMode) => {
    const cacheKey = buildMatchCacheKey(targetOuid, searchMode)
    const cachedMatches = readCachedMatches(cacheKey)
    const matchType = getMatchTypeForMode(searchMode)

    if (cachedMatches) {
      setMatches(cachedMatches)
      setMatchesError('')
      setMatchLoading(false)
      setVisibleMatchCount(INITIAL_VISIBLE_MATCHES)
      return
    }

    setMatchLoading(true)
    setMatches([])
    setMatchesError('')
    setVisibleMatchCount(INITIAL_VISIBLE_MATCHES)

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), MATCH_LIST_TIMEOUT_MS)
      const res = await fetch(
        `/api/nexon/matches/list?ouid=${targetOuid}&matchtype=${matchType}&limit=${MATCH_LIST_LIMIT}`,
        { signal: controller.signal },
      ).finally(() => clearTimeout(timer))

      if (!res.ok) {
        setMatches([])
        setMatchesError('최근 경기 기록을 불러오지 못했어요.')
        return
      }

      const data = await res.json().catch(() => [])
      const nextMatches = Array.isArray(data) ? data : []
      setMatches(nextMatches)
      if (nextMatches.length > 0) {
        writeCachedMatches(cacheKey, nextMatches)
      }
    } catch {
      setMatches([])
      setMatchesError('최근 경기 기록을 불러오지 못했어요.')
    } finally {
      setMatchLoading(false)
    }
  }

  const resolveOuid = async (nickname: string) => {
    const cached = readCachedOuid(nickname)
    if (cached) {
      return cached
    }

    const res = await fetch(`/api/nexon/matches/user?nickname=${encodeURIComponent(nickname)}`)
    if (!res.ok) return null

    const data = await res.json().catch(() => null)
    const ouid = data?.ouid ?? null

    if (ouid) {
      writeCachedOuid(nickname, ouid)
    }

    return ouid
  }

  const runSearch = async (
    nickname: string,
    shouldUpdateUrl = true,
    matchIdToKeep?: string | null,
    modeOverride?: SearchMode,
    seedCandidate?: MatchSearchCandidate | null,
  ) => {
    const trimmed = nickname.trim()
    if (!trimmed) return
    const effectiveMode = modeOverride ?? selectedSearchMode

    if (shouldUpdateUrl) {
      updateMatchesUrl(trimmed, matchIdToKeep ?? null, effectiveMode)
    }

    const requestId = ++requestIdRef.current
    setSearchLoading(true)
    setMatchLoading(false)
    setActiveSearchQuery(trimmed)
    setActiveMatchId(matchIdToKeep?.trim() ?? '')
    setExactCandidate(null)
    setCandidates([])
    setMatches([])

    if (seedCandidate) {
      setExactCandidate(seedCandidate)

      if (seedCandidate.ouid) {
        writeCachedOuid(trimmed, seedCandidate.ouid)
        void loadMatches(seedCandidate.ouid, effectiveMode)
      }
    }

    try {
      const cachedSearch = readCachedSearch(trimmed)
      if (cachedSearch) {
        const mergedExactCandidate = mergeSeedCandidate(cachedSearch.exactCandidate, seedCandidate ?? null)
        setExactCandidate(mergedExactCandidate)
        setCandidates(cachedSearch.candidates)
        setHasPendingRouteSearch(false)

        writeCachedSearch(trimmed, {
          exactCandidate: mergedExactCandidate,
          candidates: cachedSearch.candidates,
        })

        if (mergedExactCandidate?.ouid) {
          writeCachedOuid(trimmed, mergedExactCandidate.ouid)
          void loadMatches(mergedExactCandidate.ouid, effectiveMode)
        }

        return
      }

      const res = await fetch(`/api/nexon/matches/search?nickname=${encodeURIComponent(trimmed)}`)
      const data = await res.json().catch(() => null)

      if (requestId !== requestIdRef.current) return

      let nextExactMatch = data?.exactMatch ?? null
      const nextCandidates: MatchSearchCandidate[] = Array.isArray(data?.candidates) ? data.candidates : []
      const rankCandidates = nextCandidates.filter((candidate) => candidate.source !== 'exact')

      if (nextExactMatch && !nextExactMatch.ouid) {
        const resolvedOuid = await resolveOuid(trimmed)
        if (requestId !== requestIdRef.current) return
        if (resolvedOuid) {
          nextExactMatch = { ...nextExactMatch, ouid: resolvedOuid }
        }
      }

      const mergedExactCandidate = mergeSeedCandidate(nextExactMatch, seedCandidate ?? null)
      setExactCandidate(mergedExactCandidate)
      setCandidates(rankCandidates)
      setHasPendingRouteSearch(false)
      writeCachedSearch(trimmed, {
        exactCandidate: mergedExactCandidate,
        candidates: rankCandidates,
      })

      if (mergedExactCandidate?.ouid) {
        writeCachedOuid(trimmed, mergedExactCandidate.ouid)
        void loadMatches(mergedExactCandidate.ouid, effectiveMode)
      }
    } catch {
      if (requestId !== requestIdRef.current) return

      setHasPendingRouteSearch(false)

      if (!seedCandidate) {
        setExactCandidate(null)
        setCandidates([])
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setHasPendingRouteSearch(false)
        setSearchLoading(false)
      }
    }
  }

  const handleSearch = async () => {
    if (isPreviewOnlyMode) {
      return
    }

    await runSearch(query)
  }

  const handleTopRankSelect = (mode: SearchMode, nickname: string, seedItem?: TopRankSeedItem) => {
    const trimmed = nickname.trim()
    if (!trimmed) {
      return
    }

    const seedCandidate = seedItem ? buildTopRankSeedCandidate(mode, seedItem) : null
    setSelectedSearchMode(mode)
    setQuery(trimmed)
    void runSearch(trimmed, true, null, mode, seedCandidate)
  }

  const handleTopRankItemSelect = (mode: SearchMode, item: TopRankSeedItem) => {
    handleTopRankSelect(mode, item.nickname, item)
  }

  const runInitialSearch = useEffectEvent((nickname: string, matchId?: string) => {
    void runSearch(nickname, false, matchId)
  })

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      inputRef.current?.blur()
      void handleSearch()
    }
  }

  const handleSearchContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isSearchDisabled) {
      return
    }

    const target = event.target as HTMLElement
    if (target.closest('button')) {
      return
    }

    inputRef.current?.focus()
  }

  const handleSelectSearchMode = (mode: SearchMode) => {
    setSelectedSearchMode(mode)

    if (!showResultsPanel) {
      updateMatchesUrl(null, null, mode)
    }
  }

  const handleBackHome = () => {
    updateMatchesUrl(null, null, selectedSearchMode)
    setHasPendingRouteSearch(false)
    setQuery('')
    setActiveSearchQuery('')
    setExactCandidate(null)
    setCandidates([])
    setMatches([])
    setActiveMatchId('')
    setSearchLoading(false)
    setMatchLoading(false)
    setMatchesError('')
  }

  useEffect(() => {
    if (!initialNickname) {
      setHasPendingRouteSearch(false)
      return
    }

    runInitialSearch(initialNickname, initialMatchId)
  }, [initialMatchId, initialNickname])

  useEffect(() => {
    if (!activeMatchId || matches.length === 0) return
    const matchIndex = matches.findIndex((match) => match.matchId === activeMatchId)
    if (matchIndex < 0) return
    setVisibleMatchCount((current) => Math.max(current, matchIndex + 1))
  }, [activeMatchId, matches])

  const isOfficialMode = selectedSearchMode === 'official1on1'
  const isVoltaMode = selectedSearchMode === 'voltaLive'
  const voltaSummary = isVoltaMode ? summarizeMatches(matches, exactCandidate?.ouid) : null
  const officialSummary = isOfficialMode ? summarizeOfficialMatches(matches, exactCandidate?.ouid) : null
  const officialScoringSummary = isOfficialMode ? summarizeOfficialScoringStyles(matches, exactCandidate?.ouid) : null
  const officialTopPlayers = isOfficialMode ? buildOfficialRecentPlayerLeaders(matches, exactCandidate?.ouid) : []
  const recentMatchesLabel = '최근 10경기'
  const recentGoalsForLabel = '최근 10경기 총 득점'
  const recentGoalsAgainstLabel = '최근 10경기 총 실점'
  const searchTitle = '어떤 경기 기록을 찾아볼까요?'
  const searchPlaceholder =
    selectedSearchMode === 'official1on1'
      ? '1:1 공식경기 구단주명을 입력해 주세요'
      : selectedSearchMode === 'manager'
        ? '감독모드 구단주명을 입력해 주세요'
        : '볼타 라이브 구단주명을 입력해 주세요'
  const isPreviewOnlyMode = selectedSearchMode === 'manager'
  const isSearchDisabled = searchLoading || isPreviewOnlyMode
  const officialDisplay = getOfficialDisplayFields(exactCandidate)
  const fallbackOwnerEmblemUrl = exactCandidate?.representativeTeamEmblemUrl ?? null
  const officialBadgeImageUrl = officialDisplay.rankIconUrl ?? fallbackOwnerEmblemUrl
  const hasOfficialRank =
    officialDisplay.rank !== null || officialDisplay.rankPoint !== null || !!officialDisplay.rankIconUrl
  const hasVoltaRank =
    exactCandidate?.voltaRank !== null ||
    exactCandidate?.voltaRankPoint !== null ||
    !!exactCandidate?.voltaRankIconUrl
  const hasResultContext =
    hasPendingRouteSearch ||
    searchLoading ||
    activeSearchQuery.trim().length > 0 ||
    exactCandidate !== null ||
    candidates.length > 0
  const showNoResultState =
    !hasPendingRouteSearch &&
    !searchLoading &&
    activeSearchQuery.trim().length > 0 &&
    exactCandidate === null &&
    candidates.length === 0
  const showResultsPanel = hasResultContext
  const showHomePanels = !hasResultContext
  const resultsTitle = exactCandidate?.nickname || activeSearchQuery || query.trim() || '분석 홈'
  const shareNickname = exactCandidate?.nickname || activeSearchQuery || query.trim()
  const officialTeamColorValue = formatOfficialTeamColors(officialDisplay.teamColors)
  const officialRecordValue = formatMatchRecordLine(
    officialDisplay.wins,
    officialDisplay.draws,
    officialDisplay.losses,
  )

  return (
    <div className="pt-5">
      <div className="flex h-6 items-center">
        {showResultsPanel ? (
          <button
            type="button"
            onClick={handleBackHome}
            className="app-theme-title inline-flex items-center gap-1.5 text-[18px] font-bold tracking-[-0.02em]"
          >
            <ArrowLeft size={18} weight="bold" />
            <span>{resultsTitle}</span>
          </button>
        ) : (
          <h1 className="app-theme-title text-[18px] font-bold tracking-[-0.02em]">
            {searchTitle}
          </h1>
        )}
      </div>

      {!showResultsPanel && (
        <div className="mt-4 space-y-3">
          <SearchModeTabs selectedMode={selectedSearchMode} onSelect={handleSelectSearchMode} />

          <div
            className={`flex h-14 items-center gap-2 rounded-lg border px-4 focus-within:border-2 focus-within:border-[#457ae5] ${
              isSearchDisabled ? 'opacity-60' : ''
            }`}
            style={{
              backgroundColor: 'var(--app-card-bg)',
              borderColor: isSearchInputFocused ? '#457ae5' : 'var(--app-input-border)',
            }}
            onClick={handleSearchContainerClick}
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsSearchInputFocused(true)}
              onBlur={() => setIsSearchInputFocused(false)}
              placeholder={searchPlaceholder}
              disabled={isSearchDisabled}
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] leading-[1] outline-none"
              style={{ color: 'var(--app-title)' }}
            />
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={isSearchDisabled}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg disabled:opacity-50"
            >
              <MagnifyingGlass size={24} className="app-theme-body" weight="bold" />
            </button>
          </div>
        </div>
      )}

      <div className="mt-4">
        {searchLoading && (
          <div className="app-theme-card rounded-lg border px-5 py-4">
            <LoadingDots label="닉네임을 찾는 중이에요" />
          </div>
        )}

        {!searchLoading && (
          <>
            {!showNoResultState && !exactCandidate && candidates.length === 0 && showResultsPanel && (
              <MatchDetailSkeleton />
            )}

            {showNoResultState && <MatchNoResultState nickname={activeSearchQuery} />}

            {exactCandidate && (
              <div className="space-y-4">
                {isOfficialMode ? (
                  <>
                    <section className="app-theme-card rounded-lg border px-5 py-5">
                      <div className="flex items-start gap-4">
                        {officialBadgeImageUrl ? (
                          <img
                            src={officialBadgeImageUrl}
                            alt={officialDisplay.rankIconUrl ? '공식경기 등급' : '대표팀 엠블럼'}
                            className="mt-0.5 h-10 w-10 shrink-0 object-contain"
                          />
                        ) : (
                          <div className="app-theme-soft app-theme-body mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
                            1vs1
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <h2 className="app-theme-title truncate text-2xl font-bold tracking-[-0.03em]">
                              {exactCandidate.nickname}
                            </h2>
                            <button
                              type="button"
                              aria-label="구단주 페이지 링크 복사"
                              onClick={() => void copyOwnerPageLink(exactCandidate.nickname, selectedSearchMode)}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition"
                              style={{
                                backgroundColor: 'transparent',
                                borderColor: 'var(--app-input-border)',
                                color: 'var(--app-title)',
                              }}
                            >
                              <LinkSimple size={16} weight="bold" />
                            </button>
                          </div>
                          <div className="app-theme-body mt-1 flex flex-wrap items-center gap-1.5 text-sm">
                            <span>
                              공식 승률 {officialDisplay.winRate != null ? `${formatDecimal(officialDisplay.winRate, 2)}%` : '-'}
                            </span>
                            <MutedDivider />
                            <span>{officialDisplay.rankLabel ?? '공식 랭킹 검색 결과'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <InfoCard label="현재 순위" value={officialDisplay.rank != null ? `#${officialDisplay.rank}` : '-'} />
                        <InfoCard label="랭킹 포인트" value={statValue(officialDisplay.rankPoint)} />
                        <InfoCard label="구단주 취임일" value={statValue(exactCandidate.ownerSince)} />
                        <InfoCard label="대표팀" value={statValue(exactCandidate.representativeTeam)} />
                        <InfoCard label="승무패" value={officialRecordValue} />
                        <InfoCard
                          label="승률"
                          value={officialDisplay.winRate != null ? `${officialDisplay.winRate}%` : '-'}
                        />
                        <InfoCard label="주요 포메이션" value={statValue(officialDisplay.formation)} />
                        <InfoCard label="대표 팀컬러" value={officialTeamColorValue} />
                        <InfoCard label="구단가치" value={statValue(exactCandidate.price)} />
                        <InfoCard
                          label={recentMatchesLabel}
                          value={
                            officialSummary
                              ? `${officialSummary.wins}승 ${officialSummary.draws}무 ${officialSummary.losses}패`
                              : '-'
                          }
                        />
                      </div>

                      {officialSummary ? (
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <SummaryPill label={recentGoalsForLabel} value={officialSummary.goalsFor} />
                          <SummaryPill label={recentGoalsAgainstLabel} value={officialSummary.goalsAgainst} />
                          <SummaryPill
                            label="최근 10경기 평균 점유율"
                            value={`${formatMetricNumber(officialSummary.averagePossession, 1)}%`}
                          />
                          <SummaryPill
                            label="최근 10경기 평균 패스 성공률"
                            value={
                              officialSummary.averagePassRate != null
                                ? `${formatMetricNumber(officialSummary.averagePassRate, 1)}%`
                                : '-'
                            }
                          />
                        </div>
                      ) : null}
                    </section>

                    <section className="app-theme-card rounded-lg border px-5 py-5">
                      <h2 className="app-theme-title text-base font-semibold">상세 정보</h2>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <DetailStatCard label="주요 포메이션" value={officialDisplay.formation ?? '-'} />
                        <DetailStatCard label="대표 팀컬러" value={officialTeamColorValue} />
                        <DetailStatCard
                          label="랭크 / 포인트"
                          value={
                            hasOfficialRank
                              ? `${officialDisplay.rank != null ? `#${officialDisplay.rank}` : '-'} · ${statValue(officialDisplay.rankPoint)}`
                              : '-'
                          }
                        />
                        <DetailStatCard label="공식 승률" value={officialDisplay.winRate != null ? `${officialDisplay.winRate}%` : '-'} />
                        <DetailStatCard
                          label="최근 평균 슈팅"
                          value={officialSummary ? formatMetricNumber(officialSummary.averageShots, 1) : '-'}
                        />
                        <DetailStatCard
                          label="최근 평균 유효슛"
                          value={officialSummary ? formatMetricNumber(officialSummary.averageEffectiveShots, 1) : '-'}
                        />
                        <DetailStatCard
                          label="최근 클린시트"
                          value={officialSummary ? `${officialSummary.cleanSheets}회` : '-'}
                        />
                        <DetailStatCard label="검색 모드" value={getModeLabel(selectedSearchMode)} />
                      </div>
                    </section>

                    <section className="app-theme-card rounded-lg border px-5 py-5">
                      <h2 className="app-theme-title mb-3 text-base font-semibold">1:1 공식경기 최근 10경기</h2>

                      {matchLoading && <MatchRecordSkeletonList />}

                      {!matchLoading && matchesError && (
                        <p className="app-theme-muted py-4 text-sm">{matchesError}</p>
                      )}

                      {!matchLoading && !matchesError && matches.length === 0 && (
                        <p className="app-theme-muted py-4 text-sm">1:1 공식경기 기록이 없어요.</p>
                      )}

                      {!matchLoading && !matchesError && (
                        <div className="space-y-3">
                          {matches.slice(0, visibleMatchCount).map((match) => {
                            const teams = buildOfficialTeams(match, exactCandidate.ouid ?? '')
                            if (!teams) {
                              return null
                            }

                            return (
                              <OfficialMatchRecordCard
                                key={match.matchId}
                                match={match}
                                teams={teams}
                                shareNickname={shareNickname}
                                searchMode={selectedSearchMode}
                                shouldExpand={activeMatchId === match.matchId}
                                onExpandedChange={(matchId) => {
                                  setActiveMatchId(matchId ?? '')
                                  updateMatchesUrl(shareNickname || null, matchId ?? null, selectedSearchMode)
                                }}
                              />
                            )
                          })}

                          {matches.length > visibleMatchCount && (
                            <button
                              type="button"
                              onClick={() => setVisibleMatchCount(matches.length)}
                              className="app-theme-title flex w-full items-center justify-center rounded-lg border px-4 py-3 text-sm font-semibold"
                              style={{
                                backgroundColor: 'var(--app-card-bg)',
                                borderColor: 'var(--app-input-border)',
                              }}
                            >
                              더보기
                            </button>
                          )}
                        </div>
                      )}
                    </section>

                    {(officialScoringSummary || officialTopPlayers.length > 0) && (
                      <section className="app-theme-card rounded-lg border px-5 py-5">
                        <h2 className="app-theme-title text-base font-semibold">
                          최근 10경기 <span style={{ color: '#457ae5' }}>공격 패턴</span>
                        </h2>

                        {officialScoringSummary ? (
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <SummaryPill label="총 득점" value={officialScoringSummary.totalGoals} />
                            <SummaryPill label="멀티득점 경기" value={`${officialScoringSummary.multiGoalMatches}경기`} />
                            <SummaryPill
                              label="박스 안 득점"
                              value={`${officialScoringSummary.inPenaltyGoals}골`}
                            />
                            <SummaryPill
                              label="박스 밖 득점"
                              value={`${officialScoringSummary.outPenaltyGoals}골`}
                            />
                            <SummaryPill label="헤더 득점" value={`${officialScoringSummary.headerGoals}골`} />
                            <SummaryPill
                              label="PK/프리킥 득점"
                              value={`${officialScoringSummary.penaltyGoals + officialScoringSummary.freekickGoals}골`}
                            />
                          </div>
                        ) : (
                          <p className="app-theme-muted mt-4 text-sm">최근 10경기에서 집계할 득점 패턴이 아직 부족해요.</p>
                        )}

                        {officialTopPlayers.length > 0 && (
                          <>
                            <h3 className="app-theme-title mt-6 text-sm font-semibold">
                              최근 10경기 주요 선수 <span style={{ color: '#457ae5' }}>TOP 5</span>
                            </h3>
                            <div className="mt-3 space-y-3">
                              {officialTopPlayers.map((player) => (
                                <div
                                  key={player.key}
                                  className="app-theme-soft rounded-lg px-4 py-3"
                                >
                                  <div className="flex items-start gap-3">
                                    <div
                                      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg"
                                      style={{ backgroundColor: 'var(--app-analysis-soft-alt-bg)' }}
                                    >
                                      <PlayerImage
                                        spid={player.spId}
                                        alt={player.playerName ?? '선수'}
                                        className="object-contain"
                                        sizes="56px"
                                      />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        {getPlayerLeaderPositionLabel(player) ? (
                                          <PlayerPositionBadge position={getPlayerLeaderPositionLabel(player) ?? '-'} />
                                        ) : null}
                                        <p className="app-theme-title min-w-0 truncate text-sm font-semibold">
                                          {player.playerName ?? '선수 정보 없음'}
                                        </p>
                                      </div>
                                      <p className="app-theme-body mt-1 text-xs">
                                        {formatPlayerLeaderSubtitle(player)}
                                      </p>

                                      <div className="app-theme-body mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-4">
                                        <span>출전 {player.appearances}경기</span>
                                        <MutedDivider />
                                        <span>평점 {formatMetricNumber(player.averageRating, 2)}</span>
                                        <MutedDivider />
                                        <span>득점 {player.goals}골</span>
                                        <MutedDivider />
                                        <span>도움 {player.assists}개</span>
                                        <MutedDivider />
                                        <span>유효슛 {player.effectiveShots}회</span>
                                        <MutedDivider />
                                        <span>슛 {player.shots}회</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </section>
                    )}
                  </>
                ) : (
                  <>
                    <section className="app-theme-card rounded-lg border px-5 py-5">
                      <div className="flex items-start gap-4">
                        {exactCandidate.voltaRankIconUrl ? (
                          <img
                            src={exactCandidate.voltaRankIconUrl}
                            alt="볼타 등급"
                            className="mt-0.5 h-10 w-10 shrink-0 object-contain"
                          />
                        ) : (
                          <div className="app-theme-soft app-theme-body mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-semibold">
                            볼타
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <h2 className="app-theme-title truncate text-2xl font-bold tracking-[-0.03em]">
                              {exactCandidate.nickname}
                            </h2>
                            <button
                              type="button"
                              aria-label="구단주 페이지 링크 복사"
                              onClick={() => void copyOwnerPageLink(exactCandidate.nickname, selectedSearchMode)}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition"
                              style={{
                                backgroundColor: 'transparent',
                                borderColor: 'var(--app-input-border)',
                                color: 'var(--app-title)',
                              }}
                            >
                              <LinkSimple size={16} weight="bold" />
                            </button>
                          </div>
                          <div className="app-theme-body mt-1 flex flex-wrap items-center gap-1.5 text-sm">
                            <span>평점 {formatDecimal(exactCandidate.voltaAverageRating, 2)}</span>
                            <MutedDivider />
                            <span>
                              승률{' '}
                              {exactCandidate.voltaWinRate != null
                                ? `${formatDecimal(exactCandidate.voltaWinRate, 2)}%`
                                : '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {hasVoltaRank ? (
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <InfoCard label="현재 순위" value={`#${statValue(exactCandidate.voltaRank)}`} />
                          <InfoCard label="랭킹 포인트" value={statValue(exactCandidate.voltaRankPoint)} />
                          <InfoCard label="구단주 취임일" value={statValue(exactCandidate.ownerSince)} />
                          <InfoCard label="대표팀" value={statValue(exactCandidate.representativeTeam)} />
                          <InfoCard
                            label="승무패"
                            value={`${statValue(exactCandidate.voltaWins)}승 ${statValue(exactCandidate.voltaDraws)}무 ${statValue(exactCandidate.voltaLosses)}패`}
                          />
                          <InfoCard
                            label="승률"
                            value={exactCandidate.voltaWinRate !== null ? `${exactCandidate.voltaWinRate}%` : '-'}
                          />
                          <InfoCard label="평균 평점" value={statValue(exactCandidate.voltaAverageRating)} />
                          <InfoCard label="MOM 선정" value={statValue(exactCandidate.voltaMomCount)} />
                          <InfoCard label="득점" value={statValue(exactCandidate.voltaGoals)} />
                          <InfoCard label="도움" value={statValue(exactCandidate.voltaAssists)} />
                          <InfoCard label="구단가치" value={statValue(exactCandidate.price)} />
                          <InfoCard
                            label={recentMatchesLabel}
                            value={
                              voltaSummary
                                ? `${voltaSummary.wins}승 ${voltaSummary.draws}무 ${voltaSummary.losses}패`
                                : '-'
                            }
                          />
                        </div>
                      ) : (
                        <div className="app-theme-soft app-theme-body mt-4 rounded-lg px-4 py-3 text-sm">
                          볼타 랭킹 1만위 밖 유저거나 공개 랭킹 정보가 없어요.
                        </div>
                      )}

                      {voltaSummary && (
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <SummaryPill label={recentGoalsForLabel} value={voltaSummary.goalsFor} />
                          <SummaryPill label={recentGoalsAgainstLabel} value={voltaSummary.goalsAgainst} />
                        </div>
                      )}
                    </section>

                    {hasVoltaRank && (
                      <section className="app-theme-card rounded-lg border px-5 py-5">
                        <h2 className="app-theme-title text-base font-semibold">상세 정보</h2>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <DetailStatCard label="태클 성공률" value={exactCandidate.voltaTackleRate ?? '-'} />
                          <DetailStatCard label="차단 성공률" value={exactCandidate.voltaBlockRate ?? '-'} />
                          <DetailStatCard label="유효슛" value={exactCandidate.voltaEffectiveShots ?? '-'} />
                          <DetailStatCard label="패스 성공률" value={exactCandidate.voltaPassRate ?? '-'} />
                          <DetailStatCard label="드리블 성공률" value={exactCandidate.voltaDribbleRate ?? '-'} />
                          <DetailStatCard label="주요 포지션" value={exactCandidate.voltaMainPosition ?? '-'} />
                        </div>
                      </section>
                    )}

                    <section className="app-theme-card rounded-lg border px-5 py-5">
                      <h2 className="app-theme-title mb-3 text-base font-semibold">볼타 공식 최근 10경기</h2>

                      {matchLoading && <MatchRecordSkeletonList />}

                      {!matchLoading && matchesError && (
                        <p className="app-theme-muted py-4 text-sm">{matchesError}</p>
                      )}

                      {!matchLoading && !matchesError && matches.length === 0 && (
                        <p className="app-theme-muted py-4 text-sm">볼타 공식 경기 기록이 없어요.</p>
                      )}

                      {!matchLoading && !matchesError && (
                        <div className="space-y-3">
                          {matches.slice(0, visibleMatchCount).map((match) => {
                            const teams = buildVoltaTeams(match, exactCandidate.ouid ?? '')
                            if (!teams) {
                              return null
                            }

                            return (
                              <MatchRecordCard
                                key={match.matchId}
                                match={match}
                                teams={teams}
                                shareNickname={shareNickname}
                                searchMode={selectedSearchMode}
                                shouldExpand={activeMatchId === match.matchId}
                                onExpandedChange={(matchId) => {
                                  setActiveMatchId(matchId ?? '')
                                  updateMatchesUrl(shareNickname || null, matchId ?? null, selectedSearchMode)
                                }}
                              />
                            )
                          })}

                          {matches.length > visibleMatchCount && (
                            <button
                              type="button"
                              onClick={() => setVisibleMatchCount(matches.length)}
                              className="app-theme-title flex w-full items-center justify-center rounded-lg border px-4 py-3 text-sm font-semibold"
                              style={{
                                backgroundColor: 'var(--app-card-bg)',
                                borderColor: 'var(--app-input-border)',
                              }}
                            >
                              더보기
                            </button>
                          )}
                        </div>
                      )}
                    </section>
                  </>
                )}
              </div>
            )}

            {!exactCandidate && candidates.length > 0 && (
              <div className="space-y-2">
                <p className="app-theme-muted pb-1 text-xs font-semibold">랭킹 후보</p>
                {candidates.map((candidate) => {
                  const officialCandidateDisplay = getOfficialDisplayFields(candidate)

                  return (
                    <button
                      key={`${candidate.nexonSn}-${candidate.nickname}`}
                      type="button"
                      onClick={() => {
                        setQuery(candidate.nickname)
                        void runSearch(candidate.nickname)
                      }}
                      className="app-theme-card block w-full rounded-lg border px-4 py-3 text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold">{candidate.nickname}</div>
                          <div className="app-theme-muted mt-1 text-xs">{candidate.modes.join(' · ')}</div>
                        </div>
                        {isOfficialMode && officialCandidateDisplay.rank !== null ? (
                          <span className="app-theme-soft app-theme-body rounded-full px-2.5 py-1 text-[11px] font-semibold">
                            공식 #{officialCandidateDisplay.rank}
                          </span>
                        ) : candidate.voltaRank !== null ? (
                          <span className="app-theme-soft app-theme-body rounded-full px-2.5 py-1 text-[11px] font-semibold">
                            볼타 #{candidate.voltaRank}
                          </span>
                        ) : officialCandidateDisplay.rank !== null ? (
                          <span className="app-theme-soft app-theme-body rounded-full px-2.5 py-1 text-[11px] font-semibold">
                            공식 {officialCandidateDisplay.rank}위
                          </span>
                        ) : null}
                      </div>

                      <div className="app-theme-body mt-3 grid grid-cols-2 gap-2 text-xs">
                        {isOfficialMode ? (
                          <>
                            <span>랭킹 포인트 {statValue(officialCandidateDisplay.rankPoint)}</span>
                            <span>
                              승률 {officialCandidateDisplay.winRate !== null ? `${officialCandidateDisplay.winRate}%` : '-'}
                            </span>
                            <span>
                              전적 {formatMatchRecordLine(
                                officialCandidateDisplay.wins,
                                officialCandidateDisplay.draws,
                                officialCandidateDisplay.losses,
                              )}
                            </span>
                            <span>포메이션 {statValue(officialCandidateDisplay.formation)}</span>
                          </>
                        ) : (
                          <>
                            <span>볼타 포인트 {statValue(candidate.voltaRankPoint)}</span>
                            <span>승률 {candidate.voltaWinRate !== null ? `${candidate.voltaWinRate}%` : '-'}</span>
                            <span>
                              전적 {statValue(candidate.voltaWins)} / {statValue(candidate.voltaDraws)} /{' '}
                              {statValue(candidate.voltaLosses)}
                            </span>
                            <span>평균 평점 {statValue(candidate.voltaAverageRating)}</span>
                          </>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {showHomePanels && (
              <SearchModePreviewCard
                selectedMode={selectedSearchMode}
                onSelectTopRankItem={handleTopRankItemSelect}
                officialFormationMetaItems={officialFormationMetaItems}
                officialFormationMetaLoading={officialFormationMetaLoading}
                officialFormationMetaSampleSize={officialFormationMetaSampleSize}
                officialTeamColorMetaItems={officialTeamColorMetaItems}
                officialTeamColorMetaLoading={officialTeamColorMetaLoading}
                officialTeamColorMetaSampleSize={officialTeamColorMetaSampleSize}
                officialTopItems={officialTopItems}
                officialTopLoading={officialTopLoading}
                voltaTopItems={voltaTopItems}
                voltaTopLoading={voltaTopLoading}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
