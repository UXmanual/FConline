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

function formatDate(dateStr: string) {
  const normalized = /Z$|[+-]\d{2}:\d{2}$/.test(dateStr) ? dateStr : `${dateStr}Z`
  const d = new Date(normalized)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${month}/${day} ${hour}:${min}`
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
  const teammates = players.filter((player) => player.matchDetail.matchResult === myResult)
  const opponents = players.filter((player) => player.matchDetail.matchResult !== myResult)

  return {
    me,
    isDraw,
    teammates: isDraw ? players : teammates.length > 0 ? teammates : [me],
    opponents: isDraw ? [] : opponents,
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

function explainDetailValue(label: string, rawValue: string | number | null | undefined) {
  const value = statValue(rawValue)
  if (typeof value !== 'string') {
    return String(value)
  }

  if (label === '주요 포지션') {
    const [position, share] = value.split(/\s+(?=\d)/)
    if (!share) return value
    return `${position} | FW / MF / DF 비율 ${share}`
  }

  const parts = value.split(/\s+/).filter(Boolean)
  if (parts.length < 3 || !parts[0].includes('%')) {
    return value
  }

  const rate = parts[0]
  const success = parts[1]
  const attempt = parts[2]

  if (label === '유효슛') {
    return `${rate} | 총 유효슛 ${success} / 경기수 ${attempt}`
  }

  return `${rate} | 성공 ${success} / 시도 ${attempt}`
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
  const [searchMessage, setSearchMessage] = useState('닉네임을 검색해보세요.')

  const loadMatches = async (targetOuid: string) => {
    setMatchLoading(true)
    setMatches([])

    try {
      const res = await fetch(`/api/nexon/matches/list?ouid=${targetOuid}&matchtype=214&limit=20`)
      if (!res.ok) {
        setMatches([])
        return
      }

      const data = await res.json().catch(() => [])
      setMatches(Array.isArray(data) ? data : [])
    } finally {
      setMatchLoading(false)
    }
  }

  const resolveOuid = async (nickname: string) => {
    const res = await fetch(`/api/nexon/matches/user?nickname=${encodeURIComponent(nickname)}`)
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    return data?.ouid ?? null
  }

  const handleSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed) return

    const requestId = ++requestIdRef.current

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

      if (nextExactMatch?.ouid) {
        await loadMatches(nextExactMatch.ouid)
      }

      setSearchMessage(
        nextExactMatch
          ? nextExactMatch.ouid
            ? `"${trimmed}"의 볼타 기록을 확인했어요.`
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
        {searchLoading && <LoadingDots label="닉네임 목록을 찾는 중이에요" />}

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
                        {voltaSummary ? (
                          <InfoCard
                            label="최근 20경기"
                            value={`${voltaSummary.wins}승 ${voltaSummary.draws}무 ${voltaSummary.losses}패`}
                          />
                        ) : (
                          <InfoCard label="최근 20경기" value="-" />
                        )}
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
                      볼타 랭킹 1만위 밖 유저일 수 있어요.
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
                                      {teams.opponents.length > 0 ? '상대팀' : '다른 참가자'}
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
                                          팀 구분 데이터가 없어 상대 팀원을 나누지 못했어요.
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
                        전적 {statValue(candidate.voltaWins)} / {statValue(candidate.voltaDraws)} / {statValue(candidate.voltaLosses)}
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
