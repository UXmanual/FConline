import { getOfficialFormationMeta } from '@/app/matches/official-feed'

export async function GET() {
  try {
    const items = await getOfficialFormationMeta()
    return Response.json({ items, sampleSize: 100 })
  } catch {
    return Response.json({ items: [], sampleSize: 100 })
  }
}
