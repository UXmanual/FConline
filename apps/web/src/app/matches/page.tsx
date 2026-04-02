'use client'

import { useRef, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import LoadingDots from '@/components/ui/LoadingDots'
import {
  MatchData,
  MatchPlayerInfo,
  MatchSearchCandidate,
  MATCH_TYPE_NAMES,
} from '@/features/match-analysis/types'

const RESULT_COLOR: Record<string, string> = {
  승: '#256ef4',
  패: '#f64f5e',
  무: '#8a949e',
}

const OUID_CACHE_KEY = 'fconline.match.ouid-cache'
const MATCH_SEARCH_CACHE_KEY = 'fconline.match.search-cache'
const MATCH_LIST_CACHE_KEY = 'fconline.match.list-cache'
const MATCH_LIST_LIMIT = 10

type MatchSearchCacheEntry = {
  exactCandidate: MatchSearchCandidate | null
  candidates: MatchSearchCandidate[]
}

type MatchSearchCacheStore = Record<string, MatchSearchCacheEntry>
type MatchListCacheStore = Record<string, MatchData[]>

function formatDate(dateStr: string) {
  const normalized = /Z$|[+-]\d{2}:\d{2}$/.test(dateStr) ? dateStr : `${dateStr}Z`
  const date = new Date(normalized)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}/${day} ${hour}:${minute}`
}

function getDisplayScore(player: MatchPlayerInfo | undefined) {
  return player?.shoot.goalTotalDisplay ?? player?.shoot.goalTotal ?? 0
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
  return parsed[normalizeNicknameKey(nickname)] ?? null
}

function writeCachedSearch(nickname: string, entry: MatchSearchCacheEntry) {
  const parsed = readJsonStorage<MatchSearchCacheStore>(MATCH_SEARCH_CACHE_KEY) ?? {}
  parsed[normalizeNicknameKey(nickname)] = entry
  writeJsonStorage(MATCH_SEARCH_CACHE_KEY, parsed)
}

function readCachedMatches(ouid: string) {
  const parsed = readJsonStorage<MatchListCacheStore>(MATCH_LIST_CACHE_KEY)
  if (!parsed) return null
  return parsed[ouid] ?? null
}

function writeCachedMatches(ouid: string, matches: MatchData[]) {
  const parsed = readJsonStorage<MatchListCacheStore>(MATCH_LIST_CACHE_KEY) ?? {}
  parsed[ouid] = matches
  writeJsonStorage(MATCH_LIST_CACHE_KEY, parsed)
}

function explainDetailValue(label: string, rawValue: string | number | null | undefined) {
  const value = statValue(rawValue)
  if (typeof value !== 'string') {
    return String(value)
  }

  if (label === '주요 포지션') {
    const [position, share] = value.split(/\s+(?=\d)/)
    if (!share) return value
    const [fw = '-', mf = '-', df = '-'] = share.split('|').map((part) => part.trim())
    return `${position} | FW ${fw} | MF ${mf} | DF ${df}`
  }

  if (label === '유효슛') {
    const match = value.match(/^(경기당\s*[^\s]+)\s+(\d+)\s*\|\s*(\d+)$/)
    if (!match) return value
    const [, rate, success, attempt] = match
    return `${rate} | 총 유효슛 ${success} | 경기수 ${attempt}`
  }

  const match = value.match(/^(.+?%)\s+(\d+)\s*\|\s*(\d+)$/)
  if (!match) {
    return value
  }

  const [, rate, success, attempt] = match
  return `${rate} | 성공 ${success} | 시도 ${attempt}`
}

function InfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-[#f7f8fa] px-4 py-3">
      <div className="text-[11px] text-[#8a949e]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#1e2124]">{value}</div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-[#fbfbfc] px-4 py-3">
      <span className="text-xs text-[#8a949e]">{label}</span>
      <span className="text-right text-xs font-medium text-[#464c53]">
        {explainDetailValue(label, value)}
      </span>
    </div>
  )
}

export default function MatchesPage() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const requestIdRef = useRef(0)

  const [query, setQuery] = useState('')
  const [exactCandidate, setExactCandidate] = useState<MatchSearchCandidate | null>(null)
  const [candidates, setCandidates] = useState<MatchSearchCandidate[]>([])
  const [matches, setMatches] = useState<MatchData[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [matchLoading, setMatchLoading] = useState(false)
  const [searchMessage, setSearchMessage] = useState('')

  const loadMatches = async (targetOuid: string) => {
    const cachedMatches = readCachedMatches(targetOuid)
    if (cachedMatches) {
      setMatches(cachedMatches)
      setMatchLoading(false)
      return
    }

    setMatchLoading(true)
    setMatches([])

    try {
      const res = await fetch(`/api/nexon/matches/list?ouid=${targetOuid}&matchtype=214&limit=${MATCH_LIST_LIMIT}`)
      if (!res.ok) {
        setMatches([])
        return
      }

      const data = await res.json().catch(() => [])
      const nextMatches = Array.isArray(data) ? data : []
      setMatches(nextMatches)
      writeCachedMatches(targetOuid, nextMatches)
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

  const handleSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed) return

    const requestId = ++requestIdRef.current
    const cachedSearch = readCachedSearch(trimmed)

    if (cachedSearch) {
      setSearchLoading(false)
      setMatchLoading(false)
      setExactCandidate(cachedSearch.exactCandidate)
      setCandidates(cachedSearch.candidates)

      if (cachedSearch.exactCandidate?.ouid) {
        writeCachedOuid(trimmed, cachedSearch.exactCandidate.ouid)
        await loadMatches(cachedSearch.exactCandidate.ouid)
      } else {
        setMatches([])
      }

      setSearchMessage(
        cachedSearch.exactCandidate
          ? cachedSearch.exactCandidate.ouid
            ? `"${trimmed}"?? 議고쉶 寃곌낵瑜?遺덈윭?붿뼱??`
            : `"${trimmed}"?? ??궧 寃곌낵瑜?遺덈윭?붿?留? OUID???꾩쭅 ?놁뼱??`
          : `"${trimmed}" 寃??寃곌낵媛 ?놁뼱??`
      )
      return
    }

    setSearchLoading(true)
    setMatchLoading(false)
    setExactCandidate(null)
    setCandidates([])
    setMatches([])
    setSearchMessage('검색 중입니다.')

    try {
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
      writeCachedSearch(trimmed, {
        exactCandidate: nextExactMatch,
        candidates: rankCandidates,
      })

      if (nextExactMatch?.ouid) {
        writeCachedOuid(trimmed, nextExactMatch.ouid)
        await loadMatches(nextExactMatch.ouid)
      }

      setSearchMessage(
        nextExactMatch
          ? nextExactMatch.ouid
            ? `"${trimmed}"의 볼타 기록을 찾았어요.`
            : `"${trimmed}"의 랭킹 정보는 찾았지만 최근 경기 기록 식별값을 지금 못 받아오고 있어요.`
          : `"${trimmed}" 검색 결과가 없어요.`
      )
    } finally {
      if (requestId === requestIdRef.current) {
        setSearchLoading(false)
      }
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      inputRef.current?.blur()
      void handleSearch()
    }
  }

  const voltaSummary = summarizeMatches(matches, exactCandidate?.ouid)
  const hasVoltaRank =
    exactCandidate?.voltaRank !== null ||
    exactCandidate?.voltaRankPoint !== null ||
    !!exactCandidate?.voltaRankIconUrl

  return (
    <div className="pt-5">
      <h1 className="text-xl font-bold tracking-[-0.02em] text-[#1e2124]">경기분석</h1>

      <div className="mt-3 flex h-14 items-center gap-2 rounded-lg border border-[#58616a] bg-white px-4 focus-within:border-2 focus-within:border-[#256ef4]">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="닉네임 검색"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-[#1e2124] outline-none placeholder:text-[#8a949e]"
        />
        <button
          type="button"
          onClick={() => void handleSearch()}
          disabled={searchLoading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md active:bg-[#f4f5f6] disabled:opacity-50"
        >
          <MagnifyingGlass size={24} className="text-[#464c53]" weight="bold" />
        </button>
      </div>

      <div className="mt-4">
        {searchLoading && <LoadingDots label="닉네임 정보를 찾는 중이에요" />}

        {!searchLoading && (
          <>
            <p className="pb-3 text-sm text-[#8a949e]">{searchMessage}</p>

            {exactCandidate && (
              <section className="mb-6">
                <div className="border-b border-[#e6e8ea] pb-5">
                  <div className="flex items-center gap-4">
                    {exactCandidate.voltaRankIconUrl ? (
                      <img
                        src={exactCandidate.voltaRankIconUrl}
                        alt="볼타 등급"
                        className="h-14 w-14 shrink-0 object-contain"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f4f5f6] text-xs font-semibold text-[#58616a]">
                        볼타
                      </div>
                    )}

                    <div className="min-w-0">
                      <h2 className="truncate text-2xl font-bold tracking-[-0.03em] text-[#1e2124]">
                        {exactCandidate.nickname}
                      </h2>
                      <p className="mt-1 text-sm text-[#58616a]">
                        {hasVoltaRank ? '볼타 라이브 공식 랭킹' : '볼타 랭킹 정보 없음'}
                      </p>
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
                          label="최근 10경기"
                          value={
                            voltaSummary
                              ? `${voltaSummary.wins}승 ${voltaSummary.draws}무 ${voltaSummary.losses}패`
                              : '-'
                          }
                        />
                      </div>

                      <div className="mt-4 space-y-2">
                        <DetailRow label="태클 성공률" value={exactCandidate.voltaTackleRate ?? '-'} />
                        <DetailRow label="차단 성공률" value={exactCandidate.voltaBlockRate ?? '-'} />
                        <DetailRow label="유효슛" value={exactCandidate.voltaEffectiveShots ?? '-'} />
                        <DetailRow label="패스 성공률" value={exactCandidate.voltaPassRate ?? '-'} />
                        <DetailRow label="드리블 성공률" value={exactCandidate.voltaDribbleRate ?? '-'} />
                        <DetailRow label="주요 포지션" value={exactCandidate.voltaMainPosition ?? '-'} />
                      </div>
                    </>
                  ) : (
                    <div className="mt-4 rounded-xl bg-[#f4f5f6] px-4 py-3 text-sm text-[#58616a]">
                      볼타 랭킹 1만위 밖 유저거나 공개 랭킹 정보가 없어요.
                    </div>
                  )}

                  {voltaSummary && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-[#58616a]">
                      <span className="rounded-full bg-[#eef6ff] px-2.5 py-1 text-[12px] font-semibold text-[#256ef4]">
                        총 득점 {voltaSummary.goalsFor}
                      </span>
                      <span className="rounded-full bg-[#f4f5f6] px-2.5 py-1 text-[12px] font-semibold text-[#464c53]">
                        총 실점 {voltaSummary.goalsAgainst}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="mb-2 text-xs font-semibold text-[#58616a]">볼타 공식 최근 경기</div>

                  {matchLoading && <LoadingDots label="볼타 공식 기록을 불러오는 중이에요" />}

                  {!matchLoading && matches.length === 0 && (
                    <p className="py-4 text-sm text-[#8a949e]">볼타 공식 경기 기록이 없어요.</p>
                  )}

                  {!matchLoading && (
                    <div className="space-y-3">
                      {matches.map((match) => {
                        const teams = buildVoltaTeams(match, exactCandidate.ouid ?? '')
                        const result = teams?.me.matchDetail.matchResult ?? '-'
                        const resultColor = RESULT_COLOR[result] ?? '#8a949e'

                        if (!teams) {
                          return null
                        }

                        return (
                          <div key={match.matchId} className="rounded-2xl border border-[#e6e8ea] bg-white p-4">
                            <div className="flex items-start gap-3">
                              <div
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                                style={{ backgroundColor: resultColor }}
                              >
                                {result}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-[#1e2124]">
                                  <span>{result}</span>
                                  <span>{teams.isDraw ? '무승부' : '내팀'}</span>
                                  <span className="font-bold">
                                    {teams.myScore} : {teams.opponentScore}
                                  </span>
                                  <span>{teams.isDraw ? '무승부' : '상대팀'}</span>
                                </div>
                                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#8a949e]">
                                  <span>{MATCH_TYPE_NAMES[match.matchType] ?? match.matchType}</span>
                                  <span className="text-[#c1c7cd]">|</span>
                                  <span>{formatDate(match.matchDate)}</span>
                                </div>
                              </div>
                            </div>

                            <details className="mt-3 rounded-2xl bg-[#f4f7fb] px-3 py-2 text-xs text-[#58616a]">
                              <summary className="cursor-pointer list-none font-semibold text-[#464c53]">
                                팀 정보 보기
                              </summary>
                              <div className="mt-3 grid gap-3">
                                <div>
                                  <div className="mb-2 font-semibold text-[#1e2124]">
                                    {teams.isDraw ? '참가자' : '내팀'}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {teams.teammates.map((player) => (
                                      <span
                                        key={player.ouid}
                                        className={`rounded-full px-2.5 py-1 ${
                                          player.ouid === teams.me.ouid
                                            ? 'bg-[#256ef4] text-white'
                                            : 'bg-white text-[#464c53]'
                                        }`}
                                      >
                                        {player.nickname}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {!teams.isDraw && (
                                  <div>
                                    <div className="mb-2 font-semibold text-[#1e2124]">
                                      {teams.opponents.length > 0 ? '상대팀' : '상대 정보'}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {teams.opponents.length > 0 ? (
                                        teams.opponents.map((player) => (
                                          <span
                                            key={player.ouid}
                                            className="rounded-full bg-white px-2.5 py-1 text-[#464c53]"
                                          >
                                            {player.nickname}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-[#8a949e]">
                                          팀 구분 데이터가 없어 상대 정보를 나누지 못했어요.
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </details>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}

            {candidates.length > 0 && (
              <div className="space-y-2">
                <p className="pb-1 text-xs font-semibold text-[#8a949e]">랭킹 후보</p>
                {candidates.map((candidate) => (
                  <div
                    key={`${candidate.nexonSn}-${candidate.nickname}`}
                    className="block w-full rounded-2xl border border-[#e6e8ea] bg-white px-4 py-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold">{candidate.nickname}</div>
                        <div className="mt-1 text-xs text-[#8a949e]">{candidate.modes.join(' · ')}</div>
                      </div>
                      {candidate.voltaRank !== null ? (
                        <span className="rounded-full bg-[#f4f5f6] px-2.5 py-1 text-[11px] font-semibold text-[#58616a]">
                          볼타 #{candidate.voltaRank}
                        </span>
                      ) : candidate.rank !== null ? (
                        <span className="rounded-full bg-[#f4f5f6] px-2.5 py-1 text-[11px] font-semibold text-[#58616a]">
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
          </>
        )}
      </div>
    </div>
  )
}
