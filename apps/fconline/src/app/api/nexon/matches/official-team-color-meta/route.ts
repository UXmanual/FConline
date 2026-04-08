import { getOfficialTeamColorMeta } from '@/app/matches/official-feed'

export async function GET() {
  try {
    const items = await getOfficialTeamColorMeta()
    return Response.json({ items, sampleSize: 4000 })
  } catch {
    return Response.json({ items: [], sampleSize: 4000 })
  }
}
