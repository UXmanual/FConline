'use client'

import { useEffect, useRef, useState } from 'react'
import { CaretDown } from '@phosphor-icons/react'
import LoadingDots from '@/components/ui/LoadingDots'
import PlayerSearchBar from '@/features/player-search/components/PlayerSearchBar'
import PlayerCard from '@/features/player-search/components/PlayerCard'
import { Player, Season } from '@/features/player-search/types'
import { getStrongPoint } from '@/features/player-search/player-detail'

const STORAGE_KEY = 'player-search-state'
const RESULTS_KEY = 'player-search-results'
const RESET_KEY = 'player-search-reset'
const PRESERVE_KEY = 'player-search-preserve'

type SortBy = 'latest' | 'price' | 'pay'

export default function PlayersPage() {
  const [query, setQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [strongLevel, setStrongLevel] = useState(1)
  const [sortBy, setSortBy] = useState<SortBy>('latest')
  const [players, setPlayers] = useState<Player[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const isInitialRestoreRef = useRef(true)

  const handleSearch = () => {
    setSearchQuery(query.trim())
  }

  const getSortedPlayers = (playersToSort: Player[]): Player[] => {
    const sorted = [...playersToSort]

    if (sortBy === 'latest') {
      sorted.sort((a, b) => {
        const seasonIdA = Math.floor(a.id / 1000000)
        const seasonIdB = Math.floor(b.id / 1000000)
        return seasonIdB - seasonIdA
      })
    } else if (sortBy === 'price') {
      sorted.sort((a, b) => {
        const priceAStr = a.detail?.prices[strongLevel] ?? '0'
        const priceBStr = b.detail?.prices[strongLevel] ?? '0'
        const priceA = parseInt(priceAStr.replace(/,/g, ''), 10)
        const priceB = parseInt(priceBStr.replace(/,/g, ''), 10)
        return priceB - priceA
      })
    } else if (sortBy === 'pay') {
      sorted.sort((a, b) => {
        const payA = a.detail?.pay ?? 0
        const payB = b.detail?.pay ?? 0
        return payB - payA
      })
    }

    return sorted
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
    const savedResults = sessionStorage.getItem(RESULTS_KEY)

    if (savedState) {
      try {
        const parsed = JSON.parse(savedState) as {
          query: string
          searchQuery: string
          strongLevel?: number
          sortBy?: SortBy
        }

        setQuery(parsed.query ?? '')
        setSearchQuery(parsed.searchQuery ?? '')
        setStrongLevel(parsed.strongLevel ?? 1)
        setSortBy(parsed.sortBy ?? 'latest')

        // 검색 결과도 즉시 복원 (로딩 없이)
        if (savedResults) {
          try {
            const results = JSON.parse(savedResults) as {
              players: Player[]
              seasons: Season[]
            }
            setPlayers(results.players)
            setSeasons(results.seasons)
          } catch {
            sessionStorage.removeItem(RESULTS_KEY)
          }
        }
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
        sortBy,
      })
    )
  }, [hydrated, query, searchQuery, strongLevel, sortBy])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    // 초기 복원 후 첫 번째 searchQuery 변경은 스킵 (이미 sessionStorage에서 복원됨)
    if (isInitialRestoreRef.current && players.length > 0) {
      isInitialRestoreRef.current = false
      return
    }

    isInitialRestoreRef.current = false

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
        // 검색 결과 캐싱
        sessionStorage.setItem(
          RESULTS_KEY,
          JSON.stringify({
            players: data.players,
            seasons: data.seasons,
          })
        )
      })
      .finally(() => setLoading(false))
  }, [hydrated, searchQuery, players.length])

  const sortedPlayers = getSortedPlayers(players)

  return (
    <div>
      <div className="pt-5">
        <h1 className="text-xl font-bold tracking-[-0.02em] text-[#1e2124]">선수검색</h1>
        <div className="mt-3">
          <PlayerSearchBar
            value={query}
            onChange={setQuery}
            onSearch={handleSearch}
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

        {!loading && query && players.length > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortBy)}
                className="h-10 w-full appearance-none rounded-lg border border-[#e6e8ea] bg-white pl-3 pr-9 text-sm font-medium text-[#1e2124] outline-none"
                aria-label="정렬"
              >
                <option value="latest">최신순</option>
                <option value="price">금액순</option>
                <option value="pay">급여순</option>
              </select>
              <CaretDown
                size={14}
                weight="bold"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#58616a]"
              />
            </div>

            <div className="relative">
              <select
                value={strongLevel}
                onChange={(event) => setStrongLevel(Number(event.target.value))}
                className="h-10 appearance-none rounded-lg border border-[#e6e8ea] bg-white pl-3 pr-9 text-sm font-medium text-[#1e2124] outline-none"
                aria-label="강화 단계"
              >
                {Array.from({ length: 13 }, (_, index) => index + 1).map((level) => (
                  <option key={level} value={level}>
                    {level}카
                  </option>
                ))}
              </select>
              <CaretDown
                size={14}
                weight="bold"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#58616a]"
              />
            </div>
          </div>
        )}

        {sortedPlayers.map((player) => (
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
