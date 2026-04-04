import { unstable_cache } from 'next/cache'
import { NextRequest } from 'next/server'
import { getNexonHeaders } from '@/lib/nexon'

const headers = getNexonHeaders()

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

const getCachedOuid = unstable_cache(
  async (nickname: string) =>
    fetchWithRetry(`https://open.api.nexon.com/fconline/v1/id?nickname=${encodeURIComponent(nickname)}`),
  ['match-user-ouid'],
  { revalidate: 300 },
)

export async function GET(req: NextRequest) {
  const nickname = req.nextUrl.searchParams.get('nickname')?.trim()

  if (!nickname) {
    return Response.json({ error: 'nickname required' }, { status: 400 })
  }

  const resolvedOuid = await getCachedOuid(nickname)

  if (!resolvedOuid) {
    return Response.json(null)
  }

  return Response.json({ ouid: resolvedOuid, nickname })
}
