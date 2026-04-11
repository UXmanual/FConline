import { getNexonHeaders } from '@/lib/nexon'

const headers = getNexonHeaders()
const OUID_CACHE_TTL_MS = 1000 * 60 * 5

const ouidCache = new Map<string, { expiresAt: number; value: string | null }>()
const ouidPromiseCache = new Map<string, Promise<string | null>>()

function normalizeNickname(value: string) {
  return value.trim().toLowerCase()
}

async function fetchOuid(nickname: string, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(
        `https://open.api.nexon.com/fconline/v1/id?nickname=${encodeURIComponent(nickname)}`,
        {
          headers,
          cache: 'no-store',
        },
      )

      if (response.ok) {
        const data = await response.json().catch(() => null)
        return data?.ouid ?? null
      }
    } catch {}

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  return null
}

export async function resolveOuidByNickname(nickname: string) {
  const normalizedNickname = normalizeNickname(nickname)

  if (!normalizedNickname) {
    return null
  }

  const cached = ouidCache.get(normalizedNickname)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const pending = ouidPromiseCache.get(normalizedNickname)
  if (pending) {
    return pending
  }

  const request = fetchOuid(nickname)
    .then((value) => {
      ouidCache.set(normalizedNickname, {
        expiresAt: Date.now() + OUID_CACHE_TTL_MS,
        value,
      })
      return value
    })
    .finally(() => {
      ouidPromiseCache.delete(normalizedNickname)
    })

  ouidPromiseCache.set(normalizedNickname, request)
  return request
}
