import { unstable_cache } from 'next/cache'
import { VoltaTopRankItem } from '@/features/match-analysis/types'

const OFFICIAL_VOLTA_RANK_URL = 'https://fconline.nexon.com/datacenter/rank_volta?rtype=all'

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

function parseVoltaTopRanks(html: string): VoltaTopRankItem[] {
  const rows = html.split('<div class="tr">').slice(1, 16)

  return rows
    .map((chunk) => {
      const rowHtml = `<div class="tr">${chunk}`
      const getCellValue = (cellClass: string) =>
        stripTags(
          rowHtml.match(new RegExp(`<div class="td ${cellClass}[^"]*">([\\s\\S]*?)<\\/div>`))?.[0] ??
            ''
        ) || null

      const nickname = stripTags(
        rowHtml.match(/<span class="name profile_pointer"[^>]*>[\s\S]*?<\/span>/)?.[0] ?? ''
      )

      if (!nickname) {
        return null
      }

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
        price:
          stripTags(rowHtml.match(/<span class="price"[^>]*>[\s\S]*?<\/span>/)?.[0] ?? '') || null,
        rankIconUrl: rowHtml.match(/<span class="ico_rank"><img src="([^"]+)"/)?.[1] ?? null,
      }
    })
    .filter((item): item is VoltaTopRankItem => item !== null && item.rank > 0 && item.rank <= 5)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5)
}

const getCachedVoltaTopRanks = unstable_cache(
  async () => {
    const response = await fetch(OFFICIAL_VOLTA_RANK_URL, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      },
      next: { revalidate: 60 * 30 },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch official volta ranking page')
    }

    const html = await response.text()
    return parseVoltaTopRanks(html)
  },
  ['volta-top-rank-v3'],
  { revalidate: 60 * 30 },
)

export async function GET() {
  try {
    const items = await getCachedVoltaTopRanks()
    return Response.json({ items })
  } catch {
    return Response.json({ items: [] })
  }
}
