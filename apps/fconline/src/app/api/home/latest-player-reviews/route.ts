import { formatRelativeTime } from '@/lib/community'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getPlayerDetail } from '@/features/player-search/player-detail'

const LATEST_REVIEW_LIMIT = 3

type LatestPlayerReviewRow = {
  id: string
  player_id: string
  player_name: string
  nickname: string
  title: string
  created_at: string
}

function parseCardLevel(title: string) {
  const match = title.match(/^\[(\d+)카\]/)
  return match ? Number(match[1]) : null
}

function trimPlayerReviewTitle(title: string) {
  return title.replace(/^\[\d+카\]\s*/, '').trim() || title
}

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('player_review_posts')
      .select('id, player_id, player_name, nickname, title, created_at')
      .order('created_at', { ascending: false })
      .limit(LATEST_REVIEW_LIMIT)

    if (error) {
      return Response.json({ items: [] })
    }

    const reviews = (data ?? []) as LatestPlayerReviewRow[]
    const items = await Promise.all(
      reviews.map(async (review) => {
        const detail = await getPlayerDetail(String(review.player_id))

        return {
          id: review.id,
          playerId: review.player_id,
          playerName: review.player_name,
          nickname: review.nickname,
          seasonImg: detail?.seasonImg ?? null,
          title: review.title,
          trimmedTitle: trimPlayerReviewTitle(review.title),
          cardLevel: parseCardLevel(review.title),
          createdAt: review.created_at,
          createdAtLabel: formatRelativeTime(review.created_at),
        }
      }),
    )

    return Response.json({ items })
  } catch {
    return Response.json({ items: [] })
  }
}
