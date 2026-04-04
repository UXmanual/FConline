import { NextRequest } from 'next/server'
import { getPlayerDetail } from '@/features/player-search/player-detail'
import { getSeasonMeta, getSpidMeta } from '@/lib/nexon'

async function getPlayerSearchData(query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  const [players, seasons] = await Promise.all([getSpidMeta(), getSeasonMeta()])

  const filtered = normalizedQuery
    ? players
        .filter((player: { id: number; name: string }) => player.name.toLowerCase().includes(normalizedQuery))
        .sort(
          (a: { id: number; name: string }, b: { id: number; name: string }) =>
            Math.floor(b.id / 1_000_000) - Math.floor(a.id / 1_000_000),
        )
    : []

  const enrichedPlayers = await Promise.all(
    filtered.map(async (player: { id: number; name: string }) => ({
      ...player,
      detail: await getPlayerDetail(String(player.id)),
    })),
  )

  return { players: enrichedPlayers, seasons }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const data = await getPlayerSearchData(query)
  return Response.json(data)
}
