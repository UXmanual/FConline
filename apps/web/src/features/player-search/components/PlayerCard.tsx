import Image from 'next/image'
import Link from 'next/link'
import { getStrongPoint, formatPriceWithKoreanUnits, calculateSkillMoveStars } from '../player-detail'
import { Player, Season } from '../types'
import PlayerImage from './PlayerImage'

const EMPHASIS_COLOR = '#f64f5e'

interface Props {
  player: Player
  seasons: Season[]
  strongLevel: number
}

const PRESERVE_KEY = 'player-search-preserve'

function getSeasonId(spid: number) {
  return Math.floor(spid / 1000000)
}

function normalizeBodyType(bodyType: string | null): string {
  if (!bodyType) return '-'

  // 괄호 안의 숫자만 있는 경우 (예: "(168)") 제거
  const cleaned = bodyType.replace(/^\s*\(\d+\)\s*$/, '').trim()

  return cleaned || '-'
}

export default function PlayerCard({ player, seasons, strongLevel }: Props) {
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
        { label: `${strongLevel}카`, emphasize: null },
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
      className="flex gap-3 border-b border-[#e6e8ea] py-3 active:bg-[#f4f5f6]"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#f4f5f6]">
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
            <span className="truncate text-sm font-semibold text-[#1e2124]">{player.name}</span>
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
          <div className="mt-1.5 space-y-1">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-4 text-[#58616a]">
              {detailItems.map((item, index) => (
                <span key={`${player.id}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 && <span className="text-[#c1c7cd]">|</span>}
                  {item.emphasize === null ? (
                    <span className="text-[#464c53]">{item.label}</span>
                  ) : item.emphasize === true ? (
                    <span className="text-[#464c53]">
                      {item.label}{' '}
                      <span style={{ color: EMPHASIS_COLOR }} className="font-semibold">
                        {item.value}
                      </span>
                    </span>
                  ) : (
                    <span className="text-[#464c53]">
                      {item.label} {item.value}
                    </span>
                  )}
                  {item.right && <span className="text-[#464c53]">{item.right}</span>}
                </span>
              ))}
            </div>

            {detail.traits.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {detail.traits.map((trait, index) => (
                  <span key={index} className="inline-block rounded-full bg-[#f4f5f6] px-2 py-0.5 text-[10px] font-medium text-[#464c53] border border-[#e6e8ea]">
                    {trait.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
