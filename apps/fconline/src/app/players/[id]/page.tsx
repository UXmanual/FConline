import Image from 'next/image'
import Link from 'next/link'
import { CaretLeft } from '@phosphor-icons/react/dist/ssr'
import PlayerImage from '@/features/player-search/components/PlayerImage'
import PlayerDetailPanel from '@/features/player-search/components/PlayerDetailPanel'
import { getPlayerDetail } from '@/features/player-search/player-detail'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ level?: string }>
}

async function getPlayerData(spid: string) {
  const headers = { 'x-nxopen-api-key': process.env.NEXON_API_KEY! }
  const [playersRes, seasonsRes, detail] = await Promise.all([
    fetch('https://open.api.nexon.com/static/fconline/meta/spid.json', {
      headers,
      next: { revalidate: 3600 },
    }),
    fetch('https://open.api.nexon.com/static/fconline/meta/seasonid.json', {
      headers,
      next: { revalidate: 3600 },
    }),
    getPlayerDetail(spid),
  ])

  const players = await playersRes.json()
  const seasons = await seasonsRes.json()
  const player = players.find((p: { id: number; name: string }) => p.id === Number(spid))
  const seasonId = Math.floor(Number(spid) / 1000000)
  const season = seasons.find((s: { seasonId: number }) => s.seasonId === seasonId)

  return { player, season, detail }
}

export default async function PlayerDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { level } = await searchParams
  const initialStrongLevel = Math.min(13, Math.max(1, Number(level) || 1))
  const { player, season, detail } = await getPlayerData(id)

  if (!player) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <p className="text-sm text-[#8a949e]">선수 정보를 찾을 수 없어요.</p>
        <Link href="/players" className="mt-4 text-sm text-[#256ef4]">
          돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="pb-4 pt-5">
        <Link href="/players" className="flex items-center gap-1 text-[#464c53]">
          <CaretLeft size={18} weight="bold" />
          <span className="text-base font-medium">선수정보</span>
        </Link>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-[240px]">
        <PlayerImage spid={id} alt={player.name} className="object-contain" sizes="240px" />
      </div>

      <div className="mt-6 flex flex-col items-center gap-2">
        {season && (
          <div className="relative h-6 w-12">
            <Image
              src={season.seasonImg}
              alt={season.className}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        )}
        <h1 className="text-2xl font-bold text-[#1e2124]">{player.name}</h1>
        {season && <span className="text-sm text-[#8a949e]">{season.className}</span>}
      </div>

      {detail && (
        <PlayerDetailPanel
          detail={detail}
          seasonName={season?.className ?? null}
          initialStrongLevel={initialStrongLevel}
        />
      )}
    </div>
  )
}
