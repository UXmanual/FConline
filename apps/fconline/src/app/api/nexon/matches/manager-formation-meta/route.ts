import { getManagerFormationMeta } from '@/app/matches/manager-feed'

export async function GET() {
  try {
    const { items, sampleSize } = await getManagerFormationMeta()
    return Response.json({ items, sampleSize })
  } catch {
    return Response.json({ items: [], sampleSize: 0 })
  }
}
