import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { useScrollToTop } from '@react-navigation/native'
import Feather from '@expo/vector-icons/Feather'
import { useTheme } from '@/hooks/useTheme'
import { API_BASE } from '@/constants/api'
import { Text } from '@/components/Themed'

type SearchMode = 'official1on1' | 'voltaLive' | 'manager'

// Full candidate type matching MatchSearchCandidate from TWA
type MatchCandidate = {
  nickname: string
  ouid?: string | null
  level?: number | null
  // Base fields (fallback for mode-specific)
  rank?: number | null
  elo?: number | null
  rankLabel?: string | null
  rankIconUrl?: string | null
  winRate?: number | null
  wins?: number | null
  draws?: number | null
  losses?: number | null
  formation?: string | null
  teamColors?: string[]
  price?: string | null
  ownerSince?: string | null
  representativeTeam?: string | null
  representativeTeamEmblemUrl?: string | null
  teamColorEmblemUrl?: string | null
  // Official 1:1
  officialRank?: number | null
  officialRankPoint?: number | null
  officialRankLabel?: string | null
  officialRankIconUrl?: string | null
  officialWinRate?: number | null
  officialWins?: number | null
  officialDraws?: number | null
  officialLosses?: number | null
  officialTeamColors?: string[]
  officialFormation?: string | null
  // Manager
  managerRank?: number | null
  managerRankPoint?: number | null
  managerRankIconUrl?: string | null
  managerWinRate?: number | null
  managerWins?: number | null
  managerDraws?: number | null
  managerLosses?: number | null
  managerTeamColors?: string[]
  managerFormation?: string | null
  // Volta
  voltaRank?: number | null
  voltaRankPoint?: number | null
  voltaRankIconUrl?: string | null
  voltaWinRate?: number | null
  voltaWins?: number | null
  voltaDraws?: number | null
  voltaLosses?: number | null
  voltaAverageRating?: number | null
  voltaMomCount?: number | null
  voltaGoals?: number | null
  voltaAssists?: number | null
  voltaTackleRate?: string | null
  voltaBlockRate?: string | null
  voltaEffectiveShots?: string | null
  voltaPassRate?: string | null
  voltaDribbleRate?: string | null
  voltaMainPosition?: string | null
}

type MatchPassData = {
  shortPassTry: number; shortPassSuccess: number
  longPassTry: number; longPassSuccess: number
  bouncingLobPassTry: number; bouncingLobPassSuccess: number
  drivenGroundPassTry: number; drivenGroundPassSuccess: number
  throughPassTry: number; throughPassSuccess: number
  lobbedThroughPassTry: number; lobbedThroughPassSuccess: number
}

type MatchPlayerInfo = {
  ouid: string
  nickname?: string
  spId?: number | null
  cardInfo?: {
    playerName?: string | null
    enhancement?: number | null
    seasonName?: string | null
  }
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
  matchDetail: {
    matchResult: string
    matchEndType: number
    possession?: number
    controller?: string | null
    dribble?: number
    foul?: number
    cornerKick?: number
    offsideCount?: number
    yellowCards?: number
    redCards?: number
    averageRating?: number
  }
  shoot: {
    shootTotal?: number
    effectiveShootTotal?: number
    goalTotal: number
    goalTotalDisplay?: number
  }
  pass?: MatchPassData
  defence?: {
    blockTry?: number
    blockSuccess?: number
    tackleTry?: number
    tackleSuccess?: number
  }
}

type MatchData = {
  matchId: string
  matchDate: string
  matchType: number
  matchInfo: MatchPlayerInfo[]
}

type MatchSummary = {
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  averagePossession: number
  averagePassRate: number | null
}

// ??? Display field helpers (TWA ?숈씪 fallback chain) ?????????????????

function getOfficialDisplay(c: MatchCandidate) {
  return {
    // 1:1 怨듭떇寃쎄린 ?꾩슜 ?꾨뱶留??ъ슜 ???ㅻⅨ 紐⑤뱶 ?곗씠?곕줈 fallback 湲덉?
    rank: c.officialRank ?? null,
    rankPoint: c.officialRankPoint ?? null,
    rankLabel: c.officialRankLabel ?? null,
    rankIconUrl: c.officialRankIconUrl ?? null,
    winRate: c.officialWinRate ?? null,
    wins: c.officialWins ?? null,
    draws: c.officialDraws ?? null,
    losses: c.officialLosses ?? null,
    formation: c.officialFormation ?? null,
    teamColors: (c.officialTeamColors && c.officialTeamColors.length > 0)
      ? c.officialTeamColors
      : [],
  }
}

function getManagerDisplay(c: MatchCandidate) {
  return {
    // 媛먮룆紐⑤뱶 ?꾩슜 ?꾨뱶留??ъ슜 ??1:1 ?곗씠?곕줈 fallback 湲덉?
    rank: c.managerRank ?? null,
    rankPoint: c.managerRankPoint ?? null,
    rankLabel: null,
    rankIconUrl: c.managerRankIconUrl ?? null,
    winRate: c.managerWinRate ?? null,
    wins: c.managerWins ?? null,
    draws: c.managerDraws ?? null,
    losses: c.managerLosses ?? null,
    formation: c.managerFormation ?? null,
    teamColors: (c.managerTeamColors && c.managerTeamColors.length > 0)
      ? c.managerTeamColors
      : [],
  }
}

function formatTeamColors(colors: string[]) {
  if (!colors || colors.length === 0) return '-'
  return colors.slice(0, 3).join(' · ')
}

function statVal(v: string | number | null | undefined): string {
  if (v == null || v === '') return '-'
  return String(v)
}

function parseDetailValue(label: string, rawValue: string | null | undefined) {
  const value = rawValue ?? '-'

  if (label === '유효슛') {
    const m = value.match(/^(경기당\s*[^\s]+)\s+(\d+)\s*\|\s*(\d+)$/)
    if (m) return { primary: m[1], secondary: `총 유효슛 ${m[2]} · 경기수 ${m[3]}` }
    return { primary: value }
  }

  if (label === '주요 포지션') {
    const position = value.match(/\b(FW|MF|DF)\b/)?.[1] ?? null
    const percentages = value.match(/\d+(?:\.\d+)?%/g) ?? []
    const fw = percentages[0] ?? '-'
    const mf = percentages[1] ?? '-'
    const df = percentages[2] ?? '-'
    if (position) {
      const primaryShare = position === 'MF' ? mf : position === 'DF' ? df : fw
      const secondaryParts =
        position === 'FW' ? [`MF ${mf}`, `DF ${df}`] : position === 'MF' ? [`FW ${fw}`, `DF ${df}`] : [`FW ${fw}`, `MF ${mf}`]
      return { primary: `${position} ${primaryShare}`, secondary: secondaryParts.join(' · '), position }
    }
    return { primary: value }
  }

  const m = value.match(/^(.+?%)\s+(\d+)\s*\|\s*(\d+)$/)
  if (m) return { primary: m[1], secondary: `성공 ${m[2]} · 시도 ${m[3]}` }

  return { primary: value }
}

function getPositionColor(position: string | null | undefined, colors: ReturnType<typeof useTheme>['colors']): string {
  if (position === 'FW') return colors.positionFwFg
  if (position === 'MF') return colors.positionMfFg
  if (position === 'DF') return colors.positionDfFg
  return colors.title
}

function toRows<T>(items: T[]) {
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2))
  return rows
}

// ??? Match summary 怨꾩궛 ????????????????????????????????????????????????

function calcPassTotals(pass: MatchPassData) {
  const tryTotal =
    (pass.shortPassTry ?? 0) + (pass.longPassTry ?? 0) + (pass.bouncingLobPassTry ?? 0) +
    (pass.drivenGroundPassTry ?? 0) + (pass.throughPassTry ?? 0) + (pass.lobbedThroughPassTry ?? 0)
  const success =
    (pass.shortPassSuccess ?? 0) + (pass.longPassSuccess ?? 0) + (pass.bouncingLobPassSuccess ?? 0) +
    (pass.drivenGroundPassSuccess ?? 0) + (pass.throughPassSuccess ?? 0) + (pass.lobbedThroughPassSuccess ?? 0)
  return { try: tryTotal, success }
}

function getDisplayScore(player: MatchPlayerInfo) {
  return player.shoot.goalTotalDisplay ?? player.shoot.goalTotal ?? 0
}

