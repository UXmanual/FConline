import { NextRequest } from 'next/server'

const NEXON_API_KEY = process.env.NEXON_API_KEY!
const headers = { 'x-nxopen-api-key': NEXON_API_KEY }

export async function GET(req: NextRequest) {
  const nickname = req.nextUrl.searchParams.get('nickname')?.trim()

  if (!nickname) {
    return Response.json({ error: 'nickname required' }, { status: 400 })
  }

  const res = await fetch(
    `https://open.api.nexon.com/fconline/v1/id?nickname=${encodeURIComponent(nickname)}`,
    { headers }
  )

  if (!res.ok) {
    return Response.json(null)
  }

  const data = await res.json()

  if (!data.ouid) {
    return Response.json(null)
  }

  return Response.json({ ouid: data.ouid, nickname })
}
