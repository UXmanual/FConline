import { unstable_cache } from 'next/cache'
import { AbilityStat, PlayerDetail } from './types'

const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0',
  'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8',
}

function decodeHtml(value: string | null) {
  if (!value) {
    return null
  }

  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .trim()
}

function matchGroup(source: string, pattern: RegExp, group = 1) {
  const match = source.match(pattern)
  return match ? decodeHtml(match[group]) : null
}

function matchNumber(source: string, pattern: RegExp, group = 1) {
  const value = matchGroup(source, pattern, group)
  if (!value) {
    return null
  }

  const digits = value.replace(/[^\d]/g, '')
  return digits ? Number(digits) : null
}

function extractPrices(html: string) {
  const prices: Record<number, string> = {}

  for (const match of html.matchAll(/span_bp(\d+)["'][^>]*>([^<]*)</g)) {
    const level = Number(match[1])
    const price = decodeHtml(match[2])?.replace(/\s+/g, ' ') ?? ''

    if (level >= 1 && level <= 13 && price) {
      prices[level] = price
    }
  }

  return prices
}

function extractLatestClubName(html: string) {
  const latestClubMatch = html.match(
    /<div class="contentItem contentClub"[\s\S]*?<div class="listItem">[\s\S]*?<div class="club">([^<]+)</
  )

  return latestClubMatch ? decodeHtml(latestClubMatch[1]) : null
}

function extractClubHistory(html: string) {
  return Array.from(
    html.matchAll(
      /<div class="listItem">[\s\S]*?<div class="year">([^<]+)<\/div>[\s\S]*?<div class="club">([^<]+)<\/div>[\s\S]*?<div class="rent">([^<]*)<\/div>[\s\S]*?<\/div>/g
    )
  ).map((item) => ({
    year: decodeHtml(item[1]) ?? '',
    club: decodeHtml(item[2]) ?? '',
    rent: decodeHtml(item[3]),
  }))
}

function extractAbilities(html: string): AbilityStat[] {
  const tierPattern = /over120|over110|over100|over90|over60|over20|over10/

  const rows = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => match[1])
    .filter((snippet) => snippet.includes('_area_point') && snippet.includes('class="txt"'))

  return rows
    .map((row) => {
      const nameMatch = row.match(/<div class="txt">([^<]+)<\/div>/)
      const valueMatch = row.match(/_area_point[^>]*>\s*(\d+)\s*</)
      const tierMatch = row.match(tierPattern)

      const name = nameMatch ? nameMatch[1].trim() : ''
      const value = valueMatch ? Number(valueMatch[1]) : 0
      const tier = (tierMatch ? tierMatch[0] : 'base') as AbilityStat['tier']

      return { name, value, tier }
    })
    .filter((ability) => ability.name && ability.value > 0)
}

function extractFootStats(html: string) {
  const statWrap = matchGroup(html, /<div class="statWrap">([\s\S]*?)<script>/)

  if (!statWrap) {
    return { leftFoot: null, rightFoot: null }
  }

  const statText = statWrap
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const footMatch = statText.match(/L\s*(\d)\s*[^\dR]*\s*R\s*(\d)/i)

  return {
    leftFoot: footMatch ? Number(footMatch[1]) : null,
    rightFoot: footMatch ? Number(footMatch[2]) : null,
  }
}

function extractTraits(html: string) {
  const traits: Array<{ name: string }> = []

  for (const match of html.matchAll(/<img[^>]*src="[^"]*trait_icon_[^"]*"[^>]*alt="([^"]*)"[^>]*>/g)) {
    const name = decodeHtml(match[1])
    if (name && !traits.find((trait) => trait.name === name)) {
      traits.push({ name })
    }
  }

  return traits
}

export function calculateSkillMoveStars(skillMove: number | null, strongLevel: number): number {
  if (skillMove == null) return 0

  let stars = skillMove + 1

  if (strongLevel >= 8) {
    stars += 2
  } else if (strongLevel >= 5) {
    stars += 1
  }

  return Math.min(stars, 6)
}

