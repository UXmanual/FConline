import { NextRequest } from 'next/server'
import { getPlayerDetail } from '@/features/player-search/player-detail'
import { getSeasonMetaItem, getSpidMetaItem } from '@/lib/nexon'

export async function GET(req: NextRequest) {
  const spid = req.nextUrl.searchParams.get('spid')
  if (!spid) return Response.json({ error: 'spid required' }, { status: 400 })

  const playerId = Number(spid)
  if (!Number.isFinite(playerId) || playerId <= 0) {
    return Response.json({ error: 'invalid spid' }, { status: 400 })
  }

  const seasonId = Math.floor(playerId / 1000000)
  const [player, season, detail] = await Promise.all([
    getSpidMetaItem(playerId),
    getSeasonMetaItem(seasonId),
    getPlayerDetail(spid),
  ])

  return Response.json({ player, season, detail })
}
