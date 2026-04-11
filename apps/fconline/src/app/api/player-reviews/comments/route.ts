import { NextRequest } from 'next/server'
import {
  formatRelativeTime,
  getIpPrefixFromHeader,
  getKoreaTimestampString,
  type CommunityCommentItem,
} from '@/lib/community'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

type PlayerReviewCommentRow = {
  id: string
  review_post_id: string
  nickname: string
  ip_prefix?: string | null
  content: string
  created_at: string
}

function mapComment(comment: PlayerReviewCommentRow): CommunityCommentItem {
  return {
    id: comment.id,
    postId: comment.review_post_id,
    nickname: comment.nickname,
    ipPrefix: comment.ip_prefix ?? null,
    content: comment.content,
    createdAt: comment.created_at,
    createdAtLabel: formatRelativeTime(comment.created_at),
  }
}

function isMissingSupabaseConfigError(error: unknown) {
  return error instanceof Error && error.message.includes('Missing Supabase environment variable')
}

export async function GET(request: NextRequest) {
  try {
    const postId = request.nextUrl.searchParams.get('postId')?.trim() ?? ''

    if (!postId) {
      return Response.json({ message: 'postId가 필요합니다.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('player_review_comments')
      .select('id, review_post_id, nickname, ip_prefix, content, created_at')
      .eq('review_post_id', postId)
      .order('created_at', { ascending: false })

    if (error) {
      const fallback = await supabase
        .from('player_review_comments')
        .select('id, review_post_id, nickname, content, created_at')
        .eq('review_post_id', postId)
        .order('created_at', { ascending: false })

      if (fallback.error) {
        return Response.json({ message: '선수 평가 댓글을 불러오지 못했습니다.' }, { status: 500 })
      }

      return Response.json({ items: ((fallback.data ?? []) as PlayerReviewCommentRow[]).map(mapComment) })
    }

    return Response.json({ items: ((data ?? []) as PlayerReviewCommentRow[]).map(mapComment) })
  } catch (error) {
    if (process.env.NODE_ENV === 'development' && isMissingSupabaseConfigError(error)) {
      return Response.json({ items: [] })
    }

    return Response.json({ message: '선수 평가 댓글을 불러오지 못했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const postId = String(body.postId ?? '').trim()
    const content = String(body.content ?? '').trim()
    const nickname = String(body.nickname ?? '익명').trim() || '익명'
    const ipPrefix =
      getIpPrefixFromHeader(request.headers.get('x-forwarded-for')) ??
      getIpPrefixFromHeader(request.headers.get('x-real-ip')) ??
      getIpPrefixFromHeader(request.headers.get('cf-connecting-ip'))

    if (!postId || !content) {
      return Response.json({ message: '선수 평가 댓글 내용을 입력해 주세요.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    let response = await supabase
      .from('player_review_comments')
      .insert({
        review_post_id: postId,
        nickname,
        ip_prefix: ipPrefix,
        content,
        created_at: getKoreaTimestampString(),
      })
      .select('id, review_post_id, nickname, ip_prefix, content, created_at')
      .single()

    if (response.error) {
      response = await supabase
        .from('player_review_comments')
        .insert({
          review_post_id: postId,
          nickname,
          content,
          created_at: getKoreaTimestampString(),
        })
        .select('id, review_post_id, nickname, content, created_at')
        .single()
    }

    if (response.error || !response.data) {
      return Response.json({ message: '선수 평가 댓글을 등록하지 못했습니다.' }, { status: 500 })
    }

    const item = mapComment(response.data as PlayerReviewCommentRow)
    if (!item.ipPrefix && ipPrefix) {
      item.ipPrefix = ipPrefix
    }

    return Response.json({ item }, { status: 201 })
  } catch {
    return Response.json({ message: '선수 평가 댓글을 등록하지 못했습니다.' }, { status: 500 })
  }
}