export function formatPriceWithKoreanUnits(price: string | undefined | null) {
  if (!price) {
    return '-'
  }

  const numeric = Number(price.replace(/[^\d]/g, ''))

  if (!numeric) {
    return '-'
  }

  const kyung = Math.floor(numeric / 10_000_000_000_000_000)
  const trillion = Math.floor((numeric % 10_000_000_000_000_000) / 1_0000_0000_0000)
  const hundredMillion = Math.floor((numeric % 1_0000_0000_0000) / 1_0000_0000)
  const tenThousand = Math.floor((numeric % 1_0000_0000) / 1_0000)
  const parts: string[] = []

  if (kyung > 0) {
    parts.push(`${kyung.toLocaleString()}경`)
  }

  if (trillion > 0) {
    parts.push(`${trillion.toLocaleString()}조`)
  }

  if (hundredMillion > 0) {
    parts.push(`${hundredMillion.toLocaleString()}억`)
  }

  if (tenThousand > 0 && kyung === 0 && trillion === 0) {
    parts.push(`${tenThousand.toLocaleString()}만`)
  }

  return parts.length > 0 ? parts.join(' ') : `${Math.floor(numeric / 10000).toLocaleString()}만`
}

async function getPlayerDetailRaw(spid: string): Promise<PlayerDetail | null> {
  const res = await fetch(`https://m.fconline.nexon.com/datacenter/playerinfo?spid=${spid}`, {
    headers: DEFAULT_HEADERS,
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    return null
  }

  const html = await res.text()
  const prices = extractPrices(html)
  const latestClubName = extractLatestClubName(html)
  const clubHistory = extractClubHistory(html)
  const footStats = extractFootStats(html)
  const abilities = extractAbilities(html)
  const traits = extractTraits(html)
  const totalAbility = abilities.length > 0 ? abilities.reduce((sum, ability) => sum + ability.value, 0) : null

  return {
    name: matchGroup(html, /<div class="name">([^<]+)</) ?? '',
    seasonImg: matchGroup(html, /<div class="season"><img src="([^"]+)"/),
    seasonName: matchGroup(
      html,
      /<span class="nameWrap">\s*<span class="season">[\s\S]*?<span class="name"><span>([^<]+)</
    ),
    teamName: latestClubName,
    teamLogo: matchGroup(html, /<span class="team">\s*<img src="([^"]+)"/),
    clubHistory,
    nationName: matchGroup(html, /<span class="nation">[\s\S]*?<span class="txt">([^<]+)</),
    nationLogo: matchGroup(html, /<span class="nation">\s*<img src="([^"]+)"/),
    leagueName: matchGroup(html, /<span class="league">[\s\S]*?<span class="txt">([^<]+)</),
    leagueLogo: matchGroup(html, /<span class="league">\s*<img src="([^"]+)"/),
    birthDate: matchGroup(html, /출생[\s\S]*?(\d{4}\.\d{2}\.\d{2}(?:\s*\([^)]*\))?)/),
    position:
      matchGroup(html, /<strong class="([a-z]+)">([^<]+)</, 2) ??
      matchGroup(html, /<span class="position [^"]+">([^<]+)</),
    overall: matchNumber(html, /<div class="ovrWrap">[\s\S]*?<span class="_area_point">(\d+)</),
    pay: matchNumber(html, /<span class="pay">[\s\S]*?<span>(\d+)</),
    height: matchNumber(html, /<span>(\d+)cm</),
    weight: matchNumber(html, /<span>(\d+)kg</),
    bodyType:
      matchGroup(html, /kg<\/span>\s*<span>([^<]+)</) ??
      matchGroup(html, /<span>([^<]+)/),
    leftFoot: footStats.leftFoot,
    rightFoot: footStats.rightFoot,
    skillMove: matchNumber(html, /name="SkillMove\d+" value="(\d+)"/),
    abilities,
    totalAbility,
    traits,
    prices,
  }
}

export const getPlayerDetail = unstable_cache(
  async (spid: string) => getPlayerDetailRaw(spid),
  ['player-detail'],
  { revalidate: 3600 },
)

export function getStrongPoint(level: number) {
  switch (level) {
    case 1:
      return 3
    case 2:
      return 4
    case 3:
      return 5
    case 4:
      return 7
    case 5:
      return 9
    case 6:
      return 11
    case 7:
      return 14
    case 8:
      return 18
    case 9:
      return 20
    case 10:
      return 22
    case 11:
      return 24
    case 12:
      return 27
    case 13:
      return 30
    default:
      return 0
  }
}
