'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { CaretLeft } from '@phosphor-icons/react'
import LoadingDots from '@/components/ui/LoadingDots'
import { MatchData, MATCH_TYPE_NAMES, VOLTA_MATCH_TYPES } from '@/features/match-analysis/types'

const MATCH_PAGE_CACHE_KEY = 'fconline.match.page-cache'

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

export default function MatchListPage() {
  const { ouid } = useParams<{ ouid: string }>()
  const searchParams = useSearchParams()
  const nickname = searchParams.get('nickname')
  const [matchType, setMatchType] = useState(214)
  const [matches, setMatches] = useState<MatchData[]>([])
  const [loading, setLoading] = useState(false)
  const prevTypeRef = useRef<number | null>(null)

  useEffect(() => {
    if (prevTypeRef.current === matchType) return
    prevTypeRef.current = matchType

    const cacheKey = `${ouid}:${matchType}`
    try {
      const raw = window.sessionStorage.getItem(MATCH_PAGE_CACHE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, MatchData[]>
        const cached = parsed[cacheKey]
        if (cached) {
          setMatches(cached)
          setLoading(false)
          return
        }
      }
    } catch {}

    setLoading(true)
    setMatches([])

    fetch(`/api/nexon/matches/list?ouid=${ouid}&matchtype=${matchType}&limit=10`)
      .then((r) => r.json())
      .then((data) => {
        setMatches(data)
        try {
          const raw = window.sessionStorage.getItem(MATCH_PAGE_CACHE_KEY)
          const parsed = raw ? (JSON.parse(raw) as Record<string, MatchData[]>) : {}
          parsed[cacheKey] = data
          window.sessionStorage.setItem(MATCH_PAGE_CACHE_KEY, JSON.stringify(parsed))
        } catch {}
      })
      .finally(() => setLoading(false))
  }, [ouid, matchType])

  return (
    <div className="pt-5">
      <div className="flex items-center gap-2">
        <Link href="/matches" className="flex h-8 w-8 items-center justify-center rounded-full text-[#1e2124]">
          <CaretLeft size={20} weight="bold" />
        </Link>
        <div>
          <h1 className="text-lg font-bold tracking-[-0.02em] text-[#1e2124]">
            {nickname ?? ouid.slice(0, 8)}
          </h1>
          <p className="text-xs text-[#8a949e]">경기 기록</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {VOLTA_MATCH_TYPES.map((t) => (
          <button
            key={t.type}
            type="button"
            onClick={() => setMatchType(t.type)}
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

      <div className="mt-4">
        {loading && <LoadingDots label="경기 기록을 불러오는 중이에요" />}

        {!loading && matches.length === 0 && (
          <p className="py-8 text-center text-sm text-[#8a949e]">
            해당 모드의 경기 기록이 없어요.
          </p>
        )}

        {matches.map((match) => {
          const me = match.matchInfo.find((p) => p.ouid === ouid)
          const opponent = match.matchInfo.find((p) => p.ouid !== ouid)
          const result = me?.matchDetail.matchResult ?? '-'
          const resultColor = RESULT_COLOR[result] ?? '#8a949e'

          return (
            <Link
              key={match.matchId}
              href={`/matches/${ouid}/${match.matchId}?nickname=${encodeURIComponent(nickname ?? '')}`}
              className="flex items-center gap-3 border-b border-[#e6e8ea] py-3.5 active:bg-[#f0f3f5]"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: resultColor }}
              >
                {result}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#1e2124]">
                    {me?.nickname ?? '-'}
                    <span className="mx-1.5 font-bold text-[#1e2124]">
                      {me?.shoot.goalTotal ?? 0} : {opponent?.shoot.goalTotal ?? 0}
                    </span>
                    {opponent?.nickname ?? '-'}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#8a949e]">
                  <span>{MATCH_TYPE_NAMES[match.matchType] ?? match.matchType}</span>
                  <span className="text-[#c1c7cd]">|</span>
                  <span>{formatDate(match.matchDate)}</span>
                </div>
              </div>

              <CaretLeft size={14} className="shrink-0 rotate-180 text-[#c1c7cd]" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
