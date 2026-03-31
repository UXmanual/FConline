import Image from 'next/image'
import Link from 'next/link'
import { CaretLeft } from '@phosphor-icons/react/dist/ssr'

interface Props {
  params: Promise<{ id: string }>
}

async function getPlayerData(spid: string) {
  const headers = { 'x-nxopen-api-key': process.env.NEXON_API_KEY! }
  const [playersRes, seasonsRes] = await Promise.all([
    fetch('https://open.api.nexon.com/static/fconline/meta/spid.json', { headers, next: { revalidate: 3600 } }),
    fetch('https://open.api.nexon.com/static/fconline/meta/seasonid.json', { headers, next: { revalidate: 3600 } }),
  ])
  const players = await playersRes.json()
  const seasons = await seasonsRes.json()
  const player = players.find((p: { id: number; name: string }) => p.id === Number(spid))
  const seasonId = Math.floor(Number(spid) / 1000000)
  const season = seasons.find((s: { seasonId: number }) => s.seasonId === seasonId)
  return { player, season }
}

export default async function PlayerDetailPage({ params }: Props) {
  const { id } = await params
  const { player, season } = await getPlayerData(id)

  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-[#8a949e] text-sm">선수 정보를 찾을 수 없어요</p>
        <Link href="/players" className="mt-4 text-sm text-[#256ef4]">← 돌아가기</Link>
      </div>
    )
  }

  const imgUrl = `https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/playersAction/p${id}.png`

  return (
    <div>
      {/* 뒤로가기 */}
      <div className="pt-5 pb-4">
        <Link href="/players" className="flex items-center gap-1 text-[#464c53]">
          <CaretLeft size={18} weight="bold" />
          <span className="text-sm">선수정보</span>
        </Link>
      </div>

      {/* 선수 이미지 */}
      <div className="relative w-full aspect-square max-w-[240px] mx-auto">
        <Image
          src={imgUrl}
          alt={player.name}
          fill
          className="object-contain"
          unoptimized
        />
      </div>

      {/* 선수 정보 */}
      <div className="mt-6 flex flex-col items-center gap-2">
        {season && (
          <div className="relative w-12 h-6">
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
        {season && (
          <span className="text-sm text-[#8a949e]">{season.className}</span>
        )}
      </div>
    </div>
  )
}
