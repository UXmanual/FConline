import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim()

  const [playersRes, seasonsRes] = await Promise.all([
    fetch('https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/meta/spid.json'),
    fetch('https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/meta/seasonid.json'),
  ])

  const players = await playersRes.json()
  const seasons = await seasonsRes.json()

  const filtered = query
    ? players.filter((p: { id: number; name: string }) =>
        p.name.toLowerCase().includes(query.toLowerCase())
      )
    : []

  return Response.json({ players: filtered.slice(0, 30), seasons })
}
