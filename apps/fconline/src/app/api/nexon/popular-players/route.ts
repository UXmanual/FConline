import { NextRequest } from 'next/server'

type PopularPlayerItem = {
  rank: number
  name: string
  summary: string
  metric: string
  imageUrl: string
  seasonBadgeUrl?: string
}

type PopularGroupKey = 'fw' | 'mf' | 'df'

const OFFICIAL_BASE_URL = 'https://fconline.nexon.com'
const GROUP_POSITION_ORDER: Record<PopularGroupKey, number[]> = {
  fw: [25, 21, 23, 27],
  mf: [14, 10, 12, 16, 18, 23],
  df: [5, 2, 8, 3, 7],
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseCards(html: string) {
  const chunks = html.split('<div class="item_list swiper-slide">').slice(1)

  return chunks
    .map((chunk) => {
      const name = chunk.match(/<span class="hidden">([^<]+)<\/span>/)?.[1]?.trim() ?? ''
      const position = chunk.match(/<div class="position [^"]+">([^<]+)<\/div>/)?.[1]?.trim() ?? ''
      const overall = chunk.match(/<div class="ovr">([^<]+)<\/div>/)?.[1]?.trim() ?? ''
      const pay = chunk.match(/<div class="pay">[\s\S]*?<span>([^<]+)<\/span>/)?.[1]?.trim() ?? ''
      const price = chunk.match(/<span class="price [^"]+"[^>]*>([^<]+)<\/span>/)?.[1]?.trim() ?? ''
      const imageUrl = chunk.match(/<img src="(https:\/\/[^"]+playersAction\/[^"]+)"/)?.[1] ?? ''
      const seasonBadgeUrl =
        chunk.match(/<span class="season"><img src="(https:\/\/[^"]+\/season\/[A-Z0-9_]+\.png)"/)?.[1] ?? ''

      if (!name || !position || !price || !imageUrl) {
        return null
      }

      const summaryParts = [
        position || '',
        overall ? `오버롤 ${stripTags(overall)}` : '',
        pay ? `급여 ${stripTags(pay)}` : '',
      ].filter(Boolean)

      return {
        name,
        summary: summaryParts.join(' · '),
        metric: stripTags(price),
        imageUrl,
        seasonBadgeUrl,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
}

async function fetchGroup(group: PopularGroupKey): Promise<PopularPlayerItem[]> {
  const positions = GROUP_POSITION_ORDER[group]
  const responses = await Promise.all(
    positions.map((position) =>
      fetch(`${OFFICIAL_BASE_URL}/Datacenter/BestUsePositionPlayerMain?n4Position=${position}`, {
        next: { revalidate: 60 * 60 * 12 },
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        },
      }).then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch group ${group} position ${position}`)
        }

        return res.text()
      }),
    ),
  )

  return responses
    .flatMap((html) => parseCards(html))
    .filter((item, index, array) => array.findIndex((candidate) => candidate.name === item.name) === index)
    .slice(0, 5)
    .map((item, index) => ({
      rank: index + 1,
      ...item,
    }))
}

export async function GET(request: NextRequest) {
  const group = request.nextUrl.searchParams.get('group') as PopularGroupKey | null

  try {
    if (group === 'fw' || group === 'mf' || group === 'df') {
      const items = await fetchGroup(group)
      return Response.json({
        items,
      })
    }

    const [fw, mf, df] = await Promise.all([
      fetchGroup('fw'),
      fetchGroup('mf'),
      fetchGroup('df'),
    ])

    return Response.json({ fw, mf, df })
  } catch {
    if (group === 'fw' || group === 'mf' || group === 'df') {
      return Response.json({ items: [] })
    }

    return Response.json({ fw: [], mf: [], df: [] })
  }
}
