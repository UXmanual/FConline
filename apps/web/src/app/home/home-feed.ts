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

const NOTICE_LIST_URL = 'https://m.fconline.nexon.com/news/notice/list'
const EVENT_LIST_URL = 'https://fconline.nexon.com/news/events/list'
const EVENT_PAGES = [1, 2, 3]
const TEXT_NEW = '\uC0C8 \uAE00'
const STATUS_ONGOING = '\uC9C4\uD589'
const STATUS_PENDING = '\uC900\uBE44 \uC911'
const STATUS_ENDED = '\uC885\uB8CC'

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

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    next: { revalidate: 1800 },
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
    const itemMatches = [...html.matchAll(/<li class="item_list[\s\S]*?<\/li>/g)]
      .filter((match) => !match[0].includes('item_list notice'))
      .slice(0, 3)

    return itemMatches
      .map((match) => {
        const itemHtml = match[0]
        const href = itemHtml.match(/<a href="([^"]+)"/)?.[1] ?? ''
        const title = itemHtml.match(/<span class="txt">([\s\S]*?)<\/span>/)?.[1] ?? ''
        const date = itemHtml.match(/<span class="date">([\s\S]*?)<\/span>/)?.[1] ?? ''

        if (!href || !title || !date) {
          return null
        }

        return {
          title: stripTags(title),
          date: stripTags(date),
          href: toAbsoluteUrl(href, 'https://fconline.nexon.com'),
        }
      })
      .filter((item): item is NoticeItem => item !== null)
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
