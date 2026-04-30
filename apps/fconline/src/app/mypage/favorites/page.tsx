'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import { formatRelativeTime } from '@/lib/community'
import HeartIcon from '@/components/icons/HeartIcon'
import PlayerImage from '@/features/player-search/components/PlayerImage'
import { getSupabaseBrowserClient, getSupabaseUserSafely } from '@/lib/supabase/browser'

type FavoritesTab = 'players' | 'community' | 'player-reviews'

type FavoriteItem = {
  id: string | number
  title: string
  body: string
  createdAt: string
  commentCount?: number | null
  likeCount?: number | null
  href?: string | null
}

type FavoritePlayerApiItem = {
  player_id: number
  player_name: string
  season_name?: string | null
  season_img?: string | null
  position?: string | null
  level?: number | null
  created_at?: string | null
}

const FAVORITES_TABS: Array<{ key: FavoritesTab; label: string }> = [
  { key: 'players', label: '선수' },
  { key: 'community', label: '커뮤니티' },
  { key: 'player-reviews', label: '선수평가' },
]

const EMPTY_MESSAGES: Record<FavoritesTab, string> = {
  players: '즐겨찾기한 선수가 아직 없어요.',
  community: '작성한 커뮤니티 글이 아직 없어요.',
  'player-reviews': '작성한 선수평가 글이 아직 없어요.',
}

