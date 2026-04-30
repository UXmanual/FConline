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
const POPULAR_PLAYERS_CACHE_KEY = 'players-popular-cache-v2'
const LEGACY_POPULAR_PLAYERS_CACHE_KEYS = ['players-popular-cache'] as const
const PLAYER_QUERY_CACHE_KEY = 'players-query-cache'
const POPULAR_PLAYERS_CACHE_TTL_MS = 1000 * 60 * 5
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

function scheduleStateUpdate(callback: () => void) {
  queueMicrotask(callback)
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
  const [isLoginRequiredOpen, setIsLoginRequiredOpen] = useState(false)
  const isInitialRestoreRef = useRef(true)
  const skipNextSearchEffectRef = useRef(false)

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
    for (const key of LEGACY_POPULAR_PLAYERS_CACHE_KEYS) {
      sessionStorage.removeItem(key)
    }

    const shouldReset = sessionStorage.getItem(RESET_KEY) === '1'
    const shouldPreserve = sessionStorage.getItem(PRESERVE_KEY) === '1'

    sessionStorage.removeItem(RESET_KEY)
    sessionStorage.removeItem(PRESERVE_KEY)

    if (shouldReset || !shouldPreserve) {
      sessionStorage.removeItem(STORAGE_KEY)
      scheduleStateUpdate(() => {
        setHydrated(true)
      })
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

        scheduleStateUpdate(() => {
          setQuery(parsed.query ?? '')
          setSearchQuery(parsed.searchQuery ?? '')
          setStrongLevel(parsed.strongLevel ?? 1)
          setSortBy(parsed.sortBy ?? 'latest')
        })

        if (savedResults) {
          try {
            const results = JSON.parse(savedResults) as PlayerSearchResultsCacheEntry
            if (isValidPlayerSearchResultsCacheEntry(results)) {
              skipNextSearchEffectRef.current = true
              scheduleStateUpdate(() => {
                setPlayers(results.players)
                setSeasons(results.seasons)
              })
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

    scheduleStateUpdate(() => {
      setHydrated(true)
    })
  }, [])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    const cached = sessionStorage.getItem(POPULAR_PLAYERS_CACHE_KEY)

    if (cached) {
      try {
        const parsed = JSON.parse(cached) as {
          cachedAt?: number
          fw?: PopularPlayerCardItem[]
          mf?: PopularPlayerCardItem[]
          df?: PopularPlayerCardItem[]
        }
        const isCacheFresh =
          typeof parsed.cachedAt === 'number' && Date.now() - parsed.cachedAt < POPULAR_PLAYERS_CACHE_TTL_MS

        if (
          isCacheFresh &&
          Array.isArray(parsed.fw) &&
          Array.isArray(parsed.mf) &&
          Array.isArray(parsed.df) &&
          (parsed.fw.length > 0 || parsed.mf.length > 0 || parsed.df.length > 0)
        ) {
          const fw = parsed.fw
          const mf = parsed.mf
          const df = parsed.df

          scheduleStateUpdate(() => {
            setPopularFwPlayers(fw)
            setPopularMfPlayers(mf)
            setPopularDfPlayers(df)
            setPopularPlayersLoading(false)
          })
          return
        }
      } catch {
        sessionStorage.removeItem(POPULAR_PLAYERS_CACHE_KEY)
      }
    }

    scheduleStateUpdate(() => {
      setPopularPlayersLoading(true)
    })
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
            cachedAt: Date.now(),
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

    if (isInitialRestoreRef.current && skipNextSearchEffectRef.current) {
      isInitialRestoreRef.current = false
      skipNextSearchEffectRef.current = false
      return
    }

    isInitialRestoreRef.current = false

    if (!searchQuery.trim()) {
      scheduleStateUpdate(() => {
        setPlayers([])
        setSeasons([])
      })
      return
    }

    const cachedResults = sessionStorage.getItem(PLAYER_QUERY_CACHE_KEY)
    if (cachedResults) {
      try {
        const parsed = JSON.parse(cachedResults) as PlayerQueryCacheStore
        const cached = parsed[searchQuery]

        if (isValidPlayerSearchResultsCacheEntry(cached)) {
          scheduleStateUpdate(() => {
            setPlayers(cached.players)
            setSeasons(cached.seasons)
            setLoading(false)
          })
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

    scheduleStateUpdate(() => {
      setLoading(true)
    })
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
                      onRequireLogin={() => setIsLoginRequiredOpen(true)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {isLoginRequiredOpen ? (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            aria-label="닫기"
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.58)' }}
            onClick={() => setIsLoginRequiredOpen(false)}
          />
          <div
            className="absolute left-1/2 z-10 w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
          >
            <section
              className="rounded-[28px] px-5 pb-6 pt-6 shadow-[0_20px_48px_rgba(15,23,42,0.22)]"
              style={{ backgroundColor: 'var(--app-modal-bg, #ffffff)' }}
            >
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full" style={{ backgroundColor: 'rgba(133, 148, 170, 0.32)' }} />
              <div className="space-y-2">
                <p className="text-[18px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--app-title)' }}>
                  로그인이 필요해요
                </p>
                <p className="text-sm leading-[1.55]" style={{ color: 'var(--app-body-text)' }}>
                  선수 즐겨찾기는 Google 로그인 후 이용할 수 있어요
                </p>
              </div>
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginRequiredOpen(false)
                    window.location.assign('/mypage')
                  }}
                  className="flex h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white"
                  style={{ backgroundColor: '#457ae5' }}
                >
                  로그인하러 가기
                </button>
                <button
                  type="button"
                  onClick={() => setIsLoginRequiredOpen(false)}
                  className="block w-full text-center text-sm font-medium"
                  style={{ color: 'var(--app-muted-text)' }}
                >
                  취소
                </button>
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  )
}
