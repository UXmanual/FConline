import type { Metadata } from 'next'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: '커뮤니티',
  description: 'FC온라인 유저들과 자유롭게 소통하는 커뮤니티입니다. 피파온라인 공략, 팁, 선수 정보, 게임 이야기를 나눠보세요.',
  keywords: ['FC온라인 커뮤니티', '피파 커뮤니티', '피파커뮤니티', '축구 커뮤니티', '피파 게시판', 'FC온라인 게시판', '피파온라인 커뮤니티', 'FC온라인 공략', '축구게임 커뮤니티'],
}
import { createSupabaseSsrClient } from '@/lib/supabase/ssr'
import { canDeleteCommunityPost } from '@/lib/communityAuth'
import { formatRelativeTime, type CommunityPostSummary } from '@/lib/community'
import { getUserLevelMap } from '@/lib/userLevel.server'
import CommunityPageClient from './CommunityPageClient'

export const dynamic = 'force-dynamic'

const INITIAL_PAGE = 1
const POSTS_PER_PAGE = 5

type PostRow = {
  id: string
  category: string
  nickname: string
  comment_count: number | null
  author_user_id?: string | null
  password_hash?: string | null
  ip_prefix?: string | null
  title: string
  content: string
  created_at: string
}

async function getAvatarUrlMap(userIds: Array<string | null | undefined>) {
  const normalizedIds = [...new Set(userIds.filter((value): value is string => typeof value === 'string' && value.trim().length > 0))]

  if (normalizedIds.length === 0) {
    return new Map<string, string>()
  }

  const supabase = createSupabaseAdminClient()
  const avatarUrlMap = new Map<string, string>()
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })

    if (error || !data?.users?.length) {
      break
    }

    for (const user of data.users) {
      if (!normalizedIds.includes(user.id)) {
        continue
      }

      const avatarUrl = user.user_metadata?.custom_avatar_url

      if (typeof avatarUrl === 'string' && avatarUrl.trim()) {
        avatarUrlMap.set(user.id, avatarUrl.trim())
      }
    }

    if (data.users.length < perPage || avatarUrlMap.size >= normalizedIds.length) {
      break
    }

    page += 1
  }

  return avatarUrlMap
}

type InitialCommunityData = {
  items: CommunityPostSummary[]
  totalCount: number
  hasMore: boolean
  page: number
  pageSize: number
  highlightedPostId?: string | null
  autoOpenComments?: boolean
}

async function fetchInitialPosts(highlightPostId?: string | null): Promise<InitialCommunityData> {
  try {
    const supabase = createSupabaseAdminClient()
    const authSupabase = await createSupabaseSsrClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()
    let page = INITIAL_PAGE
    let from = 0
    let to = POSTS_PER_PAGE - 1

    if (highlightPostId) {
      const postResponse = await supabase
        .from('community_posts')
        .select('id, created_at')
        .eq('id', highlightPostId)
        .single()

      if (!postResponse.error && postResponse.data) {
        const { count } = await supabase
          .from('community_posts')
          .select('id', { count: 'exact', head: true })
          .gt('created_at', postResponse.data.created_at)

        page = Math.floor((Number(count ?? 0) || 0) / POSTS_PER_PAGE) + 1
        from = (page - 1) * POSTS_PER_PAGE
        to = page * POSTS_PER_PAGE - 1
      }
    }

    const primaryResponsePromise = supabase
      .from('community_posts')
      .select('id, category, nickname, comment_count, author_user_id, password_hash, ip_prefix, title, content, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    const primaryResponse = await primaryResponsePromise

    const fallbackResponse = primaryResponse.error
      ? await supabase
          .from('community_posts')
          .select('id, category, nickname, comment_count, password_hash, ip_prefix, title, content, created_at', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, to)
      : null

    const response = fallbackResponse ?? primaryResponse
    const { data: posts, error: postsError, count } = response

    if (postsError || !posts) {
      return { items: [], totalCount: 0, hasMore: false, page: INITIAL_PAGE, pageSize: POSTS_PER_PAGE, highlightedPostId: highlightPostId ?? null }
    }

    const typedPosts = posts as unknown as PostRow[]
    const postIds = typedPosts.map((post) => post.id)
    const [levelMap, avatarUrlMap, likeResult] = await Promise.all([
      getUserLevelMap(typedPosts.map((post) => post.author_user_id)),
      getAvatarUrlMap(typedPosts.map((post) => post.author_user_id)),
      postIds.length > 0
        ? supabase.from('post_likes').select('post_id, user_id').eq('post_type', 'community').in('post_id', postIds)
        : Promise.resolve({ data: [] as Array<{ post_id: string; user_id: string }> }),
    ])
    const likeCountMap = new Map<string, number>()
    const likedPostIds = new Set<string>()
    for (const row of (likeResult.data ?? []) as Array<{ post_id: string; user_id: string }>) {
      likeCountMap.set(row.post_id, (likeCountMap.get(row.post_id) ?? 0) + 1)
      if (row.user_id === user?.id) likedPostIds.add(row.post_id)
    }
    const items = typedPosts.map((post) => ({
      id: post.id,
      category: post.category as CommunityPostSummary['category'],
      nickname: post.nickname,
      level:
        typeof post.author_user_id === 'string' && post.author_user_id.trim().length > 0
          ? (levelMap.get(post.author_user_id) ?? 1)
          : null,
      avatarUrl:
        typeof post.author_user_id === 'string' && post.author_user_id.trim().length > 0
          ? (avatarUrlMap.get(post.author_user_id) ?? null)
          : null,
      ipPrefix: post.ip_prefix ?? null,
      title: post.title,
      content: post.content,
      createdAt: post.created_at,
      createdAtLabel: formatRelativeTime(post.created_at),
      commentCount: Math.max(0, Number(post.comment_count ?? 0) || 0),
      likeCount: likeCountMap.get(post.id) ?? 0,
      isLiked: likedPostIds.has(post.id),
      canDelete: canDeleteCommunityPost(post, user?.id, user?.email),
    }))

    return {
      items,
      totalCount: count ?? 0,
      hasMore: typedPosts.length === POSTS_PER_PAGE,
      page,
      pageSize: POSTS_PER_PAGE,
      highlightedPostId: highlightPostId ?? null,
      autoOpenComments: false,
    }
  } catch {
    return { items: [], totalCount: 0, hasMore: false, page: INITIAL_PAGE, pageSize: POSTS_PER_PAGE, highlightedPostId: highlightPostId ?? null, autoOpenComments: false }
  }
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ postId?: string; openComments?: string }>
}) {
  const { postId, openComments } = await searchParams
  const trimmedPostId = postId?.trim() || null
  const initialData = await fetchInitialPosts(trimmedPostId)
  return <CommunityPageClient initialData={{ ...initialData, autoOpenComments: !!openComments && !!trimmedPostId }} />
}
