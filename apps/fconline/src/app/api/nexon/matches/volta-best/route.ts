import { getVoltaBestStats } from '@/app/matches/matches-feed'

export async function GET() {
  try {
    const items = await getVoltaBestStats()
    return Response.json({ items })
  } catch {
    return Response.json({ items: [] })
  }
}
