'use client'

import { ReactNode, useEffect, useEffectEvent, useRef, useState } from 'react'
import { ArrowLeft, MagnifyingGlass } from '@phosphor-icons/react'
import LoadingDots from '@/components/ui/LoadingDots'
import VoltaBestStatsCard from '@/features/match-analysis/components/VoltaBestStatsCard'
import VoltaTopRankCard from '@/features/match-analysis/components/VoltaTopRankCard'
import {
  calcPassTotal,
  MatchData,
  MatchPlayerInfo,
  MatchSearchCandidate,
  VoltaBestStatItem,
  VoltaTopRankItem,
} from '@/features/match-analysis/types'

const OUID_CACHE_KEY = 'fconline.match.ouid-cache'
const MATCH_SEARCH_CACHE_KEY = 'fconline.match.search-cache.v2'
const MATCH_RESULTS_CACHE_KEY = 'fconline.match.results-cache.v1'
const VOLTA_BEST_CACHE_KEY = 'fconline.match.volta-best-cache.v3'
const VOLTA_TOP_CACHE_KEY = 'fconline.match.volta-top-cache.v2'
const MATCH_LIST_LIMIT = 10
const MATCH_LIST_TIMEOUT_MS = 10000
const INITIAL_VISIBLE_MATCHES = 3
const MATCH_RESULTS_CACHE_TTL_MS = 1000 * 60 * 10
const POSITION_BADGE_STYLES: Record<string, string> = {
  FW: 'bg-[#fdecec] text-[#d14343]',
  MF: 'bg-[#eaf6ee] text-[#2f8f57]',
  DF: 'bg-[#e8f1ff] text-[#457ae5]',
}

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
type VoltaBestCacheEntry = {
  dateKey: string
  items: VoltaBestStatItem[]
}
type VoltaTopRankCacheEntry = {
  dateKey: string
  items: VoltaTopRankItem[]
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

  return entry
}

function writeCachedSearch(nickname: string, entry: MatchSearchCacheEntry) {
  const parsed = readJsonStorage<MatchSearchCacheStore>(MATCH_SEARCH_CACHE_KEY) ?? {}
  parsed[normalizeNicknameKey(nickname)] = entry
  writeJsonStorage(MATCH_SEARCH_CACHE_KEY, parsed)
}

function readCachedMatches(ouid: string) {
  const parsed = readJsonStorage<MatchResultsCacheStore>(MATCH_RESULTS_CACHE_KEY)
  if (!parsed) return null

  const entry = parsed[ouid]
  if (!entry) return null

  if (Date.now() - entry.cachedAt > MATCH_RESULTS_CACHE_TTL_MS) {
    return null
  }

  return Array.isArray(entry.matches) ? entry.matches : null
}

function writeCachedMatches(ouid: string, matches: MatchData[]) {
  const parsed = readJsonStorage<MatchResultsCacheStore>(MATCH_RESULTS_CACHE_KEY) ?? {}
  parsed[ouid] = {
    cachedAt: Date.now(),
    matches,
  }
  writeJsonStorage(MATCH_RESULTS_CACHE_KEY, parsed)
}

function updateMatchesUrl(nickname: string | null) {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)

  if (nickname?.trim()) {
    url.searchParams.set('nickname', nickname.trim())
  } else {
    url.searchParams.delete('nickname')
  }

  window.history.replaceState({}, '', `${url.pathname}${url.search}`)
}

function MutedDivider() {
  return <span className="text-[11px] font-normal leading-none text-[#c7d0d9]">|</span>
}

function MainPositionValue({ value }: { value: string }) {
  const { position, primaryShare } = parseMainPositionParts(value)
  const textClassName =
    POSITION_BADGE_STYLES[position]?.includes('#d14343')
      ? 'text-[#d14343]'
      : POSITION_BADGE_STYLES[position]?.includes('#2f8f57')
        ? 'text-[#2f8f57]'
        : POSITION_BADGE_STYLES[position]?.includes('#457ae5')
          ? 'text-[#457ae5]'
          : 'text-[#58616a]'

  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-sm font-semibold tracking-[-0.02em] ${textClassName}`}>{position}</span>
      <span className={`text-sm font-semibold tracking-[-0.02em] ${textClassName}`}>{primaryShare}</span>
    </div>
  )
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
        <div className="flex items-center gap-1.5 text-[12px] leading-4 text-[#66707a]">
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
    <div className="rounded-lg bg-[#f7f8fa] px-4 py-3">
      <div className="text-[11px] text-[#8a949e]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#1e2124]">{value}</div>
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
    <div className="rounded-lg bg-[#f7f8fa] px-4 py-3">
      <div className="text-[11px] text-[#8a949e]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#1e2124]">{value}</div>
    </div>
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
  const accentClassName =
    accent === 'blue'
      ? 'text-[#256ef4]'
      : accent === 'red'
        ? 'text-[#d14343]'
        : accent === 'green'
          ? 'text-[#2f8f57]'
          : 'text-[#1e2124]'

  return (
    <div className="rounded-lg bg-white px-4 py-3">
      <p className="text-[11px] text-[#8a949e]">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${accentClassName}`}>{value}</p>
    </div>
  )
}

function MatchSectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8a949e]">{children}</p>
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
      className={`inline-flex min-h-9 max-w-[128px] items-center rounded-[8px] border bg-white px-2 py-1.5 align-middle text-left text-[12px] font-semibold break-words shadow-[0_1px_0_rgba(17,24,39,0.02)] transition sm:min-h-7 sm:max-w-[112px] sm:py-[5px] ${
        active
          ? 'border-[#256ef4] text-[#256ef4] shadow-[0_0_0_1px_rgba(37,110,244,0.08)]'
          : 'border-[#dbe3ea] text-[#58616a] hover:border-[#b8c7d8] hover:text-[#1e2124]'
      }`}
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
    result === '승' ? '#dfeeff' : result === '패' ? '#ffe6e9' : '#dde4ea'

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
      ? 'text-[#256ef4]'
      : result === '패'
        ? 'text-[#d14343]'
        : 'text-[#66707a]'

  return <span className={`text-sm font-bold ${className}`}>{label}</span>
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
  const teammateShotValues = teammateMetrics.map(({ metrics }) => metrics.shots)
  const teammateEffectiveShotValues = teammateMetrics.map(({ metrics }) => metrics.effectiveShots)
  const teammateDribbleValues = teammateMetrics.map(({ metrics }) => metrics.dribble)
  const teammateRatingValues = teammateMetrics.map(({ metrics }) => metrics.rating)
  const teammateTackleValues = teammateMetrics
    .map(({ metrics }) => metrics.tackleRate)
    .filter((value): value is number => value !== null)
  const teammateBlockValues = teammateMetrics
    .map(({ metrics }) => metrics.blockRate)
    .filter((value): value is number => value !== null)
  const teammatePassValues = teammateMetrics
    .map(({ metrics }) => metrics.passRate)
    .filter((value): value is number => value !== null)
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
  const passRank =
    meMetrics.passRate === null || teammatePassValues.length === 0
      ? null
      : rankDescending(meMetrics.passRate, teammatePassValues)
  const goalRank = rankDescending(meMetrics.goals, teammateGoalValues)
  const shotRank = rankDescending(meMetrics.shots, teammateShotValues)
  const effectiveShotRank = rankDescending(meMetrics.effectiveShots, teammateEffectiveShotValues)
  const dribbleRank = rankDescending(meMetrics.dribble, teammateDribbleValues)
  const ratingRank = rankDescending(meMetrics.rating, teammateRatingValues)
  const tackleRank =
    meMetrics.tackleRate === null || teammateTackleValues.length === 0
      ? null
      : rankDescending(meMetrics.tackleRate, teammateTackleValues)
  const blockRank =
    meMetrics.blockRate === null || teammateBlockValues.length === 0
      ? null
      : rankDescending(meMetrics.blockRate, teammateBlockValues)
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

  if (meMetrics.goals > 0) {
    if (goalShare >= 0.5) {
      addObservation(
        98,
        'good',
        `${formatMetricNumber(meMetrics.goals)}골로 팀 득점의 ${Math.round(goalShare * 100)}%를 책임졌습니다. 이 경기에서 가장 확실한 공격 마무리 자원이었습니다.`,
      )
    } else if (meMetrics.goals === teamGoalTop) {
      addObservation(
        90,
        'good',
        `${formatMetricNumber(meMetrics.goals)}골로 팀 내 득점 ${formatRank(goalRank, teammateCount)}를 기록했습니다. 최소한 득점 책임은 상위권이었습니다.`,
      )
    } else {
      addObservation(
        72,
        'good',
        `${formatMetricNumber(meMetrics.goals)}골로 공격 포인트는 만들었지만, 팀 전체 공격 비중을 주도한 수준까지는 아니었습니다.`,
      )
    }
  } else if (meMetrics.shots >= 4) {
    addObservation(
      95,
      'bad',
      `슈팅 ${formatMetricNumber(meMetrics.shots)}회로 시도량은 ${formatRank(shotRank, teammateCount)}였는데 무득점이었습니다. 가장 아쉬운 지점은 마무리입니다.`,
    )
  } else if (meMetrics.shots <= 1 && meMetrics.passTry <= 5) {
    addObservation(
      89,
      'bad',
      `슈팅 ${formatMetricNumber(meMetrics.shots)}회, 패스 시도 ${formatMetricNumber(meMetrics.passTry)}회에 그쳐 공격 전개에 깊게 관여했다고 보기 어렵습니다.`,
    )
  }

  if (effectiveShotRate !== null && meMetrics.shots >= 3) {
    if (effectiveShotRate >= 70 && meMetrics.effectiveShots === teamEffectiveShotTop) {
      addObservation(
        82,
        'good',
        `유효슛 비율이 ${effectiveShotRate}%로 높았고, 유효슛 수 역시 팀 내 ${formatRank(effectiveShotRank, teammateCount)}였습니다. 슈팅 질은 좋은 편이었습니다.`,
      )
    } else if (effectiveShotRate <= 35) {
      addObservation(
        86,
        'bad',
        `슈팅 ${formatMetricNumber(meMetrics.shots)}회 중 유효슛은 ${formatMetricNumber(meMetrics.effectiveShots)}회뿐이라, 슈팅 정확도가 낮았습니다.`,
      )
    }
  }

  if (meMetrics.goals > 0 && meMetrics.shots >= 3) {
    if (shotConversion >= 50) {
      addObservation(
        80,
        'good',
        `슈팅 대비 득점 전환율이 ${shotConversion}%로 높아, 적은 기회도 득점으로 연결하는 효율은 좋았습니다.`,
      )
    } else if (shotConversion <= 25) {
      addObservation(
        77,
        'bad',
        `득점은 있었지만 슈팅 대비 득점 전환율이 ${shotConversion}%에 그쳐, 시도 수에 비해 효율이 높다고 보긴 어렵습니다.`,
      )
    }
  }

  if (meMetrics.passRate !== null && meMetrics.passTry >= 8) {
    if (teammateAvgPassRate > 0 && meMetrics.passRate >= teammateAvgPassRate + 8) {
      addObservation(
        78,
        'good',
        `패스 성공률 ${meMetrics.passRate}%로 팀 평균보다 전개 안정감이 높았습니다. 연결 완성도는 ${formatRank(passRank ?? 1, teammatePassValues.length)}였습니다.`,
      )
    } else if (teammateAvgPassRate > 0 && meMetrics.passRate <= teammateAvgPassRate - 8) {
      addObservation(
        84,
        'bad',
        `패스 성공률 ${meMetrics.passRate}%는 팀 평균보다 분명히 낮았습니다. 연결 단계에서 턴오버 위험을 자주 만들었습니다.`,
      )
    } else if (meMetrics.passRate < 75) {
      addObservation(
        72,
        'bad',
        `패스 시도 수는 있었지만 성공률 ${meMetrics.passRate}%로 안정적인 전개를 이끌었다고 보기 어렵습니다.`,
      )
    }
  }

  if (meMetrics.passTry >= 14 && passVolumeShare >= 1.3) {
    addObservation(
      69,
      'good',
      `패스 시도 ${formatMetricNumber(meMetrics.passTry)}회로 팀 평균보다 볼을 더 많이 받았습니다. 빌드업 관여도 자체는 높았습니다.`,
    )
  } else if (meMetrics.passTry <= 4 && meMetrics.goals === 0 && meMetrics.dribble <= 1) {
    addObservation(
      80,
      'bad',
      `패스 참여와 드리블 전진 모두 적어, 공을 잡았을 때 흐름을 바꾸는 장면이 거의 없었습니다.`,
    )
  }

  if (meMetrics.dribble >= Math.max(4, teammateAvgDribble + 2) && meMetrics.dribble === teamDribbleTop) {
    addObservation(
      74,
      'good',
      `드리블 ${formatMetricNumber(meMetrics.dribble)}회로 팀 내 ${formatRank(dribbleRank, teammateCount)}였습니다. 직접 전진해 공간을 여는 역할은 분명했습니다.`,
    )
  } else if (meMetrics.dribble <= 1 && meMetrics.shots <= teammateAvgShots) {
    addObservation(
      70,
      'bad',
      '드리블 돌파와 직접 전진 시도가 적어, 스스로 공격 장면을 만드는 힘은 약했습니다.',
    )
  }

  if (meMetrics.tackleRate !== null && meMetrics.tackleTry >= 3) {
    if (meMetrics.tackleRate >= 60) {
      addObservation(
        66,
        'good',
        `태클 성공률 ${formatPercent(meMetrics.tackleRate)}로 수비 경합 대응은 안정적이었습니다. 팀 내 순위도 ${formatRank(tackleRank ?? 1, teammateTackleValues.length)}였습니다.`,
      )
    } else if (meMetrics.tackleRate <= 35) {
      addObservation(
        74,
        'bad',
        `태클 성공률 ${formatPercent(meMetrics.tackleRate)}로 경합에서 쉽게 벗겨졌습니다. 압박 강도 대비 실속이 부족했습니다.`,
      )
    }
  }

  if (meMetrics.blockRate !== null && meMetrics.blockTry >= 2) {
    if (meMetrics.blockRate >= 60) {
      addObservation(
        64,
        'good',
        `차단 성공률 ${formatPercent(meMetrics.blockRate)}로 상대 전개를 끊는 장면은 있었습니다. 팀 내 ${formatRank(blockRank ?? 1, teammateBlockValues.length)} 수준입니다.`,
      )
    } else if (meMetrics.blockRate <= 35) {
      addObservation(
        71,
        'bad',
        `차단 성공률 ${formatPercent(meMetrics.blockRate)}로 압박은 들어갔지만 실제 차단으로 이어지는 비율이 낮았습니다.`,
      )
    }
  }

  if (meMetrics.rating >= Math.max(7.5, teammateAvgRating + 0.5)) {
    addObservation(
      83,
      'good',
      `평점 ${formatMetricNumber(meMetrics.rating, 2)}로 팀 내 ${formatRank(ratingRank, teammateCount)}였습니다. 전체 영향력은 분명히 높은 편이었습니다.`,
    )
  } else if (meMetrics.rating > 0 && meMetrics.rating <= Math.max(6.5, teammateAvgRating - 0.5)) {
    addObservation(
      87,
      'bad',
      `평점 ${formatMetricNumber(meMetrics.rating, 2)}로 팀 내 ${formatRank(ratingRank, teammateCount)}에 머물렀습니다. 경기 전반 존재감이 낮았습니다.`,
    )
  }

  if (opponentGoalTop >= 2 && meMetrics.goals === 0) {
    addObservation(
      79,
      'bad',
      '상대 팀에서는 다득점 선수가 나왔는데, 이쪽은 공격 포인트가 없어 맞대응 카드가 되지 못했습니다.',
    )
  }

  if (opponentShotTop >= 4 && meMetrics.shots <= 1) {
    addObservation(
      68,
      'bad',
      '상대 핵심 자원은 슈팅을 꾸준히 만들었는데, 이쪽은 시도 자체가 적어 공격 존재감 차이가 있었습니다.',
    )
  }

  if (opponentDribbleTop >= 4 && meMetrics.dribble <= 1) {
    addObservation(
      62,
      'bad',
      '상대는 전진 드리블로 경기를 흔들었지만, 이쪽은 볼 운반과 돌파 시도가 부족했습니다.',
    )
  }

  if (
    perspectiveOpponentScore >= 3 &&
    meMetrics.goals === 0 &&
    meMetrics.rating <= opponentRatingTop - 1
  ) {
    addObservation(
      82,
      'bad',
      '상대 핵심 자원들에 비해 존재감이 밀려, 주도권 싸움에서 우위를 만들지 못했습니다.',
    )
  }

  if (meMetrics.yellowCards > 0 || meMetrics.redCards > 0) {
    addObservation(76, 'bad', '카드 관리는 명확한 감점 요소였습니다. 수비 리스크를 스스로 키운 경기였습니다.')
  } else if (meMetrics.fouls >= 3) {
    addObservation(
      67,
      'bad',
      `파울 ${formatMetricNumber(meMetrics.fouls)}회로 수비 타이밍이 거칠었습니다. 불필요한 끊김이 많았습니다.`,
    )
  }

  if (meMetrics.goals === 0 && meMetrics.shots === 0 && meMetrics.passTry <= 3 && meMetrics.rating <= 6.5) {
    addObservation(
      94,
      'bad',
      '득점, 슈팅, 패스 관여가 모두 낮았습니다. 기록상으로는 경기 흐름에 실질적인 흔적을 거의 남기지 못했습니다.',
    )
  }

  observations.sort((a, b) => b.score - a.score)

  const picked = observations.slice(0, 10).map((entry) => entry.text)
  if (picked.length > 0) {
    return picked
  }

  return ['기록 대부분이 팀 평균 부근에 모여 있어, 이번 경기는 뚜렷한 강점이나 약점이 크게 드러나지 않았습니다.']
}

