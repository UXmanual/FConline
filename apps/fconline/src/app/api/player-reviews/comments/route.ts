import { NextRequest } from 'next/server'
import {
  deriveCommunityNickname,
  formatRelativeTime,
  getIpPrefixFromHeader,
  getKoreaTimestampString,
  isCommunityAdminEmail,
  type CommunityCommentItem,
} from '@/lib/community'
import { canDeleteCommunityPost, hashPassword } from '@/lib/communityAuth'
import { hasSupabaseAuthCookie } from '@/lib/supabase/authCookie'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { createSupabaseSsrClient } from '@/lib/supabase/ssr'
import { getUserLevelMap, getUserLevelProfile, rewardPlayerReviewCommentXp } from '@/lib/userLevel.server'
import { getAvatarUrlMap } from '@/lib/userAvatar.server'

type PlayerReviewCommentRow = {
  id: string
  review_post_id: string
  nickname: string
  author_user_id?: string | null
  password_hash?: string | null
  ip_prefix?: string | null
  content: string
  created_at: string
}

function mapComment(
  comment: PlayerReviewCommentRow,
  currentUserId?: string | null,
  currentUserEmail?: string | null,
  levelMap?: Map<string, number>,
  avatarUrlMap?: Map<string, string>,
): CommunityCommentItem {
  return {
    id: comment.id,
    postId: comment.review_post_id,
    nickname: comment.nickname,
    level:
      typeof comment.author_user_id === 'string' && comment.author_user_id.trim().length > 0
        ? (levelMap?.get(comment.author_user_id) ?? 1)
        : null,
    avatarUrl:
      typeof comment.author_user_id === 'string' && comment.author_user_id.trim().length > 0
        ? (avatarUrlMap?.get(comment.author_user_id) ?? null)
        : null,
    authorId: comment.author_user_id ?? null,
    ipPrefix: comment.ip_prefix ?? null,
    content: comment.content,
    createdAt: comment.created_at,
    createdAtLabel: formatRelativeTime(comment.created_at),
    canDelete: canDeleteCommunityPost(comment, currentUserId, currentUserEmail),
  }
}

function isMissingSupabaseConfigError(error: unknown) {
  return error instanceof Error && error.message.includes('Missing Supabase environment variable')
}

async function fetchPlayerReviewComments(postId: string) {
  const supabase = createSupabaseAdminClient()

  const attempts = [
    'id, review_post_id, nickname, author_user_id, password_hash, ip_prefix, content, created_at',
    'id, review_post_id, nickname, author_user_id, ip_prefix, content, created_at',
    'id, review_post_id, nickname, author_user_id, content, created_at',
    'id, review_post_id, nickname, password_hash, content, created_at',
    'id, review_post_id, nickname, content, created_at',
  ]

  for (const selectFields of attempts) {
    const response = await supabase
      .from('player_review_comments')
      .select(selectFields)
      .eq('review_post_id', postId)
      .order('created_at', { ascending: false })

    if (!response.error) {
      return response
    }
  }

  return supabase
    .from('player_review_comments')
    .select('id')
    .eq('review_post_id', postId)
    .order('created_at', { ascending: false })
}

async function syncPlayerReviewPostCommentCount(postId: string) {
  const supabase = createSupabaseAdminClient()
  const { count } = await supabase
    .from('player_review_comments')
    .select('id', { count: 'exact', head: true })
    .eq('review_post_id', postId)

  await supabase
    .from('player_review_posts')
    .update({ comment_count: count ?? 0 })
    .eq('id', postId)
}

