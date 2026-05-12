import { getHomeControllerUsage } from '@/app/home/home-feed'

export const revalidate = 1800

export async function GET() {
  try {
    const controllerUsage = await getHomeControllerUsage()

    return Response.json(controllerUsage, {
      headers: {
        'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600',
      },
    })
  } catch {
    return Response.json(
      {
        items: [
          { label: '키보드', percentage: '0', record: '- 승 - 무 - 패' },
          { label: '패드', percentage: '0', record: '- 승 - 무 - 패' },
        ],
        basisLabel: '공식 경기 1 ON 1 | 전일 12시 업데이트 상위 1만명 기준',
        sourceUrl: 'https://fconline.nexon.com/datacenter/dailysquad',
        unavailable: true,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    )
  }
}
