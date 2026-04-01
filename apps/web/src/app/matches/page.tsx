'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MagnifyingGlass } from '@phosphor-icons/react'
import LoadingDots from '@/components/ui/LoadingDots'
import { MatchUser } from '@/features/match-analysis/types'

export default function MatchesPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const handleSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed) return

    setLoading(true)
    setNotFound(false)

    try {
      const res = await fetch(`/api/nexon/matches/user?nickname=${encodeURIComponent(trimmed)}`)
      const user: MatchUser | null = await res.json()

      if (!user) {
        setNotFound(true)
        return
      }

      router.push(`/matches/${user.ouid}?nickname=${encodeURIComponent(user.nickname)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="pt-5">
      <h1 className="text-xl font-bold tracking-[-0.02em] text-[#1e2124]">경기분석</h1>

      <div className="mt-3 flex h-14 items-center gap-2 rounded-lg border border-[#58616a] bg-white px-4 focus-within:border-2 focus-within:border-[#256ef4]">
        <input
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
          disabled={loading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md active:bg-[#f4f5f6] disabled:opacity-50"
        >
          <MagnifyingGlass size={24} className="text-[#464c53]" weight="bold" />
        </button>
      </div>

      <div className="mt-6">
        {loading && <LoadingDots label="검색 중이에요" />}

        {notFound && (
          <p className="py-8 text-center text-sm text-[#8a949e]">
            해당 닉네임의 유저를 찾을 수 없어요.
          </p>
        )}

        {!loading && !notFound && !query && (
          <p className="py-8 text-center text-sm text-[#8a949e]">
            닉네임을 검색해보세요.
          </p>
        )}
      </div>
    </div>
  )
}