function computeMatchSummary(matches: MatchData[], ouid: string): MatchSummary | null {
  let wins = 0
  let draws = 0
  let losses = 0
  let goalsFor = 0
  let goalsAgainst = 0
  let possessionTotal = 0
  const passRates: number[] = []
  let counted = 0

  for (const match of matches) {
    const players = match.matchInfo ?? []
    const me = players.find((p) => p.ouid === ouid)
    const opp = players.find((p) => p.ouid !== ouid)
    if (!me) continue

    const result = me.matchDetail.matchResult
    if (result === '승') wins++
    else if (result === '무') draws++
    else if (result === '패') losses++

    goalsFor += getDisplayScore(me)
    goalsAgainst += opp ? getDisplayScore(opp) : 0
    possessionTotal += me.matchDetail.possession ?? 0
    counted++

    if (me.pass) {
      const { try: t, success: s } = calcPassTotals(me.pass)
      if (t > 0) passRates.push(Math.round((s / t) * 100))
    }
  }

  if (counted === 0) return null

  return {
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    averagePossession: Math.round(possessionTotal / counted),
    averagePassRate: passRates.length > 0
      ? Math.round(passRates.reduce((a, b) => a + b, 0) / passRates.length)
      : null,
  }
}

// ??? Mode tabs ?????????????????????????????????????????????????????????

const SEARCH_MODES: { value: SearchMode; label: string }[] = [
  { value: 'official1on1', label: '1:1 공식경기' },
  { value: 'voltaLive', label: '볼타 라이브' },
  { value: 'manager', label: '감독모드' },
]

function normalizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('//')) return `https:${url}`
  if (url.startsWith('/')) return `https://fconline.nexon.com${url}`
  return url
}

function getModeAccent(mode: SearchMode) {
  return mode === 'manager' ? '#10b981' : mode === 'voltaLive' ? '#5f36d9' : '#457ae5'
}

function getMatchType(mode: SearchMode) {
  return mode === 'official1on1' ? 50 : mode === 'manager' ? 52 : 214
}

// ??? Official match helpers (TWA ?ы똿) ????????????????????????????????

function formatMetricNum(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return '-'
  return digits > 0 ? value.toFixed(digits) : String(value)
}

function fmtPct(value: number): string {
  return `${Math.round(value)}%`
}

function getControllerDisplay(value: string | null | undefined): string {
  if (!value || !value.trim()) return '-'
  const normalized = value.toLowerCase()
  if (normalized.includes('keyboard') || normalized.includes('키보드')) return `⌨️ ${value}`
  if (
    normalized.includes('gamepad') || normalized.includes('pad') ||
    normalized.includes('패드') || normalized.includes('controller') ||
    normalized.includes('컨트롤러')
  ) return `🎮 ${value}`
  return value
}

