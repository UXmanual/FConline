import Image from 'next/image'
import Link from 'next/link'
import { getStrongPoint, formatPriceWithKoreanUnits } from '../player-detail'
import { Player, Season } from '../types'
import PlayerImage from './PlayerImage'

interface Props {
  player: Player
  seasons: Season[]
  strongLevel: number
}

const PRESERVE_KEY = 'player-search-preserve'

function getSeasonId(spid: number) {
  return Math.floor(spid / 1000000)
}

export default function PlayerCard({ player, seasons, strongLevel }: Props) {
  const seasonId = getSeasonId(player.id)
  const season = seasons.find((item) => item.seasonId === seasonId)
  const detail = player.detail
  const currentOverall =
    detail?.overall != null
      ? detail.overall - getStrongPoint(1) + getStrongPoint(strongLevel)
      : null

  const detailItems = detail
    ? [
        `${strongLevel}카`,
        `포지션 ${detail.position ?? '-'}`,
        `오버롤 ${currentOverall ?? '-'}`,
        `급여 ${detail.pay ?? '-'}`,
        `현재 금액 ${formatPriceWithKoreanUnits(detail.prices[strongLevel])}`,
        `키 ${detail.height ? `${detail.height}cm` : '-'}`,
        `몸무게 ${detail.weight ? `${detail.weight}kg` : '-'}`,
        `체형 ${detail.bodyType ?? '-'}`,
        `왼발 ${detail.leftFoot ?? '-'} 오른발 ${detail.rightFoot ?? '-'}`,
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

        {detail && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-4 text-[#58616a]">
            {detailItems.map((item, index) => (
              <span key={`${player.id}-${index}`} className="flex items-center gap-1.5">
                {index > 0 && <span className="text-[#c1c7cd]">|</span>}
                <span className="text-[#464c53]">{item}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}
