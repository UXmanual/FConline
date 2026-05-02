import { unstable_cache } from 'next/cache'
import type {
  ManagerTopRankItem,
  OfficialFormationMetaItem,
  OfficialTeamColorMetaItem,
} from '@/features/match-analysis/types'
import { resolveOuidByNickname } from './ouid-lookup'

const OFFICIAL_MANAGER_RANK_URL =
  'https://fconline.nexon.com/datacenter/rank_inner?rt=manager&n4seasonno=0&n4pageno=1'
const MANAGER_RANK_URL_TEMPLATE =
  'https://fconline.nexon.com/datacenter/rank_inner?rt=manager&n4seasonno=0&n4pageno='
const DAILY_SQUAD_URL = 'https://fconline.nexon.com/datacenter/dailysquad'
const MANAGER_FORMATION_META_PAGE_COUNT = 5
const MANAGER_TEAM_COLOR_META_PAGE_COUNT = 200
const MANAGER_TEAM_COLOR_META_SAMPLE_SIZE = 4000

let lastSuccessfulManagerTeamColorMeta: OfficialTeamColorMetaItem[] = []

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'

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

function parseManagerTopRanks(html: string): ManagerTopRankItem[] {
  return html
    .split('<div class="tr">')
    .slice(1)
    .map((chunk) => {
      const rowHtml = `<div class="tr">${chunk}`
      const getCellValue = (cellClass: string) =>
        stripTags(
          rowHtml.match(new RegExp(`<span class="td ${cellClass}[^"]*">([\\s\\S]*?)<\\/span>`))?.[0] ?? '',
        ) || null

      const nickname = stripTags(
        rowHtml.match(/<span class="name profile_pointer"[^>]*>[\s\S]*?<\/span>/)?.[0] ?? '',
      )
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
    .filter((item): item is ManagerTopRankItem => item !== null && item.rank > 0 && item.rank <= 5)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5)
}

async function attachOuidToManagerTopRanks(items: ManagerTopRankItem[]) {
  const ouids = await Promise.all(items.map((item) => resolveOuidByNickname(item.nickname)))
  return items.map((item, index) => ({ ...item, ouid: ouids[index] }))
}

export const getManagerTopRanks = unstable_cache(
  async (): Promise<ManagerTopRankItem[]> => {
    const response = await fetch(OFFICIAL_MANAGER_RANK_URL, { headers: { 'user-agent': UA } })
    if (!response.ok) return []
    const buffer = Buffer.from(await response.arrayBuffer())
    return attachOuidToManagerTopRanks(parseManagerTopRanks(new TextDecoder('utf-8').decode(buffer)))
  },
  ['manager-top-rank-v1'],
  { revalidate: 60 * 5 },
)

function parseManagerRankRows(html: string): ManagerTopRankItem[] {
  return html
    .split('<div class="tr">')
    .slice(1)
    .map((chunk) => {
      const rowHtml = `<div class="tr">${chunk}`
      const getCellValue = (cellClass: string) =>
        stripTags(
          rowHtml.match(new RegExp(`<span class="td ${cellClass}[^"]*">([\\s\\S]*?)<\\/span>`))?.[0] ?? '',
        ) || null

      const nickname = stripTags(
        rowHtml.match(/<span class="name profile_pointer"[^>]*>[\s\S]*?<\/span>/)?.[0] ?? '',
      )
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
    .filter((item): item is ManagerTopRankItem => item !== null && item.rank > 0)
}

function buildManagerFormationMeta(items: ManagerTopRankItem[]): OfficialFormationMetaItem[] {
  const validItems = items.filter((item) => item.formation)
  const total = validItems.length
  if (total === 0) return []

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
          ? Number((winRates.reduce((sum, v) => sum + v, 0) / winRates.length).toFixed(1))
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

export const getManagerFormationMeta = unstable_cache(
  async (): Promise<{ items: OfficialFormationMetaItem[]; sampleSize: number }> => {
    const pages = await Promise.all(
      Array.from({ length: MANAGER_FORMATION_META_PAGE_COUNT }, (_, index) =>
        fetch(`${MANAGER_RANK_URL_TEMPLATE}${index + 1}`, { headers: { 'user-agent': UA } }),
      ),
    )

    const htmlList = await Promise.all(
      pages.map(async (response) => {
        if (!response.ok) return ''
        const buffer = Buffer.from(await response.arrayBuffer())
        return new TextDecoder('utf-8').decode(buffer)
      }),
    )

    const allItems = htmlList.flatMap((html) => (html ? parseManagerRankRows(html) : []))
    const sampleItems = allItems.filter((item) => item.rank <= 100)
    return { items: buildManagerFormationMeta(sampleItems), sampleSize: sampleItems.length }
  },
  ['manager-formation-meta-v1'],
  { revalidate: 60 * 10 },
)

function parseDailySquadTeamColorEmblemMap(html: string, candidates: string[]) {
  const sectionStart = html.indexOf('팀컬러 이용률')
  const sectionEnd = html.indexOf('팀컬러 선택', sectionStart)
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

function buildManagerTeamColorMeta(
  items: ManagerTopRankItem[],
  emblemMap: Map<string, string>,
): OfficialTeamColorMetaItem[] {
  const total = items.length
  if (total === 0) return []

  const teamColorCounts = new Map<string, number>()

  for (const item of items) {
    const uniqueTeamColors = Array.from(new Set(item.teamColors.map((tc) => tc.trim()).filter(Boolean)))
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

export const getManagerTeamColorMeta = unstable_cache(
  async (): Promise<{ items: OfficialTeamColorMetaItem[]; sampleSize: number }> => {
    try {
      const [dailySquadResponse, ...pages] = await Promise.all([
        fetch(DAILY_SQUAD_URL, { headers: { 'user-agent': UA } }),
        ...Array.from({ length: MANAGER_TEAM_COLOR_META_PAGE_COUNT }, (_, index) =>
          fetch(`${MANAGER_RANK_URL_TEMPLATE}${index + 1}`, { headers: { 'user-agent': UA } }),
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

      const allItems = htmlList.flatMap((html) => (html ? parseManagerRankRows(html) : []))
      const sampleItems = allItems.filter((item) => item.rank <= MANAGER_TEAM_COLOR_META_SAMPLE_SIZE)

      if (sampleItems.length === 0) {
        return { items: lastSuccessfulManagerTeamColorMeta, sampleSize: 0 }
      }

      const emblemMap = parseDailySquadTeamColorEmblemMap(
        dailySquadHtml,
        Array.from(
          new Set(sampleItems.flatMap((item) => item.teamColors.map((tc) => tc.trim()).filter(Boolean))),
        ),
      )

      const nextItems = buildManagerTeamColorMeta(sampleItems, emblemMap)

      if (nextItems.length > 0) {
        lastSuccessfulManagerTeamColorMeta = nextItems
      }

      return {
        items: nextItems.length > 0 ? nextItems : lastSuccessfulManagerTeamColorMeta,
        sampleSize: sampleItems.length,
      }
    } catch {
      return { items: lastSuccessfulManagerTeamColorMeta, sampleSize: 0 }
    }
  },
  ['manager-team-color-meta-v2'],
  { revalidate: 60 * 30 },
)