function getOfficialPlayerMetrics(player: MatchPlayerInfo) {
  const passTry = player.pass ? calcPassTotals(player.pass).try : 0
  const passSuccess = player.pass ? calcPassTotals(player.pass).success : 0
  const blockTry = player.defence?.blockTry ?? null
  const blockSuccess = player.defence?.blockSuccess ?? null
  const blockRate = (blockTry != null && blockTry > 0 && blockSuccess != null) ? (blockSuccess / blockTry) * 100 : null
  const tackleTry = player.defence?.tackleTry ?? null
  const tackleSuccess = player.defence?.tackleSuccess ?? null
  const tackleRate = (tackleTry != null && tackleTry > 0 && tackleSuccess != null) ? (tackleSuccess / tackleTry) * 100 : null

  return {
    controller: player.matchDetail.controller ?? null,
    possession: player.matchDetail.possession ?? 0,
    fouls: player.matchDetail.foul ?? 0,
    corners: player.matchDetail.cornerKick ?? 0,
    offsides: player.matchDetail.offsideCount ?? 0,
    yellowCards: player.matchDetail.yellowCards ?? 0,
    redCards: player.matchDetail.redCards ?? 0,
    rating: player.matchDetail.averageRating ?? 0,
    shots: player.shoot.shootTotal ?? 0,
    effectiveShots: player.shoot.effectiveShootTotal ?? 0,
    goals: (player.shoot.goalTotalDisplay ?? player.shoot.goalTotal ?? 0),
    passTry,
    passSuccess,
    passRate: passTry > 0 ? (passSuccess / passTry) * 100 : null,
    blockTry,
    blockSuccess,
    blockRate,
    tackleTry,
    tackleSuccess,
    tackleRate,
  }
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

function buildVoltaTeams(match: MatchData, myOuid: string) {
  const players = Array.isArray(match.matchInfo) ? match.matchInfo : []
  const me = players.find((player) => player.ouid === myOuid)
  if (!me) return null

  const myResult = me.matchDetail.matchResult
  const isDraw = myResult === '무'
  const teammates = isDraw ? players : players.filter((player) => player.matchDetail.matchResult === myResult)
  const opponents = isDraw ? [] : players.filter((player) => player.matchDetail.matchResult !== myResult)

  return {
    me,
    isDraw,
    teammates: teammates.length > 0 ? teammates : [me],
    opponents,
    myScore: getDisplayScore(me),
    opponentScore: isDraw ? getDisplayScore(me) : getDisplayScore(opponents[0]),
  }
}

function getVoltaPlayerMetrics(player: MatchPlayerInfo) {
  const status = player.player?.[0]?.status
  const shotTotal = status?.shoot ?? player.shoot.shootTotal ?? 0
  const effectiveShotTotal = status?.effectiveShoot ?? player.shoot.effectiveShootTotal ?? 0
  const goalTotal = status?.goal ?? player.shoot.goalTotalDisplay ?? player.shoot.goalTotal ?? 0
  const passTry = status?.passTry ?? calcPassTotals(player.pass ?? {
    shortPassTry: 0, shortPassSuccess: 0, longPassTry: 0, longPassSuccess: 0,
    bouncingLobPassTry: 0, bouncingLobPassSuccess: 0, drivenGroundPassTry: 0, drivenGroundPassSuccess: 0,
    throughPassTry: 0, throughPassSuccess: 0, lobbedThroughPassTry: 0, lobbedThroughPassSuccess: 0,
  }).try
  const passSuccess = status?.passSuccess ?? calcPassTotals(player.pass ?? {
    shortPassTry: 0, shortPassSuccess: 0, longPassTry: 0, longPassSuccess: 0,
    bouncingLobPassTry: 0, bouncingLobPassSuccess: 0, drivenGroundPassTry: 0, drivenGroundPassSuccess: 0,
    throughPassTry: 0, throughPassSuccess: 0, lobbedThroughPassTry: 0, lobbedThroughPassSuccess: 0,
  }).success
  const passRate = passTry > 0 ? Math.round((passSuccess / passTry) * 100) : null
  const blockTry = status?.blockTry ?? player.defence?.blockTry ?? null
  const blockSuccess = status?.block ?? player.defence?.blockSuccess ?? null
  const blockRate = blockTry != null && blockTry > 0 && blockSuccess != null ? (blockSuccess / blockTry) * 100 : null
  const tackleTry = status?.tackleTry ?? player.defence?.tackleTry ?? null
  const tackleSuccess = status?.tackle ?? player.defence?.tackleSuccess ?? null
  const tackleRate = tackleTry != null && tackleTry > 0 && tackleSuccess != null ? (tackleSuccess / tackleTry) * 100 : null

  return {
    rating: status?.spRating ?? player.matchDetail.averageRating ?? 0,
    possession: player.matchDetail.possession ?? 0,
    controller: getControllerDisplay(player.matchDetail.controller),
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
  const perspectiveMyScore = isFocusOnOriginalSide ? teams.myScore : teams.opponentScore
  const perspectiveOpponentScore = isFocusOnOriginalSide ? teams.opponentScore : teams.myScore
  const meMetrics = getVoltaPlayerMetrics(focusPlayer)
  const teammateMetrics = perspectiveTeammates.map((player) => ({
    player,
    metrics: getVoltaPlayerMetrics(player),
  }))
  const teammateGoalValues = teammateMetrics.map(({ metrics }) => metrics.goals)
  const teammateRatingValues = teammateMetrics.map(({ metrics }) => metrics.rating)
  const teammateDribbleValues = teammateMetrics.map(({ metrics }) => metrics.dribble)
  const teammateCount = teammateMetrics.length
  const goalRank = rankDescending(meMetrics.goals, teammateGoalValues)
  const ratingRank = rankDescending(meMetrics.rating, teammateRatingValues)
  const dribbleRank = rankDescending(meMetrics.dribble, teammateDribbleValues)
  const passAttempts = meMetrics.passTry ?? 0
  const effectiveShotRate = meMetrics.shots > 0 ? Math.round((meMetrics.effectiveShots / meMetrics.shots) * 100) : null
  const tackleCount = meMetrics.tackleSuccess ?? 0
  const blockCount = meMetrics.blockSuccess ?? 0
  const lines: string[] = []

  if (perspectiveMyScore > perspectiveOpponentScore) {
    lines.push(`${focusPlayer.nickname ?? '선수'} 기준으로 ${perspectiveMyScore}:${perspectiveOpponentScore} 승리 경기였습니다. 팀이 이긴 흐름 안에서 선택 선수의 기여가 기록에 분명히 남아 있습니다.`)
  } else if (perspectiveMyScore < perspectiveOpponentScore) {
    lines.push(`${focusPlayer.nickname ?? '선수'} 기준으로 ${perspectiveMyScore}:${perspectiveOpponentScore} 패배 경기였습니다. 개인 지표와 별개로 팀 밸런스와 마무리 완성도가 조금 더 필요했던 경기입니다.`)
  } else {
    lines.push(`${focusPlayer.nickname ?? '선수'} 기준으로 ${perspectiveMyScore}:${perspectiveOpponentScore} 무승부 경기였습니다. 작은 선택 하나가 결과를 바꿀 수 있었던 접전이었습니다.`)
  }

  if (meMetrics.goals > 0) {
    lines.push(`득점은 ${formatMetricNum(meMetrics.goals)}골로 팀 내 ${formatRank(goalRank, teammateCount)}였습니다. 결정적인 마무리 기여가 있었고 공격 관여도도 분명했습니다.`)
  } else if (meMetrics.shots >= 3) {
    lines.push(`슈팅은 ${formatMetricNum(meMetrics.shots)}회였지만 득점으로 이어지지 않았습니다. 박스 근처에서의 마지막 선택과 마무리 정확도를 조금 더 끌어올릴 여지가 있습니다.`)
  } else {
    lines.push(`슈팅 ${formatMetricNum(meMetrics.shots)}회, 유효슛 ${formatMetricNum(meMetrics.effectiveShots)}회로 공격 장면 관여는 제한적이었습니다. 다음 경기에서는 공을 더 자주 받는 위치 선점이 중요해 보입니다.`)
  }

  if (effectiveShotRate !== null) {
    if (effectiveShotRate >= 60) {
      lines.push(`유효슛 비율이 ${effectiveShotRate}%로 높았습니다. 슈팅을 가져갈 때는 비교적 좋은 각도에서 마무리한 흐름이 보였습니다.`)
    } else if (meMetrics.shots >= 2) {
      lines.push(`유효슛 비율이 ${effectiveShotRate}%에 머물렀습니다. 무리한 각도보다 한 번 더 연결해 더 좋은 찬스를 만드는 편이 효율적일 수 있습니다.`)
    }
  }

  if (meMetrics.passRate != null) {
    lines.push(`패스 성공률은 ${fmtPct(meMetrics.passRate)}이며 ${formatMetricNum(meMetrics.passSuccess)}/${formatMetricNum(meMetrics.passTry)}를 기록했습니다. 볼 순환 안정감은 이 수치에서 확인됩니다.`)
  }

  if (meMetrics.dribble > 0) {
    lines.push(`드리블은 ${formatMetricNum(meMetrics.dribble)}회로 팀 내 ${formatRank(dribbleRank, teammateCount)}였습니다. 직접 전진하거나 압박을 푸는 역할도 어느 정도 수행했습니다.`)
  }

  if (tackleCount > 0 || blockCount > 0) {
    lines.push(`수비 기여는 태클 성공 ${formatMetricNum(tackleCount)}회, 차단 성공 ${formatMetricNum(blockCount)}회였습니다. 공격뿐 아니라 전환 수비에서도 존재감이 있었습니다.`)
  }

  if (meMetrics.rating > 0) {
    lines.push(`평점은 ${formatMetricNum(meMetrics.rating, 2)}로 팀 내 ${formatRank(ratingRank, teammateCount)}였습니다. 경기 전반 영향력을 가장 직관적으로 보여주는 수치입니다.`)
  }

  return lines.slice(0, 4)
}

function buildOfficialTeams(match: MatchData, myOuid: string) {
  const players = Array.isArray(match.matchInfo) ? match.matchInfo : []
  const me = players.find((p) => p.ouid === myOuid)
  if (!me) return null
  const opponent = players.find((p) => p.ouid !== myOuid)
  if (!opponent) return null
  return {
    me,
    opponent,
    myScore: (me.shoot.goalTotalDisplay ?? me.shoot.goalTotal ?? 0),
    opponentScore: (opponent.shoot.goalTotalDisplay ?? opponent.shoot.goalTotal ?? 0),
  }
}

function buildOfficialMatchInsight(
  teams: NonNullable<ReturnType<typeof buildOfficialTeams>>,
): string[] {
  const meMetrics = getOfficialPlayerMetrics(teams.me)
  const opponentMetrics = getOfficialPlayerMetrics(teams.opponent)
  const shotGap = meMetrics.shots - opponentMetrics.shots
  const effectiveShotGap = meMetrics.effectiveShots - opponentMetrics.effectiveShots
  const possessionGap = meMetrics.possession - opponentMetrics.possession
  const myConversion = meMetrics.shots > 0 ? (meMetrics.goals / meMetrics.shots) * 100 : 0
  const opponentConversion = opponentMetrics.shots > 0 ? (opponentMetrics.goals / opponentMetrics.shots) * 100 : 0
  const myDefensiveStops = (meMetrics.tackleSuccess ?? 0) + (meMetrics.blockSuccess ?? 0)
  const ratingGap = meMetrics.rating - opponentMetrics.rating
  const isWin = teams.myScore > teams.opponentScore
  const isLoss = teams.myScore < teams.opponentScore
  const lines: string[] = []

  if (isWin) {
    lines.push(`${teams.myScore}:${teams.opponentScore} 승리 경기였습니다. 결과 면에서 주도권을 가져왔고, 승부처에서 더 정확한 마무리가 나왔습니다.`)
  } else if (isLoss) {
    lines.push(`${teams.myScore}:${teams.opponentScore} 패배 경기였습니다. 전체 흐름이 크게 밀린 경기라기보다 결정적인 장면 처리에서 차이가 났습니다.`)
  } else {
    lines.push(`${teams.myScore}:${teams.opponentScore} 무승부 경기였습니다. 큰 차이는 없었고 한 번의 선택이 결과를 바꿀 수 있었던 경기였습니다.`)
  }

  if (shotGap > 0 || effectiveShotGap > 0) {
    lines.push(`공격 지표는 슈팅 ${formatMetricNum(meMetrics.shots)}:${formatMetricNum(opponentMetrics.shots)}, 유효슛 ${formatMetricNum(meMetrics.effectiveShots)}:${formatMetricNum(opponentMetrics.effectiveShots)}였습니다. 찬스 생산 자체는 나쁘지 않았습니다.`)
  } else if (shotGap < 0 || effectiveShotGap < 0) {
    lines.push(`공격 지표는 슈팅 ${formatMetricNum(meMetrics.shots)}:${formatMetricNum(opponentMetrics.shots)}, 유효슛 ${formatMetricNum(meMetrics.effectiveShots)}:${formatMetricNum(opponentMetrics.effectiveShots)}였습니다. 박스 근처 진입과 슈팅 연결 빈도를 더 늘릴 필요가 있습니다.`)
  }

  if (myConversion === 0 && meMetrics.shots >= 4) {
    lines.push(`슈팅 수에 비해 득점 전환이 없었습니다. 마무리 정확도와 슈팅 타이밍 조절이 다음 경기의 핵심 포인트로 보입니다.`)
  } else if (myConversion > opponentConversion && meMetrics.goals > 0) {
    lines.push(`슈팅 대비 득점 전환 효율은 상대보다 좋았습니다. 같은 찬스 수에서도 더 날카롭게 마무리한 경기였습니다.`)
  } else if (myConversion + 15 < opponentConversion && opponentMetrics.goals > 0) {
    lines.push(`득점 전환 효율은 상대가 더 좋았습니다. 수비 실수 이후 허용한 결정적 장면이 결과 차이로 이어졌습니다.`)
  }

  if (Math.abs(possessionGap) >= 8) {
    if (possessionGap > 0) {
      lines.push(`점유율은 ${formatMetricNum(meMetrics.possession)}%로 앞섰지만, 점유 우위를 유효한 찬스로 연결하는 과정은 조금 더 다듬을 여지가 있습니다.`)
    } else {
      lines.push(`점유율은 ${formatMetricNum(opponentMetrics.possession)}% 쪽으로 기울었습니다. 공을 되찾은 뒤 전개를 더 빠르게 연결하면 흐름을 바꿀 수 있습니다.`)
    }
  }

  if (meMetrics.passRate != null && opponentMetrics.passRate != null) {
    lines.push(`패스 성공률은 ${fmtPct(meMetrics.passRate)}:${fmtPct(opponentMetrics.passRate)}였습니다. 전개 안정감과 템포 조절은 이 수치에서 확인됩니다.`)
  }

  if (myDefensiveStops >= 5) {
    lines.push(`태클과 차단 성공 합계가 ${formatMetricNum(myDefensiveStops)}회였습니다. 수비 전환에서 버텨낸 장면이 분명히 있었습니다.`)
  }

  if (meMetrics.fouls >= 3 || meMetrics.yellowCards > 0 || meMetrics.redCards > 0) {
    lines.push(`파울 ${formatMetricNum(meMetrics.fouls)}회${meMetrics.yellowCards > 0 ? `, 경고 ${formatMetricNum(meMetrics.yellowCards)}회` : ''}${meMetrics.redCards > 0 ? `, 퇴장 ${formatMetricNum(meMetrics.redCards)}회` : ''}로 수비 동작은 다소 급했습니다. 수비 선택을 조금 더 차분하게 가져갈 필요가 있습니다.`)
  }

  if (ratingGap <= -0.5 && (isLoss || teams.myScore === teams.opponentScore)) {
    lines.push(`평점은 ${formatMetricNum(meMetrics.rating, 2)}:${formatMetricNum(opponentMetrics.rating, 2)}로 상대가 조금 더 앞섰습니다. 세부 장면 완성도가 승부에 영향을 준 경기였습니다.`)
  } else if (ratingGap >= 0.5) {
    lines.push(`평점은 ${formatMetricNum(meMetrics.rating, 2)}:${formatMetricNum(opponentMetrics.rating, 2)}로 우세했습니다. 전반적인 경기 영향력 자체는 나쁘지 않았습니다.`)
  }

  return lines.slice(0, 4)
}

// ??? Match list helpers ????????????????????????????????????????????????

function formatMatchDate(dateStr: string) {
  const normalized = /Z$|[+-]\d{2}:\d{2}$/.test(dateStr) ? dateStr : `${dateStr}Z`
  const d = new Date(normalized)
  const year = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${year}.${m}.${day} ${h}:${min}`
}

function getMatchResult(match: MatchData, myOuid: string) {
  return match.matchInfo?.find((p) => p.ouid === myOuid)?.matchDetail.matchResult ?? null
}

function getMatchScore(match: MatchData, myOuid: string) {
  const players = match.matchInfo ?? []
  const me = players.find((p) => p.ouid === myOuid)
  if (!me) return null
  const myResult = me.matchDetail.matchResult
  const opponents = myResult === '무'
    ? players.filter((p) => p.ouid !== myOuid)
    : players.filter((p) => p.matchDetail.matchResult !== myResult)
  return { my: getDisplayScore(me), opp: getDisplayScore(opponents[0]) }
}

// ??? Main Screen ???????????????????????????????????????????????????????

export default function OwnerDetailScreen() {
  const { ouid, mode: initialMode, candidateData } = useLocalSearchParams<{
    ouid: string
    mode: string
    candidateData: string
  }>()
  const router = useRouter()
  const { colors, isDark } = useTheme()
  const tabBarHeight = useBottomTabBarHeight()

  const candidate: MatchCandidate = (() => {
    try { return JSON.parse(candidateData ?? '{}') } catch { return {} as MatchCandidate }
  })()

  const [mode, setMode] = useState<SearchMode>((initialMode as SearchMode) ?? 'official1on1')
  const [matches, setMatches] = useState<MatchData[]>([])
  const [matchLoading, setMatchLoading] = useState(false)
  const [error, setError] = useState('')

  const scrollRef = useRef<ScrollView>(null)
  useScrollToTop(scrollRef)

  const loadMatches = useCallback(async (searchMode: SearchMode) => {
    if (!ouid) return
    setMatchLoading(true)
    setMatches([])
    setError('')
    try {
      const res = await fetch(
        `${API_BASE}/api/nexon/matches/list?ouid=${ouid}&matchtype=${getMatchType(searchMode)}&limit=10`,
      )
      if (!res.ok) { setError('경기 기록을 불러오지 못했어요.'); return }
      const data = await res.json().catch(() => [])
      setMatches(Array.isArray(data) ? data : [])
    } catch {
      setError('경기 기록을 불러오지 못했어요.')
    } finally {
      setMatchLoading(false)
    }
  }, [ouid])

  useEffect(() => { loadMatches(mode) }, [])

  const handleModeChange = (newMode: SearchMode) => {
    if (newMode === mode) return
    setMode(newMode)
    loadMatches(newMode)
  }

  const s = styles(colors, isDark)

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: tabBarHeight + 12 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ?ㅻ뜑 */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={22} color={colors.title} />
            <Text style={s.backText} numberOfLines={1}>{candidate.nickname || '구단주 분석'}</Text>
          </TouchableOpacity>
        </View>

        {/* 紐⑤뱶 ??*/}
        <View style={s.modeRow}>
          {SEARCH_MODES.map((m) => {
            const isActive = mode === m.value
            return (
              <TouchableOpacity
                key={m.value}
                style={[s.modeTab, isActive && { backgroundColor: getModeAccent(m.value) }]}
                onPress={() => handleModeChange(m.value)}
                activeOpacity={0.8}
              >
                <Text style={[s.modeTabText, isActive && s.modeTabTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* 援щ떒二??곸꽭 ?뺣낫 移대뱶 */}
        <OwnerDetailCard
          candidate={candidate}
          mode={mode}
          colors={colors}
          matches={matches}
          ouid={ouid ?? ''}
          matchLoading={matchLoading}
        />

        {/* 蹂쇳? ?곸꽭 ?뺣낫 移대뱶 */}
        {mode === 'voltaLive' && candidate.voltaRank != null && (
          <VoltaDetailCard candidate={candidate} colors={colors} />
        )}

        {/* ?먮윭 */}
        {error ? (
          <View style={s.card}>
            <Text style={[s.emptyText, { color: colors.bodyText }]}>{error}</Text>
          </View>
        ) : null}

        {/* 寃쎄린 紐⑸줉 */}
        {(matchLoading || matches.length > 0) && ouid && (
          <MatchList
            matches={matches}
            myOuid={ouid}
            loading={matchLoading}
            mode={mode}
            colors={colors}
            onPress={(matchId) => router.push(`/(tabs)/matches/${ouid}/${matchId}` as any)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ??? 援щ떒二??곸꽭 ?뺣낫 移대뱶 ?????????????????????????????????????????????

function OwnerDetailCard({
  candidate, mode, colors, matches, ouid, matchLoading,
}: {
  candidate: MatchCandidate
  mode: SearchMode
  colors: ReturnType<typeof useTheme>['colors']
  matches: MatchData[]
  ouid: string
  matchLoading: boolean
}) {
  const isVolta = mode === 'voltaLive'
  const isManager = mode === 'manager'
  const accentColor = getModeAccent(mode)

  // Compute display fields with TWA fallback chain
  const display = isManager ? getManagerDisplay(candidate) : getOfficialDisplay(candidate)

  const badgeUrl =
    normalizeImageUrl(isVolta ? candidate.voltaRankIconUrl : display.rankIconUrl)
    ?? normalizeImageUrl(candidate.representativeTeamEmblemUrl)
    ?? normalizeImageUrl(candidate.teamColorEmblemUrl)

  const fallbackLabel = isManager ? 'GM' : isVolta ? 'VOLTA' : '1vs1'

  // Sub-header text
  const subText = (() => {
    if (isVolta) {
      const rating = candidate.voltaAverageRating != null ? `평점 ${candidate.voltaAverageRating}` : null
      const wr = `승률 ${candidate.voltaWinRate != null ? `${Math.round(candidate.voltaWinRate)}%` : '0%'}`
      return [rating, wr].filter(Boolean).join(' · ')
    }
    const wr = `승률 ${display.winRate != null ? `${Math.round(display.winRate)}%` : '0%'}`
    const label = display.rankLabel ?? (isManager ? '감독모드' : '1:1 공식경기')
    return `${wr} · ${label}`
  })()

  // Match summary (computed from loaded matches)
  const summary = useMemo<MatchSummary | null>(() => {
    if (!ouid || matches.length === 0) return null
    return computeMatchSummary(matches, ouid)
  }, [matches, ouid])

  // Build InfoCard items based on mode
  const infoItems = (() => {
    if (isVolta) {
      const hasVoltaRank = candidate.voltaRank != null
      if (!hasVoltaRank) return null
      const record = (candidate.voltaWins != null && candidate.voltaDraws != null && candidate.voltaLosses != null)
        ? `${candidate.voltaWins}승 ${candidate.voltaDraws}무 ${candidate.voltaLosses}패`
        : '-'
      return [
        { label: '현재 순위', value: `#${statVal(candidate.voltaRank)}`, valueColor: accentColor },
        { label: '랭킹 포인트', value: statVal(candidate.voltaRankPoint) },
        { label: '구단주 취임일', value: statVal(candidate.ownerSince) },
        { label: '대표팀', value: statVal(candidate.representativeTeam) },
        { label: '전적', value: record },
        { label: '승률', value: candidate.voltaWinRate != null ? `${candidate.voltaWinRate}%` : '-' },
        { label: '평균 평점', value: statVal(candidate.voltaAverageRating) },
        { label: 'MOM 선정', value: statVal(candidate.voltaMomCount) },
        { label: '득점', value: statVal(candidate.voltaGoals) },
        { label: '도움', value: statVal(candidate.voltaAssists) },
        { label: '구단가치', value: statVal(candidate.price) },
        {
          label: '최근 10경기',
          value: summary ? `${summary.wins}승 ${summary.draws}무 ${summary.losses}패` : (matchLoading ? '불러오는 중...' : '-'),
        },
      ]
    }

    const record = (display.wins != null && display.draws != null && display.losses != null)
      ? `${display.wins}승 ${display.draws}무 ${display.losses}패`
      : '-'
    const formation = display.formation
    const teamColorsStr = formatTeamColors(display.teamColors)

    return [
      {
        label: '현재 순위',
        value: display.rank != null ? `${display.rank}위` : '-',
        valueColor: display.rank != null ? accentColor : undefined,
      },
      { label: '랭킹 포인트', value: statVal(display.rankPoint) },
      { label: '구단주 취임일', value: statVal(candidate.ownerSince) },
      { label: '대표팀', value: statVal(candidate.representativeTeam) },
      { label: '전적', value: record },
      { label: '승률', value: display.winRate != null ? `${display.winRate}%` : '-' },
      {
        label: '주요 포메이션',
        value: statVal(formation),
        valueColor: formation ? accentColor : undefined,
      },
      { label: '대표팀 컬러', value: teamColorsStr },
      { label: '구단가치', value: statVal(candidate.price) },
      {
        label: '최근 10경기',
        value: summary ? `${summary.wins}승 ${summary.draws}무 ${summary.losses}패` : (matchLoading ? '불러오는 중...' : '-'),
      },
    ]
  })()

  // Build summary pills (4 for official/manager, 2 for volta)
  const summaryPills = (() => {
    if (!summary) return null
    if (isVolta) {
      return [
        { label: '최근 10경기 총 득점', value: String(summary.goalsFor) },
        { label: '최근 10경기 총 실점', value: String(summary.goalsAgainst) },
      ]
    }
    return [
      { label: '최근 10경기 총 득점', value: String(summary.goalsFor) },
      { label: '최근 10경기 총 실점', value: String(summary.goalsAgainst) },
      { label: '최근 10경기 평균 점유율', value: `${summary.averagePossession}%` },
      {
        label: '최근 10경기 평균 패스 성공률',
        value: summary.averagePassRate != null ? `${summary.averagePassRate}%` : '-',
      },
    ]
  })()

  return (
    <View style={[cd.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
      {/* ?ㅻ뜑 ??*/}
      <View style={cd.headerRow}>
        {badgeUrl ? (
          <Image source={{ uri: badgeUrl }} style={cd.badge} resizeMode="contain" />
        ) : (
          <View style={[cd.badgeFallback, { backgroundColor: colors.surfaceStrong }]}>
            <Text style={[cd.badgeFallbackText, { color: colors.bodyText }]}>{fallbackLabel}</Text>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[cd.nickname, { color: colors.title }]} numberOfLines={1}>
            {candidate.nickname}
          </Text>
          <Text style={[cd.subText, { color: colors.bodyText }]} numberOfLines={1}>
            {subText}
          </Text>
        </View>
      </View>

      {/* 蹂쇳? ??궧 ?녿뒗 寃쎌슦 */}
      {isVolta && infoItems === null ? (
        <View style={[cd.noRankBanner, { backgroundColor: colors.surfaceSoft }]}>
          <Text style={[cd.noRankText, { color: colors.bodyText }]}>
            볼타 랭크 1만위 밖이거나 공개 랭크 정보가 없어요.
          </Text>
        </View>
      ) : null}

      {/* ?명룷 移대뱶 洹몃━??*/}
      {infoItems ? (
        <View style={cd.grid}>
          {toRows(infoItems).map((row, i) => (
            <View key={i} style={cd.gridRow}>
              {row.map((item, j) => (
                <InfoCard
                  key={j}
                  label={item.label}
                  value={item.value}
                  valueColor={item.valueColor}
                  colors={colors}
                />
              ))}
              {row.length === 1 && <View style={{ flex: 1 }} />}
            </View>
          ))}
        </View>
      ) : null}

      {/* Summary Pills */}
      {summaryPills ? (
        <View style={[cd.grid, { marginTop: 8 }]}>
          {toRows(summaryPills).map((row, i) => (
            <View key={i} style={cd.gridRow}>
              {row.map((item, j) => (
                <SummaryPill key={j} label={item.label} value={item.value} colors={colors} />
              ))}
              {row.length === 1 && <View style={{ flex: 1 }} />}
            </View>
          ))}
        </View>
      ) : null}

    </View>
  )
}

function InfoCard({
  label, value, valueColor, colors,
}: {
  label: string
  value: string
  valueColor?: string
  colors: ReturnType<typeof useTheme>['colors']
}) {
  return (
    <View style={[cd.infoCard, { flex: 1, backgroundColor: colors.surfaceSoft }]}>
      <Text style={[cd.infoLabel, { color: colors.mutedText }]}>{label}</Text>
      <Text style={[cd.infoValue, { color: valueColor ?? colors.title }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

function DetailStatCard({
  label, rawValue, colors,
}: {
  label: string
  rawValue: string | null | undefined
  colors: ReturnType<typeof useTheme>['colors']
}) {
  const parsed = parseDetailValue(label, rawValue)
  const valueColor = 'position' in parsed && parsed.position
    ? getPositionColor(parsed.position as string, colors)
    : colors.title

  return (
    <View style={[cd.detailCard, { flex: 1, backgroundColor: colors.surfaceSoft }]}>
      <Text style={[cd.infoLabel, { color: colors.mutedText }]}>{label}</Text>
      <Text style={[cd.detailValue, { color: valueColor }]} numberOfLines={1}>{parsed.primary}</Text>
      {parsed.secondary ? (
        <Text style={[cd.detailSecondary, { color: colors.bodyText }]} numberOfLines={1}>{parsed.secondary}</Text>
      ) : null}
    </View>
  )
}

function VoltaDetailCard({
  candidate, colors,
}: {
  candidate: MatchCandidate
  colors: ReturnType<typeof useTheme>['colors']
}) {
  const items = [
    { label: '태클 성공률', value: candidate.voltaTackleRate },
    { label: '차단 성공률', value: candidate.voltaBlockRate },
    { label: '유효슛', value: candidate.voltaEffectiveShots },
    { label: '패스 성공률', value: candidate.voltaPassRate },
    { label: '드리블 성공률', value: candidate.voltaDribbleRate },
    { label: '주요 포지션', value: candidate.voltaMainPosition },
  ]

  return (
    <View style={[cd.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
      <Text style={[cd.sectionTitle, { color: colors.title }]}>상세 정보</Text>
      <View style={[cd.grid, { marginTop: 14 }]}>
        {toRows(items).map((row, i) => (
          <View key={i} style={cd.gridRow}>
            {row.map((item, j) => (
              <DetailStatCard key={j} label={item.label} rawValue={item.value} colors={colors} />
            ))}
            {row.length === 1 && <View style={{ flex: 1 }} />}
          </View>
        ))}
      </View>
    </View>
  )
}

function SummaryPill({
  label, value, colors,
}: {
  label: string
  value: string
  colors: ReturnType<typeof useTheme>['colors']
}) {
  return (
    <View style={[cd.infoCard, { flex: 1, backgroundColor: colors.surfaceSoft }]}>
      <Text style={[cd.infoLabel, { color: colors.mutedText }]}>{label}</Text>
      <Text style={[cd.infoValue, { color: colors.title }]} numberOfLines={1}>{value}</Text>
    </View>
  )
}

const cd = StyleSheet.create({
  card: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  badge: { width: 40, height: 40, borderRadius: 6 },
  badgeFallback: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgeFallbackText: { fontSize: 10, fontWeight: '700', letterSpacing: -0.2 },
  nickname: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5, marginBottom: 3 },
  subText: { fontSize: 13 },
  noRankBanner: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12 },
  noRankText: { fontSize: 13 },
  grid: { gap: 8 },
  gridRow: { flexDirection: 'row', gap: 8 },
  infoCard: { borderRadius: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, minHeight: 64, justifyContent: 'space-between' },
  infoLabel: { fontSize: 11 },
  infoValue: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.3, marginBottom: 0 },
  detailCard: { borderRadius: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, minHeight: 68 },
  detailValue: { fontSize: 14, fontWeight: '600', marginTop: 4, letterSpacing: -0.28 },
  detailSecondary: { fontSize: 12, marginTop: 3, lineHeight: 16 },
})

// ??? 寃쎄린 紐⑸줉 ?????????????????????????????????????????????????????????

function MatchList({
  matches, myOuid, loading, mode, colors, onPress,
}: {
  matches: MatchData[]
  myOuid: string
  loading: boolean
  mode: SearchMode
  colors: ReturnType<typeof useTheme>['colors']
  onPress: (matchId: string) => void
}) {
  const sectionTitle =
    mode === 'manager' ? '감독모드 최근 10경기'
    : mode === 'voltaLive' ? '볼타 라이브 최근 10경기'
    : '1:1 공식경기 최근 10경기'

  const emptyText =
    mode === 'manager' ? '감독모드 경기 기록이 없어요.'
    : mode === 'voltaLive' ? '볼타 라이브 경기 기록이 없어요.'
    : '1:1 공식경기 기록이 없어요.'

  if (loading) {
    return (
      <View style={[ml.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <Text style={[ml.sectionTitle, { color: colors.title }]}>{sectionTitle}</Text>
        <View style={ml.loadingRow}>
          <ActivityIndicator size="small" color={colors.accentBlue} />
          <Text style={[ml.loadingText, { color: colors.bodyText }]}>경기 기록 불러오는 중...</Text>
        </View>
      </View>
    )
  }

  if (matches.length === 0) {
    return (
      <View style={[ml.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <Text style={[ml.sectionTitle, { color: colors.title }]}>{sectionTitle}</Text>
        <Text style={[ml.emptyText, { color: colors.mutedText }]}>{emptyText}</Text>
      </View>
    )
  }

  if (mode === 'official1on1' || mode === 'manager') {
    return (
      <View style={[ml.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <Text style={[ml.sectionTitle, { color: colors.title }]}>{sectionTitle}</Text>
        <View style={{ gap: 8, marginTop: 12 }}>
          {matches.map((match) => (
            <OfficialMatchItem key={match.matchId} match={match} myOuid={myOuid} colors={colors} mode={mode} />
          ))}
        </View>
      </View>
    )
  }

  if (mode === 'voltaLive') {
    return (
      <View style={[ml.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
        <Text style={[ml.sectionTitle, { color: colors.title }]}>{sectionTitle}</Text>
        <View style={{ gap: 8, marginTop: 12 }}>
          {matches.map((match) => (
            <VoltaMatchItem
              key={match.matchId}
              match={match}
              myOuid={myOuid}
              colors={colors}
            />
          ))}
        </View>
      </View>
    )
  }

  return (
    <View style={[ml.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
      <Text style={[ml.sectionTitle, { color: colors.title }]}>{sectionTitle}</Text>
      <View style={{ marginTop: 4 }}>
        {matches.map((match, i) => {
          const result = getMatchResult(match, myOuid)
          const score = getMatchScore(match, myOuid)
          const isLast = i === matches.length - 1
          const resultColor = result === '승' ? '#2f8f57' : result === '패' ? '#d14343' : colors.bodyText
          const resultBg = result === '승' ? colors.resultWinSoft : result === '패' ? colors.resultLossSoft : colors.resultDrawSoft
          return (
            <TouchableOpacity
              key={match.matchId}
              style={[ml.row, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}
              onPress={() => onPress(match.matchId)}
              activeOpacity={0.7}
            >
              <View style={[ml.resultBadge, { backgroundColor: resultBg }]}>
                <Text style={[ml.resultText, { color: resultColor }]}>{result ?? '-'}</Text>
              </View>
              {score ? (
                <Text style={[ml.score, { color: colors.title }]}>{score.my} : {score.opp}</Text>
              ) : (
                <Text style={[ml.score, { color: colors.mutedText }]}>- : -</Text>
              )}
              <Text style={[ml.date, { color: colors.mutedText }]}>{formatMatchDate(match.matchDate)}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

// ??? 1:1 怨듭떇寃쎄린 ?꾩퐫?붿뼵 移대뱶 ????????????????????????????????????????

function OfficialMatchItem({
  match, myOuid, colors, mode,
}: {
  match: MatchData
  myOuid: string
  colors: ReturnType<typeof useTheme>['colors']
  mode: SearchMode
}) {
  const [expanded, setExpanded] = useState(false)
  const teams = buildOfficialTeams(match, myOuid)
  const result = match.matchInfo?.find((p) => p.ouid === myOuid)?.matchDetail.matchResult ?? null
  const score = getMatchScore(match, myOuid)

  const cardTintBg = result === '승' ? colors.resultWinSoft : result === '패' ? colors.resultLossSoft : colors.resultDrawSoft
  const badgeBg = result === '승' ? colors.resultWinBadgeSoft : result === '패' ? colors.resultLossBadgeSoft : colors.resultDrawBadgeSoft
  const resultEmoji = result === '승' ? '😆' : result === '패' ? '😭' : '😐'
  const resultLabel = result === '승' ? '승리' : result === '패' ? '패배' : '무승부'
  const resultLabelColor = result === '승' ? colors.accentBlue : result === '패' ? colors.accentRed : colors.bodyText
  const detailBtnColor = result === '패' ? '#ef6b76' : result === '무' ? '#7a8793' : '#5e8fe8'

  const meMetrics = teams ? getOfficialPlayerMetrics(teams.me) : null
  const opponentMetrics = teams ? getOfficialPlayerMetrics(teams.opponent) : null
  const insight = (teams && expanded) ? buildOfficialMatchInsight(teams) : []

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      style={[mc.card, { backgroundColor: cardTintBg }]}
      onPress={() => setExpanded((v) => !v)}
    >
      {/* ?묓엺 ?ㅻ뜑 */}
      <View style={mc.headerRow}>
        <View style={[mc.emojiBadge, { backgroundColor: badgeBg }]}>
          <Text style={mc.emoji}>{resultEmoji}</Text>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={mc.headLine1}>
            <Text style={[mc.resultLabel, { color: resultLabelColor }]}>{resultLabel}</Text>
            <Text style={[mc.dot, { color: colors.mutedText }]}>·</Text>
            <Text style={[mc.modeLabel, { color: colors.bodyText }]}>{mode === 'manager' ? '감독모드' : '1:1 공식경기'}</Text>
          </View>
          <View style={mc.headLine2}>
            {score ? (
              <Text style={[mc.score, { color: colors.title }]}>{score.my} : {score.opp}</Text>
            ) : (
              <Text style={[mc.score, { color: colors.mutedText }]}>- : -</Text>
            )}
            <Text style={[mc.dot, { color: colors.mutedText }]}>·</Text>
            <Text style={[mc.dateText, { color: colors.bodyText }]}>{formatMatchDate(match.matchDate)}</Text>
          </View>
        </View>

        {!expanded ? (
          <View style={[mc.detailBtn, { backgroundColor: detailBtnColor }]}>
            <Text style={mc.detailBtnText}>상세</Text>
          </View>
        ) : null}
      </View>

      {/* ?쇱퀜吏??댁슜 */}
      {expanded && teams && meMetrics && opponentMetrics ? (
        <View style={mc.expandedBody}>
          {/* 援щ떒二?誘몃땲 移대뱶 */}
          <View style={[mc.sectionCard, { backgroundColor: colors.cardBg, borderWidth: 0 }]}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={[mc.playerCard, { flex: 1, backgroundColor: colors.surfaceSoft }]}>
                <Text style={[mc.playerCardLabel, { color: colors.mutedText }]}>내 구단주</Text>
                <Text style={[mc.playerCardName, { color: colors.title }]} numberOfLines={1}>{teams.me.nickname ?? myOuid}</Text>
                <Text style={[mc.playerCardSub, { color: colors.bodyText }]}>{getControllerDisplay(teams.me.matchDetail.controller)}</Text>
              </View>
              <View style={[mc.playerCard, { flex: 1, backgroundColor: colors.surfaceSoft, alignItems: 'flex-end' }]}>
                <Text style={[mc.playerCardLabel, { color: colors.mutedText }]}>상대 구단주</Text>
                <Text style={[mc.playerCardName, { color: colors.title }]} numberOfLines={1}>{teams.opponent.nickname ?? '상대'}</Text>
                <Text style={[mc.playerCardSub, { color: colors.bodyText }]}>{getControllerDisplay(teams.opponent.matchDetail.controller)}</Text>
              </View>
            </View>
          </View>

          {/* 4 硫뷀듃由?移대뱶 */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <MetricCard label="득점" value={formatMetricNum(meMetrics.goals)} accent="blue" colors={colors} />
            <MetricCard
              label="유효슛 / 슛"
              value={`${formatMetricNum(meMetrics.effectiveShots)} / ${formatMetricNum(meMetrics.shots)}`}
              colors={colors}
            />
            <MetricCard
              label="패스 성공률"
              value={meMetrics.passRate != null ? fmtPct(meMetrics.passRate) : '-'}
              accent="green"
              colors={colors}
            />
            <MetricCard label="평점" value={formatMetricNum(meMetrics.rating, 2)} colors={colors} />
          </View>

          {/* 경기 지표 비교 */}
          <View style={[mc.sectionCard, { backgroundColor: colors.cardBg, borderWidth: 0 }]}>
            <Text style={[mc.sectionTitle, { color: colors.title }]}>경기 지표 비교</Text>
            <View style={{ marginTop: 10, gap: 6 }}>
              <ComparisonRow label="점유율" myValue={`${formatMetricNum(meMetrics.possession)}%`} oppValue={`${formatMetricNum(opponentMetrics.possession)}%`} myAccent={meMetrics.possession > opponentMetrics.possession} oppAccent={opponentMetrics.possession > meMetrics.possession} colors={colors} />
              <ComparisonRow label="슈팅" myValue={formatMetricNum(meMetrics.shots)} oppValue={formatMetricNum(opponentMetrics.shots)} myAccent={meMetrics.shots > opponentMetrics.shots} oppAccent={opponentMetrics.shots > meMetrics.shots} colors={colors} />
              <ComparisonRow label="유효슛" myValue={formatMetricNum(meMetrics.effectiveShots)} oppValue={formatMetricNum(opponentMetrics.effectiveShots)} myAccent={meMetrics.effectiveShots > opponentMetrics.effectiveShots} oppAccent={opponentMetrics.effectiveShots > meMetrics.effectiveShots} colors={colors} />
              <ComparisonRow label="패스 성공률" myValue={meMetrics.passRate != null ? fmtPct(meMetrics.passRate) : '-'} oppValue={opponentMetrics.passRate != null ? fmtPct(opponentMetrics.passRate) : '-'} myAccent={(meMetrics.passRate ?? -1) > (opponentMetrics.passRate ?? -1)} oppAccent={(opponentMetrics.passRate ?? -1) > (meMetrics.passRate ?? -1)} colors={colors} />
              <ComparisonRow label="태클 성공률" myValue={meMetrics.tackleRate != null ? fmtPct(meMetrics.tackleRate) : '-'} oppValue={opponentMetrics.tackleRate != null ? fmtPct(opponentMetrics.tackleRate) : '-'} myAccent={(meMetrics.tackleRate ?? -1) > (opponentMetrics.tackleRate ?? -1)} oppAccent={(opponentMetrics.tackleRate ?? -1) > (meMetrics.tackleRate ?? -1)} colors={colors} />
              <ComparisonRow label="차단 성공률" myValue={meMetrics.blockRate != null ? fmtPct(meMetrics.blockRate) : '-'} oppValue={opponentMetrics.blockRate != null ? fmtPct(opponentMetrics.blockRate) : '-'} myAccent={(meMetrics.blockRate ?? -1) > (opponentMetrics.blockRate ?? -1)} oppAccent={(opponentMetrics.blockRate ?? -1) > (meMetrics.blockRate ?? -1)} colors={colors} />
              <ComparisonRow label="파울" myValue={formatMetricNum(meMetrics.fouls)} oppValue={formatMetricNum(opponentMetrics.fouls)} colors={colors} />
              <ComparisonRow label="코너킥" myValue={formatMetricNum(meMetrics.corners)} oppValue={formatMetricNum(opponentMetrics.corners)} myAccent={meMetrics.corners > opponentMetrics.corners} oppAccent={opponentMetrics.corners > meMetrics.corners} colors={colors} />
            </View>
          </View>

          {/* 경기 분석 */}
          {insight.length > 0 ? (
            <View style={[mc.sectionCard, { backgroundColor: colors.cardBg }]}>
              <Text style={[mc.sectionTitle, { color: colors.title }]}>경기 분석</Text>
              <View style={{ marginTop: 8, gap: 4 }}>
                {insight.map((line, i) => (
                  <Text key={i} style={[mc.insightLine, { color: colors.bodyText }]}>{line}</Text>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

function MetricCard({
  label, value, accent = 'default', colors,
}: {
  label: string
  value: string
  accent?: 'default' | 'blue' | 'green' | 'red'
  colors: ReturnType<typeof useTheme>['colors']
}) {
  const valueColor =
    accent === 'blue' ? colors.accentBlue
    : accent === 'green' ? colors.accentGreen
    : accent === 'red' ? colors.accentRed
    : colors.title

  return (
    <View style={[mc.metricCard, { flex: 1, minWidth: '44%', backgroundColor: colors.cardBg }]}>
      <Text style={[mc.metricLabel, { color: colors.mutedText }]}>{label}</Text>
      <Text style={[mc.metricValue, { color: valueColor }]}>{value}</Text>
    </View>
  )
}

function ComparisonRow({
  label, myValue, oppValue, myAccent = false, oppAccent = false, colors,
}: {
  label: string
  myValue: string
  oppValue: string
  myAccent?: boolean
  oppAccent?: boolean
  colors: ReturnType<typeof useTheme>['colors']
}) {
  return (
    <View style={[mc.compRow, { backgroundColor: colors.surfaceSoft }]}>
      <Text style={[mc.compMyValue, { color: myAccent ? colors.accentBlue : colors.title }]}>{myValue}</Text>
      <Text style={[mc.compLabel, { color: colors.mutedText }]}>{label}</Text>
      <Text style={[mc.compOppValue, { color: oppAccent ? colors.accentRed : colors.title }]}>{oppValue}</Text>
    </View>
  )
}

function VoltaMatchItem({
  match,
  myOuid,
  colors,
}: {
  match: MatchData
  myOuid: string
  colors: ReturnType<typeof useTheme>['colors']
}) {
  const [expanded, setExpanded] = useState(false)
  const teams = buildVoltaTeams(match, myOuid)
  const [selectedPlayerOuid, setSelectedPlayerOuid] = useState(teams?.me.ouid ?? myOuid)
  const result = teams?.me.matchDetail.matchResult ?? null
  const score = getMatchScore(match, myOuid)
  const myPlayers = teams?.teammates ?? []
  const opponentPlayers = teams?.opponents ?? []
  const allPlayers = [...myPlayers, ...opponentPlayers].filter(
    (player, index, array) => array.findIndex((candidate) => candidate.ouid === player.ouid) === index,
  )
  const selectedPlayer = allPlayers.find((player) => player.ouid === selectedPlayerOuid) ?? teams?.me ?? null
  const selectedMetrics = selectedPlayer ? getVoltaPlayerMetrics(selectedPlayer) : null
  const isMyPlayer = selectedPlayer?.ouid === teams?.me.ouid
  const selectedSideLabel = isMyPlayer ? (teams?.isDraw ? '참가자' : '내팀') : '상대팀'
  const selectedCardSummary = selectedPlayer ? formatPlayerCardSummary(selectedPlayer) : null
  const matchInsight = teams && selectedPlayer ? buildMatchInsight(teams, selectedPlayer) : []

  const cardTintBg = result === '승' ? colors.resultWinSoft : result === '패' ? colors.resultLossSoft : colors.resultDrawSoft
  const badgeBg =
    result === '승' ? colors.resultWinBadgeSoft : result === '패' ? colors.resultLossBadgeSoft : colors.resultDrawBadgeSoft
  const resultEmoji = result === '승' ? '😆' : result === '패' ? '😭' : '😐'
  const resultLabel = result === '승' ? '승리' : result === '패' ? '패배' : '무승부'
  const resultLabelColor = result === '승' ? colors.accentBlue : result === '패' ? colors.accentRed : colors.bodyText
  const detailBtnColor = result === '패' ? '#ef6b76' : result === '무' ? '#7a8793' : '#5e8fe8'

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      style={[mc.card, { backgroundColor: cardTintBg }]}
      onPress={() => setExpanded((v) => !v)}
    >
      <View style={mc.headerRow}>
        <View style={[mc.emojiBadge, { backgroundColor: badgeBg }]}>
          <Text style={mc.emoji}>{resultEmoji}</Text>
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={mc.headLine1}>
            <Text style={[mc.resultLabel, { color: resultLabelColor }]}>{resultLabel}</Text>
            <Text style={[mc.dot, { color: colors.mutedText }]}>·</Text>
            <Text style={[mc.modeLabel, { color: colors.bodyText }]}>볼타 라이브</Text>
          </View>
          <View style={mc.headLine2}>
            {score ? (
              <Text style={[mc.score, { color: colors.title }]}>{score.my} : {score.opp}</Text>
            ) : (
              <Text style={[mc.score, { color: colors.mutedText }]}>- : -</Text>
            )}
            <Text style={[mc.dot, { color: colors.mutedText }]}>·</Text>
            <Text style={[mc.dateText, { color: colors.bodyText }]}>{formatMatchDate(match.matchDate)}</Text>
          </View>
        </View>

        {!expanded ? (
          <View style={[mc.detailBtn, { backgroundColor: detailBtnColor }]}>
            <Text style={mc.detailBtnText}>상세</Text>
          </View>
        ) : null}
      </View>

      {expanded && teams && selectedPlayer && selectedMetrics ? (
        <View style={mc.expandedBody}>
          <View style={[mc.sectionCard, { backgroundColor: colors.cardBg, borderWidth: 0 }]}>
            <View style={{ gap: 14 }}>
              <View>
                <Text style={[mc.sectionTitle, { color: colors.title }]}>{teams.isDraw ? '참가자' : '내팀'}</Text>
                <View style={mc.selectorWrap}>
                  {myPlayers.map((player) => (
                    <TouchableOpacity
                      key={player.ouid}
                      activeOpacity={0.85}
                      onPress={() => setSelectedPlayerOuid(player.ouid)}
                      style={[
                        mc.selectorChip,
                        {
                          borderColor: player.ouid === selectedPlayer.ouid ? colors.accentBlue : colors.cardBorder,
                          backgroundColor: player.ouid === selectedPlayer.ouid ? colors.cardBg : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          mc.selectorChipText,
                          { color: player.ouid === selectedPlayer.ouid ? colors.accentBlue : colors.bodyText },
                        ]}
                      >
                        {player.nickname ?? '선수'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {!teams.isDraw && opponentPlayers.length > 0 ? (
                <View>
                  <Text style={[mc.sectionTitle, { color: colors.title }]}>상대팀</Text>
                  <View style={mc.selectorWrap}>
                    {opponentPlayers.map((player) => (
                      <TouchableOpacity
                        key={player.ouid}
                        activeOpacity={0.85}
                        onPress={() => setSelectedPlayerOuid(player.ouid)}
                        style={[
                          mc.selectorChip,
                          {
                            borderColor: player.ouid === selectedPlayer.ouid ? colors.accentBlue : colors.cardBorder,
                            backgroundColor: player.ouid === selectedPlayer.ouid ? colors.cardBg : 'transparent',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            mc.selectorChipText,
                            { color: player.ouid === selectedPlayer.ouid ? colors.accentBlue : colors.bodyText },
                          ]}
                        >
                          {player.nickname ?? '선수'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          <View style={[mc.sectionCard, { backgroundColor: colors.cardBg, borderWidth: 0 }]}>
            <View style={mc.selectedHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[mc.playerCardLabel, { color: colors.mutedText }]}>{selectedSideLabel}</Text>
                <Text style={[mc.playerCardName, { color: colors.title }]} numberOfLines={1}>{selectedPlayer.nickname ?? '선수'}</Text>
              </View>
              <View style={[mc.controllerBadge, { backgroundColor: colors.surfaceSoft }]}>
                <Text style={[mc.controllerBadgeText, { color: colors.title }]}>{selectedMetrics.controller}</Text>
              </View>
            </View>
          </View>

          <View style={[mc.sectionCard, { backgroundColor: colors.cardBg }]}>
            <View style={mc.cardInfoRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[mc.playerCardLabel, { color: colors.mutedText }]}>사용 카드</Text>
                <Text style={[mc.playerCardName, { color: colors.title }]}>{selectedCardSummary ?? '정보 없음'}</Text>
              </View>
              {selectedPlayer.spId ? (
                <View style={[mc.playerImageFrame, { backgroundColor: colors.surfaceSoft }]}>
                  <Image
                    source={{ uri: `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${selectedPlayer.spId}.png` }}
                    style={mc.playerImage}
                    resizeMode="contain"
                  />
                </View>
              ) : null}
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <MetricCard label="득점" value={formatMetricNum(selectedMetrics.goals)} accent={isMyPlayer ? 'blue' : 'red'} colors={colors} />
            <MetricCard
              label="유효슛 / 슛"
              value={`${formatMetricNum(selectedMetrics.effectiveShots)} / ${formatMetricNum(selectedMetrics.shots)}`}
              colors={colors}
            />
            <MetricCard
              label="패스 성공률"
              value={selectedMetrics.passRate != null ? `${fmtPct(selectedMetrics.passRate)} (${formatMetricNum(selectedMetrics.passSuccess)}/${formatMetricNum(selectedMetrics.passTry)})` : '-'}
              accent="green"
              colors={colors}
            />
            <MetricCard
              label="차단 성공률"
              value={selectedMetrics.blockRate != null ? `${fmtPct(selectedMetrics.blockRate)} (${formatMetricNum(selectedMetrics.blockSuccess)}/${formatMetricNum(selectedMetrics.blockTry)})` : '-'}
              colors={colors}
            />
            <MetricCard label="드리블" value={formatMetricNum(selectedMetrics.dribble)} colors={colors} />
            <MetricCard label="평점" value={formatMetricNum(selectedMetrics.rating, 2)} colors={colors} />
          </View>

          <View style={[mc.sectionCard, { backgroundColor: colors.cardBg }]}>
            <Text style={[mc.sectionTitle, { color: colors.title }]}>경기 분석</Text>
            <View style={{ marginTop: 8, gap: 4 }}>
              {matchInsight.map((line, index) => (
                <Text key={`${match.matchId}-volta-insight-${index}`} style={[mc.insightLine, { color: colors.bodyText }]}>
                  {line}
                </Text>
              ))}
            </View>
          </View>
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

const mc = StyleSheet.create({
  card: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emojiBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  emoji: { fontSize: 22, lineHeight: 26, textAlign: 'center', transform: [{ translateY: 1 }] },
  headLine1: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  headLine2: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  headLine3: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  resultLabel: { fontSize: 14, fontWeight: '700' },
  modeLabel: { fontSize: 14, fontWeight: '600' },
  score: { fontSize: 14, fontWeight: '700', letterSpacing: -0.3 },
  dot: { fontSize: 12 },
  dateText: { fontSize: 13 },
  quickStat: { fontSize: 12 },
  detailBtn: { height: 28, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', flexShrink: 0 },
  detailBtnText: { fontSize: 12, fontWeight: '700', color: '#ffffff', lineHeight: 14 },
  expandedBody: { marginTop: 14, gap: 8 },
  sectionCard: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 0 },
  sectionTitle: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  selectorWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  selectorChip: { minHeight: 36, maxWidth: 128, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'center' },
  selectorChipText: { fontSize: 12, fontWeight: '700', lineHeight: 16 },
  selectedHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  controllerBadge: { minHeight: 40, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'flex-end', justifyContent: 'center' },
  controllerBadgeText: { fontSize: 14, fontWeight: '600', lineHeight: 17 },
  cardInfoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  playerImageFrame: { width: 56, height: 56, borderRadius: 16, overflow: 'hidden', flexShrink: 0 },
  playerImage: { width: 56, height: 56 },
  playerCard: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  playerCardLabel: { fontSize: 11 },
  playerCardName: { fontSize: 14, fontWeight: '600', marginTop: 3 },
  playerCardSub: { fontSize: 12, marginTop: 2 },
  metricCard: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 0 },
  metricLabel: { fontSize: 11 },
  metricValue: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  compRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  compMyValue: { flex: 1, fontSize: 14, fontWeight: '600', textAlign: 'left' },
  compLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center', flexShrink: 0, paddingHorizontal: 8 },
  compOppValue: { flex: 1, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  insightLine: { fontSize: 14, lineHeight: 22 },
})

const ml = StyleSheet.create({
  card: { borderRadius: 16, paddingHorizontal: 20, paddingVertical: 20, borderWidth: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '600', letterSpacing: -0.3, marginBottom: 10 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  loadingText: { fontSize: 14 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  resultBadge: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  resultText: { fontSize: 14, fontWeight: '700' },
  score: { fontSize: 16, fontWeight: '700', flex: 1, letterSpacing: -0.3 },
  date: { fontSize: 12, fontWeight: '500', flexShrink: 0 },
})

// ??? ?섏씠吏 ?ㅽ????????????????????????????????????????????????????????

const styles = (c: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.pageBg },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
    header: { minHeight: 32, justifyContent: 'center' },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '90%' },
    backText: { fontSize: 18, fontWeight: '700', color: c.title, letterSpacing: -0.4, flex: 1 },
    modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    modeTab: {
      height: 36, alignItems: 'center', justifyContent: 'center',
      borderRadius: 999, paddingHorizontal: 12, backgroundColor: 'transparent',
    },
    modeTabText: { fontSize: 15, fontWeight: '600', color: c.bodyText, letterSpacing: -0.2 },
    modeTabTextActive: { color: '#ffffff' },
    card: {
      backgroundColor: c.cardBg, borderRadius: 16,
      paddingHorizontal: 20, paddingVertical: 16,
      borderWidth: 1, borderColor: c.cardBorder,
    },
    emptyText: { fontSize: 14, textAlign: 'center' },
  })

