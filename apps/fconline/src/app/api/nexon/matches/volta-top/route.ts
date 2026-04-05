import { getVoltaTopRanks } from '@/app/matches/matches-feed'

export async function GET() {
  try {
    const items = await getVoltaTopRanks()
    return Response.json({ items })
  } catch {
    return Response.json({ items: [] })
  }
}
