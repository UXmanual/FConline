import { NextRequest } from 'next/server'
import {
  deriveCommunityNickname,
  formatRelativeTime,
  type CommunityPostSummary,
} from '@/lib/community'
import { canDeleteCommunityPost } from '@/lib/communityAuth'
import { getAuthUserFromRequest } from '@/lib/supabase/getAuthUser'
import { hasSupabaseAuthCookie } from '@/lib/supabase/authCookie'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { createSupabaseSsrClient } from '@/lib/supabase/ssr'
import { getUserLevelProfile } from '@/lib/userLevel.server'
import { getAvatarUrlMap } from '@/lib/userAvatar.server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params
    if (!postId) {
      return Response.json({ message: '게시글 ID가 필요합니다.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    const userPromise = hasSupabaseAuthCookie(request)
      ? createSupabaseSsrClient().then((s) => s.auth.getUser())
      : Promise.resolve({ data: { user: null } })

    const postPromise = supabase
      .from('community_posts')
      .select('id, category, nickname, comment_count, author_user_id, ip_prefix, title, content, created_at')
      .eq('id', postId)
      .single()

    const [{ data: { user } }, { data: post, error: postError }] = await Promise.all([
      userPromise,
      postPromise,
    ])

    if (postError || !post) {
      return Response.json({ message: '게시글을 찾을 수 없습니다.' }, { status: 404 })
    }

    const authorId = (post as { author_user_id?: string | null }).author_user_id ?? null

    const [levelProfile, avatarUrlMap, likeResult] = await Promise.all([
      authorId ? getUserLevelProfile(authorId).catch(() => null) : Promise.resolve(null),
      getAvatarUrlMap([authorId]),
      supabase.from('post_likes').select('user_id').eq('post_type', 'community').eq('post_id', postId),
    ])

    const likeCount = (likeResult.data ?? []).length
    const isLiked = (likeResult.data ?? []).some((r) => r.user_id === user?.id)

    const item: CommunityPostSummary = {
      id: post.id,
      category: post.category as CommunityPostSummary['category'],
      nickname: post.nickname,
      level: authorId ? (levelProfile?.level ?? 1) : null,
      avatarUrl: authorId ? (avatarUrlMap?.get(authorId) ?? null) : null,
      authorId,
      ipPrefix: (post as { ip_prefix?: string | null }).ip_prefix ?? null,
      title: post.title,
      content: post.content,
      createdAt: post.created_at,
      createdAtLabel: formatRelativeTime(post.created_at),
      commentCount: Math.max(0, Number((post as { comment_count?: number | null }).comment_count ?? 0) || 0),
      likeCount,
      isLiked,
      canDelete: canDeleteCommunityPost(post, user?.id, user?.email),
    }

    return Response.json({ item })
  } catch {
    return Response.json({ message: '게시글을 불러오지 못했습니다.' }, { status: 500 })
  }
}
