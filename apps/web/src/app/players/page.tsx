'use client'

import { useEffect, useState } from 'react'
import LoadingDots from '@/components/ui/LoadingDots'
import PlayerSearchBar from '@/features/player-search/components/PlayerSearchBar'
import PlayerCard from '@/features/player-search/components/PlayerCard'
import { Player, Season } from '@/features/player-search/types'

const STORAGE_KEY = 'player-search-state'
const RESET_KEY = 'player-search-reset'
const PRESERVE_KEY = 'player-search-preserve'

export default function PlayersPage() {
  const [query, setQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [strongLevel, setStrongLevel] = useState(1)
  const [players, setPlayers] = useState<Player[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const handleSearch = () => {
    setSearchQuery(query.trim())
  }

  useEffect(() => {
    const shouldReset = sessionStorage.getItem(RESET_KEY) === '1'
    const shouldPreserve = sessionStorage.getItem(PRESERVE_KEY) === '1'

    sessionStorage.removeItem(RESET_KEY)
    sessionStorage.removeItem(PRESERVE_KEY)

    if (shouldReset || !shouldPreserve) {
      sessionStorage.removeItem(STORAGE_KEY)
      setHydrated(true)
      return
    }

    const savedState = sessionStorage.getItem(STORAGE_KEY)

    if (savedState) {
      try {
        const parsed = JSON.parse(savedState) as {
          query: string
          searchQuery: string
          strongLevel?: number
        }

        setQuery(parsed.query ?? '')
        setSearchQuery(parsed.searchQuery ?? '')
        setStrongLevel(parsed.strongLevel ?? 1)
      } catch {
        sessionStorage.removeItem(STORAGE_KEY)
      }
    }

    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        query,
        searchQuery,
        strongLevel,
      })
    )
  }, [hydrated, query, searchQuery, strongLevel])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    if (!searchQuery.trim()) {
      setPlayers([])
      setSeasons([])
      return
    }

    setLoading(true)
    fetch(`/api/nexon/players?q=${encodeURIComponent(searchQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        setPlayers(data.players)
        setSeasons(data.seasons)
      })
      .finally(() => setLoading(false))
  }, [hydrated, searchQuery])

  return (
    <div>
      <div className="pt-5">
        <h1 className="text-xl font-bold tracking-[-0.02em] text-[#1e2124]">선수검색</h1>
        <div className="mt-3">
          <PlayerSearchBar
            value={query}
            onChange={setQuery}
            onSearch={handleSearch}
            strongLevel={strongLevel}
            onStrongLevelChange={setStrongLevel}
          />
        </div>
      </div>

      <div className="mt-4">
        {loading && <LoadingDots label="선수를 찾는중이에요" />}

        {!loading && query && players.length === 0 && (
          <p className="py-8 text-center text-sm text-[#8a949e]">검색 결과가 없어요.</p>
        )}

        {!loading && !query && (
          <p className="py-8 text-center text-sm text-[#8a949e]">선수 이름을 검색해보세요.</p>
        )}

        {players.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            seasons={seasons}
            strongLevel={strongLevel}
          />
        ))}
      </div>
    </div>
  )
}
