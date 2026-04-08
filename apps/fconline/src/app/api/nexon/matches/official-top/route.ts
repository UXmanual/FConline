import { getOfficialTopRanks } from '@/app/matches/official-feed'

export async function GET() {
  try {
    const items = await getOfficialTopRanks()
    return Response.json({ items })
  } catch {
    return Response.json({ items: [] })
  }
}
