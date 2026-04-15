import { NextRequest } from 'next/server'
import {
  formatRelativeTime,
  getKoreaTimestampString,
  getIpPrefixFromHeader,
  hashPassword,
  verifyPassword,
  type CommunityPostSummary,
} from '@/lib/community'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 5
const MAX_PAGE_SIZE = 20

type PlayerReviewPostRow = {
  id: string
  player_id: string
  player_name: string
  nickname: string
  ip_prefix?: string | null
  title: string
  content: string
  created_at: string
}

type CommentCountRow = {
  review_post_id: string
}

function mapPostSummary(post: PlayerReviewPostRow, commentCount: number): CommunityPostSummary {
  return {
    id: post.id,
    category: '선수',
    nickname: post.nickname,
    ipPrefix: post.ip_prefix ?? null,
    title: post.title,
    content: post.content,
    createdAt: post.created_at,
    createdAtLabel: formatRelativeTime(post.created_at),
    commentCount,
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
) {
  const selectFields = includeIpPrefix
    ? 'id, player_id, player_name, nickname, ip_prefix, title, content, created_at'
    : 'id, player_id, player_name, nickname, title, content, created_at'

  const response = await supabase
    .from('player_review_posts')
    .select(selectFields, { count: 'exact' })
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (!response.error || !includeIpPrefix) {
    return response
  }

  return fetchPostsPage(supabase, playerId, from, to, false)
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

async function fetchCommentCounts(supabase: SupabaseClient, postIds: string[]) {
  if (postIds.length === 0) {
    return new Map<string, number>()
  }

  const { data, error } = await supabase
    .from('player_review_comments')
    .select('review_post_id')
    .in('review_post_id', postIds)

  if (error) {
    return new Map<string, number>()
  }

  const countMap = new Map<string, number>()
  for (const row of (data ?? []) as CommentCountRow[]) {
    countMap.set(row.review_post_id, (countMap.get(row.review_post_id) ?? 0) + 1)
  }

  return countMap
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
    const resolvedPage =
      (await resolvePageForPost(supabase, playerId, postId, pageSize)) ?? requestedPage
    const from = (resolvedPage - 1) * pageSize
    const to = resolvedPage * pageSize - 1
    const { data: posts, error: postsError, count } = await fetchPostsPage(supabase, playerId, from, to)

    if (postsError) {
      return Response.json({ message: '선수 평가를 불러오지 못했습니다.' }, { status: 500 })
    }

    const typedPosts = (posts ?? []) as unknown as PlayerReviewPostRow[]
    const commentCountMap = await fetchCommentCounts(
      supabase,
      typedPosts.map((post) => post.id),
    )

    const items = typedPosts.map((post) => mapPostSummary(post, commentCountMap.get(post.id) ?? 0))

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
    const body = await request.json()
    const ipPrefix =
      getIpPrefixFromHeader(request.headers.get('x-forwarded-for')) ??
      getIpPrefixFromHeader(request.headers.get('x-real-ip')) ??
      getIpPrefixFromHeader(request.headers.get('cf-connecting-ip'))
    const playerId = String(body.playerId ?? '').trim()
    const playerName = String(body.playerName ?? '').trim()
    const nickname = String(body.nickname ?? '').trim()
    const password = String(body.password ?? '').trim()
    const title = String(body.title ?? '').trim()
    const content = String(body.content ?? '').trim()

    if (!playerId || !playerName || !nickname || !password || !title || !content) {
      return Response.json({ message: '입력값을 다시 확인해 주세요.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const insertPayload = {
      player_id: playerId,
      player_name: playerName,
      nickname,
      password_hash: hashPassword(password),
      title,
      content,
      created_at: getKoreaTimestampString(),
      ip_prefix: ipPrefix,
    }

    let response = await supabase
      .from('player_review_posts')
      .insert(insertPayload)
      .select('id, player_id, player_name, nickname, ip_prefix, title, content, created_at')
      .single()

    if (response.error) {
      response = await supabase
        .from('player_review_posts')
        .insert({
          player_id: playerId,
          player_name: playerName,
          nickname,
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

    const item = mapPostSummary(response.data as PlayerReviewPostRow, 0)
    if (!item.ipPrefix && ipPrefix) {
      item.ipPrefix = ipPrefix
    }

    return Response.json({ item }, { status: 201 })
  } catch {
    return Response.json({ message: '선수 평가를 등록하지 못했습니다.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const postId = String(body.postId ?? '').trim()
    const password = String(body.password ?? '').trim()

    if (!postId || !password) {
      return Response.json({ message: '비밀번호를 입력해 주세요.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data: post, error: postError } = await supabase
      .from('player_review_posts')
      .select('id, password_hash')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return Response.json({ message: '선수 평가를 찾을 수 없습니다.' }, { status: 404 })
    }

    if (!verifyPassword(password, String(post.password_hash))) {
      return Response.json({ message: '비밀번호가 일치하지 않습니다.' }, { status: 403 })
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
