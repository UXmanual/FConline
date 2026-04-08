import { unstable_cache } from 'next/cache'
import type {
  OfficialFormationMetaItem,
  OfficialTeamColorMetaItem,
  OfficialTopRankItem,
} from '@/features/match-analysis/types'

const OFFICIAL_1VS1_RANK_URL =
  'https://fconline.nexon.com/datacenter/rank_inner?rt=1vs1&n4seasonno=0&n4pageno=1'
const OFFICIAL_1VS1_RANK_URL_TEMPLATE =
  'https://fconline.nexon.com/datacenter/rank_inner?rt=1vs1&n4seasonno=0&n4pageno='
const DAILY_SQUAD_URL = 'https://fconline.nexon.com/datacenter/dailysquad'
const OFFICIAL_FORMATION_META_PAGE_COUNT = 5
const OFFICIAL_TEAM_COLOR_META_PAGE_COUNT = 200
const OFFICIAL_TEAM_COLOR_META_SAMPLE_SIZE = 4000

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'

let lastSuccessfulOfficialTeamColorMeta: OfficialTeamColorMetaItem[] = []

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function stripTags(value: string) {
  return decodeHtml(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseNumber(value: string | null) {
  if (!value) return null
  const cleaned = value.replace(/,/g, '').replace(/%/g, '').trim()
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

function cleanTeamColorName(value: string) {
  return value.replace(/\s*\(\d+명\)\s*$/u, '').trim()
}

function parseOfficialRankRows(html: string): OfficialTopRankItem[] {
  return html
    .split('<div class="tr">')
    .slice(1)
    .map((chunk) => {
      const rowHtml = `<div class="tr">${chunk}`
      const getCellValue = (cellClass: string) =>
        stripTags(rowHtml.match(new RegExp(`<span class="td ${cellClass}[^"]*">([\\s\\S]*?)<\\/span>`))?.[0] ?? '') ||
        null

      const nickname = stripTags(rowHtml.match(/<span class="name profile_pointer"[^>]*>[\s\S]*?<\/span>/)?.[0] ?? '')
      if (!nickname) return null

      const winLossText = stripTags(rowHtml.match(/<span class="bottom">[\s\S]*?<\/span>/)?.[0] ?? '')
      const [wins, draws, losses] = winLossText.split('|').map((part) => parseNumber(part))

      return {
        rank: parseNumber(getCellValue('rank_no')) ?? 0,
        nickname,
        rankPoint: parseNumber(getCellValue('rank_r_win_point')),
        winRate: parseNumber(stripTags(rowHtml.match(/<span class="top">[\s\S]*?%[\s\S]*?<\/span>/)?.[0] ?? '')),
        wins: wins ?? null,
        draws: draws ?? null,
        losses: losses ?? null,
        formation:
          stripTags(rowHtml.match(/<span class="td formation">[\s\S]*?<\/span>/)?.[0] ?? '') || null,
        price:
          stripTags(rowHtml.match(/<span class="price"[^>]*>[\s\S]*?<\/span>/)?.[0] ?? '') || null,
        rankIconUrl: rowHtml.match(/<span class="ico_rank"><img src="([^"]+)"/)?.[1] ?? null,
        teamColors: [...rowHtml.matchAll(/<span class="inner">([\s\S]*?)<\/span>/g)]
          .map((match) => cleanTeamColorName(stripTags(match[1])))
          .filter(Boolean),
      }
    })
    .filter((item): item is OfficialTopRankItem => item !== null && item.rank > 0)
}

function parseOfficialTopRanks(html: string): OfficialTopRankItem[] {
  return parseOfficialRankRows(html)
    .filter((item) => item.rank <= 5)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5)
}

function buildOfficialFormationMeta(items: OfficialTopRankItem[]): OfficialFormationMetaItem[] {
  const validItems = items.filter((item) => item.formation)
  const total = validItems.length

  if (total === 0) {
    return []
  }

  const formationCounts = new Map<string, number>()
  const formationWinRates = new Map<string, number[]>()
  const formationBestRanks = new Map<string, number>()

  for (const item of validItems) {
    const formation = item.formation?.trim()
    if (!formation) continue

    formationCounts.set(formation, (formationCounts.get(formation) ?? 0) + 1)

    if (item.winRate != null) {
      const current = formationWinRates.get(formation) ?? []
      current.push(item.winRate)
      formationWinRates.set(formation, current)
    }

    if (item.rank > 0) {
      const currentBestRank = formationBestRanks.get(formation)
      formationBestRanks.set(
        formation,
        currentBestRank == null ? item.rank : Math.min(currentBestRank, item.rank),
      )
    }
  }

  return [...formationCounts.entries()]
    .map(([formation, usageCount], index) => {
      const winRates = formationWinRates.get(formation) ?? []
      const averageWinRate =
        winRates.length > 0
          ? Number((winRates.reduce((sum, value) => sum + value, 0) / winRates.length).toFixed(1))
          : null

      return {
        rank: index + 1,
        formation,
        usageCount,
        usageRate: Number(((usageCount / total) * 100).toFixed(1)),
        averageWinRate,
        bestRank: formationBestRanks.get(formation) ?? null,
      }
    })
    .sort((a, b) => {
      if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount
      return a.formation.localeCompare(b.formation)
    })
    .map((item, index) => ({ ...item, rank: index + 1 }))
    .slice(0, 5)
}

function parseDailySquadTeamColorEmblemMap(html: string, candidates: string[]) {
  const sectionStart = html.indexOf('\uD300\uCEEC\uB7EC \uC774\uC6A9\uB960')
  const sectionEnd = html.indexOf('\uD300\uCEEC\uB7EC \uC120\uD0DD', sectionStart)
  const sectionHtml =
    sectionStart >= 0
      ? html.slice(sectionStart, sectionEnd > sectionStart ? sectionEnd : sectionStart + 24000)
      : html

  const emblemMap = new Map<string, string>()
  const assetPattern =
    /((?:https?:)?\/\/[^"'\s>]*(?:crests\/light\/medium\/[^"'\s>]+\.png|countries\/largeflags\/[^"'\s>]+\.png))/g

  for (const candidate of candidates) {
    if (!candidate || emblemMap.has(candidate)) continue

    const markerIndex = sectionHtml.indexOf(candidate)
    if (markerIndex < 0) continue

    const lookbehind = sectionHtml.slice(Math.max(0, markerIndex - 700), markerIndex)
    const assetMatches = [...lookbehind.matchAll(assetPattern)]
    const emblemUrl = assetMatches.at(-1)?.[1] ?? null

    if (emblemUrl) {
      emblemMap.set(candidate, emblemUrl)
    }
  }

  return emblemMap
}

