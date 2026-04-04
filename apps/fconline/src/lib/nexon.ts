const NEXON_API_KEY = process.env.NEXON_API_KEY!
const NEXON_HEADERS = { 'x-nxopen-api-key': NEXON_API_KEY }
const META_TTL_MS = 1000 * 60 * 60 * 24

type SpidMetaItem = { id: number; name: string }
type SeasonMetaItem = { seasonId: number; className: string; seasonImg: string }

let spidMetaCache: SpidMetaItem[] | null = null
let spidMetaExpiresAt = 0
let spidMetaPromise: Promise<SpidMetaItem[]> | null = null

let seasonMetaCache: SeasonMetaItem[] | null = null
let seasonMetaExpiresAt = 0
let seasonMetaPromise: Promise<SeasonMetaItem[]> | null = null

let spidMetaMapCache: Map<number, SpidMetaItem> | null = null
let seasonMetaMapCache: Map<number, SeasonMetaItem> | null = null

export function getNexonHeaders() {
  return NEXON_HEADERS
}

export async function getSpidMeta() {
  const now = Date.now()

  if (spidMetaCache && spidMetaExpiresAt > now) {
    return spidMetaCache
  }

  if (spidMetaPromise) {
    return spidMetaPromise
  }

  spidMetaPromise = fetch('https://open.api.nexon.com/static/fconline/meta/spid.json', {
    headers: NEXON_HEADERS,
    cache: 'no-store',
  })
    .then((res) => res.json())
    .then((data) => {
      spidMetaCache = data
      spidMetaMapCache = new Map(data.map((item: SpidMetaItem) => [item.id, item]))
      spidMetaExpiresAt = Date.now() + META_TTL_MS
      return data
    })
    .finally(() => {
      spidMetaPromise = null
    })

  return spidMetaPromise
}

export async function getSeasonMeta() {
  const now = Date.now()

  if (seasonMetaCache && seasonMetaExpiresAt > now) {
    return seasonMetaCache
  }

  if (seasonMetaPromise) {
    return seasonMetaPromise
  }

  seasonMetaPromise = fetch('https://open.api.nexon.com/static/fconline/meta/seasonid.json', {
    headers: NEXON_HEADERS,
    cache: 'no-store',
  })
    .then((res) => res.json())
    .then((data) => {
      seasonMetaCache = data
      seasonMetaMapCache = new Map(data.map((item: SeasonMetaItem) => [item.seasonId, item]))
      seasonMetaExpiresAt = Date.now() + META_TTL_MS
      return data
    })
    .finally(() => {
      seasonMetaPromise = null
    })

  return seasonMetaPromise
}

export async function getSpidMetaItem(spid: number) {
  const now = Date.now()

  if (spidMetaMapCache && spidMetaExpiresAt > now) {
    return spidMetaMapCache.get(spid) ?? null
  }

  const items = await getSpidMeta()
  return items.find((item) => item.id === spid) ?? null
}

export async function getSeasonMetaItem(seasonId: number) {
  const now = Date.now()

  if (seasonMetaMapCache && seasonMetaExpiresAt > now) {
    return seasonMetaMapCache.get(seasonId) ?? null
  }

  const items = await getSeasonMeta()
  return items.find((item) => item.seasonId === seasonId) ?? null
}
