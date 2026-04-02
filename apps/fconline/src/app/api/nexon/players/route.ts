import { NextRequest } from 'next/server'
import { getPlayerDetail } from '@/features/player-search/player-detail'

const NEXON_API_KEY = process.env.NEXON_API_KEY!
const headers = { 'x-nxopen-api-key': NEXON_API_KEY }

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim()

  const [playersRes, seasonsRes] = await Promise.all([
    fetch('https://open.api.nexon.com/static/fconline/meta/spid.json', { headers, next: { revalidate: 3600 } }),
    fetch('https://open.api.nexon.com/static/fconline/meta/seasonid.json', { headers, next: { revalidate: 3600 } }),
  ])

  const players = await playersRes.json()
  const seasons = await seasonsRes.json()
  const normalizedQuery = query?.toLowerCase()

  const filtered = normalizedQuery
    ? players
        .filter((p: { id: number; name: string }) =>
          p.name.toLowerCase().includes(normalizedQuery)
        )
        .sort(
          (
            a: { id: number; name: string },
            b: { id: number; name: string }
          ) => Math.floor(b.id / 1000000) - Math.floor(a.id / 1000000)
        )
    : []

  const enrichedPlayers = await Promise.all(
    filtered.map(async (player: { id: number; name: string }) => ({
      ...player,
      detail: await getPlayerDetail(String(player.id)),
    }))
  )

  return Response.json({ players: enrichedPlayers, seasons })
}
