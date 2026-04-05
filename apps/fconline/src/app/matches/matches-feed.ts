import { unstable_cache } from 'next/cache'
import type { VoltaBestStatItem, VoltaTopRankItem } from '@/features/match-analysis/types'

const OFFICIAL_VOLTA_TOPPLAYER_URL = 'https://fconline.nexon.com/datacenter/rank_volta_topplayer'
const OFFICIAL_VOLTA_RANK_URL = 'https://fconline.nexon.com/datacenter/rank_volta?rtype=all'
const VOLTA_GRADE_ICON_URL = 'https://ssl.nexon.com/s2/game/fo4/obt/rank/volta/ico_rank2.png'

const TARGET_LABELS = [
  '최다 플레이',
  '최다 득점',
  '최다 도움',
  '최다 차단 성공',
  '최다 태클 성공',
  '최다 패스 성공',
  '최다 드리블 성공',
]

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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parseNumber(value: string | null) {
  if (!value) return null
  const cleaned = value.replace(/,/g, '').replace(/%/g, '').trim()
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

function parseVoltaBestStats(html: string): VoltaBestStatItem[] {
  const text = stripTags(html)
  const items: VoltaBestStatItem[] = []

  for (const label of TARGET_LABELS) {
    const pattern = new RegExp(`${escapeRegExp(label)}\\s+(.+?)\\s+(\\d[\\d,]*)\\s*회`)
    const match = text.match(pattern)
    if (!match) continue
    items.push({ label, nickname: match[1].trim(), count: `${match[2]}회`, iconUrl: VOLTA_GRADE_ICON_URL })
  }

  return items
}

function parseVoltaTopRanks(html: string): VoltaTopRankItem[] {
  const rows = html.split('<div class="tr">').slice(1, 16)

  return rows
    .map((chunk) => {
      const rowHtml = `<div class="tr">${chunk}`
      const getCellValue = (cellClass: string) =>
        stripTags(rowHtml.match(new RegExp(`<div class="td ${cellClass}[^"]*">([\\s\\S]*?)<\\/div>`))?.[0] ?? '') || null

      const nickname = stripTags(rowHtml.match(/<span class="name profile_pointer"[^>]*>[\s\S]*?<\/span>/)?.[0] ?? '')
      if (!nickname) return null

      const mainPositionDetail = getCellValue('large usebr')
      const mainPosition = mainPositionDetail?.split(/\s+/)?.[0] ?? null

      return {
        rank: parseNumber(getCellValue('no')) ?? 0,
        nickname,
        rankPoint: parseNumber(getCellValue('small s1')),
        winRate: parseNumber(getCellValue('small s5')),
        averageRating: parseNumber(getCellValue('small s6')),
        mainPosition,
        mainPositionDetail,
        price: stripTags(rowHtml.match(/<span class="price"[^>]*>[\s\S]*?<\/span>/)?.[0] ?? '') || null,
        rankIconUrl: rowHtml.match(/<span class="ico_rank"><img src="([^"]+)"/)?.[1] ?? null,
      }
    })
    .filter((item): item is VoltaTopRankItem => item !== null && item.rank > 0 && item.rank <= 5)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5)
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'

export const getVoltaBestStats = unstable_cache(
  async (): Promise<VoltaBestStatItem[]> => {
    const response = await fetch(OFFICIAL_VOLTA_TOPPLAYER_URL, { headers: { 'user-agent': UA } })
    if (!response.ok) return []
    return parseVoltaBestStats(await response.text())
  },
  ['volta-best-stats-v5'],
  { revalidate: 60 * 5 },
)

export const getVoltaTopRanks = unstable_cache(
  async (): Promise<VoltaTopRankItem[]> => {
    const response = await fetch(OFFICIAL_VOLTA_RANK_URL, { headers: { 'user-agent': UA } })
    if (!response.ok) return []
    return parseVoltaTopRanks(await response.text())
  },
  ['volta-top-rank-v4'],
  { revalidate: 60 * 5 },
)
