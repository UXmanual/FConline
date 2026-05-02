import { getManagerTopRanks } from '@/app/matches/manager-feed'

export async function GET() {
  try {
    const items = await getManagerTopRanks()
    return Response.json({ items })
  } catch {
    return Response.json({ items: [] })
  }
}
