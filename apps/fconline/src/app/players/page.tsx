'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import LoadingDots from '@/components/ui/LoadingDots'
import SelectChevron from '@/components/ui/SelectChevron'
import PlayerSearchBar from '@/features/player-search/components/PlayerSearchBar'
import PlayerCard from '@/features/player-search/components/PlayerCard'
import { Player, Season } from '@/features/player-search/types'
import PositionTopPlayersCard from './PositionTopPlayersCard'

const STORAGE_KEY = 'player-search-state'
const RESULTS_KEY = 'player-search-results'
const RESET_KEY = 'player-search-reset'
const PRESERVE_KEY = 'player-search-preserve'
const POPULAR_PLAYERS_CACHE_KEY = 'players-popular-cache'
const PLAYER_QUERY_CACHE_KEY = 'players-query-cache'
const PLAYER_QUERY_CACHE_TTL_MS = 1000 * 60 * 5
const PLAYER_QUERY_CACHE_VERSION = 2

const TITLE_TEXT = '\uC120\uC218\uB97C \uCC3E\uC544\uBCFC\uAE4C\uC694?'
const BACK_HOME_TEXT = '\uC120\uC218 \uD648'
const FW_TITLE = 'FW \uC778\uAE30 \uC120\uC218 TOP 5'
const MF_TITLE = 'MF \uC778\uAE30 \uC120\uC218 TOP 5'
const DF_TITLE = 'DF \uC778\uAE30 \uC120\uC218 TOP 5'
const FW_GUIDE_TEXT =
  '\u2022 \uC804\uC77C \uC5C5\uB370\uC774\uD2B8 \uAE30\uC900 \uACF5\uC2DD \uD3EC\uC9C0\uC158 \uC778\uAE30 \uCE74\uB4DC'
const LOADING_LABEL = '\uC120\uC218\uB97C \uCC3E\uB294 \uC911\uC774\uC5D0\uC694'
const EMPTY_RESULT_TEXT = '\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC5B4\uC694'
const SORT_LABEL = '\uC815\uB82C'
const SORT_LATEST = '\uCD5C\uC2E0\uC21C'
const SORT_PRICE = '\uAE08\uC561\uC21C'
const SORT_PAY = '\uAE09\uC5EC\uC21C'
const STRONG_LEVEL_LABEL = '\uAC15\uD654 \uB2E8\uACC4'

const MF_TOP_PLAYERS = [
  {
    rank: 1,
    name: '\uCF00\uBE48 \uB354\uBE0C\uB77C\uC704\uB108',
    summary: 'UT \u00B7 CM \u00B7 OVR 114 \u00B7 \uAE09\uC5EC 28',
    metric: '4,280\uC5B5',
  },
  {
    rank: 2,
    name: '\uB8E8\uB4DC \uAD74\uB9AC\uD2B8',
    summary: 'WB \u00B7 CAM \u00B7 OVR 116 \u00B7 \uAE09\uC5EC 31',
    metric: '14\uC870 2,000\uC5B5',
  },
  {
    rank: 3,
    name: '\uC8FC\uB4DC \uBCA8\uB9C1\uC5C4',
    summary: '24UCL \u00B7 CM \u00B7 OVR 113 \u00B7 \uAE09\uC5EC 27',
    metric: '3,720\uC5B5',
  },
  {
    rank: 4,
    name: '\uC9C0\uB124\uB527 \uC9C0\uB2E8',
    summary: 'DC \u00B7 CAM \u00B7 OVR 113 \u00B7 \uAE09\uC5EC 29',
    metric: '2,940\uC5B5',
  },
  {
    rank: 5,
    name: '\uD329\uD2B8\uB9AD \uBE44\uC5D0\uC774\uB77C',
    summary: 'RTN \u00B7 CDM \u00B7 OVR 114 \u00B7 \uAE09\uC5EC 28',
    metric: '5,610\uC5B5',
  },
] as const

