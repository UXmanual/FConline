'use client'

import Image from 'next/image'
import Link from 'next/link'
import { getStrongPoint, formatPriceWithKoreanUnits, calculateSkillMoveStars } from '../player-detail'
import { Player, Season } from '../types'
import PlayerImage from './PlayerImage'

const EMPHASIS_COLOR = '#f64f5e'
const PRESERVE_KEY = 'player-search-preserve'

interface Props {
  player: Player
  seasons: Season[]
  strongLevel: number
  isLast?: boolean
}

function getSeasonId(spid: number) {
  return Math.floor(spid / 1000000)
}

function normalizeBodyType(bodyType: string | null): string {
  if (!bodyType) return '-'

  const cleaned = bodyType.replace(/^\s*\(\d+\)\s*$/, '').trim()
  return cleaned || '-'
}

export default function PlayerCard({ player, seasons, strongLevel, isLast = false }: Props) {
  const seasonId = getSeasonId(player.id)
  const season = seasons.find((item) => item.seasonId === seasonId)
  const detail = player.detail
  const currentOverall =
    detail?.overall != null
      ? detail.overall - getStrongPoint(1) + getStrongPoint(strongLevel)
      : null

  const bodyTypeNormalized = detail ? normalizeBodyType(detail.bodyType) : '-'

  const detailItems = detail
    ? [
        { label: `${strongLevel}카`, value: null, emphasize: null as boolean | null },
        { label: '포지션', value: detail.position ?? '-', emphasize: true },
        { label: '오버롤', value: currentOverall ?? '-', emphasize: true },
        { label: '급여', value: detail.pay ?? '-', emphasize: true },
        { label: '현재 금액', value: formatPriceWithKoreanUnits(detail.prices[strongLevel]), emphasize: true },
        { label: '키', value: detail.height ? `${detail.height}cm` : '-', emphasize: false },
        { label: '몸무게', value: detail.weight ? `${detail.weight}kg` : '-', emphasize: false },
        { label: '체형', value: bodyTypeNormalized, emphasize: false },
        { label: '왼발', value: detail.leftFoot ?? '-', emphasize: false, right: `오른발 ${detail.rightFoot ?? '-'}` },
      ]
    : []

  return (
    <Link
      href={`/players/${player.id}?level=${strongLevel}`}
      onClick={() => {
        sessionStorage.setItem(PRESERVE_KEY, '1')
      }}
      className={`flex gap-3 py-3 ${isLast ? '' : 'border-b'}`}
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
            <span className="app-player-title truncate text-sm font-semibold">{player.name}</span>
          </div>

          {detail?.skillMove != null && (
            <div className="shrink-0 flex gap-0.5">
              {Array.from({ length: calculateSkillMoveStars(detail.skillMove, strongLevel) }, (_, i) => (
                <svg
                  key={i}
                  width="12"
                  height="12"
                  viewBox="0 0 19 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4.19227 17.44L6.27227 11.08L0.832266 7.16H7.51227L9.59227 0.799999L11.6723 7.16H18.3923L12.9523 11.08L15.0323 17.44L9.59227 13.52L4.19227 17.44Z"
                    fill="#F1C018"
                  />
                </svg>
              ))}
            </div>
          )}
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
    </Link>
  )
}
