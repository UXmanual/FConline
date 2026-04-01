import { NextRequest } from 'next/server'
import { MatchData } from '@/features/match-analysis/types'

const NEXON_API_KEY = process.env.NEXON_API_KEY!
const headers = { 'x-nxopen-api-key': NEXON_API_KEY }

export async function GET(req: NextRequest) {
  const ouid = req.nextUrl.searchParams.get('ouid')
  const matchtype = req.nextUrl.searchParams.get('matchtype') ?? '214'
  const offset = req.nextUrl.searchParams.get('offset') ?? '0'
  const limit = req.nextUrl.searchParams.get('limit') ?? '10'

  if (!ouid) {
    return Response.json({ error: 'ouid required' }, { status: 400 })
  }

  const matchListRes = await fetch(
    `https://open.api.nexon.com/fconline/v1/user/match?ouid=${ouid}&matchtype=${matchtype}&offset=${offset}&limit=${limit}`,
    { headers }
  )

  if (!matchListRes.ok) {
    return Response.json([])
  }

  const matchIds: string[] = await matchListRes.json()

  if (!matchIds.length) {
    return Response.json([])
  }

  const matchDetails = await Promise.all(
    matchIds.map((matchId) =>
      fetch(`https://open.api.nexon.com/fconline/v1/match-detail?matchid=${matchId}`, { headers })
        .then((r) => r.json() as Promise<MatchData>)
        .catch(() => null)
    )
  )

  return Response.json(matchDetails.filter(Boolean))
}
