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
const MATCH_SEARCH_CACHE_KEY = 'fconline.match.search-cache.v2'
const MATCH_RESULTS_CACHE_KEY = 'fconline.match.results-cache.v3'
const OFFICIAL_FORMATION_META_CACHE_KEY = 'fconline.match.official-formation-meta-cache.v2'
const OFFICIAL_TEAM_COLOR_META_CACHE_KEY = 'fconline.match.official-team-color-meta-cache.v7'
const OFFICIAL_TOP_CACHE_KEY = 'fconline.match.official-top-cache.v2'
const VOLTA_TOP_CACHE_KEY = 'fconline.match.volta-top-cache.v2'
const MATCH_LIST_LIMIT = 10
const MATCH_LIST_TIMEOUT_MS = 10000
const INITIAL_VISIBLE_MATCHES = 3
const MATCH_RESULTS_CACHE_TTL_MS = 1000 * 60 * 10
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
  dateKey: string
  items: VoltaTopRankItem[]
}
type OfficialTopRankCacheEntry = {
  dateKey: string
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

function buildMatchesUrl(nickname: string | null, matchId?: string | null) {
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

  return `${url.pathname}${url.search}`
}

function updateMatchesUrl(nickname: string | null, matchId?: string | null) {
  if (typeof window === 'undefined') return
  const nextUrl = buildMatchesUrl(nickname, matchId)
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
                color: 'var(--app-volta-accent-fg)',
                backgroundColor: 'var(--app-volta-accent-bg)',
              }
            : {
                color: 'var(--app-accent-blue)',
                backgroundColor: 'rgba(37, 110, 244, 0.1)',
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
            className="rounded-full px-3 py-1.5 text-[15px] font-semibold tracking-[-0.02em] transition"
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

          <OfficialTopRankCard items={officialTopItems} isLoading={officialTopLoading} />
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
          <VoltaTopRankCard items={voltaTopItems} isLoading={voltaTopLoading} />
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

function MatchRecordCard({
  match,
  teams,
  shareNickname,
  shouldExpand,
  onExpandedChange,
}: {
  match: MatchData
  teams: NonNullable<ReturnType<typeof buildVoltaTeams>>
  shareNickname: string
  shouldExpand: boolean
  onExpandedChange: (matchId: string | null) => void
}) {
  const cardRef = useRef<HTMLElement | null>(null)
  const [selectedPlayerOuid, setSelectedPlayerOuid] = useState(teams.me.ouid)
  const [expanded, setExpanded] = useState(false)
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
      setExpanded(true)
      const timeoutId = window.setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
      return () => window.clearTimeout(timeoutId)
    }
  }, [shouldExpand])

  const handleShare = async (type: 'x' | 'copy') => {
    if (typeof window === 'undefined') return

    const relativeUrl = buildMatchesUrl(shareNickname, match.matchId)
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
        setExpanded(nextExpanded)
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
                setExpanded(true)
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

async function copyOwnerPageLink(nickname: string) {
  if (typeof window === 'undefined') return

  const relativeUrl = buildMatchesUrl(nickname, null)
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
}

export default function MatchesPageClient({ initialNickname, initialMatchId }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const requestIdRef = useRef(0)

  const [selectedSearchMode, setSelectedSearchMode] = useState<SearchMode>('voltaLive')
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
    let cancelled = false

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

    const loadOfficialTopRanks = async () => {
      const todayKey = getKstDateKey()
      const cached = readJsonStorage<OfficialTopRankCacheEntry>(OFFICIAL_TOP_CACHE_KEY)

      if (cached?.dateKey === todayKey && Array.isArray(cached.items) && cached.items.length >= 5) {
        setOfficialTopItems(cached.items)
        setOfficialTopLoading(false)
        return
      }

      try {
        const res = await fetch('/api/nexon/matches/official-top')
        if (!res.ok) {
          return
        }

        const data = await res.json().catch(() => null)
        const items = Array.isArray(data?.items) ? (data.items as OfficialTopRankItem[]) : []

        if (cancelled) {
          return
        }

        setOfficialTopItems(items)

        if (items.length > 0) {
          writeJsonStorage(OFFICIAL_TOP_CACHE_KEY, {
            dateKey: todayKey,
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

  const runSearch = async (nickname: string, shouldUpdateUrl = true, matchIdToKeep?: string | null) => {
    const trimmed = nickname.trim()
    if (!trimmed) return

    if (shouldUpdateUrl) {
      updateMatchesUrl(trimmed, matchIdToKeep ?? null)
    }

    const requestId = ++requestIdRef.current
    setSearchLoading(true)
    setMatchLoading(false)
    setActiveSearchQuery(trimmed)
    setActiveMatchId(matchIdToKeep?.trim() ?? '')
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
    if (isPreviewOnlyMode) {
      return
    }

    await runSearch(query)
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

  const handleBackHome = () => {
    updateMatchesUrl(null, null)
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

  const voltaSummary = summarizeMatches(matches, exactCandidate?.ouid)
  const recentMatchesLabel = '최근 10경기'
  const recentGoalsForLabel = '최근 10경기 총 득점'
  const recentGoalsAgainstLabel = '최근 10경기 총 실점'
  const searchTitle = '어떤 공식경기 기록을 찾아볼까요?'
  const searchPlaceholder =
    selectedSearchMode === 'official1on1'
      ? '1:1 공식경기 구단주명을 입력해 주세요'
      : selectedSearchMode === 'manager'
        ? '감독모드 구단주명을 입력해 주세요'
        : '볼타 라이브 구단주명을 입력해 주세요'
  const isPreviewOnlyMode = selectedSearchMode !== 'voltaLive'
  const isSearchDisabled = searchLoading || isPreviewOnlyMode
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
          <SearchModeTabs selectedMode={selectedSearchMode} onSelect={setSelectedSearchMode} />

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
                          onClick={() => void copyOwnerPageLink(exactCandidate.nickname)}
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
                    <>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <InfoCard label="현재 순위" value={`#${statValue(exactCandidate.voltaRank)}`} />
                        <InfoCard label="랭킹 포인트" value={statValue(exactCandidate.voltaRankPoint)} />
                        <InfoCard
                          label="구단주 취임일"
                          value={statValue(exactCandidate.ownerSince)}
                        />
                        <InfoCard
                          label="대표팀"
                          value={statValue(exactCandidate.representativeTeam)}
                        />
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
                    <div className="app-theme-soft app-theme-body mt-4 rounded-lg px-4 py-3 text-sm">
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
                  <section className="app-theme-card rounded-lg border px-5 py-5">
                    <h2 className="app-theme-title text-base font-semibold">상세 정보</h2>
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
                            shouldExpand={activeMatchId === match.matchId}
                            onExpandedChange={(matchId) => {
                              setActiveMatchId(matchId ?? '')
                              updateMatchesUrl(shareNickname || null, matchId ?? null)
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
              </div>
            )}

            {!exactCandidate && candidates.length > 0 && (
              <div className="space-y-2">
                <p className="app-theme-muted pb-1 text-xs font-semibold">랭킹 후보</p>
                {candidates.map((candidate) => (
                  <div
                    key={`${candidate.nexonSn}-${candidate.nickname}`}
                    className="app-theme-card block w-full rounded-lg border px-4 py-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold">{candidate.nickname}</div>
                        <div className="app-theme-muted mt-1 text-xs">{candidate.modes.join(' · ')}</div>
                      </div>
                      {candidate.voltaRank !== null ? (
                        <span className="app-theme-soft app-theme-body rounded-full px-2.5 py-1 text-[11px] font-semibold">
                          볼타 #{candidate.voltaRank}
                        </span>
                      ) : candidate.rank !== null ? (
                        <span className="app-theme-soft app-theme-body rounded-full px-2.5 py-1 text-[11px] font-semibold">
                          공식 {candidate.rank}위
                        </span>
                      ) : null}
                    </div>

                    <div className="app-theme-body mt-3 grid grid-cols-2 gap-2 text-xs">
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
              <SearchModePreviewCard
                selectedMode={selectedSearchMode}
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
