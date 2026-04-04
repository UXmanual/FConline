import { NextRequest } from 'next/server'
import {
  formatRelativeTime,
  getKoreaTimestampString,
  getIpPrefixFromHeader,
  hashPassword,
  isCommunityCategory,
  verifyPassword,
  type CommunityPostSummary,
} from '@/lib/community'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

type PostRow = {
  id: string
  category: string
  nickname: string
  ip_prefix?: string | null
  title: string
  content: string
  created_at: string
}

type CommentCountRow = {
  post_id: string
}

function mapPostSummary(post: PostRow, commentCount: number): CommunityPostSummary {
  return {
    id: post.id,
    category: post.category as CommunityPostSummary['category'],
    nickname: post.nickname,
    ipPrefix: post.ip_prefix ?? null,
    title: post.title,
    content: post.content,
    createdAt: post.created_at,
    createdAtLabel: formatRelativeTime(post.created_at),
    commentCount,
  }
}

async function fetchPosts(supabase: SupabaseClient, includeIpPrefix = true) {
  const selectFields = includeIpPrefix
    ? 'id, category, nickname, ip_prefix, title, content, created_at'
    : 'id, category, nickname, title, content, created_at'

  const response = await supabase.from('community_posts').select(selectFields).order('created_at', { ascending: false })

  if (!response.error || !includeIpPrefix) {
    return response
  }

  return fetchPosts(supabase, false)
}

export async function GET() {
  const supabase = createSupabaseAdminClient()
  const [{ data: posts, error: postsError }, { data: commentRows, error: commentsError }] = await Promise.all([
    fetchPosts(supabase),
    supabase.from('community_comments').select('post_id'),
  ])

  if (postsError || commentsError) {
    return Response.json({ message: '게시글을 불러오지 못했습니다.' }, { status: 500 })
  }

  const commentCountMap = new Map<string, number>()

  for (const row of (commentRows ?? []) as CommentCountRow[]) {
    commentCountMap.set(row.post_id, (commentCountMap.get(row.post_id) ?? 0) + 1)
  }

  const items = ((posts ?? []) as unknown as PostRow[]).map((post) =>
    mapPostSummary(post, commentCountMap.get(post.id) ?? 0),
  )

  return Response.json({ items })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const ipPrefix =
    getIpPrefixFromHeader(request.headers.get('x-forwarded-for')) ??
    getIpPrefixFromHeader(request.headers.get('x-real-ip')) ??
    getIpPrefixFromHeader(request.headers.get('cf-connecting-ip'))
  const category = String(body.category ?? '').trim()
  const nickname = String(body.nickname ?? '').trim()
  const password = String(body.password ?? '').trim()
  const title = String(body.title ?? '').trim()
  const content = String(body.content ?? '').trim()

  if (!isCommunityCategory(category) || !nickname || !password || !title || !content) {
    return Response.json({ message: '입력값을 다시 확인해 주세요.' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const insertPayload = {
    category,
    nickname,
    password_hash: hashPassword(password),
    title,
    content,
    created_at: getKoreaTimestampString(),
    ip_prefix: ipPrefix,
  }
  let response = await supabase
    .from('community_posts')
    .insert(insertPayload)
    .select('id, category, nickname, ip_prefix, title, content, created_at')
    .single()

  if (response.error) {
    response = await supabase
      .from('community_posts')
      .insert({
        category,
        nickname,
        password_hash: insertPayload.password_hash,
        title,
        content,
        created_at: insertPayload.created_at,
      })
      .select('id, category, nickname, title, content, created_at')
      .single()
  }

  if (response.error || !response.data) {
    return Response.json({ message: '게시글을 저장하지 못했습니다.' }, { status: 500 })
  }

  const item = mapPostSummary(response.data as PostRow, 0)
  if (!item.ipPrefix && ipPrefix) {
    item.ipPrefix = ipPrefix
  }

  return Response.json({ item }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const body = await request.json()
  const postId = String(body.postId ?? '').trim()
  const password = String(body.password ?? '').trim()

  if (!postId || !password) {
    return Response.json({ message: '비밀번호를 입력해 주세요.' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const { data: post, error: postError } = await supabase
    .from('community_posts')
    .select('id, password_hash')
    .eq('id', postId)
    .single()

  if (postError || !post) {
    return Response.json({ message: '게시글을 찾을 수 없습니다.' }, { status: 404 })
  }

  if (!verifyPassword(password, String(post.password_hash))) {
    return Response.json({ message: '비밀번호가 일치하지 않습니다.' }, { status: 403 })
  }

  const { error: deleteError } = await supabase.from('community_posts').delete().eq('id', postId)

  if (deleteError) {
    return Response.json({ message: '게시글을 삭제하지 못했습니다.' }, { status: 500 })
  }

  return Response.json({ success: true })
}
