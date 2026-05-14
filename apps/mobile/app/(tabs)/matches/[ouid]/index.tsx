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
    spId?: number | null
    spGrade?: number | null
    spPosition?: number | null
    cardInfo?: {
      playerName?: string | null
      enhancement?: number | null
      seasonName?: string | null
    }
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

// ??? TOP 5 ?꾩슜 ???뺣낫 ????????????????????????????????????????????????????

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
  0: 'GK', 1: 'SW', 2: 'RWB', 3: 'RB', 4: 'RCB', 5: 'CB', 6: 'LCB',
  7: 'LB', 8: 'LWB', 9: 'RDM', 10: 'CDM', 11: 'LDM', 12: 'RM', 13: 'RCM',
  14: 'CM', 15: 'LCM', 16: 'LM', 17: 'RAM', 18: 'CAM', 19: 'LAM',
  20: 'RF', 21: 'CF', 22: 'LF', 23: 'RW', 24: 'RS', 25: 'ST', 26: 'LS', 27: 'LW',
}

function buildOfficialRecentPlayerLeaders(matches: MatchData[], ouid: string): OfficialRecentPlayerLeader[] {
  const playerMap = new Map<string, OfficialRecentPlayerLeader>()

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
      const prev = playerMap.get(key)

      playerMap.set(key, {
        key,
        spId,
        spPosition: typeof squadPlayer?.spPosition === 'number' ? squadPlayer.spPosition : (prev?.spPosition ?? null),
        enhancement,
        playerName: squadPlayer.cardInfo?.playerName ?? prev?.playerName ?? null,
        seasonName: squadPlayer.cardInfo?.seasonName ?? prev?.seasonName ?? null,
        appearances: (prev?.appearances ?? 0) + 1,
        goals: (prev?.goals ?? 0) + (status?.goal ?? 0),
        assists: (prev?.assists ?? 0) + (status?.assist ?? 0),
        effectiveShots: (prev?.effectiveShots ?? 0) + (status?.effectiveShoot ?? 0),
        shots: (prev?.shots ?? 0) + (status?.shoot ?? 0),
        averageRating: (prev?.averageRating ?? 0) + (status?.spRating ?? 0),
      })
    }
  }

  return [...playerMap.values()]
    .map((p) => ({ ...p, averageRating: p.appearances > 0 ? p.averageRating / p.appearances : 0 }))
    .sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals
      if (b.assists !== a.assists) return b.assists - a.assists
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating
      return b.effectiveShots - a.effectiveShots
    })
    .slice(0, 5)
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
  const lines: Array<{ priority: number; text: string }> = []
  const seen = new Set<string>()

  const addLine = (priority: number, text: string) => {
    if (seen.has(text)) return
    seen.add(text)
    lines.push({ priority, text })
  }

  const shotGap = meMetrics.shots - opponentMetrics.shots
  const effectiveShotGap = meMetrics.effectiveShots - opponentMetrics.effectiveShots
  const possessionGap = meMetrics.possession - opponentMetrics.possession
  const passGap =
    meMetrics.passRate != null && opponentMetrics.passRate != null
      ? meMetrics.passRate - opponentMetrics.passRate
      : null
  const myConversion = meMetrics.shots > 0 ? (meMetrics.goals / meMetrics.shots) * 100 : 0
  const opponentConversion = opponentMetrics.shots > 0 ? (opponentMetrics.goals / opponentMetrics.shots) * 100 : 0
  const myDefensiveStops = (meMetrics.tackleSuccess ?? 0) + (meMetrics.blockSuccess ?? 0)
  const opponentDefensiveStops = (opponentMetrics.tackleSuccess ?? 0) + (opponentMetrics.blockSuccess ?? 0)
  const ratingGap = meMetrics.rating - opponentMetrics.rating
  const isWin = teams.myScore > teams.opponentScore
  const isLoss = teams.myScore < teams.opponentScore
  const isDraw = teams.myScore === teams.opponentScore

  if (isWin) {
    if (effectiveShotGap >= 2) {
      addLine(120, `스코어는 ${teams.myScore}:${teams.opponentScore} 승리였고, 유효슛이 ${formatMetricNum(meMetrics.effectiveShots)}대${formatMetricNum(opponentMetrics.effectiveShots)}로 분명히 앞섰습니다. 이 경기는 단순히 운이 아니라 찬스 질 자체에서 우위를 만든 승리였습니다.`)
    } else if (shotGap < 0) {
      addLine(118, `슈팅 수는 ${formatMetricNum(meMetrics.shots)}대${formatMetricNum(opponentMetrics.shots)}로 밀렸는데도 ${teams.myScore}:${teams.opponentScore}로 이겼습니다. 볼을 오래 잡거나 많이 때린 경기라기보다, 적은 기회를 더 정확하게 끝낸 효율 승리에 가깝습니다.`)
    } else {
      addLine(116, `스코어 ${teams.myScore}:${teams.opponentScore} 승리입니다. 지표 전체를 압도한 경기까지는 아니어도, 적어도 결정적인 순간의 선택과 마무리는 상대보다 낫게 가져갔습니다.`)
    }
  } else if (isLoss) {
    if (shotGap >= 0 && effectiveShotGap >= 0) {
      addLine(120, `슈팅 ${formatMetricNum(meMetrics.shots)}대${formatMetricNum(opponentMetrics.shots)}, 유효슛 ${formatMetricNum(meMetrics.effectiveShots)}대${formatMetricNum(opponentMetrics.effectiveShots)}로 기회 수는 밀리지 않았는데 ${teams.myScore}:${teams.opponentScore}로 패했습니다. 이 경기는 전개보다 마무리 효율과 박스 안 결정력이 결과를 망친 쪽에 가깝습니다.`)
    } else if (shotGap <= -3 || effectiveShotGap <= -2) {
      addLine(118, `패배 원인이 비교적 명확합니다. 슈팅이 ${formatMetricNum(meMetrics.shots)}대${formatMetricNum(opponentMetrics.shots)}, 유효슛이 ${formatMetricNum(meMetrics.effectiveShots)}대${formatMetricNum(opponentMetrics.effectiveShots)}로 밀려 공격 장면 자체를 덜 만들었습니다. 이번 경기는 마무리 이전에 진입 횟수부터 부족했습니다.`)
    } else {
      addLine(116, `스코어는 ${teams.myScore}:${teams.opponentScore} 패배입니다. 전체 흐름이 완전히 한쪽으로 기운 경기는 아니었지만, 결정적 장면 한두 번에서 상대보다 덜 날카로웠고 그 차이가 그대로 점수 차로 남았습니다.`)
    }
  } else if (shotGap !== 0 || effectiveShotGap !== 0) {
    addLine(112, `무승부지만 내용은 완전히 대등하지 않았습니다. 슈팅 ${formatMetricNum(meMetrics.shots)}대${formatMetricNum(opponentMetrics.shots)}, 유효슛 ${formatMetricNum(meMetrics.effectiveShots)}대${formatMetricNum(opponentMetrics.effectiveShots)} 흐름을 보면, 먼저 한 골을 넣을 쪽이 누구였는지 힌트는 남은 경기였습니다.`)
  } else {
    addLine(108, `무승부 경기였습니다. 스코어뿐 아니라 주요 공격 지표도 비슷해서, 세부 운영 완성도 하나가 승부를 갈랐을 법한 팽팽한 흐름이었습니다.`)
  }

  if (shotGap >= 3 && effectiveShotGap <= 0) {
    addLine(110, `슈팅은 더 많이 가져갔는데 유효슛 우위로 이어지지 않았습니다. 숫자만 보면 공격 시도는 있었지만, 박스 안에서 급하게 끝내거나 각도가 없는 슛이 많았다는 뜻입니다. 같은 점유를 가져가더라도 '언제 때리느냐'를 더 까다롭게 골라야 합니다.`)
  } else if (shotGap <= -3 && effectiveShotGap >= 0) {
    addLine(106, `슈팅 총량은 적었지만 유효슛 격차는 크지 않았습니다. 많은 장면을 만드는 팀은 아니었지만, 들어간 공격은 비교적 날카로웠다는 뜻입니다. 다만 이 패턴은 한두 번만 막혀도 바로 득점력이 끊겨서, 공격 볼륨을 조금 더 늘릴 필요가 있습니다.`)
  }

  if (myConversion === 0 && meMetrics.shots >= 5) {
    addLine(114, `슈팅을 ${formatMetricNum(meMetrics.shots)}개 만들고도 무득점이었습니다. 공격이 안 풀렸다기보다, 마무리 선택이 계속 빗나간 경기로 보는 편이 더 정확합니다. 골문 정면으로 끝낸 슛이 적었다면 박스 안 첫 터치와 슈팅 타이밍부터 다시 봐야 합니다.`)
  } else if (myConversion + 18 < opponentConversion && opponentMetrics.goals > 0) {
    addLine(112, `결정력 차이가 컸습니다. 내 슈팅 대비 득점 전환율은 ${fmtPct(myConversion)}인데 상대는 ${fmtPct(opponentConversion)}였습니다. 같은 몇 번의 찬스라도 상대가 더 값비싸게 쓴 셈이라, 이 경기는 수비보다 마무리 쪽 손실이 더 크게 보입니다.`)
  } else if (myConversion >= 30 && meMetrics.goals > 0) {
    addLine(98, `득점 전환율이 ${fmtPct(myConversion)}로 높았습니다. 슛 수가 아주 많지 않아도 유효한 장면을 골로 바꾸는 효율은 괜찮았고, 이 감각을 유지한 채 공격 볼륨만 늘리면 결과가 더 안정될 수 있습니다.`)
  }

  if (possessionGap >= 8 && effectiveShotGap <= 0) {
    addLine(111, `점유율은 ${formatMetricNum(meMetrics.possession)}%로 우위였지만, 그 점유가 유효슛 우위로는 연결되지 않았습니다. 볼은 오래 들고 있었는데 상대 수비를 더 아프게 찌르지는 못한, 소유형 정체 구간이 있었다고 보는 게 맞습니다.`)
  } else if (possessionGap <= -8 && effectiveShotGap >= 0) {
    addLine(103, `점유율은 내줬지만 유효슛 내용은 크게 밀리지 않았습니다. 볼을 오래 쥐는 운영보다 탈취 후 빠르게 전진하는 패턴이 더 잘 먹힌 경기였고, 괜히 점유를 맞추려 하기보다 전환 속도를 살리는 편이 더 맞는 흐름이었습니다.`)
  } else if (possessionGap <= -10 && isLoss) {
    addLine(109, `점유율이 ${formatMetricNum(opponentMetrics.possession)}%까지 넘어가며 흐름을 너무 오래 상대에게 줬습니다. 수비 숫자를 맞춰도 결국 다시 공을 뺏기면 계속 눌리기 때문에, 첫 번째 전진 패스 성공률을 끌어올리는 게 우선입니다.`)
  }

  if (passGap != null) {
    const myPassRate = meMetrics.passRate ?? 0
    if (passGap <= -6) {
      addLine(110, `패스 성공률이 ${fmtPct(myPassRate)}로 상대보다 낮았습니다. 공격 템포를 올리려는 의도는 있었겠지만, 실제론 전개 안정성을 잃어버려 흐름을 오래 못 잡았습니다. 이번 경기는 무리한 직선 패스보다 한 번 더 풀어가는 선택이 필요했습니다.`)
    } else if (passGap >= 6 && (isLoss || isDraw) && effectiveShotGap <= 0) {
      addLine(102, `패스 성공률은 ${fmtPct(myPassRate)}로 더 좋았는데 결과 이득은 크지 않았습니다. 전개 안정성은 있었지만 상대 박스 앞에서 속도 변화나 침투 타이밍이 부족해서, 안전한 소유가 위협으로 전환되지 못했습니다.`)
    }
  }

  if (opponentMetrics.effectiveShots >= 4 && myDefensiveStops <= opponentDefensiveStops && isLoss) {
    addLine(108, `상대 유효슛이 ${formatMetricNum(opponentMetrics.effectiveShots)}개까지 나왔는데, 태클/차단 성공 합계는 ${formatMetricNum(myDefensiveStops)}회에 그쳤습니다. 최종 수비 구간에서 슛을 너무 편하게 허용한 경기였고, 박스 앞 압박 강도를 더 높여야 합니다.`)
  } else if (myDefensiveStops >= 6 && (isLoss || isDraw)) {
    addLine(96, `태클/차단 성공이 합계 ${formatMetricNum(myDefensiveStops)}회로 수비 개입은 적지 않았습니다. 버티는 힘은 있었지만, 끊어낸 뒤 바로 다시 내주는 장면이 반복되면 결국 수비 지표가 좋아도 경기 주도권은 가져오기 어렵습니다.`)
  }

  if (meMetrics.offsides >= 3) {
    addLine(100, `오프사이드가 ${formatMetricNum(meMetrics.offsides)}회면 침투 타이밍이 계속 한 박자 빨랐다는 뜻입니다. 지금은 공격 의도는 좋지만, 상대 라인을 흔들기 전에 먼저 뛰어나가면서 좋은 장면을 스스로 끊고 있습니다.`)
  }

  if (meMetrics.fouls >= 3 || meMetrics.yellowCards > 0 || meMetrics.redCards > 0) {
    addLine(94, `파울 ${formatMetricNum(meMetrics.fouls)}회${meMetrics.yellowCards > 0 ? `, 경고 ${formatMetricNum(meMetrics.yellowCards)}회` : ''}${meMetrics.redCards > 0 ? `, 퇴장 ${formatMetricNum(meMetrics.redCards)}회` : ''}로 수비 대응이 다소 급했습니다. 한 번 늦은 압박을 몸으로 끊는 장면이 많아지면, 이후 수비 선택지가 급격히 줄어듭니다.`)
  }

  if (ratingGap <= -0.5 && (isLoss || isDraw)) {
    addLine(101, `평점도 ${formatMetricNum(meMetrics.rating, 2)}대${formatMetricNum(opponentMetrics.rating, 2)}로 밀렸습니다. 특정 지표 하나만의 문제가 아니라, 공격 마무리와 수비 대응 전체에서 상대가 조금씩 더 나았다는 뜻입니다.`)
  } else if (ratingGap >= 0.5 && isLoss) {
    addLine(95, `평점은 ${formatMetricNum(meMetrics.rating, 2)}대${formatMetricNum(opponentMetrics.rating, 2)}로 크게 밀리지 않았는데 결과는 패배였습니다. 내용 전체가 나빴다기보다, 실점 장면 몇 번과 마무리 실패가 지나치게 치명적이었던 경기로 보는 편이 맞습니다.`)
  }

  return lines.sort((a, b) => b.priority - a.priority).map(({ text }) => text)
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