function MatchRecordCard({
  match,
  teams,
}: {
  match: MatchData
  teams: NonNullable<ReturnType<typeof buildVoltaTeams>>
}) {
  const [selectedPlayerOuid, setSelectedPlayerOuid] = useState(teams.me.ouid)
  const [expanded, setExpanded] = useState(false)
  const result = teams.me.matchDetail.matchResult
  const scorelineLabel = `${teams.myScore} : ${teams.opponentScore}`
  const cardTintColor =
    result === '승' ? '#f4f8ff' : result === '패' ? '#fff5f5' : '#eef2f5'
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

  return (
    <article
      className="rounded-lg px-4 py-4"
      style={{ backgroundColor: cardTintColor }}
      onClick={() => setExpanded((current) => !current)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <MatchResultBadge result={result} />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <MatchResultLabel result={result} />
              <MutedDivider />
              <span className="text-sm font-semibold text-[#58616a]">
                볼타 공식 경기
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-[#58616a]">
              <span className="font-semibold text-[#1e2124]">{scorelineLabel}</span>
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
                setExpanded(true)
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
          <div className="rounded-lg bg-white px-4 py-4">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-[#1e2124]">
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
                  <p className="text-sm font-semibold text-[#1e2124]">상대팀</p>
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

          <div className="rounded-lg bg-white px-4 py-4">
            <div className="flex min-h-[44px] flex-wrap items-center justify-between gap-2">
              <div>
                <MatchSectionLabel>{selectedSideLabel}</MatchSectionLabel>
                <p className="mt-1 text-sm font-semibold text-[#1e2124]">{selectedPlayer.nickname}</p>
              </div>
              <div className="inline-flex min-h-10 items-center rounded-lg bg-[#f7f9fb] px-3 py-2 text-right">
                <p className="text-sm leading-[1.2] font-semibold text-[#1e2124]">
                  {getControllerDisplay(selectedMetrics.controller)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MatchMetricCard label="득점" value={formatMetricNumber(selectedMetrics.goals)} accent={isMyPlayer ? 'blue' : 'red'} />
            <MatchMetricCard label="유효슛 / 슛" value={`${formatMetricNumber(selectedMetrics.effectiveShots)} / ${formatMetricNumber(selectedMetrics.shots)}`} />
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

          <div className="rounded-lg bg-white px-4 py-4">
            <p className="text-sm font-semibold text-[#1e2124]">경기 분석</p>
            <div className="mt-2 space-y-1">
              {matchInsight.map((line, index) => (
                <p key={`${match.matchId}-insight-${index}`} className="text-sm leading-5 text-[#58616a]">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </article>
  )
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
    <div className="rounded-lg bg-[#f7f8fa] px-4 py-3">
      <p className="text-[11px] text-[#8a949e]">{label}</p>
      <div className="mt-1 text-sm font-semibold tracking-[-0.02em] text-[#1e2124]">
        {content.primary}
      </div>
      {content.secondary ? (
        <div className="mt-1 overflow-x-auto text-[12px] leading-4 text-[#66707a]">
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
        <div key={index} className="rounded-lg bg-[#f7f9fb] px-4 py-4">
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
      <section className="rounded-lg bg-white px-5 py-5">
        <div className="flex items-center gap-4">
          <div className="home-image-shimmer h-14 w-14 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <div className="home-image-shimmer h-7 w-32 rounded-full" />
            <div className="home-image-shimmer mt-2 h-4 w-40 rounded-full" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="rounded-lg bg-[#f7f8fa] px-4 py-3">
              <div className="home-image-shimmer h-3 w-16 rounded-full" />
              <div className="home-image-shimmer mt-2 h-4 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg bg-white px-5 py-5">
        <div className="home-image-shimmer h-5 w-20 rounded-full" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="rounded-lg bg-[#f7f8fa] px-4 py-3">
              <div className="home-image-shimmer h-3 w-18 rounded-full" />
              <div className="home-image-shimmer mt-2 h-4 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg bg-white px-5 py-5">
        <div className="home-image-shimmer mb-3 h-5 w-32 rounded-full" />
        <MatchRecordSkeletonList />
      </section>
    </div>
  )
}

function MatchNoResultState({ nickname }: { nickname: string }) {
  return (
    <div className="space-y-4">
      <section className="rounded-lg bg-white px-5 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#f0f3f5] text-lg font-bold text-[#66707a]">
            ?
          </div>

          <div className="min-w-0">
            <h2 className="text-[20px] font-bold tracking-[-0.03em] text-[#1e2124]">
              검색 결과가 없어요
            </h2>
            <p className="mt-1 text-sm leading-5 text-[#66707a]">
              <span className="font-semibold text-[#1e2124]">{nickname}</span>
              {' 닉네임으로 조회되는 볼타 분석 데이터를 찾지 못했어요.'}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-[#f7f8fa] px-4 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8a949e]">
            확인해 보세요
          </p>
          <div className="mt-3 grid gap-3">
            <div className="rounded-lg bg-white px-4 py-3">
              <p className="text-[11px] text-[#8a949e]">닉네임 입력</p>
              <p className="mt-1 text-sm font-semibold text-[#1e2124]">
                띄어쓰기와 특수문자까지 정확한지 확인해 주세요.
              </p>
            </div>
            <div className="rounded-lg bg-white px-4 py-3">
              <p className="text-[11px] text-[#8a949e]">공개 데이터</p>
              <p className="mt-1 text-sm font-semibold text-[#1e2124]">
                랭킹/전적 정보가 없는 계정은 분석 결과가 보이지 않을 수 있어요.
              </p>
            </div>
            <div className="rounded-lg bg-white px-4 py-3">
              <p className="text-[11px] text-[#8a949e]">다시 검색</p>
              <p className="mt-1 text-sm font-semibold text-[#1e2124]">
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
}

export default function MatchesPageClient({ initialNickname }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const requestIdRef = useRef(0)

  const [hasPendingRouteSearch, setHasPendingRouteSearch] = useState(Boolean(initialNickname))
  const [query, setQuery] = useState(initialNickname)
  const [activeSearchQuery, setActiveSearchQuery] = useState(initialNickname)
  const [exactCandidate, setExactCandidate] = useState<MatchSearchCandidate | null>(null)
  const [candidates, setCandidates] = useState<MatchSearchCandidate[]>([])
  const [matches, setMatches] = useState<MatchData[]>([])
  const [voltaBestItems, setVoltaBestItems] = useState<VoltaBestStatItem[]>([])
  const [voltaTopItems, setVoltaTopItems] = useState<VoltaTopRankItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [matchLoading, setMatchLoading] = useState(false)
  const [voltaBestLoading, setVoltaBestLoading] = useState(true)
  const [voltaTopLoading, setVoltaTopLoading] = useState(true)
  const [matchesError, setMatchesError] = useState('')
  const [visibleMatchCount, setVisibleMatchCount] = useState(INITIAL_VISIBLE_MATCHES)

  useEffect(() => {
    let cancelled = false

    const loadVoltaBestStats = async () => {
      const todayKey = getKstDateKey()
      const cached = readJsonStorage<VoltaBestCacheEntry>(VOLTA_BEST_CACHE_KEY)

      if (
        cached?.dateKey === todayKey &&
        Array.isArray(cached.items) &&
        cached.items.length >= 7 &&
        cached.items.every((item) => item.iconUrl)
      ) {
        setVoltaBestItems(cached.items)
        setVoltaBestLoading(false)
        return
      }

      try {
        const res = await fetch('/api/nexon/matches/volta-best')
        if (!res.ok) {
          return
        }

        const data = await res.json().catch(() => null)
        const items = Array.isArray(data?.items) ? (data.items as VoltaBestStatItem[]) : []

        if (cancelled) {
          return
        }

        setVoltaBestItems(items)

        if (items.length > 0) {
          writeJsonStorage(VOLTA_BEST_CACHE_KEY, {
            dateKey: todayKey,
            items,
          } satisfies VoltaBestCacheEntry)
        }
      } finally {
        if (!cancelled) {
          setVoltaBestLoading(false)
        }
      }
    }

    const loadVoltaTopRanks = async () => {
      const todayKey = getKstDateKey()
      const cached = readJsonStorage<VoltaTopRankCacheEntry>(VOLTA_TOP_CACHE_KEY)

      if (cached?.dateKey === todayKey && Array.isArray(cached.items) && cached.items.length >= 5) {
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
            dateKey: todayKey,
            items,
          } satisfies VoltaTopRankCacheEntry)
        }
      } finally {
        if (!cancelled) {
          setVoltaTopLoading(false)
        }
      }
    }

    void loadVoltaBestStats()
    void loadVoltaTopRanks()

    return () => {
      cancelled = true
    }
  }, [])

  const loadMatches = async (targetOuid: string) => {
    const cachedMatches = readCachedMatches(targetOuid)

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
        `/api/nexon/matches/list?ouid=${targetOuid}&matchtype=214&limit=${MATCH_LIST_LIMIT}`,
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
        writeCachedMatches(targetOuid, nextMatches)
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

  const runSearch = async (nickname: string, shouldUpdateUrl = true) => {
    const trimmed = nickname.trim()
    if (!trimmed) return

    if (shouldUpdateUrl) {
      updateMatchesUrl(trimmed)
    }

    const requestId = ++requestIdRef.current
    setSearchLoading(true)
    setMatchLoading(false)
    setActiveSearchQuery(trimmed)
    setExactCandidate(null)
    setCandidates([])
    setMatches([])

    try {
      const cachedSearch = readCachedSearch(trimmed)
      if (cachedSearch) {
        setExactCandidate(cachedSearch.exactCandidate)
        setCandidates(cachedSearch.candidates)
        setHasPendingRouteSearch(false)

        if (cachedSearch.exactCandidate?.ouid) {
          writeCachedOuid(trimmed, cachedSearch.exactCandidate.ouid)
          void loadMatches(cachedSearch.exactCandidate.ouid)
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

      setExactCandidate(nextExactMatch)
      setCandidates(rankCandidates)
      setHasPendingRouteSearch(false)
      writeCachedSearch(trimmed, {
        exactCandidate: nextExactMatch,
        candidates: rankCandidates,
      })

      if (nextExactMatch?.ouid) {
        writeCachedOuid(trimmed, nextExactMatch.ouid)
        void loadMatches(nextExactMatch.ouid)
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setHasPendingRouteSearch(false)
        setSearchLoading(false)
      }
    }
  }

  const handleSearch = async () => {
    await runSearch(query)
  }

  const runInitialSearch = useEffectEvent((nickname: string) => {
    void runSearch(nickname, false)
  })

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      inputRef.current?.blur()
      void handleSearch()
    }
  }

  const handleSearchContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('button')) {
      return
    }

    inputRef.current?.focus()
  }

  const handleBackHome = () => {
    updateMatchesUrl(null)
    setHasPendingRouteSearch(false)
    setQuery('')
    setActiveSearchQuery('')
    setExactCandidate(null)
    setCandidates([])
    setMatches([])
    setSearchLoading(false)
    setMatchLoading(false)
    setMatchesError('')
  }

  useEffect(() => {
    if (!initialNickname) {
      setHasPendingRouteSearch(false)
      return
    }

    runInitialSearch(initialNickname)
  }, [initialNickname])

  const voltaSummary = summarizeMatches(matches, exactCandidate?.ouid)
  const recentMatchesLabel = '최근 10경기'
  const recentGoalsForLabel = '최근 10경기 총 득점'
  const recentGoalsAgainstLabel = '최근 10경기 총 실점'
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

  return (
    <div className="pt-5">
      <div className="flex h-6 items-center">
        {showResultsPanel ? (
          <button
            type="button"
            onClick={handleBackHome}
            className="inline-flex items-center gap-1.5 text-[18px] font-bold tracking-[-0.02em] text-[#1e2124]"
          >
            <ArrowLeft size={18} weight="bold" />
            <span>{resultsTitle}</span>
          </button>
        ) : (
          <h1 className="text-[18px] font-bold tracking-[-0.02em] text-[#1e2124]">
            내 볼타 분석을 찾아볼까요?
          </h1>
        )}
      </div>

      {!showResultsPanel && (
        <div
          className="mt-4 flex h-14 items-center gap-2 rounded-lg border border-[#e6e8ea] bg-white px-4 focus-within:border-2 focus-within:border-[#457ae5]"
          onClick={handleSearchContainerClick}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="닉네임을 입력해 주세요"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-[#1e2124] outline-none placeholder:text-[#8a949e]"
          />
          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={searchLoading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg active:bg-[#f0f3f5] disabled:opacity-50"
          >
            <MagnifyingGlass size={24} className="text-[#464c53]" weight="bold" />
          </button>
        </div>
      )}

      <div className="mt-4">
        {searchLoading && (
          <div className="rounded-lg bg-white px-5 py-4">
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
                <section className="rounded-lg bg-white px-5 py-5">
                  <div className="flex items-center gap-4">
                    {exactCandidate.voltaRankIconUrl ? (
                      <img
                        src={exactCandidate.voltaRankIconUrl}
                        alt="볼타 등급"
                        className="h-14 w-14 shrink-0 object-contain"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#f0f3f5] text-xs font-semibold text-[#58616a]">
                        볼타
                      </div>
                    )}

                    <div className="min-w-0">
                      <h2 className="truncate text-2xl font-bold tracking-[-0.03em] text-[#1e2124]">
                        {exactCandidate.nickname}
                      </h2>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-[#58616a]">
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
                    <>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <InfoCard label="현재 순위" value={`#${statValue(exactCandidate.voltaRank)}`} />
                        <InfoCard label="랭킹 포인트" value={statValue(exactCandidate.voltaRankPoint)} />
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

                    </>
                  ) : (
                    <div className="mt-4 rounded-lg bg-[#f0f3f5] px-4 py-3 text-sm text-[#58616a]">
                      볼타 랭킹 1만위 밖 유저거나 공개 랭킹 정보가 없어요.
                    </div>
                  )}

                  {voltaSummary && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <SummaryPill
                        label={recentGoalsForLabel}
                        value={voltaSummary.goalsFor}
                      />
                      <SummaryPill
                        label={recentGoalsAgainstLabel}
                        value={voltaSummary.goalsAgainst}
                      />
                    </div>
                  )}
                </section>

                {hasVoltaRank && (
                  <section className="rounded-lg bg-white px-5 py-5">
                    <h2 className="text-base font-semibold text-[#1e2124]">상세 정보</h2>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <DetailStatCard
                        label="태클 성공률"
                        value={exactCandidate.voltaTackleRate ?? '-'}
                      />
                      <DetailStatCard
                        label="차단 성공률"
                        value={exactCandidate.voltaBlockRate ?? '-'}
                      />
                      <DetailStatCard
                        label="유효슛"
                        value={exactCandidate.voltaEffectiveShots ?? '-'}
                      />
                      <DetailStatCard
                        label="패스 성공률"
                        value={exactCandidate.voltaPassRate ?? '-'}
                      />
                      <DetailStatCard
                        label="드리블 성공률"
                        value={exactCandidate.voltaDribbleRate ?? '-'}
                      />
                      <DetailStatCard
                        label="주요 포지션"
                        value={exactCandidate.voltaMainPosition ?? '-'}
                      />
                    </div>
                  </section>
                )}

                <section className="rounded-lg bg-white px-5 py-5">
                  <h2 className="mb-3 text-base font-semibold text-[#1e2124]">볼타 공식 최근 10경기</h2>

                  {matchLoading && <MatchRecordSkeletonList />}

                  {!matchLoading && matchesError && (
                    <p className="py-4 text-sm text-[#8a949e]">{matchesError}</p>
                  )}

                  {!matchLoading && !matchesError && matches.length === 0 && (
                    <p className="py-4 text-sm text-[#8a949e]">볼타 공식 경기 기록이 없어요.</p>
                  )}

                  {!matchLoading && !matchesError && (
                    <div className="space-y-3">
                      {matches.slice(0, visibleMatchCount).map((match) => {
                        const teams = buildVoltaTeams(match, exactCandidate.ouid ?? '')
                        if (!teams) {
                          return null
                        }

                        return (
                          <MatchRecordCard key={match.matchId} match={match} teams={teams} />
                        )
                      })}

                      {matches.length > visibleMatchCount && (
                        <button
                          type="button"
                          onClick={() => setVisibleMatchCount(matches.length)}
                          className="flex w-full items-center justify-center rounded-lg border border-[#dbe3ea] bg-white px-4 py-3 text-sm font-semibold text-[#1e2124]"
                        >
                          더보기
                        </button>
                      )}
                    </div>
                  )}
                </section>
              </div>
            )}

            {!exactCandidate && candidates.length > 0 && (
              <div className="space-y-2">
                <p className="pb-1 text-xs font-semibold text-[#8a949e]">랭킹 후보</p>
                {candidates.map((candidate) => (
                  <div
                    key={`${candidate.nexonSn}-${candidate.nickname}`}
                    className="block w-full rounded-lg border border-[#e6e8ea] bg-white px-4 py-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold">{candidate.nickname}</div>
                        <div className="mt-1 text-xs text-[#8a949e]">{candidate.modes.join(' · ')}</div>
                      </div>
                      {candidate.voltaRank !== null ? (
                        <span className="rounded-full bg-[#f0f3f5] px-2.5 py-1 text-[11px] font-semibold text-[#58616a]">
                          볼타 #{candidate.voltaRank}
                        </span>
                      ) : candidate.rank !== null ? (
                        <span className="rounded-full bg-[#f0f3f5] px-2.5 py-1 text-[11px] font-semibold text-[#58616a]">
                          공식 {candidate.rank}위
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#58616a]">
                      <span>볼타 포인트 {statValue(candidate.voltaRankPoint)}</span>
                      <span>승률 {candidate.voltaWinRate !== null ? `${candidate.voltaWinRate}%` : '-'}</span>
                      <span>
                        전적 {statValue(candidate.voltaWins)} / {statValue(candidate.voltaDraws)} /{' '}
                        {statValue(candidate.voltaLosses)}
                      </span>
                      <span>평균 평점 {statValue(candidate.voltaAverageRating)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showHomePanels && (
              <>
                <section className="mt-4 space-y-3">
                  <p className="text-[11px] font-medium leading-4 text-[#8a949e]">
                    • 현재 시즌 볼타 라이브 공식 랭킹 기준
                  </p>

                  {voltaTopLoading || voltaTopItems.length > 0 ? (
                    <VoltaTopRankCard items={voltaTopItems} isLoading={voltaTopLoading} />
                  ) : null}
                </section>

                <section className="mt-4">
                  {voltaBestLoading || voltaBestItems.length > 0 ? (
                    <VoltaBestStatsCard items={voltaBestItems} isLoading={voltaBestLoading} />
                  ) : null}
                </section>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