export async function GET(request: NextRequest) {
  try {
    const postId = request.nextUrl.searchParams.get('postId')?.trim() ?? ''

    if (!postId) {
      return Response.json({ message: 'postId가 필요합니다.' }, { status: 400 })
    }

    const userPromise = hasSupabaseAuthCookie(request)
      ? createSupabaseSsrClient().then((authSupabase) => authSupabase.auth.getUser())
      : Promise.resolve({ data: { user: null } })
    const commentsPromise = fetchPlayerReviewComments(postId)
    const [{ data: { user } }, { data, error }] = await Promise.all([userPromise, commentsPromise])

    if (error) {
      return Response.json({ message: '선수 평가 댓글을 불러오지 못했습니다.' }, { status: 500 })
    }

    const typedComments = (data ?? []) as PlayerReviewCommentRow[]
    const [levelMap, avatarUrlMap] = await Promise.all([
      getUserLevelMap(typedComments.map((comment) => comment.author_user_id)),
      getAvatarUrlMap(typedComments.map((comment) => comment.author_user_id)),
    ])

    return Response.json({
      items: typedComments.map((comment) => mapComment(comment, user?.id, user?.email, levelMap, avatarUrlMap)),
    })
  } catch (error) {
    if (process.env.NODE_ENV === 'development' && isMissingSupabaseConfigError(error)) {
      return Response.json({ items: [] })
    }

    return Response.json({ message: '선수 평가 댓글을 불러오지 못했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createSupabaseSsrClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return Response.json({ message: '로그인한 사용자만 선수평가 댓글을 작성할 수 있습니다.' }, { status: 401 })
    }

    const body = await request.json()
    const postId = String(body.postId ?? '').trim()
    const content = String(body.content ?? '').trim()
    const nickname = deriveCommunityNickname(user)
    const ipPrefix =
      getIpPrefixFromHeader(request.headers.get('x-forwarded-for')) ??
      getIpPrefixFromHeader(request.headers.get('x-real-ip')) ??
      getIpPrefixFromHeader(request.headers.get('cf-connecting-ip'))

    if (!postId || !content) {
      return Response.json({ message: '선수 평가 댓글 내용을 입력해 주세요.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const createdAt = getKoreaTimestampString()
    const passwordHash = hashPassword(user.id)

    const insertAttempts = [
      {
        review_post_id: postId,
        nickname,
        author_user_id: user.id,
        password_hash: passwordHash,
        ip_prefix: ipPrefix,
        content,
        created_at: createdAt,
      },
      {
        review_post_id: postId,
        nickname,
        author_user_id: user.id,
        ip_prefix: ipPrefix,
        content,
        created_at: createdAt,
      },
      {
        review_post_id: postId,
        nickname,
        author_user_id: user.id,
        content,
        created_at: createdAt,
      },
      {
        review_post_id: postId,
        nickname,
        password_hash: passwordHash,
        content,
        created_at: createdAt,
      },
      {
        review_post_id: postId,
        nickname,
        content,
        created_at: createdAt,
      },
    ]

    const selectAttempts = [
      'id, review_post_id, nickname, author_user_id, password_hash, ip_prefix, content, created_at',
      'id, review_post_id, nickname, author_user_id, ip_prefix, content, created_at',
      'id, review_post_id, nickname, author_user_id, content, created_at',
      'id, review_post_id, nickname, password_hash, content, created_at',
      'id, review_post_id, nickname, content, created_at',
    ]

    let response: { data: PlayerReviewCommentRow | null; error: unknown } | null = null

    for (let index = 0; index < insertAttempts.length; index += 1) {
      response = await supabase
        .from('player_review_comments')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(insertAttempts[index] as any)
        .select(selectAttempts[index])
        .single()

      if (!response.error) {
        break
      }
    }

    if (!response || response.error || !response.data) {
      return Response.json({ message: '선수 평가 댓글을 등록하지 못했습니다.' }, { status: 500 })
    }

    await syncPlayerReviewPostCommentCount(postId)

    const item = mapComment(
      response.data as PlayerReviewCommentRow,
      user.id,
      user.email,
      new Map([[user.id, 1]]),
      await getAvatarUrlMap([user.id]),
    )
    if (!item.ipPrefix && ipPrefix) {
      item.ipPrefix = ipPrefix
    }

    await rewardPlayerReviewCommentXp(user.id, item.id, postId, content).catch(() => undefined)
    item.level = (await getUserLevelProfile(user.id).catch(() => null))?.level ?? item.level ?? 1

    return Response.json({ item }, { status: 201 })
  } catch {
    return Response.json({ message: '선수 평가 댓글을 등록하지 못했습니다.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authSupabase = await createSupabaseSsrClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return Response.json({ message: '로그인한 사용자만 선수평가 댓글을 삭제할 수 있습니다.' }, { status: 401 })
    }

    const body = await request.json()
    const commentId = String(body.commentId ?? '').trim()

    if (!commentId) {
      return Response.json({ message: '삭제할 댓글을 찾지 못했습니다.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const selectAttempts = [
      'id, review_post_id, author_user_id, password_hash',
      'id, review_post_id, author_user_id',
      'id, review_post_id, password_hash',
      'id, review_post_id',
    ]

    let comment: Record<string, unknown> | null = null
    let commentError: unknown = null

    for (const selectFields of selectAttempts) {
      const response = await supabase
        .from('player_review_comments')
        .select(selectFields)
        .eq('id', commentId)
      .single()

      if (!response.error) {
        comment = (response.data ?? null) as unknown as Record<string, unknown> | null
        commentError = null
        break
      }

      commentError = response.error
    }

    if (commentError || !comment) {
      return Response.json({ message: '선수 평가 댓글을 찾을 수 없습니다.' }, { status: 404 })
    }

    const ownershipTarget = {
      author_user_id:
        typeof comment.author_user_id === 'string' || comment.author_user_id === null
          ? comment.author_user_id
          : undefined,
      password_hash:
        typeof comment.password_hash === 'string' || comment.password_hash === null
          ? comment.password_hash
          : undefined,
    }

    if (isCommunityAdminEmail(user.email)) {
      const targetPostId =
        typeof comment.review_post_id === 'string' && comment.review_post_id.trim().length > 0
          ? comment.review_post_id
          : null

      const { error: deleteError } = await supabase.from('player_review_comments').delete().eq('id', commentId)

      if (deleteError) {
        return Response.json({ message: '??? ??? ??????????? ????????' }, { status: 500 })
      }

      if (targetPostId) {
        await syncPlayerReviewPostCommentCount(targetPostId)
      }

      return Response.json({ success: true })
    }

    if (!ownershipTarget.author_user_id && !ownershipTarget.password_hash) {
      return Response.json({ message: '내가 작성한 댓글만 삭제할 수 있습니다.' }, { status: 403 })
    }

    if (!canDeleteCommunityPost(ownershipTarget, user.id, user.email)) {
      return Response.json({ message: '내가 작성한 댓글만 삭제할 수 있습니다.' }, { status: 403 })
    }

    const targetPostId =
      typeof comment.review_post_id === 'string' && comment.review_post_id.trim().length > 0
        ? comment.review_post_id
        : null

    const { error: deleteError } = await supabase.from('player_review_comments').delete().eq('id', commentId)

    if (deleteError) {
      return Response.json({ message: '선수 평가 댓글을 삭제하지 못했습니다.' }, { status: 500 })
    }

    if (targetPostId) {
      await syncPlayerReviewPostCommentCount(targetPostId)
    }

    return Response.json({ success: true })
  } catch {
    return Response.json({ message: '선수 평가 댓글을 삭제하지 못했습니다.' }, { status: 500 })
  }
}