function buildOfficialTeamColorMeta(
  items: OfficialTopRankItem[],
  emblemMap: Map<string, string>,
): OfficialTeamColorMetaItem[] {
  const total = items.length

  if (total === 0) {
    return []
  }

  const teamColorCounts = new Map<string, number>()

  for (const item of items) {
    const uniqueTeamColors = Array.from(new Set(item.teamColors.map((teamColor) => teamColor.trim()).filter(Boolean)))

    for (const teamColor of uniqueTeamColors) {
      teamColorCounts.set(teamColor, (teamColorCounts.get(teamColor) ?? 0) + 1)
    }
  }

  return [...teamColorCounts.entries()]
    .map(([teamColor, usageCount], index) => ({
      rank: index + 1,
      teamColor,
      usageCount,
      usageRate: Number(((usageCount / total) * 100).toFixed(1)),
      emblemUrl: emblemMap.get(teamColor) ?? null,
    }))
    .sort((a, b) => {
      if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount
      return a.teamColor.localeCompare(b.teamColor, 'ko')
    })
    .map((item, index) => ({ ...item, rank: index + 1 }))
    .slice(0, 10)
}

export const getOfficialTopRanks = unstable_cache(
  async (): Promise<OfficialTopRankItem[]> => {
    const response = await fetch(OFFICIAL_1VS1_RANK_URL, { headers: { 'user-agent': UA } })
    if (!response.ok) return []

    const buffer = Buffer.from(await response.arrayBuffer())
    return parseOfficialTopRanks(new TextDecoder('utf-8').decode(buffer))
  },
  ['official-top-rank-1vs1-v2'],
  { revalidate: 60 * 5 },
)

export const getOfficialFormationMeta = unstable_cache(
  async (): Promise<OfficialFormationMetaItem[]> => {
    const pages = await Promise.all(
      Array.from({ length: OFFICIAL_FORMATION_META_PAGE_COUNT }, (_, index) =>
        fetch(`${OFFICIAL_1VS1_RANK_URL_TEMPLATE}${index + 1}`, {
          headers: { 'user-agent': UA },
        }),
      ),
    )

    const htmlList = await Promise.all(
      pages.map(async (response) => {
        if (!response.ok) return ''
        const buffer = Buffer.from(await response.arrayBuffer())
        return new TextDecoder('utf-8').decode(buffer)
      }),
    )

    const allItems = htmlList.flatMap((html) => (html ? parseOfficialRankRows(html) : []))
    return buildOfficialFormationMeta(allItems.filter((item) => item.rank <= 100))
  },
  ['official-formation-meta-1vs1-v2'],
  { revalidate: 60 * 10 },
)

export const getOfficialTeamColorMeta = unstable_cache(
  async (): Promise<OfficialTeamColorMetaItem[]> => {
    try {
      const [dailySquadResponse, ...pages] = await Promise.all([
        fetch(DAILY_SQUAD_URL, {
          headers: { 'user-agent': UA },
        }),
        ...Array.from({ length: OFFICIAL_TEAM_COLOR_META_PAGE_COUNT }, (_, index) =>
          fetch(`${OFFICIAL_1VS1_RANK_URL_TEMPLATE}${index + 1}`, {
            headers: { 'user-agent': UA },
          }),
        ),
      ])

      const dailySquadHtml = dailySquadResponse.ok
        ? new TextDecoder('utf-8').decode(Buffer.from(await dailySquadResponse.arrayBuffer()))
        : ''

      const htmlList = await Promise.all(
        pages.map(async (response) => {
          if (!response.ok) return ''
          const buffer = Buffer.from(await response.arrayBuffer())
          return new TextDecoder('utf-8').decode(buffer)
        }),
      )

      const allItems = htmlList.flatMap((html) => (html ? parseOfficialRankRows(html) : []))
      const topSampleItems = allItems.filter((item) => item.rank <= OFFICIAL_TEAM_COLOR_META_SAMPLE_SIZE)

      if (topSampleItems.length === 0) {
        return lastSuccessfulOfficialTeamColorMeta
      }

      const emblemMap = parseDailySquadTeamColorEmblemMap(
        dailySquadHtml,
        Array.from(
          new Set(
            topSampleItems.flatMap((item) => item.teamColors.map((teamColor) => teamColor.trim()).filter(Boolean)),
          ),
        ),
      )

      const nextItems = buildOfficialTeamColorMeta(topSampleItems, emblemMap)

      if (nextItems.length > 0) {
        lastSuccessfulOfficialTeamColorMeta = nextItems
      }

      return nextItems.length > 0 ? nextItems : lastSuccessfulOfficialTeamColorMeta
    } catch {
      return lastSuccessfulOfficialTeamColorMeta
    }
  },
  ['official-team-color-meta-1vs1-v7'],
  { revalidate: 60 * 30 },
)
