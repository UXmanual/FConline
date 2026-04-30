import { NextRequest } from 'next/server'
import {
  deriveCommunityNickname,
  formatRelativeTime,
  getKoreaTimestampString,
  getIpPrefixFromHeader,
  isCommunityCategory,
  type CommunityPostSummary,
} from '@/lib/community'
import { canDeleteCommunityPost, hashPassword } from '@/lib/communityAuth'
import { hasSupabaseAuthCookie } from '@/lib/supabase/authCookie'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { createSupabaseSsrClient } from '@/lib/supabase/ssr'
import { getUserLevelMap, getUserLevelProfile, rewardCommunityPostXp } from '@/lib/userLevel.server'
import type { SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 5
const MAX_PAGE_SIZE = 20

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

function mapPostSummary(
  post: PostRow,
  currentUserId?: string | null,
  currentUserEmail?: string | null,
  levelMap?: Map<string, number>,
  avatarUrlMap?: Map<string, string>,
  likeCountMap?: Map<string, number>,
  likedPostIds?: Set<string>,
): CommunityPostSummary {
  return {
    id: post.id,
    category: post.category as CommunityPostSummary['category'],
    nickname: post.nickname,
    level:
      typeof post.author_user_id === 'string' && post.author_user_id.trim().length > 0
        ? (levelMap?.get(post.author_user_id) ?? 1)
        : null,
    avatarUrl:
      typeof post.author_user_id === 'string' && post.author_user_id.trim().length > 0
        ? (avatarUrlMap?.get(post.author_user_id) ?? null)
        : null,
    ipPrefix: post.ip_prefix ?? null,
    title: post.title,
    content: post.content,
    createdAt: post.created_at,
    createdAtLabel: formatRelativeTime(post.created_at),
    commentCount: Math.max(0, Number(post.comment_count ?? 0) || 0),
    likeCount: likeCountMap?.get(post.id) ?? 0,
    isLiked: likedPostIds?.has(post.id) ?? false,
    canDelete: canDeleteCommunityPost(post, currentUserId, currentUserEmail),
  }
}

function isMissingSupabaseConfigError(error: unknown) {
  return error instanceof Error && error.message.includes('Missing Supabase environment variable')
}

function getPaginationParams(request: NextRequest) {
  const pageParam = Number(request.nextUrl.searchParams.get('page') ?? DEFAULT_PAGE)
  const pageSizeParam = Number(request.nextUrl.searchParams.get('pageSize') ?? DEFAULT_PAGE_SIZE)
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : DEFAULT_PAGE
  const pageSize =
    Number.isFinite(pageSizeParam) && pageSizeParam > 0
      ? Math.min(MAX_PAGE_SIZE, Math.floor(pageSizeParam))
      : DEFAULT_PAGE_SIZE

  return { page, pageSize, from: (page - 1) * pageSize, to: page * pageSize - 1 }
}

function shouldIncludeTotalCount(request: NextRequest) {
  return request.nextUrl.searchParams.get('includeTotalCount') === '1'
}

async function resolvePageForPostId(supabase: SupabaseClient, postId: string, pageSize: number) {
  const primaryResponse = await supabase
    .from('community_posts')
    .select('id, created_at')
    .eq('id', postId)
    .single()

  if (primaryResponse.error || !primaryResponse.data) {
    return null
  }

  const { count, error } = await supabase
    .from('community_posts')
    .select('id', { count: 'exact', head: true })
    .gt('created_at', primaryResponse.data.created_at)

  if (error) {
    return null
  }

  const page = Math.floor((Number(count ?? 0) || 0) / pageSize) + 1

  return {
    page,
    from: (page - 1) * pageSize,
    to: page * pageSize - 1,
  }
}

async function fetchPostsPage(
  supabase: SupabaseClient,
  from: number,
  to: number,
  includeTotalCount = false,
  includeIpPrefix = true,
  includeAuthorUserId = true,
) {
  const baseFields = includeAuthorUserId
    ? 'id, category, nickname, comment_count, author_user_id, password_hash'
    : 'id, category, nickname, comment_count, password_hash'
  const selectFields = includeIpPrefix
    ? `${baseFields}, ip_prefix, title, content, created_at`
    : `${baseFields}, title, content, created_at`

  const response = await supabase
    .from('community_posts')
    .select(selectFields, includeTotalCount ? { count: 'exact' } : undefined)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (!response.error || !includeIpPrefix) {
    return response
  }

  if (includeAuthorUserId) {
    return fetchPostsPage(supabase, from, to, includeTotalCount, includeIpPrefix, false)
  }

  return fetchPostsPage(supabase, from, to, includeTotalCount, false, includeAuthorUserId)
}

export async function GET(request: NextRequest) {
  try {
    const { page: rawPage, pageSize, from: rawFrom, to: rawTo } = getPaginationParams(request)
    const includeTotalCount = shouldIncludeTotalCount(request)
    const highlightPostId = request.nextUrl.searchParams.get('postId')?.trim() ?? ''
    const supabase = createSupabaseAdminClient()
    const resolvedPage = highlightPostId
      ? await resolvePageForPostId(supabase, highlightPostId, pageSize)
      : null
    const page = resolvedPage?.page ?? rawPage
    const from = resolvedPage?.from ?? rawFrom
    const to = resolvedPage?.to ?? rawTo
    const userPromise = hasSupabaseAuthCookie(request)
      ? createSupabaseSsrClient().then((authSupabase) => authSupabase.auth.getUser())
      : Promise.resolve({ data: { user: null } })
    const postsPromise = fetchPostsPage(supabase, from, to, includeTotalCount)
    const [{ data: { user } }, { data: posts, error: postsError, count }] = await Promise.all([
      userPromise,
      postsPromise,
    ])

    if (postsError) {
      return Response.json({ message: '게시글을 불러오지 못했습니다.' }, { status: 500 })
    }

    const typedPosts = (posts ?? []) as unknown as PostRow[]
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
    const items = typedPosts.map((post) => mapPostSummary(post, user?.id, user?.email, levelMap, avatarUrlMap, likeCountMap, likedPostIds))

    return Response.json({
      items,
      totalCount: includeTotalCount ? (count ?? 0) : null,
      hasMore: typedPosts.length === pageSize,
      page,
      pageSize,
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development' && isMissingSupabaseConfigError(error)) {
      return Response.json({ items: [], totalCount: 0, page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE })
    }

    return Response.json({ message: '게시글을 불러오지 못했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createSupabaseSsrClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return Response.json({ message: '로그인한 사용자만 글을 작성할 수 있습니다.' }, { status: 401 })
    }

    const body = await request.json()
    const ipPrefix =
      getIpPrefixFromHeader(request.headers.get('x-forwarded-for')) ??
      getIpPrefixFromHeader(request.headers.get('x-real-ip')) ??
      getIpPrefixFromHeader(request.headers.get('cf-connecting-ip'))
    const category = String(body.category ?? '').trim()
    const nickname = deriveCommunityNickname(user)
    const title = String(body.title ?? '').trim()
    const content = String(body.content ?? '').trim()

    if (!isCommunityCategory(category) || !nickname || !title || !content) {
      return Response.json({ message: '입력값을 다시 확인해 주세요.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const insertPayload = {
      category,
      nickname,
      author_user_id: user.id,
      // Keep legacy schema compatibility if password_hash is still NOT NULL.
      password_hash: hashPassword(user.id),
      title,
      content,
      created_at: getKoreaTimestampString(),
      ip_prefix: ipPrefix,
    }

    let response = await supabase
      .from('community_posts')
      .insert(insertPayload)
      .select('id, category, nickname, author_user_id, ip_prefix, title, content, created_at')
      .single()

    if (response.error) {
      response = await supabase
        .from('community_posts')
        .insert({
          category,
          nickname,
          comment_count: 0,
          password_hash: insertPayload.password_hash,
          title,
          content,
          created_at: insertPayload.created_at,
        })
        .select('id, category, nickname, title, content, created_at')
        .single()
    }

    if (response.error || !response.data) {
      return Response.json({ message: '게시글을 등록하지 못했습니다.' }, { status: 500 })
    }

    const item = mapPostSummary(
      { ...(response.data as PostRow), comment_count: 0 },
      user.id,
      user.email,
      new Map([[user.id, 1]]),
      new Map(
        typeof user.user_metadata?.custom_avatar_url === 'string' && user.user_metadata.custom_avatar_url.trim()
          ? [[user.id, user.user_metadata.custom_avatar_url.trim()]]
          : [],
      ),
      new Map(),
      new Set(),
    )
    if (!item.ipPrefix && ipPrefix) {
      item.ipPrefix = ipPrefix
    }

    await rewardCommunityPostXp(user.id, item.id).catch(() => undefined)
    item.level = (await getUserLevelProfile(user.id).catch(() => null))?.level ?? item.level ?? 1

    return Response.json({ item }, { status: 201 })
  } catch {
    return Response.json({ message: '게시글을 등록하지 못했습니다.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authSupabase = await createSupabaseSsrClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return Response.json({ message: '로그인한 사용자만 글을 삭제할 수 있습니다.' }, { status: 401 })
    }

    const body = await request.json()
    const postId = String(body.postId ?? '').trim()

    if (!postId) {
      return Response.json({ message: '삭제할 게시글을 찾지 못했습니다.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const primaryResponse = await supabase
      .from('community_posts')
      .select('id, author_user_id, password_hash')
      .eq('id', postId)
      .single()

    const fallbackResponse = primaryResponse.error
      ? await supabase
        .from('community_posts')
        .select('id, password_hash')
        .eq('id', postId)
        .single()
      : null

    const { data: post, error: postError } = fallbackResponse ?? primaryResponse

    if (postError || !post) {
      return Response.json({ message: '게시글을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (!canDeleteCommunityPost(post, user.id, user.email)) {
      return Response.json({ message: '내가 작성한 글만 삭제할 수 있습니다.' }, { status: 403 })
    }

    const { error: deleteError } = await supabase.from('community_posts').delete().eq('id', postId)

    if (deleteError) {
      return Response.json({ message: '게시글을 삭제하지 못했습니다.' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch {
    return Response.json({ message: '게시글을 삭제하지 못했습니다.' }, { status: 500 })
  }
}