function buildManagerMatchInsight(
  teams: NonNullable<ReturnType<typeof buildOfficialTeams>>,
): string[] {
  const meMetrics = getOfficialPlayerMetrics(teams.me)
  const opponentMetrics = getOfficialPlayerMetrics(teams.opponent)
  const lines: Array<{ priority: number; text: string }> = []
  const seen = new Set<string>()

  const addLine = (priority: number, text: string) => {
    if (seen.has(text)) return
    seen.add(text)
    lines.push({ priority, text })
  }

  const shotGap = meMetrics.shots - opponentMetrics.shots
  const effectiveShotGap = meMetrics.effectiveShots - opponentMetrics.effectiveShots
  const possessionGap = meMetrics.possession - opponentMetrics.possession
  const cornerGap = meMetrics.corners - opponentMetrics.corners
  const passGap =
    meMetrics.passRate != null && opponentMetrics.passRate != null
      ? meMetrics.passRate - opponentMetrics.passRate
      : null
  const myConversion = meMetrics.shots > 0 ? (meMetrics.goals / meMetrics.shots) * 100 : 0
  const opponentConversion = opponentMetrics.shots > 0 ? (opponentMetrics.goals / opponentMetrics.shots) * 100 : 0
  const myDefensiveStops = (meMetrics.tackleSuccess ?? 0) + (meMetrics.blockSuccess ?? 0)
  const opponentDefensiveStops = (opponentMetrics.tackleSuccess ?? 0) + (opponentMetrics.blockSuccess ?? 0)
  const ratingGap = meMetrics.rating - opponentMetrics.rating
  const isWin = teams.myScore > teams.opponentScore
  const isLoss = teams.myScore < teams.opponentScore
  const isDraw = teams.myScore === teams.opponentScore

  // 결과 요약
  if (isWin) {
    if (effectiveShotGap >= 3) {
      addLine(120, `${teams.myScore}:${teams.opponentScore} 승리였습니다. 유효슛이 ${formatMetricNum(meMetrics.effectiveShots)}대${formatMetricNum(opponentMetrics.effectiveShots)}로 확실히 앞섰고, 전술적으로 더 많은 위협적 장면을 만들어낸 경기였습니다.`)
    } else if (shotGap < 0 && effectiveShotGap >= 0) {
      addLine(118, `슈팅 총량은 ${formatMetricNum(meMetrics.shots)}대${formatMetricNum(opponentMetrics.shots)}로 적었지만 ${teams.myScore}:${teams.opponentScore} 승리를 거뒀습니다. 볼 점유보다 빠른 역습과 세트피스 활용이 결과를 만들어낸 경기로 보입니다.`)
    } else if (shotGap >= 5) {
      addLine(116, `슈팅을 ${formatMetricNum(meMetrics.shots)}대${formatMetricNum(opponentMetrics.shots)}로 압도했고 ${teams.myScore}:${teams.opponentScore} 승리까지 이어졌습니다. 지배적인 공격 전개로 상대를 꾸준히 압박한 경기였습니다.`)
    } else {
      addLine(114, `${teams.myScore}:${teams.opponentScore} 승리입니다. 수치 전체를 압도하진 않았더라도 득점 장면에서의 전술 실행이 더 날카로웠습니다.`)
    }
  } else if (isLoss) {
    if (shotGap >= 2 && effectiveShotGap >= 0) {
      addLine(120, `슈팅 ${formatMetricNum(meMetrics.shots)}대${formatMetricNum(opponentMetrics.shots)}, 유효슛 ${formatMetricNum(meMetrics.effectiveShots)}대${formatMetricNum(opponentMetrics.effectiveShots)}로 공격 기회는 더 많이 만들었는데도 ${teams.myScore}:${teams.opponentScore}로 패했습니다. 마무리 효율과 실점 장면의 수비 집중력이 이 경기의 핵심 패인이었습니다.`)
    } else if (shotGap <= -4 || effectiveShotGap <= -3) {
      addLine(118, `슈팅 ${formatMetricNum(meMetrics.shots)}대${formatMetricNum(opponentMetrics.shots)}, 유효슛 ${formatMetricNum(meMetrics.effectiveShots)}대${formatMetricNum(opponentMetrics.effectiveShots)}로 공격 전개 자체가 눌렸습니다. ${teams.myScore}:${teams.opponentScore} 패배는 마무리 이전에 상대 진영 진입 횟수부터 부족했던 결과입니다.`)
    } else {
      addLine(116, `${teams.myScore}:${teams.opponentScore} 패배입니다. 전체 지표가 크게 기운 경기는 아니었지만, 실점 장면 한두 번에서 수비 조직이 흔들렸고 그 차이가 결과로 이어졌습니다.`)
    }
  } else if (shotGap !== 0 || effectiveShotGap !== 0) {
    addLine(110, `무승부지만 내용은 완전히 대등하지 않았습니다. 슈팅 ${formatMetricNum(meMetrics.shots)}대${formatMetricNum(opponentMetrics.shots)}, 유효슛 ${formatMetricNum(meMetrics.effectiveShots)}대${formatMetricNum(opponentMetrics.effectiveShots)} 흐름을 보면 어느 쪽이 먼저 균형을 깼을지 힌트가 보이는 경기였습니다.`)
  } else {
    addLine(106, `무승부 경기였습니다. 양 팀 주요 공격 지표가 비슷하게 맞선 만큼, 세트피스 하나 혹은 전술 교체 타이밍이 경기를 갈랐을 가능성이 높습니다.`)
  }

  // 슈팅 품질 괴리 분석
  if (shotGap >= 5 && effectiveShotGap <= 1) {
    addLine(112, `슈팅은 많이 가져갔는데 유효슛으로 연결되지 않았습니다. 박스 외곽이나 불리한 각도에서 무리하게 때린 슛이 많았다는 의미로, 빌드업 마지막 단계에서 진입 위치를 더 까다롭게 골라야 합니다.`)
  } else if (shotGap <= -4 && effectiveShotGap >= 0) {
    addLine(108, `슈팅 총량은 적었지만 유효슛 격차는 크지 않았습니다. 공격 장면 수는 부족했어도 만들어낸 기회의 질은 나쁘지 않았다는 뜻입니다. 공격 빈도를 끌어올리는 게 다음 경기 포인트입니다.`)
  }

  // 득점 전환율
  if (myConversion === 0 && meMetrics.shots >= 6) {
    addLine(114, `슈팅을 ${formatMetricNum(meMetrics.shots)}개 만들고도 무득점이었습니다. 공격 전개보다 마무리 선택이 문제였을 가능성이 높으며, 세트피스 연계나 박스 안 침투 위치를 다시 점검할 필요가 있습니다.`)
  } else if (myConversion + 15 < opponentConversion && opponentMetrics.goals > 0) {
    addLine(112, `득점 전환율 차이가 컸습니다. 내 전환율 ${fmtPct(myConversion)}에 비해 상대는 ${fmtPct(opponentConversion)}였습니다. 같은 유효슛이라도 상대가 더 위협적인 상황에서 슛을 끌어낸 경기로 볼 수 있습니다.`)
  } else if (myConversion >= 25 && meMetrics.goals > 0) {
    addLine(96, `득점 전환율이 ${fmtPct(myConversion)}로 준수했습니다. 많은 찬스를 요구하지 않고도 실점으로 마무리한 효율은 좋은 편이었습니다.`)
  }

  // 점유율 - 전술 효율 연계
  if (possessionGap >= 10 && effectiveShotGap <= 0) {
    addLine(111, `점유율은 ${formatMetricNum(meMetrics.possession)}%로 앞섰지만 유효슛으로 이어지지 않았습니다. 11명 운영에서 볼 보유 시간이 길어도 공격 전환 속도나 침투 타이밍이 늦으면 유효한 찬스로 연결되지 않습니다.`)
  } else if (possessionGap <= -10 && isLoss) {
    addLine(109, `점유율이 ${formatMetricNum(opponentMetrics.possession)}%까지 넘어갔습니다. 진형이 눌린 상태에서 볼을 되찾더라도 조직적인 전진이 어렵기 때문에, 미드필드 압박 개시 위치를 높이는 전술 조정이 필요합니다.`)
  } else if (possessionGap <= -10 && effectiveShotGap >= 0) {
    addLine(100, `점유율을 내줬는데도 유효슛 내용은 크게 밀리지 않았습니다. 볼 없는 상태에서도 카운터어택으로 위협을 만든 흐름이었고, 이 패턴은 상대 전술에 따라 계속 유효할 수 있습니다.`)
  }

  // 패스 성공률
  if (passGap != null) {
    const myPassRate = meMetrics.passRate ?? 0
    if (passGap <= -8) {
      addLine(108, `패스 성공률이 ${fmtPct(myPassRate)}로 상대보다 낮았습니다. 감독모드에서 패스 안정성이 떨어지면 미드필드 연결이 끊겨 공격 전개 속도가 크게 줄어듭니다. 짧은 패스 연계로 볼 흐름을 안정시킬 필요가 있습니다.`)
    } else if (passGap >= 8 && (isLoss || isDraw) && effectiveShotGap <= 0) {
      addLine(100, `패스 성공률은 ${fmtPct(myPassRate)}로 더 좋았는데 유효슛 우위로는 이어지지 않았습니다. 안전한 패스 빌드업이 상대 수비를 흔드는 수직 전개나 침투로 연결되지 못하고 있을 가능성이 있습니다.`)
    }
  }

  // 수비 지표
  if (opponentMetrics.effectiveShots >= 5 && myDefensiveStops <= opponentDefensiveStops && isLoss) {
    addLine(107, `상대 유효슛이 ${formatMetricNum(opponentMetrics.effectiveShots)}개 나왔는데 태클·차단 합계는 ${formatMetricNum(myDefensiveStops)}회에 그쳤습니다. 최종 수비 구간에서 슛을 자유롭게 허용했고, 수비 블록 조직을 더 촘촘하게 가져가야 합니다.`)
  } else if (myDefensiveStops >= 8 && (isLoss || isDraw)) {
    addLine(95, `태클·차단 성공이 ${formatMetricNum(myDefensiveStops)}회로 수비 개입은 많았습니다. 다만 개인 수비 횟수가 많다는 건 조직 압박이 무너진 뒤 개인 대응으로 수비한 장면이 많았다는 뜻이기도 합니다.`)
  }

  // 코너킥 세트피스
  if (cornerGap >= 4 && meMetrics.corners >= 5) {
    addLine(98, `코너킥을 ${formatMetricNum(meMetrics.corners)}회 가져갔습니다. 감독모드에서 코너킥은 득점 기회로 직결될 수 있는데, 이 찬스를 유효슛으로 얼마나 전환했는지가 다음 세트피스 전략의 척도가 됩니다.`)
  } else if (cornerGap <= -4 && opponentMetrics.corners >= 5 && isLoss) {
    addLine(104, `상대 코너킥이 ${formatMetricNum(opponentMetrics.corners)}회로 많았습니다. 세트피스 수비 조직이 지속적으로 압박을 받은 경기였고, 코너킥 수비 포지셔닝을 점검할 필요가 있습니다.`)
  }

  // 파울·카드
  if (meMetrics.fouls >= 4 || meMetrics.yellowCards > 0 || meMetrics.redCards > 0) {
    addLine(93, `파울 ${formatMetricNum(meMetrics.fouls)}회${meMetrics.yellowCards > 0 ? `, 경고 ${formatMetricNum(meMetrics.yellowCards)}회` : ''}${meMetrics.redCards > 0 ? `, 퇴장 ${formatMetricNum(meMetrics.redCards)}회` : ''}로 수비 대응이 다소 거칠었습니다. 감독모드에서 파울이 누적되면 프리킥 기회를 자주 내줘 세트피스 실점 위험이 높아집니다.`)
  }

  // 평점
  if (ratingGap <= -0.5 && (isLoss || isDraw)) {
    addLine(101, `평점도 ${formatMetricNum(meMetrics.rating, 2)}대${formatMetricNum(opponentMetrics.rating, 2)}로 밀렸습니다. 개별 장면 완성도 전반에서 상대가 조금씩 앞선 경기였고, 특정 포지션보다 팀 전체 전술 실행력 차이가 평점 격차로 이어졌을 가능성이 높습니다.`)
  } else if (ratingGap >= 0.5 && isLoss) {
    addLine(94, `평점은 ${formatMetricNum(meMetrics.rating, 2)}대${formatMetricNum(opponentMetrics.rating, 2)}로 앞섰는데도 패배였습니다. 전반적 내용은 나쁘지 않았지만 실점 장면 처리가 지나치게 치명적이었습니다.`)
  }

  return lines.sort((a, b) => b.priority - a.priority).map(({ text }) => text)
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

        {/* 최근 10경기 주요 선수 TOP 5 */}
        {mode !== 'voltaLive' && matches.length > 0 && ouid && (
          <TopPlayersBlock matches={matches} ouid={ouid} mode={mode} colors={colors} />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── TOP 5 선수 블록 ──────────────────────────────────────────────────────────

function PlayerImageWithFallback({ spId, size, colors }: { spId: number; size: number; colors: ReturnType<typeof useTheme>['colors'] }) {
  const urls = [
    `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${spId}.png`,
    `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${spId % 1000000}.png`,
    `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/players/p${spId}.png`,
    `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/players/p${spId % 1000000}.png`,
  ]
  const [urlIndex, setUrlIndex] = useState(0)
  const failed = urlIndex >= urls.length

  if (failed) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 22 }}>⚽</Text>
      </View>
    )
  }

  return (
    <Image
      source={{ uri: urls[urlIndex] }}
      style={{ width: size, height: size }}
      resizeMode="contain"
      onError={() => setUrlIndex((i) => i + 1)}
    />
  )
}

