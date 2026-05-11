import { NextRequest } from 'next/server'
import { getNexonHeaders } from '@/lib/nexon'

const headers = getNexonHeaders()

export async function GET(req: NextRequest) {
  const matchid = req.nextUrl.searchParams.get('matchid')
  if (!matchid) return Response.json({ error: 'matchid required' }, { status: 400 })

  try {
    const res = await fetch(`https://open.api.nexon.com/fconline/v1/match-detail?matchid=${matchid}`, {
      headers,
      next: { revalidate: 300 },
    })
    if (!res.ok) return Response.json(null)
    return Response.json(await res.json())
  } catch {
    return Response.json(null)
  }
}
