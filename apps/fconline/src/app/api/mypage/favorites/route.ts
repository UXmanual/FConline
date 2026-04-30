import { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { createSupabaseSsrClient } from '@/lib/supabase/ssr'

type FavoritesTab = 'players' | 'community' | 'player-reviews'

function normalizeTab(value: string | null | undefined): FavoritesTab {
  if (value === 'community' || value === 'player-reviews') {
    return value
  }

  return 'players'
}

export async function GET(request: NextRequest) {
  try {
    const authSupabase = await createSupabaseSsrClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return Response.json({ message: '로그인 후 이용해 주세요.' }, { status: 401 })
    }

    const tab = normalizeTab(request.nextUrl.searchParams.get('tab'))

    if (tab === 'players') {
      return Response.json({ tab, items: [] })
    }

    const supabase = createSupabaseAdminClient()

    if (tab === 'community') {
      const { data, error } = await supabase
        .from('community_posts')
        .select('id, title, content, created_at, comment_count')
        .eq('author_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        throw error
      }

      const postIds = (data ?? []).map((item) => item.id)
      const likeCounts = new Map<string, number>()

      if (postIds.length > 0) {
        const { data: likeRows } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('post_type', 'community')
          .in('post_id', postIds)

        for (const row of (likeRows ?? []) as Array<{ post_id: string }>) {
          likeCounts.set(row.post_id, (likeCounts.get(row.post_id) ?? 0) + 1)
        }
      }

      return Response.json({
        tab,
        items: (data ?? []).map((item) => ({
          id: item.id,
          title: item.title,
          body: item.content,
          createdAt: item.created_at,
          commentCount: Math.max(0, Number(item.comment_count ?? 0) || 0),
          likeCount: likeCounts.get(item.id) ?? 0,
          href: `/community?postId=${item.id}`,
        })),
      })
    }

    const { data, error } = await supabase
      .from('player_review_posts')
      .select('id, player_id, player_name, title, content, created_at, comment_count')
      .eq('author_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      throw error
    }

    const postIds = (data ?? []).map((item) => item.id)
    const likeCounts = new Map<string, number>()

    if (postIds.length > 0) {
      const { data: likeRows } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('post_type', 'player_review')
        .in('post_id', postIds)

      for (const row of (likeRows ?? []) as Array<{ post_id: string }>) {
        likeCounts.set(row.post_id, (likeCounts.get(row.post_id) ?? 0) + 1)
      }
    }

    return Response.json({
      tab,
      items: (data ?? []).map((item) => ({
        id: item.id,
        title: `[${item.player_name}] ${item.title}`,
        body: item.content,
        createdAt: item.created_at,
        commentCount: Math.max(0, Number(item.comment_count ?? 0) || 0),
        likeCount: likeCounts.get(item.id) ?? 0,
        href: `/players/${item.player_id}?tab=review&postId=${item.id}`,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '즐겨찾기 목록을 불러오지 못했습니다.'
    return Response.json({ message }, { status: 500 })
  }
}
