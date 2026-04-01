import { NextRequest } from 'next/server'
import { MatchData } from '@/features/match-analysis/types'

const NEXON_API_KEY = process.env.NEXON_API_KEY!
const headers = { 'x-nxopen-api-key': NEXON_API_KEY }

function isMatchData(value: unknown): value is MatchData {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<MatchData>
  return typeof candidate.matchId === 'string' && Array.isArray(candidate.matchInfo)
}

async function fetchMatchDetail(matchId: string, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(
        `https://open.api.nexon.com/fconline/v1/match-detail?matchid=${matchId}`,
        { headers }
      )

      if (res.ok) {
        const detail = (await res.json().catch(() => null)) as MatchData | null
        if (isMatchData(detail)) {
          return detail
        }
      }
    } catch {}

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 120))
    }
  }

  return null
}

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

  const matchDetails: MatchData[] = []

  for (const matchId of matchIds) {
    const detail = await fetchMatchDetail(matchId)
    if (detail) {
      matchDetails.push(detail)
    }
  }

  return Response.json(matchDetails)
}
