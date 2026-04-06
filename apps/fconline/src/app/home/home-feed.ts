export type NoticeItem = {
  title: string
  date: string
  href: string
}

export type HomeEventItem = {
  id: string
  title: string
  href: string
  imageUrl?: string
}

export type ControllerUsageItem = {
  label: string
  percentage: string
  record: string
}

export type HomeControllerUsage = {
  items: ControllerUsageItem[]
  basisLabel: string
  sourceUrl: string
}

const NOTICE_LIST_URL = 'https://fconline.nexon.com/news/notice/list'
const EVENT_LIST_URL = 'https://fconline.nexon.com/news/events/list'
const DAILY_SQUAD_URL = 'https://fconline.nexon.com/datacenter/dailysquad'
const EVENT_PAGES = [1, 2, 3]
const TEXT_NEW = '\uC0C8 \uAE00'
const STATUS_ONGOING = '\uC9C4\uD589'
const STATUS_PENDING = '\uC900\uBE44 \uC911'
const STATUS_ENDED = '\uC885\uB8CC'
const FETCH_TIMEOUT_MS = 5000

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, ' '))
}

function toAbsoluteUrl(input: string, base: string) {
  try {
    return new URL(input, base).toString()
  } catch {
    return input
  }
}

function parseNoticeTimestamp(input: string) {
  const value = stripTags(input)
  const normalized = value.replace(/\s+/g, ' ').trim()
  const now = new Date()

  if (normalized === '방금 전') {
    return now.getTime()
  }

  const hoursAgo = normalized.match(/(\d+)\s*시간\s*전/)

  if (hoursAgo) {
    return now.getTime() - Number(hoursAgo[1]) * 60 * 60 * 1000
  }

  const minutesAgo = normalized.match(/(\d+)\s*분\s*전/)

  if (minutesAgo) {
    return now.getTime() - Number(minutesAgo[1]) * 60 * 1000
  }

  if (normalized === '어제') {
    return now.getTime() - 24 * 60 * 60 * 1000
  }

  if (normalized === '그제') {
    return now.getTime() - 2 * 24 * 60 * 60 * 1000
  }

  const daysAgo = normalized.match(/(\d+)\s*일\s*전/)

  if (daysAgo) {
    return now.getTime() - Number(daysAgo[1]) * 24 * 60 * 60 * 1000
  }

  const weeksAgo = normalized.match(/(\d+)\s*주\s*전/)

  if (weeksAgo) {
    return now.getTime() - Number(weeksAgo[1]) * 7 * 24 * 60 * 60 * 1000
  }

  const dotted = normalized.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/)

  if (dotted) {
    const [, year, month, day] = dotted
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime()
  }

  const slashed = normalized.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/)

  if (slashed) {
    const [, year, month, day] = slashed
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime()
  }

  const dashed = normalized.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)

  if (dashed) {
    const [, year, month, day] = dashed
    return new Date(Number(year), Number(month) - 1, Number(day)).getTime()
  }

  const monthDayDotted = normalized.match(/(\d{1,2})\.(\d{1,2})/)

  if (monthDayDotted) {
    const [, month, day] = monthDayDotted
    const candidate = new Date(now.getFullYear(), Number(month) - 1, Number(day))

    if (candidate.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
      candidate.setFullYear(candidate.getFullYear() - 1)
    }

    return candidate.getTime()
  }

  const monthDaySlashed = normalized.match(/(\d{1,2})\/(\d{1,2})/)

  if (monthDaySlashed) {
    const [, month, day] = monthDaySlashed
    const candidate = new Date(now.getFullYear(), Number(month) - 1, Number(day))

    if (candidate.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
      candidate.setFullYear(candidate.getFullYear() - 1)
    }

    return candidate.getTime()
  }

  return 0
}

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}`)
  }

  return res.text()
}

export async function getLatestNotices(): Promise<NoticeItem[]> {
  try {
    const html = await fetchHtml(NOTICE_LIST_URL)
    const rowMatches = [
      ...html.matchAll(
        /<div class="tr[^"]*">\s*<a href="([^"]+)">[\s\S]*?<span class="td sort">([\s\S]*?)<\/span>[\s\S]*?<span class="td subject">([\s\S]*?)<\/span>[\s\S]*?<span class="td date">([\s\S]*?)<\/span>/g,
      ),
    ]

    return rowMatches
      .map((match) => {
        const href = match[1] ?? ''
        const sort = stripTags(match[2] ?? '')
        const title = stripTags(match[3] ?? '').replace(/\s*새 글\s*/g, ' ').trim()
        const date = stripTags(match[4] ?? '')

        if (sort !== '공지' || !href || !title || !date) {
          return null
        }

        return {
          title: stripTags(title),
          date: stripTags(date),
          href: toAbsoluteUrl(href, NOTICE_LIST_URL),
          timestamp: parseNoticeTimestamp(date),
        }
      })
      .filter(
        (item): item is NoticeItem & { timestamp: number } => item !== null,
      )
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 3)
      .map(({ title, date, href }) => ({ title, date, href }))
  } catch {
    return []
  }
}

function parseEventListItems(html: string) {
  const anchors = [
    ...html.matchAll(/<a[^>]+href=(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi),
  ]

  return anchors
    .map((match, index) => {
      const hrefValue = match[1] ?? match[2] ?? match[3] ?? ''
      const href = toAbsoluteUrl(decodeHtml(hrefValue), 'https://fconline.nexon.com')
      const innerHtml = match[4]
      const imageSrcMatch = innerHtml.match(
        /<img[^>]+src=(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/i,
      )
      const imageSrc = imageSrcMatch
        ? decodeHtml(imageSrcMatch[1] ?? imageSrcMatch[2] ?? imageSrcMatch[3] ?? '')
        : ''
      const text = stripTags(innerHtml)

      if (!href || !imageSrc) {
        return null
      }

      if (
        !href.includes('events.fconline.nexon.com') &&
        !href.includes('shop.fconline.nexon.com') &&
        !href.includes('fconline.nexon.com/news/notice/view')
      ) {
        return null
      }

      if (
        !text.includes(STATUS_ONGOING) ||
        text.includes(STATUS_PENDING) ||
        text.includes(STATUS_ENDED)
      ) {
        return null
      }

      const title = text
        .replace(TEXT_NEW, '')
        .replace(/\d{4}-\d{2}-\d{2}/g, '')
        .replace(STATUS_ONGOING, '')
        .replace(STATUS_PENDING, '')
        .replace(STATUS_ENDED, '')
        .replace(/~/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      if (!title) {
        return null
      }

      return {
        id: `event-${index}`,
        title,
        href,
        imageUrl: toAbsoluteUrl(imageSrc, href),
      }
    })
    .filter(
      (item): item is { id: string; title: string; href: string; imageUrl: string } => item !== null,
    )
}

export async function getHomeEvents(): Promise<HomeEventItem[]> {
  try {
    const pages = await Promise.all(
      EVENT_PAGES.map((page) =>
        fetchHtml(page === 1 ? EVENT_LIST_URL : `${EVENT_LIST_URL}?n4PageNo=${page}`),
      ),
    )

    const items = pages.flatMap((html) => parseEventListItems(html))
    const deduped = items.filter(
      (item, index, array) => array.findIndex((candidate) => candidate.href === item.href) === index,
    )

    return deduped
  } catch {
    return []
  }
}

export async function getHomeControllerUsage(): Promise<HomeControllerUsage | null> {
  try {
    const html = await fetchHtml(DAILY_SQUAD_URL)
    const sectionMatch = html.match(
      /컨트롤러 이용 비중[\s\S]*?키보드[\s\S]*?패드[\s\S]*?(\d+(?:\.\d+)?)%\s*[\s\S]*?(\d+승\s*\d+무\s*\d+패)\s*[\s\S]*?(\d+(?:\.\d+)?)\s*%\s*[\s\S]*?(\d+승\s*\d+무\s*\d+패)/,
    )

    if (!sectionMatch) {
      return null
    }

    const keyboardPercentage = `${sectionMatch[1]}%`
    const keyboardRecord = sectionMatch[2].replace(/\s+/g, ' ').trim()
    const padPercentage = `${sectionMatch[3]}%`
    const padRecord = sectionMatch[4].replace(/\s+/g, ' ').trim()

    return {
      items: [
        {
          label: '키보드',
          percentage: keyboardPercentage,
          record: keyboardRecord,
        },
        {
          label: '패드',
          percentage: padPercentage,
          record: padRecord,
        },
      ],
      basisLabel: '공식 경기 1 ON 1, 전일 12시 업데이트 기준',
      sourceUrl: DAILY_SQUAD_URL,
    }
  } catch {
    return null
  }
}