const POSITION_GROUP_COLORS: Record<string, { bg: string; fg: string }> = {
  GK: { bg: 'rgba(234,179,8,0.15)', fg: '#ca8a04' },
  DF: { bg: 'rgba(59,130,246,0.13)', fg: '#2563eb' },
  MF: { bg: 'rgba(34,197,94,0.13)', fg: '#16a34a' },
  FW: { bg: 'rgba(239,68,68,0.13)', fg: '#dc2626' },
}

function getPositionGroup(pos: string | null | undefined): 'GK' | 'DF' | 'MF' | 'FW' {
  if (!pos) return 'MF'
  if (pos === 'GK' || pos === 'SW') return 'GK'
  if (['RWB','RB','RCB','CB','LCB','LB','LWB'].includes(pos)) return 'DF'
  if (['RDM','CDM','LDM','RM','RCM','CM','LCM','LM','RAM','CAM','LAM'].includes(pos)) return 'MF'
  return 'FW'
}

function TopPlayersBlock({
  matches, ouid, mode, colors,
}: {
  matches: MatchData[]
  ouid: string
  mode: SearchMode
  colors: ReturnType<typeof useTheme>['colors']
}) {
  const accentColor = getModeAccent(mode)
  const topPlayers = buildOfficialRecentPlayerLeaders(matches, ouid)
  if (topPlayers.length === 0) return null

  return (
    <View style={[tp.card, { backgroundColor: colors.cardBg, borderColor: colors.divider }]}>
      <View style={tp.titleRow}>
        <Text style={[tp.titleMain, { color: colors.title }]}>최근 10경기 주요 선수 </Text>
        <Text style={[tp.titleAccent, { color: accentColor }]}>TOP 5</Text>
      </View>

      <View style={{ marginTop: 4 }}>
        {topPlayers.map((player, i) => {
          const posLabel = player.spPosition != null
            ? (FC_POSITION_LABELS[player.spPosition] ?? null)
            : null
          const group = getPositionGroup(posLabel)
          const posColor = POSITION_GROUP_COLORS[group]

          return (
            <View key={player.key} style={[tp.row, i < topPlayers.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
              <View style={[tp.imgBox, { backgroundColor: colors.surfaceStrong }]}>
                <PlayerImageWithFallback spId={player.spId} size={52} colors={colors} />
              </View>

              <View style={tp.infoCol}>
                <View style={tp.nameRow}>
                  {posLabel ? (
                    <View style={[tp.posBadge, { backgroundColor: posColor.bg }]}>
                      <Text style={[tp.posBadgeText, { color: posColor.fg }]}>{posLabel}</Text>
                    </View>
                  ) : null}
                  <Text style={[tp.playerName, { color: colors.title }]} numberOfLines={1}>
                    {player.playerName ?? '선수 정보 없음'}
                  </Text>
                </View>

                {(player.enhancement != null || player.seasonName) ? (
                  <Text style={[tp.subtitle, { color: colors.mutedText }]}>
                    {[
                      player.enhancement != null ? `${player.enhancement}강` : null,
                      player.seasonName || null,
                    ].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}

                <View style={tp.statsRow}>
                  <Text style={[tp.stat, { color: colors.bodyText }]}>{player.appearances}경기</Text>
                  <Text style={[tp.dot, { color: colors.mutedText }]}>·</Text>
                  <Text style={[tp.stat, { color: colors.bodyText }]}>평점 {player.averageRating.toFixed(2)}</Text>
                  <Text style={[tp.dot, { color: colors.mutedText }]}>·</Text>
                  <Text style={[tp.stat, { color: accentColor }]}>{player.goals}골 {player.assists}도움</Text>
                  <Text style={[tp.dot, { color: colors.mutedText }]}>·</Text>
                  <Text style={[tp.stat, { color: colors.bodyText }]}>유효슛 {player.effectiveShots}</Text>
                </View>
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const tp = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  titleMain: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  titleAccent: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  imgBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  posBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  posBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
  },
  playerName: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 3,
    marginTop: 2,
  },
  stat: {
    fontSize: 11,
    lineHeight: 15,
  },
  dot: {
    fontSize: 11,
    lineHeight: 15,
  },
})

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
  const insight = (teams && expanded)
    ? (mode === 'manager' ? buildManagerMatchInsight(teams) : buildOfficialMatchInsight(teams))
    : []

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

