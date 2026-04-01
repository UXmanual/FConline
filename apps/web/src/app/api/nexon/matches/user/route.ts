import { NextRequest } from 'next/server'

const NEXON_API_KEY = process.env.NEXON_API_KEY!
const headers = { 'x-nxopen-api-key': NEXON_API_KEY }
const ouidCache = new Map<string, string>()

function normalizeNickname(value: string) {
  return value.trim().toLowerCase()
}

async function fetchWithRetry(url: string, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, { headers, next: { revalidate: 300 } })
      if (res.ok) {
        const data = await res.json().catch(() => null)
        if (data?.ouid) {
          return data.ouid as string
        }
      }
    } catch {}

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  return null
}

export async function GET(req: NextRequest) {
  const nickname = req.nextUrl.searchParams.get('nickname')?.trim()

  if (!nickname) {
    return Response.json({ error: 'nickname required' }, { status: 400 })
  }

  const normalizedNickname = normalizeNickname(nickname)
  const resolvedOuid =
    (await fetchWithRetry(
      `https://open.api.nexon.com/fconline/v1/id?nickname=${encodeURIComponent(nickname)}`
    )) ?? ouidCache.get(normalizedNickname) ?? null

  if (!resolvedOuid) {
    return Response.json(null)
  }

  ouidCache.set(normalizedNickname, resolvedOuid)
  return Response.json({ ouid: resolvedOuid, nickname })
}