const DF_TOP_PLAYERS = [
  {
    rank: 1,
    name: '\uBC84\uC9C8 \uBC18\uB370\uC774\uD06C',
    summary: '25TOTN \u00B7 CB \u00B7 OVR 115 \u00B7 \uAE09\uC5EC 28',
    metric: '6,140\uC5B5',
  },
  {
    rank: 2,
    name: '\uD30C\uC62C\uB85C \uB9D0\uB514\uB2C8',
    summary: 'RTN \u00B7 CB \u00B7 OVR 116 \u00B7 \uAE09\uC5EC 29',
    metric: '8,900\uC5B5',
  },
  {
    rank: 3,
    name: '\uB8E8\uC2DC\uC6B0',
    summary: 'DC \u00B7 CB \u00B7 OVR 114 \u00B7 \uAE09\uC5EC 27',
    metric: '3,880\uC5B5',
  },
  {
    rank: 4,
    name: '\uD398\uB97C\uB791 \uBA58\uB514',
    summary: 'WB \u00B7 LB \u00B7 OVR 113 \u00B7 \uAE09\uC5EC 26',
    metric: '2,760\uC5B5',
  },
  {
    rank: 5,
    name: '\uCE74\uB974\uBC14\uD560',
    summary: '24UCL \u00B7 RB \u00B7 OVR 112 \u00B7 \uAE09\uC5EC 25',
    metric: '2,180\uC5B5',
  },
] as const

type SortBy = 'latest' | 'price' | 'pay'

type PopularPlayerCardItem = {
  rank: number
  name: string
  summary: string
  metric: string
  imageUrl?: string
  seasonBadgeUrl?: string
}

type PlayerSearchResultsCacheEntry = {
  players: Player[]
  seasons: Season[]
  cachedAt: number
  version?: number
}

type PlayerQueryCacheStore = Record<string, PlayerSearchResultsCacheEntry>

function hasIncompletePlayerDetails(players: Player[]) {
  return players.some((player) => player.detail == null)
}

function isValidPlayerSearchResultsCacheEntry(entry: PlayerSearchResultsCacheEntry | null | undefined) {
  if (!entry || typeof entry.cachedAt !== 'number') {
    return false
  }

  if (entry.version !== PLAYER_QUERY_CACHE_VERSION) {
    return false
  }

  if (Date.now() - entry.cachedAt > PLAYER_QUERY_CACHE_TTL_MS) {
    return false
  }

  if (hasIncompletePlayerDetails(entry.players)) {
    return false
  }

  return true
}

function getKstDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export default function PlayersPage() {
  const [query, setQuery] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [strongLevel, setStrongLevel] = useState(1)
  const [sortBy, setSortBy] = useState<SortBy>('latest')
  const [players, setPlayers] = useState<Player[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [popularFwPlayers, setPopularFwPlayers] = useState<PopularPlayerCardItem[]>([])
  const [popularMfPlayers, setPopularMfPlayers] = useState<PopularPlayerCardItem[]>([])
  const [popularDfPlayers, setPopularDfPlayers] = useState<PopularPlayerCardItem[]>([])
  const [popularPlayersLoading, setPopularPlayersLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const isInitialRestoreRef = useRef(true)

  const handleSearch = () => {
    const trimmed = query.trim()
    if (!trimmed) {
      return
    }

    setLoading(true)
    setSearchQuery(trimmed)
  }

  const handlePopularPlayerSelect = (name: string) => {
    const trimmed = name.trim()

    if (!trimmed) {
      return
    }

    setQuery(trimmed)
    setLoading(true)
    setSearchQuery(trimmed)
  }

  const handleBackHome = () => {
    setQuery('')
    setSearchQuery('')
    setPlayers([])
    setSeasons([])
    setLoading(false)
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(RESULTS_KEY)
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

        if (savedResults) {
          try {
            const results = JSON.parse(savedResults) as PlayerSearchResultsCacheEntry
            if (isValidPlayerSearchResultsCacheEntry(results)) {
              setPlayers(results.players)
              setSeasons(results.seasons)
            } else {
              sessionStorage.removeItem(RESULTS_KEY)
            }
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

    const todayKey = getKstDateKey()
    const cached = sessionStorage.getItem(POPULAR_PLAYERS_CACHE_KEY)

    if (cached) {
      try {
        const parsed = JSON.parse(cached) as {
          dateKey?: string
          fw?: PopularPlayerCardItem[]
          mf?: PopularPlayerCardItem[]
          df?: PopularPlayerCardItem[]
        }

        if (
          parsed.dateKey === todayKey &&
          Array.isArray(parsed.fw) &&
          Array.isArray(parsed.mf) &&
          Array.isArray(parsed.df) &&
          (parsed.fw.length > 0 || parsed.mf.length > 0 || parsed.df.length > 0)
        ) {
          setPopularFwPlayers(parsed.fw)
          setPopularMfPlayers(parsed.mf)
          setPopularDfPlayers(parsed.df)
          setPopularPlayersLoading(false)
          return
        }
      } catch {
        sessionStorage.removeItem(POPULAR_PLAYERS_CACHE_KEY)
      }
    }

    setPopularPlayersLoading(true)
    fetch('/api/nexon/popular-players')
      .then((res) => res.json())
      .then((data) => {
        const fw = Array.isArray(data.fw) ? data.fw : []
        const mf = Array.isArray(data.mf) ? data.mf : []
        const df = Array.isArray(data.df) ? data.df : []
        setPopularFwPlayers(fw)
        setPopularMfPlayers(mf)
        setPopularDfPlayers(df)
        sessionStorage.setItem(
          POPULAR_PLAYERS_CACHE_KEY,
          JSON.stringify({
            dateKey: todayKey,
            fw,
            mf,
            df,
          }),
        )
      })
      .catch(() => {
        setPopularFwPlayers([])
        setPopularMfPlayers([])
        setPopularDfPlayers([])
      })
      .finally(() => {
        setPopularPlayersLoading(false)
      })
  }, [hydrated])

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
      }),
    )
  }, [hydrated, query, searchQuery, strongLevel, sortBy])

  useEffect(() => {
    if (!hydrated) {
      return
    }

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

    const cachedResults = sessionStorage.getItem(PLAYER_QUERY_CACHE_KEY)
    if (cachedResults) {
      try {
        const parsed = JSON.parse(cachedResults) as PlayerQueryCacheStore
        const cached = parsed[searchQuery]

        if (isValidPlayerSearchResultsCacheEntry(cached)) {
          setPlayers(cached.players)
          setSeasons(cached.seasons)
          setLoading(false)
          sessionStorage.setItem(
            RESULTS_KEY,
            JSON.stringify({
              players: cached.players,
              seasons: cached.seasons,
              cachedAt: cached.cachedAt,
              version: cached.version,
            }),
          )
          return
        }

        if (cached) {
          delete parsed[searchQuery]
          sessionStorage.setItem(PLAYER_QUERY_CACHE_KEY, JSON.stringify(parsed))
        }
      } catch {
        sessionStorage.removeItem(PLAYER_QUERY_CACHE_KEY)
      }
    }

    setLoading(true)
    fetch(`/api/nexon/players?q=${encodeURIComponent(searchQuery)}`)
      .then((res) => res.json())
      .then((data) => {
        setPlayers(data.players)
        setSeasons(data.seasons)
        const shouldCacheResults = !hasIncompletePlayerDetails(data.players)

        if (shouldCacheResults) {
          const parsed = (() => {
            try {
              return JSON.parse(sessionStorage.getItem(PLAYER_QUERY_CACHE_KEY) ?? '{}') as PlayerQueryCacheStore
            } catch {
              return {}
            }
          })()

          parsed[searchQuery] = {
            players: data.players,
            seasons: data.seasons,
            cachedAt: Date.now(),
            version: PLAYER_QUERY_CACHE_VERSION,
          }
          sessionStorage.setItem(PLAYER_QUERY_CACHE_KEY, JSON.stringify(parsed))
          sessionStorage.setItem(
            RESULTS_KEY,
            JSON.stringify({
              players: data.players,
              seasons: data.seasons,
              cachedAt: Date.now(),
              version: PLAYER_QUERY_CACHE_VERSION,
            }),
          )
        } else {
          sessionStorage.removeItem(RESULTS_KEY)
        }
      })
      .finally(() => setLoading(false))
  }, [hydrated, searchQuery])

  const sortedPlayers = getSortedPlayers(players)
  const hasSearchResults = searchQuery.trim().length > 0
  const showResultsPanel = loading || hasSearchResults
  const showTopPlayersPanel = !loading && !hasSearchResults

  return (
    <div>
      <div className="pt-5">
        <div className="flex h-6 items-center">
          {showResultsPanel ? (
            <button
              type="button"
              onClick={handleBackHome}
              className="app-player-title inline-flex items-center gap-1.5 text-[18px] font-bold tracking-[-0.02em]"
            >
              <ArrowLeft size={18} weight="bold" />
              <span>{BACK_HOME_TEXT}</span>
            </button>
          ) : (
            <h1 className="app-player-title text-[18px] font-bold tracking-[-0.02em]">{TITLE_TEXT}</h1>
          )}
        </div>
        <div className="mt-4">
          <PlayerSearchBar value={query} onChange={setQuery} onSearch={handleSearch} />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {showTopPlayersPanel && (
          <>
            <p className="app-player-muted text-[11px] font-medium leading-4">{FW_GUIDE_TEXT}</p>
            <PositionTopPlayersCard
              title={FW_TITLE}
              badge="FW"
              items={popularFwPlayers}
              isLoading={popularPlayersLoading}
              onSelectPlayer={handlePopularPlayerSelect}
            />
            <PositionTopPlayersCard
              title={MF_TITLE}
              badge="MF"
              items={popularMfPlayers}
              isLoading={popularPlayersLoading}
              onSelectPlayer={handlePopularPlayerSelect}
            />
            <PositionTopPlayersCard
              title={DF_TITLE}
              badge="DF"
              items={popularDfPlayers}
              isLoading={popularPlayersLoading}
              onSelectPlayer={handlePopularPlayerSelect}
            />
          </>
        )}

        {showResultsPanel && (
          <div className="app-player-card rounded-lg px-5 py-4">
            {loading && <LoadingDots label={LOADING_LABEL} />}

            {!loading && players.length === 0 && (
              <p className="app-player-muted py-4 text-center text-sm">{EMPTY_RESULT_TEXT}</p>
            )}

            {!loading && players.length > 0 && (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value as SortBy)}
                      className="h-10 w-full appearance-none rounded-lg border pl-3 pr-9 text-sm font-medium outline-none"
                      style={{ backgroundColor: 'var(--app-player-card-bg)', borderColor: 'var(--app-player-input-border)', color: 'var(--app-player-title)' }}
                      aria-label={SORT_LABEL}
                    >
                      <option value="latest">{SORT_LATEST}</option>
                      <option value="price">{SORT_PRICE}</option>
                      <option value="pay">{SORT_PAY}</option>
                    </select>
                    <SelectChevron className="right-3" />
                  </div>

                  <div className="relative">
                    <select
                      value={strongLevel}
                      onChange={(event) => setStrongLevel(Number(event.target.value))}
                      className="h-10 appearance-none rounded-lg border pl-3 pr-9 text-sm font-medium outline-none"
                      style={{ backgroundColor: 'var(--app-player-card-bg)', borderColor: 'var(--app-player-input-border)', color: 'var(--app-player-title)' }}
                      aria-label={STRONG_LEVEL_LABEL}
                    >
                      {Array.from({ length: 13 }, (_, index) => index + 1).map((level) => (
                        <option key={level} value={level}>
                          {`${level}\uAC15`}
                        </option>
                      ))}
                    </select>
                    <SelectChevron className="right-3" />
                  </div>
                </div>

                <div>
                  {sortedPlayers.map((player, index) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      seasons={seasons}
                      strongLevel={strongLevel}
                      isLast={index === sortedPlayers.length - 1}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
