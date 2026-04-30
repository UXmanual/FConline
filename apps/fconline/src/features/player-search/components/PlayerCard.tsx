'use client'

import Image from 'next/image'
import { MouseEvent, PointerEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import FilledFavoriteIcon from '@/components/icons/star.svg'
import EmptyFavoriteIcon from '@/components/icons/star_border.svg'
import { getStrongPoint, formatPriceWithKoreanUnits } from '../player-detail'
import { Player, Season } from '../types'
import PlayerImage from './PlayerImage'

const EMPHASIS_COLOR = '#f64f5e'
const PRESERVE_KEY = 'player-search-preserve'


interface Props {
  player: Player
  seasons: Season[]
  strongLevel: number
  isLast?: boolean
  onRequireLogin?: () => void
}

type FavoritePlayerApiItem = {
  player_id: number
}

function getSeasonId(spid: number) {
  return Math.floor(spid / 1000000)
}

function normalizeBodyType(bodyType: string | null): string {
  if (!bodyType) return '-'

  const cleaned = bodyType.replace(/^\s*\(\d+\)\s*$/, '').trim()
  return cleaned || '-'
}

export default function PlayerCard({ player, seasons, strongLevel, isLast = false, onRequireLogin }: Props) {
  const router = useRouter()
  const seasonId = getSeasonId(player.id)
  const season = seasons.find((item) => item.seasonId === seasonId)
  const detail = player.detail
  const [favorited, setFavorited] = useState(false)
  const currentOverall =
    detail?.overall != null
      ? detail.overall - getStrongPoint(1) + getStrongPoint(strongLevel)
      : null

  const bodyTypeNormalized = detail ? normalizeBodyType(detail.bodyType) : '-'

  useEffect(() => {
    let isMounted = true

    const syncFavorite = async () => {
      try {
        const response = await fetch('/api/mypage/favorite-players', { cache: 'no-store' })
        const result = await response.json().catch(() => null)

        if (!isMounted || !response.ok) {
          return
        }

        const items = (Array.isArray(result?.items) ? result.items : []) as FavoritePlayerApiItem[]
        setFavorited(items.some((item) => Number(item.player_id) === player.id))
      } catch {
        if (isMounted) {
          setFavorited(false)
        }
      }
    }

    void syncFavorite()

    return () => {
      isMounted = false
    }
  }, [player.id])

  const detailItems = detail
    ? [
        { label: `${strongLevel}\uAC15`, value: null, emphasize: null as boolean | null },
        { label: '\uC8FC\uD3EC\uC9C0\uC158', value: detail.position ?? '-', emphasize: true },
        { label: '\uC624\uBC84\uB864', value: currentOverall ?? '-', emphasize: true },
        { label: '\uAE09\uC5EC', value: detail.pay ?? '-', emphasize: true },
        { label: '\uD604\uC7AC \uAE08\uC561', value: formatPriceWithKoreanUnits(detail.prices[strongLevel]), emphasize: true },
        { label: '\uD0A4', value: detail.height ? `${detail.height}cm` : '-', emphasize: false },
        { label: '\uBAB8\uBB34\uAC8C', value: detail.weight ? `${detail.weight}kg` : '-', emphasize: false },
        { label: '\uCCB4\uD615', value: bodyTypeNormalized, emphasize: false },
        { label: '\uC67C\uBC1C', value: detail.leftFoot ?? '-', emphasize: false, right: `\uC624\uB978\uBC1C ${detail.rightFoot ?? '-'}` },
      ]
    : []

  const handleOpenPlayer = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null

    if (target?.closest('button')) {
      return
    }

    sessionStorage.setItem(PRESERVE_KEY, '1')
    router.push(`/players/${player.id}?level=${strongLevel}`)
  }

  const handleFavorite = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    void (async () => {
      const response = await fetch('/api/mypage/favorite-players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          playerName: player.name,
          seasonName: season?.className ?? null,
          position: detail?.position ?? null,
          level: strongLevel,
        }),
      })

      if (response.status === 401) {
        onRequireLogin?.()
        return
      }

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        window.alert(result?.message ?? '선수 즐겨찾기를 처리하지 못했습니다.')
        return
      }

      const result = await response.json().catch(() => null)
      setFavorited(Boolean(result?.favorited))
    })()
  }

  return (
    <article
      onClick={handleOpenPlayer}
      className={`flex cursor-pointer gap-3 py-3 ${isLast ? '' : 'border-b'}`}
      style={{ borderColor: isLast ? undefined : 'var(--app-player-divider)' }}
    >
      <div
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg"
        style={{ backgroundColor: 'var(--app-player-soft-strong)' }}
      >
        <PlayerImage spid={player.id} alt={player.name} className="object-contain" sizes="64px" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            {season && (
              <div className="relative -mr-1 h-4 w-6 shrink-0">
                <Image
                  src={season.seasonImg}
                  alt={season.className}
                  fill
                  className="object-contain object-left"
                  unoptimized
                />
              </div>
            )}
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="app-player-title truncate text-sm font-semibold">{player.name}</span>
              {typeof player.reviewCount === 'number' && player.reviewCount > 0 ? (
                <span
                  className="shrink-0 text-[11px] font-medium whitespace-nowrap"
                  style={{ color: 'var(--app-muted-text)' }}
                >
                  <span className="font-semibold" style={{ color: '#457ae5' }}>
                    {player.reviewCount.toLocaleString()}
                  </span>{' '}
                  평가
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
                event.stopPropagation()
              }}
              onClick={handleFavorite}
              className="shrink-0 rounded-full p-2 -m-2 touch-manipulation"
              aria-label="선수 즐겨찾기"
            >
              <Image
                src={favorited ? FilledFavoriteIcon : EmptyFavoriteIcon}
                alt=""
                width={18}
                height={18}
                className="shrink-0"
              />
            </button>
          </div>
        </div>

        {detail && (
          <div className="app-player-body mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-4">
            {detailItems.map((item, index) => (
              <span key={`${player.id}-${index}`} className="flex items-center gap-1.5">
                {index > 0 && <span className="app-player-muted">|</span>}
                {item.emphasize === null ? (
                  <span className="app-player-body">{item.label}</span>
                ) : item.emphasize === true ? (
                  <span className="app-player-body">
                    {item.label}{' '}
                    <span style={{ color: EMPHASIS_COLOR }} className="font-semibold">
                      {item.value}
                    </span>
                  </span>
                ) : (
                  <span className="app-player-body">
                    {item.label} {item.value}
                  </span>
                )}
                {item.right && <span className="app-player-body">{item.right}</span>}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
