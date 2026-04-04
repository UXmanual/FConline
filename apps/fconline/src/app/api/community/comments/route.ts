import { NextRequest } from 'next/server'
import {
  formatRelativeTime,
  getIpPrefixFromHeader,
  getKoreaTimestampString,
  type CommunityCommentItem,
} from '@/lib/community'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

type CommentRow = {
  id: string
  post_id: string
  nickname: string
  ip_prefix?: string | null
  content: string
  created_at: string
}

function mapComment(comment: CommentRow): CommunityCommentItem {
  return {
    id: comment.id,
    postId: comment.post_id,
    nickname: comment.nickname,
    ipPrefix: comment.ip_prefix ?? null,
    content: comment.content,
    createdAt: comment.created_at,
    createdAtLabel: formatRelativeTime(comment.created_at),
  }
}

export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get('postId')?.trim() ?? ''

  if (!postId) {
    return Response.json({ message: 'postId가 필요합니다.' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('community_comments')
    .select('id, post_id, nickname, ip_prefix, content, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: false })

  if (error) {
    const fallback = await supabase
      .from('community_comments')
      .select('id, post_id, nickname, content, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })

    if (fallback.error) {
      return Response.json({ message: '댓글을 불러오지 못했습니다.' }, { status: 500 })
    }

    return Response.json({ items: ((fallback.data ?? []) as CommentRow[]).map(mapComment) })
  }

  return Response.json({ items: ((data ?? []) as CommentRow[]).map(mapComment) })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const postId = String(body.postId ?? '').trim()
  const content = String(body.content ?? '').trim()
  const nickname = String(body.nickname ?? '익명').trim() || '익명'
  const ipPrefix =
    getIpPrefixFromHeader(request.headers.get('x-forwarded-for')) ??
    getIpPrefixFromHeader(request.headers.get('x-real-ip')) ??
    getIpPrefixFromHeader(request.headers.get('cf-connecting-ip'))

  if (!postId || !content) {
    return Response.json({ message: '댓글 내용을 입력해 주세요.' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient()
  let response = await supabase
    .from('community_comments')
    .insert({
      post_id: postId,
      nickname,
      ip_prefix: ipPrefix,
      content,
      created_at: getKoreaTimestampString(),
    })
    .select('id, post_id, nickname, ip_prefix, content, created_at')
    .single()

  if (response.error) {
    response = await supabase
      .from('community_comments')
      .insert({
        post_id: postId,
        nickname,
        content,
        created_at: getKoreaTimestampString(),
      })
      .select('id, post_id, nickname, content, created_at')
      .single()
  }

  if (response.error || !response.data) {
    return Response.json({ message: '댓글을 저장하지 못했습니다.' }, { status: 500 })
  }

  const item = mapComment(response.data as CommentRow)
  if (!item.ipPrefix && ipPrefix) {
    item.ipPrefix = ipPrefix
  }

  return Response.json({ item }, { status: 201 })
}
