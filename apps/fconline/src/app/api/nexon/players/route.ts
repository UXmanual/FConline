import { NextRequest } from 'next/server'
import { getPlayerDetail } from '@/features/player-search/player-detail'
import { getSeasonMeta, getSpidMeta } from '@/lib/nexon'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

async function getPlayerReviewCountMap(playerIds: number[]) {
  if (playerIds.length === 0) {
    return new Map<string, number>()
  }

  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('player_review_posts')
      .select('player_id')
      .in('player_id', playerIds.map(String))

    if (error) {
      return new Map<string, number>()
    }

    const countMap = new Map<string, number>()
    for (const row of (data ?? []) as Array<{ player_id: string }>) {
      countMap.set(row.player_id, (countMap.get(row.player_id) ?? 0) + 1)
    }

    return countMap
  } catch {
    return new Map<string, number>()
  }
}

async function getPlayerSearchData(query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  const [players, seasons] = await Promise.all([getSpidMeta(), getSeasonMeta()])

  const filtered = normalizedQuery
    ? players
        .filter((player: { id: number; name: string }) => player.name.toLowerCase().includes(normalizedQuery))
        .sort(
          (a: { id: number; name: string }, b: { id: number; name: string }) =>
            Math.floor(b.id / 1_000_000) - Math.floor(a.id / 1_000_000),
        )
    : []

  const reviewCountMap = await getPlayerReviewCountMap(filtered.map((player: { id: number }) => player.id))

  const enrichedPlayers = await Promise.all(
    filtered.map(async (player: { id: number; name: string }) => ({
      ...player,
      detail: await getPlayerDetail(String(player.id)),
      reviewCount: reviewCountMap.get(String(player.id)) ?? 0,
    })),
  )

  return { players: enrichedPlayers, seasons }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const data = await getPlayerSearchData(query)
  return Response.json(data)
}
