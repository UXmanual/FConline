import { NextRequest } from 'next/server'
import {
  deriveCommunityNickname,
  formatRelativeTime,
  getKoreaTimestampString,
  getIpPrefixFromHeader,
  type CommunityPostSummary,
} from '@/lib/community'
import { canDeleteCommunityPost, hashPassword } from '@/lib/communityAuth'
import { hasSupabaseAuthCookie } from '@/lib/supabase/authCookie'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { createSupabaseSsrClient } from '@/lib/supabase/ssr'
import { getUserLevelMap, getUserLevelProfile, rewardPlayerReviewPostXp } from '@/lib/userLevel.server'
import type { SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 5
const MAX_PAGE_SIZE = 20

type PlayerReviewPostRow = {
  id: string
  player_id: string
  player_name: string
  nickname: string
  comment_count?: number | null
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
  post: PlayerReviewPostRow,
  currentUserId?: string | null,
  currentUserEmail?: string | null,
  levelMap?: Map<string, number>,
  avatarUrlMap?: Map<string, string>,
): CommunityPostSummary {
  return {
    id: post.id,
    category: '선수',
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

function getPlayerIdParam(request: NextRequest) {
  return request.nextUrl.searchParams.get('playerId')?.trim() ?? ''
}

function getPostIdParam(request: NextRequest) {
  return request.nextUrl.searchParams.get('postId')?.trim() ?? ''
}

async function fetchPostsPage(
  supabase: SupabaseClient,
  playerId: string,
  from: number,
  to: number,
  includeIpPrefix = true,
  includeAuthorUserId = true,
) {
  const baseFields = includeAuthorUserId
    ? 'id, player_id, player_name, nickname, comment_count, author_user_id, password_hash'
    : 'id, player_id, player_name, nickname, comment_count, password_hash'
  const selectFields = includeIpPrefix
    ? `${baseFields}, ip_prefix, title, content, created_at`
    : `${baseFields}, title, content, created_at`

  const response = await supabase
    .from('player_review_posts')
    .select(selectFields, { count: 'exact' })
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (!response.error || !includeIpPrefix) {
    return response
  }

  if (includeAuthorUserId) {
    return fetchPostsPage(supabase, playerId, from, to, includeIpPrefix, false)
  }

  return fetchPostsPage(supabase, playerId, from, to, false, includeAuthorUserId)
}

async function resolvePageForPost(
  supabase: SupabaseClient,
  playerId: string,
  postId: string,
  pageSize: number,
) {
  if (!postId) {
    return null
  }

  const { data: targetPost, error: targetPostError } = await supabase
    .from('player_review_posts')
    .select('id, created_at')
    .eq('id', postId)
    .eq('player_id', playerId)
    .maybeSingle()

  if (targetPostError || !targetPost) {
    return null
  }

  const { count, error: countError } = await supabase
    .from('player_review_posts')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .gt('created_at', targetPost.created_at)

  if (countError) {
    return null
  }

  return Math.floor((count ?? 0) / pageSize) + 1
}

function containsPost(posts: PlayerReviewPostRow[], postId: string) {
  return posts.some((post) => post.id === postId)
}

export async function GET(request: NextRequest) {
  try {
    const { page: requestedPage, pageSize } = getPaginationParams(request)
    const playerId = getPlayerIdParam(request)
    const postId = getPostIdParam(request)

    if (!playerId) {
      return Response.json({ message: 'playerId가 필요합니다.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const userPromise = hasSupabaseAuthCookie(request)
      ? createSupabaseSsrClient().then((authSupabase) => authSupabase.auth.getUser())
      : Promise.resolve({ data: { user: null } })
    const requestedFrom = (requestedPage - 1) * pageSize
    const requestedTo = requestedPage * pageSize - 1
    const initialPostsPromise = fetchPostsPage(supabase, playerId, requestedFrom, requestedTo)
    const [{ data: { user } }, initialPostsResponse] = await Promise.all([userPromise, initialPostsPromise])

    if (initialPostsResponse.error) {
      return Response.json({ message: '?좎닔 ?됯?瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲??' }, { status: 500 })
    }

    let resolvedPage = requestedPage
    let postsResponse: Awaited<ReturnType<typeof fetchPostsPage>> = initialPostsResponse
    const initialPosts = (initialPostsResponse.data ?? []) as unknown as PlayerReviewPostRow[]
    const hasTargetPost = postId ? containsPost(initialPosts, postId) : false

    if (postId && !hasTargetPost) {
      const targetPage = await resolvePageForPost(supabase, playerId, postId, pageSize)

      if (targetPage && targetPage !== requestedPage) {
        resolvedPage = targetPage
        const resolvedFrom = (targetPage - 1) * pageSize
        const resolvedTo = targetPage * pageSize - 1
        postsResponse = await fetchPostsPage(supabase, playerId, resolvedFrom, resolvedTo)
      }
    }

    const { data: posts, error: postsError, count } = postsResponse

    if (postsError) {
      return Response.json({ message: '선수 평가를 불러오지 못했습니다.' }, { status: 500 })
    }

    const typedPosts = (posts ?? []) as unknown as PlayerReviewPostRow[]
    const [levelMap, avatarUrlMap] = await Promise.all([
      getUserLevelMap(typedPosts.map((post) => post.author_user_id)),
      getAvatarUrlMap(typedPosts.map((post) => post.author_user_id)),
    ])
    const items = typedPosts.map((post) => mapPostSummary(post, user?.id, user?.email, levelMap, avatarUrlMap))

    return Response.json({
      items,
      totalCount: count ?? 0,
      page: resolvedPage,
      pageSize,
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development' && isMissingSupabaseConfigError(error)) {
      return Response.json({ items: [], totalCount: 0, page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE })
    }

    return Response.json({ message: '선수 평가를 불러오지 못했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createSupabaseSsrClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return Response.json({ message: '로그인한 사용자만 선수평가를 작성할 수 있습니다.' }, { status: 401 })
    }

    const body = await request.json()
    const ipPrefix =
      getIpPrefixFromHeader(request.headers.get('x-forwarded-for')) ??
      getIpPrefixFromHeader(request.headers.get('x-real-ip')) ??
      getIpPrefixFromHeader(request.headers.get('cf-connecting-ip'))
    const playerId = String(body.playerId ?? '').trim()
    const playerName = String(body.playerName ?? '').trim()
    const nickname = deriveCommunityNickname(user)
    const title = String(body.title ?? '').trim()
    const content = String(body.content ?? '').trim()

    if (!playerId || !playerName || !nickname || !title || !content) {
      return Response.json({ message: '입력값을 다시 확인해 주세요.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const insertPayload = {
      player_id: playerId,
      player_name: playerName,
      nickname,
      author_user_id: user.id,
      password_hash: hashPassword(user.id),
      title,
      content,
      created_at: getKoreaTimestampString(),
      ip_prefix: ipPrefix,
    }

    let response = await supabase
      .from('player_review_posts')
      .insert(insertPayload)
      .select('id, player_id, player_name, nickname, author_user_id, ip_prefix, title, content, created_at')
      .single()

    if (response.error) {
      response = await supabase
        .from('player_review_posts')
        .insert({
          player_id: playerId,
          player_name: playerName,
          nickname,
          comment_count: 0,
          password_hash: insertPayload.password_hash,
          title,
          content,
          created_at: insertPayload.created_at,
        })
        .select('id, player_id, player_name, nickname, title, content, created_at')
        .single()
    }

    if (response.error || !response.data) {
      return Response.json({ message: '선수 평가를 등록하지 못했습니다.' }, { status: 500 })
    }

    const item = mapPostSummary(
      { ...(response.data as PlayerReviewPostRow), comment_count: 0 },
      user.id,
      user.email,
      new Map([[user.id, 1]]),
      new Map(
        typeof user.user_metadata?.custom_avatar_url === 'string' && user.user_metadata.custom_avatar_url.trim()
          ? [[user.id, user.user_metadata.custom_avatar_url.trim()]]
          : [],
      ),
    )
    if (!item.ipPrefix && ipPrefix) {
      item.ipPrefix = ipPrefix
    }

    await rewardPlayerReviewPostXp(user.id, item.id).catch(() => undefined)
    item.level = (await getUserLevelProfile(user.id).catch(() => null))?.level ?? item.level ?? 1

    return Response.json({ item }, { status: 201 })
  } catch {
    return Response.json({ message: '선수 평가를 등록하지 못했습니다.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authSupabase = await createSupabaseSsrClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return Response.json({ message: '로그인한 사용자만 선수평가를 삭제할 수 있습니다.' }, { status: 401 })
    }

    const body = await request.json()
    const postId = String(body.postId ?? '').trim()

    if (!postId) {
      return Response.json({ message: '삭제할 선수평가를 찾지 못했습니다.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const primaryResponse = await supabase
      .from('player_review_posts')
      .select('id, author_user_id, password_hash')
      .eq('id', postId)
      .single()

    const fallbackResponse = primaryResponse.error
      ? await supabase
          .from('player_review_posts')
          .select('id, password_hash')
          .eq('id', postId)
          .single()
      : null

    const { data: post, error: postError } = fallbackResponse ?? primaryResponse

    if (postError || !post) {
      return Response.json({ message: '선수 평가를 찾을 수 없습니다.' }, { status: 404 })
    }

    if (!canDeleteCommunityPost(post, user.id, user.email)) {
      return Response.json({ message: '내가 작성한 글만 삭제할 수 있습니다.' }, { status: 403 })
    }

    const { error: deleteError } = await supabase.from('player_review_posts').delete().eq('id', postId)

    if (deleteError) {
      return Response.json({ message: '선수 평가를 삭제하지 못했습니다.' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch {
    return Response.json({ message: '선수 평가를 삭제하지 못했습니다.' }, { status: 500 })
  }
}
