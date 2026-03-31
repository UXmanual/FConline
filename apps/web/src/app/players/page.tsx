'use client'

import { useState, useEffect } from 'react'
import PlayerSearchBar from '@/features/player-search/components/PlayerSearchBar'
import PlayerCard from '@/features/player-search/components/PlayerCard'
import { Player, Season } from '@/features/player-search/types'

export default function PlayersPage() {
  const [query, setQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = () => {
    setSearchQuery(query)
  }

  useEffect(() => {
    if (!searchQuery.trim()) {
      setPlayers([])
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
  }, [searchQuery])

  return (
    <div>
      {/* 검색바 */}
      <div className="pt-5">
        <PlayerSearchBar value={query} onChange={setQuery} onSearch={handleSearch} />
      </div>

      {/* 결과 */}
      <div className="mt-4">
        {loading && (
          <p className="text-sm text-zinc-400 text-center py-8">검색 중...</p>
        )}

        {!loading && query && players.length === 0 && (
          <p className="text-sm text-zinc-400 text-center py-8">검색 결과가 없어요</p>
        )}

        {!loading && !query && (
          <p className="text-sm text-zinc-400 text-center py-8">선수 이름을 검색해보세요</p>
        )}

        {players.map((player) => (
          <PlayerCard key={player.id} player={player} seasons={seasons} />
        ))}
      </div>
    </div>
  )
}
