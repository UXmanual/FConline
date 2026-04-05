import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import PlayerDetailPanel from '@/features/player-search/components/PlayerDetailPanel'
import { getPlayerDetail } from '@/features/player-search/player-detail'
import { getSeasonMetaItem, getSpidMetaItem } from '@/lib/nexon'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ level?: string }>
}

async function getPlayerData(spid: string) {
  const playerId = Number(spid)
  const seasonId = Math.floor(Number(spid) / 1000000)
  const [player, season, detail] = await Promise.all([
    getSpidMetaItem(playerId),
    getSeasonMetaItem(seasonId),
    getPlayerDetail(spid),
  ])

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
        <p className="app-player-muted text-sm">선수 정보를 찾을 수 없어요</p>
        <Link href="/players" className="mt-4 text-sm" style={{ color: 'var(--app-accent-blue)' }}>
          선수 홈으로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="pb-4 pt-5">
        <Link
          href="/players"
          className="app-player-title inline-flex items-center gap-1.5 text-[18px] font-bold tracking-[-0.02em]"
        >
          <ArrowLeft size={18} weight="bold" />
          <span>{player.name}</span>
        </Link>
      </div>

      {detail && (
        <PlayerDetailPanel
          playerName={player.name}
          spid={id}
          detail={detail}
          seasonName={season?.className ?? null}
          seasonImageUrl={season?.seasonImg ?? null}
          initialStrongLevel={initialStrongLevel}
        />
      )}
    </div>
  )
}
