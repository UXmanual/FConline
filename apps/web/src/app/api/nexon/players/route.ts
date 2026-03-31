import { NextRequest } from 'next/server'

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

  const filtered = query
    ? players.filter((p: { id: number; name: string }) =>
        p.name.toLowerCase().includes(query.toLowerCase())
      )
    : []

  return Response.json({ players: filtered, seasons })
}
