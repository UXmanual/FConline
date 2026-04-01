'use client'

import { useRef, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import LoadingDots from '@/components/ui/LoadingDots'
import { MatchData, MATCH_TYPE_NAMES, VOLTA_MATCH_TYPES } from '@/features/match-analysis/types'

const RESULT_COLOR: Record<string, string> = {
  승: '#256ef4',
  패: '#f64f5e',
  무: '#8a949e',
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${month}/${day} ${hour}:${min}`
}

export default function MatchesPage() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [query, setQuery] = useState('')
  const [ouid, setOuid] = useState<string | null>(null)
  const [matchType, setMatchType] = useState(214)
  const [matches, setMatches] = useState<MatchData[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [matchLoading, setMatchLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const handleSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed) return

    setSearchLoading(true)
    setNotFound(false)
    setOuid(null)
    setMatches([])

    try {
      const res = await fetch(`/api/nexon/matches/user?nickname=${encodeURIComponent(trimmed)}`)
      const user = await res.json()

      if (!user?.ouid) {
        setNotFound(true)
        return
      }

      setOuid(user.ouid)
      loadMatches(user.ouid, matchType)
    } finally {
      setSearchLoading(false)
    }
  }

  const loadMatches = async (targetOuid: string, type: number) => {
    setMatchLoading(true)
    setMatches([])

    try {
      const res = await fetch(`/api/nexon/matches/list?ouid=${targetOuid}&matchtype=${type}&limit=10`)
      const data = await res.json()
      setMatches(data)
    } finally {
      setMatchLoading(false)
    }
  }

  const handleTypeChange = (type: number) => {
    setMatchType(type)
    if (ouid) loadMatches(ouid, type)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur()
      handleSearch()
    }
  }

  return (
    <div className="pt-5">
      <h1 className="text-xl font-bold tracking-[-0.02em] text-[#1e2124]">경기분석</h1>

      <div className="mt-3 flex h-14 items-center gap-2 rounded-lg border border-[#58616a] bg-white px-4 focus-within:border-2 focus-within:border-[#256ef4]">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setNotFound(false)
          }}
          onKeyDown={handleKeyDown}
          placeholder="닉네임 검색"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-[#1e2124] outline-none placeholder:text-[#8a949e]"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={searchLoading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md active:bg-[#f4f5f6] disabled:opacity-50"
        >
          <MagnifyingGlass size={24} className="text-[#464c53]" weight="bold" />
        </button>
      </div>

      <div className="mt-4">
        {searchLoading && <LoadingDots label="검색 중이에요" />}

        {notFound && (
          <p className="py-8 text-center text-sm text-[#8a949e]">해당 닉네임의 유저를 찾을 수 없어요.</p>
        )}

        {!searchLoading && !notFound && !ouid && (
          <p className="py-8 text-center text-sm text-[#8a949e]">닉네임을 검색해보세요.</p>
        )}

        {ouid && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {VOLTA_MATCH_TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => handleTypeChange(t.type)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    matchType === t.type
                      ? 'border-[#1e2124] bg-[#1e2124] text-white'
                      : 'border-[#e6e8ea] bg-white text-[#58616a]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-3">
              {matchLoading && <LoadingDots label="경기 기록을 불러오는 중이에요" />}

              {!matchLoading && matches.length === 0 && (
                <p className="py-8 text-center text-sm text-[#8a949e]">해당 모드의 경기 기록이 없어요.</p>
              )}

              {matches.map((match) => {
                const me = match.matchInfo.find((p) => p.ouid === ouid)
                const opponent = match.matchInfo.find((p) => p.ouid !== ouid)
                const result = me?.matchDetail.matchResult ?? '-'
                const resultColor = RESULT_COLOR[result] ?? '#8a949e'

                return (
                  <div
                    key={match.matchId}
                    className="flex items-center gap-3 border-b border-[#e6e8ea] py-3.5"
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                      style={{ backgroundColor: resultColor }}
                    >
                      {result}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-semibold text-[#1e2124]">
                        {me?.nickname ?? '-'}
                        <span className="mx-1.5 font-bold">
                          {me?.shoot.goalTotal ?? 0} : {opponent?.shoot.goalTotal ?? 0}
                        </span>
                        {opponent?.nickname ?? '-'}
                      </span>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#8a949e]">
                        <span>{MATCH_TYPE_NAMES[match.matchType] ?? match.matchType}</span>
                        <span className="text-[#c1c7cd]">|</span>
                        <span>{formatDate(match.matchDate)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
