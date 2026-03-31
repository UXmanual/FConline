import Image from 'next/image'
import Link from 'next/link'
import { Player, Season } from '../types'

interface Props {
  player: Player
  seasons: Season[]
}

function getSeasonId(spid: number) {
  return Math.floor(spid / 1000000)
}

function getPlayerImgUrl(spid: number) {
  return `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${spid}.png`
}

export default function PlayerCard({ player, seasons }: Props) {
  const seasonId = getSeasonId(player.id)
  const season = seasons.find((s) => s.seasonId === seasonId)

  return (
    <Link
      href={`/players/${player.id}`}
      className="flex items-center gap-4 py-3 border-b border-zinc-100 active:bg-zinc-50"
    >
      {/* 선수 이미지 */}
      <div className="relative w-16 h-16 rounded-xl bg-zinc-100 overflow-hidden flex-shrink-0">
        <Image
          src={getPlayerImgUrl(player.id)}
          alt={player.name}
          fill
          className="object-contain"
          unoptimized
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/player-fallback.png'
          }}
        />
      </div>

      {/* 이름 + 시즌 */}
      <div className="flex flex-col gap-1">
        {season && (
          <div className="relative w-8 h-4">
            <Image
              src={season.seasonImg}
              alt={season.className}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        )}
        <span className="text-sm font-semibold text-zinc-900">{player.name}</span>
      </div>
    </Link>
  )
}
