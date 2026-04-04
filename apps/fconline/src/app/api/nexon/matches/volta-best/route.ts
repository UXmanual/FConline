import { unstable_cache } from 'next/cache'
import { VoltaBestStatItem } from '@/features/match-analysis/types'

const OFFICIAL_VOLTA_TOPPLAYER_URL = 'https://fconline.nexon.com/datacenter/rank_volta_topplayer'
const VOLTA_GRADE_ICON_URL = 'https://ssl.nexon.com/s2/game/fo4/obt/rank/volta/ico_rank2.png'
const TARGET_LABELS = [
  '\uCD5C\uB2E4 \uD50C\uB808\uC774',
  '\uCD5C\uB2E4 \uB4DD\uC810',
  '\uCD5C\uB2E4 \uB3C4\uC6C0',
  '\uCD5C\uB2E4 \uCC28\uB2E8 \uC131\uACF5',
  '\uCD5C\uB2E4 \uD0DC\uD074 \uC131\uACF5',
  '\uCD5C\uB2E4 \uD328\uC2A4 \uC131\uACF5',
  '\uCD5C\uB2E4 \uB4DC\uB9AC\uBE14 \uC131\uACF5',
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

function parseVoltaBestStats(html: string): VoltaBestStatItem[] {
  const text = stripTags(html)
  const items: VoltaBestStatItem[] = []

  for (const label of TARGET_LABELS) {
    const pattern = new RegExp(`${escapeRegExp(label)}\\s+(.+?)\\s+(\\d[\\d,]*)\\s*\\uD68C`)
    const match = text.match(pattern)

    if (!match) {
      continue
    }

    items.push({
      label,
      nickname: match[1].trim(),
      count: `${match[2]}\uD68C`,
      iconUrl: VOLTA_GRADE_ICON_URL,
    })
  }

  return items
}

const getCachedVoltaBestStats = unstable_cache(
  async () => {
    const response = await fetch(OFFICIAL_VOLTA_TOPPLAYER_URL, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      },
      next: { revalidate: 60 * 30 },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch official volta topplayer page')
    }

    const html = await response.text()
    return parseVoltaBestStats(html)
  },
  ['volta-best-stats-v4'],
  { revalidate: 60 * 30 },
)

export async function GET() {
  try {
    const items = await getCachedVoltaBestStats()
    return Response.json({ items })
  } catch {
    return Response.json({ items: [] })
  }
}
