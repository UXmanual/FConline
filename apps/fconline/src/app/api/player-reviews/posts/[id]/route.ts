import { NextRequest } from 'next/server'
import { formatRelativeTime, type CommunityPostSummary } from '@/lib/community'
import { canDeleteCommunityPost } from '@/lib/communityAuth'
import { hasSupabaseAuthCookie } from '@/lib/supabase/authCookie'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { createSupabaseSsrClient } from '@/lib/supabase/ssr'
import { getUserLevelProfile } from '@/lib/userLevel.server'
import { getAvatarUrlMap } from '@/lib/userAvatar.server'

type PostRow = {
  id: string
  player_id?: string | null
  player_name?: string | null
  nickname: string
  comment_count?: number | null
  author_user_id?: string | null
  password_hash?: string | null
  ip_prefix?: string | null
  title: string
  content: string
  created_at: string
}

async function fetchPost(supabase: ReturnType<typeof createSupabaseAdminClient>, postId: string) {
  const attempts = [
    'id, player_id, player_name, nickname, comment_count, author_user_id, password_hash, ip_prefix, title, content, created_at',
    'id, player_id, player_name, nickname, comment_count, author_user_id, ip_prefix, title, content, created_at',
    'id, player_id, player_name, nickname, comment_count, author_user_id, title, content, created_at',
    'id, player_id, player_name, nickname, comment_count, password_hash, title, content, created_at',
    'id, player_id, player_name, nickname, comment_count, title, content, created_at',
    'id, nickname, comment_count, title, content, created_at',
  ]

  for (const fields of attempts) {
    const response = await supabase
      .from('player_review_posts')
      .select(fields)
      .eq('id', postId)
      .single()

    if (!response.error) {
      return response
    }

    if (response.error.code === 'PGRST116') {
      return response
    }
  }

  return supabase
    .from('player_review_posts')
    .select('id, nickname, title, content, created_at')
    .eq('id', postId)
    .single()
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: postId } = await params
    if (!postId) {
      return Response.json({ message: '평가 ID가 필요합니다.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    const userPromise = hasSupabaseAuthCookie(request)
      ? createSupabaseSsrClient().then((s) => s.auth.getUser())
      : Promise.resolve({ data: { user: null } })

    const [{ data: { user } }, { data: post, error: postError }] = await Promise.all([
      userPromise,
      fetchPost(supabase, postId),
    ])

    if (postError || !post) {
      return Response.json({ message: '평가를 찾을 수 없습니다.' }, { status: 404 })
    }

    const typedPost = post as unknown as PostRow
    const authorId = typedPost.author_user_id ?? null

    const [levelProfile, avatarUrlMap, likeResult] = await Promise.all([
      authorId ? getUserLevelProfile(authorId).catch(() => null) : Promise.resolve(null),
      getAvatarUrlMap([authorId]),
      supabase.from('post_likes').select('user_id').eq('post_type', 'player_review').eq('post_id', postId),
    ])

    const likeCount = (likeResult.data ?? []).length
    const isLiked = (likeResult.data ?? []).some((r: any) => r.user_id === user?.id)

    const item: CommunityPostSummary = {
      id: typedPost.id,
      category: '선수',
      nickname: typedPost.nickname,
      level: authorId ? (levelProfile?.level ?? 1) : null,
      avatarUrl: authorId ? (avatarUrlMap?.get(authorId) ?? null) : null,
      authorId,
      ipPrefix: typedPost.ip_prefix ?? null,
      title: typedPost.title,
      content: typedPost.content,
      createdAt: typedPost.created_at,
      createdAtLabel: formatRelativeTime(typedPost.created_at),
      commentCount: Math.max(0, Number(typedPost.comment_count ?? 0) || 0),
      likeCount,
      isLiked,
      canDelete: canDeleteCommunityPost(typedPost, user?.id, user?.email),
    }

    return Response.json({ item })
  } catch {
    return Response.json({ message: '평가를 불러오지 못했습니다.' }, { status: 500 })
  }
}