export default function MyFavoritesPage() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<FavoritesTab>(() => {
    const tab = searchParams.get('tab')
    return tab === 'community' || tab === 'player-reviews' || tab === 'players' ? tab : 'players'
  })
  const [items, setItems] = useState<FavoriteItem[]>([])
  const [playerItems, setPlayerItems] = useState<FavoritePlayerApiItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const titleStyle = { color: 'var(--app-title)' }
  const bodyStyle = { color: 'var(--app-body-text)' }
  const mutedStyle = { color: 'var(--app-muted-text)' }
  const dividerStyle = { borderColor: 'var(--app-divider)' }
  const cardStyle = {
    backgroundColor: 'var(--app-card-bg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--app-card-border)',
  }

  async function handleDeletePlayer(item: FavoritePlayerApiItem) {
    const prev = playerItems
    setPlayerItems((current) => current.filter((p) => p.player_id !== item.player_id))
    try {
      const response = await fetch('/api/mypage/favorite-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: item.player_id,
          playerName: item.player_name,
          seasonName: item.season_name ?? null,
          position: item.position ?? null,
          level: item.level ?? null,
        }),
      })
      if (!response.ok) throw new Error()
    } catch {
      setPlayerItems(prev)
    }
  }

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    let isMounted = true

    const syncItems = async () => {
      try {
        setIsLoading(true)
        setErrorMessage(null)

        const { user } = await getSupabaseUserSafely(supabase)

        if (!isMounted) {
          return
        }

        if (!user) {
          setItems([])
          setErrorMessage('로그인 후 이용할 수 있어요.')
          setIsLoading(false)
          return
        }

        if (activeTab === 'players') {
          const response = await fetch('/api/mypage/favorite-players', { cache: 'no-store' })
          const result = await response.json().catch(() => null)

          if (!isMounted) {
            return
          }

          if (!response.ok) {
            setItems([])
            setErrorMessage(result?.message ?? '선수 즐겨찾기를 불러오지 못했습니다.')
            setIsLoading(false)
            return
          }

          const favorites = (Array.isArray(result?.items) ? result.items : []) as FavoritePlayerApiItem[]
          setPlayerItems(favorites)
          setIsLoading(false)
          return
        }

        const response = await fetch(`/api/mypage/favorites?tab=${activeTab}`, { cache: 'no-store' })
        const result = await response.json().catch(() => null)

        if (!isMounted) {
          return
        }

        if (!response.ok) {
          setItems([])
          setErrorMessage(result?.message ?? '즐겨찾기 목록을 불러오지 못했습니다.')
          setIsLoading(false)
          return
        }

        setItems((result?.items as FavoriteItem[] | undefined) ?? [])
        setIsLoading(false)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setItems([])
        setErrorMessage(error instanceof Error ? error.message : '즐겨찾기 목록을 불러오지 못했습니다.')
        setIsLoading(false)
      }
    }

    void syncItems()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncItems()
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [activeTab])

  return (
    <div className="pt-5">
      <div className="flex h-6 items-center">
        <Link
          href="/mypage"
          aria-label="뒤로가기"
          className="app-player-title inline-flex items-center gap-1.5 text-[18px] font-bold tracking-[-0.02em]"
        >
          <ArrowLeft size={18} weight="bold" />
          <span>마이페이지</span>
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-1.5 gap-y-2">
          {FAVORITES_TABS.map((tab) => {
            const isActive = tab.key === activeTab

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="inline-flex h-9 items-center justify-center rounded-full px-4 text-[15px] font-semibold leading-none tracking-[-0.02em] transition"
                style={{
                  color: isActive ? '#ffffff' : 'var(--app-body-text)',
                  background: isActive ? 'linear-gradient(135deg, #457ae5 0%, #256ef4 100%)' : 'transparent',
                  boxShadow: 'none',
                }}
              >
                {tab.label}
              </button>
            )
          })}
      </div>

      <section className="mt-3 rounded-lg px-5 py-1" style={cardStyle}>
        {isLoading ? (
          <div className="py-5 text-center text-sm font-medium" style={mutedStyle}>
            불러오는 중...
          </div>
        ) : errorMessage ? (
          <div className="py-5 text-center text-sm font-medium" style={mutedStyle}>
            {errorMessage}
          </div>
        ) : activeTab === 'players' ? (
          playerItems.length > 0 ? (
            <ul>
              {playerItems.map((item, index) => (
                <li
                  key={item.player_id}
                  className={`py-3 ${index === playerItems.length - 1 ? '' : 'border-b'}`}
                  style={index === playerItems.length - 1 ? undefined : dividerStyle}
                >
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/players/${item.player_id}?level=${item.level ?? 1}`}
                      className="flex min-w-0 flex-1 items-center gap-3"
                    >
                      <div
                        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg"
                        style={{ backgroundColor: 'var(--app-player-soft-strong)' }}
                      >
                        <PlayerImage spid={item.player_id} alt={item.player_name} className="object-contain" sizes="64px" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1">
                          {item.season_img ? (
                            <div className="relative -mr-1 h-4 w-6 shrink-0">
                              <Image src={item.season_img} alt={item.season_name ?? ''} fill className="object-contain object-left" unoptimized />
                            </div>
                          ) : null}
                          <span className="truncate text-sm font-semibold" style={titleStyle}>
                            {item.player_name}
                          </span>
                        </div>
                        {(item.season_name || item.position) ? (
                          <p className="mt-1 text-[12px] font-medium" style={mutedStyle}>
                            {[item.season_name, item.position].filter(Boolean).join(' · ')}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleDeletePlayer(item)}
                      className="shrink-0 text-[12px] font-medium leading-none"
                      style={mutedStyle}
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-5 text-center text-sm font-medium" style={mutedStyle}>
              {EMPTY_MESSAGES['players']}
            </div>
          )
        ) : items.length > 0 ? (
          <ul>
            {items.map((item, index) => {
              const content = (
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold leading-[1.4]" style={titleStyle}>
                        {item.title}
                      </p>
                      <p className="mt-1.5 break-words line-clamp-2 text-sm leading-[1.55]" style={bodyStyle}>
                        {item.body}
                      </p>
                    </div>
                    <div className="shrink-0 pt-0.5 text-right text-[12px] font-medium leading-none" style={mutedStyle}>
                      <p>{formatRelativeTime(item.createdAt)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-1 text-[12px] font-medium">
                      <span style={titleStyle}>댓글</span>
                      <span className="font-[600] text-[#457ae5]">{Math.max(0, Number(item.commentCount ?? 0) || 0)}</span>
                    </div>
                    <div className="inline-flex items-center gap-1 text-[12px] font-medium">
                      <HeartIcon size={14} filled={(item.likeCount ?? 0) > 0} color={(item.likeCount ?? 0) > 0 ? '#e03131' : 'var(--app-muted-text)'} />
                      <span style={{ color: (item.likeCount ?? 0) > 0 ? '#e03131' : 'var(--app-muted-text)' }}>
                        {Math.max(0, Number(item.likeCount ?? 0) || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )

              return (
                <li
                  key={item.id}
                  className={`py-4 ${index === items.length - 1 ? '' : 'border-b'}`}
                  style={index === items.length - 1 ? undefined : dividerStyle}
                >
                  {item.href ? (
                    <Link href={item.href} className="block">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="py-5 text-center text-sm font-medium" style={mutedStyle}>
            {EMPTY_MESSAGES[activeTab]}
          </div>
        )}
      </section>
    </div>
  )
}
