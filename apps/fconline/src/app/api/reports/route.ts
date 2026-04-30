import { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { createSupabaseSsrClient } from '@/lib/supabase/ssr'

const TELEGRAM_API_BASE = 'https://api.telegram.org'

const TARGET_TYPE_LABELS: Record<string, string> = {
  community_post: '커뮤니티 게시글',
  community_comment: '커뮤니티 댓글',
  player_review_post: '선수평가 게시글',
  player_review_comment: '선수평가 댓글',
}

const VALID_TARGET_TYPES = Object.keys(TARGET_TYPE_LABELS)

const DEFAULT_LINK_BY_TYPE: Record<string, string> = {
  community_post: '/community',
  community_comment: '/community',
  player_review_post: '/players',
  player_review_comment: '/players',
}

async function fetchTargetInfo(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  targetType: string,
  targetId: string,
): Promise<{ title: string | null; preview: string; link: string }> {
  const fallbackLink = DEFAULT_LINK_BY_TYPE[targetType] ?? '/community'
  try {
    if (targetType === 'community_post') {
      const { data, error } = await supabase
        .from('community_posts')
        .select('title, nickname')
        .eq('id', targetId)
        .maybeSingle()
      if (error) console.error('[reports] community_post fetch error:', error)
      if (data) return { title: data.title, preview: `작성자: ${data.nickname}\n제목: ${data.title}`, link: `/community?postId=${targetId}` }
    } else if (targetType === 'community_comment') {
      const { data, error } = await supabase
        .from('community_comments')
        .select('content, nickname, post_id')
        .eq('id', targetId)
        .maybeSingle()
      if (error) console.error('[reports] community_comment fetch error:', error)
      if (data) {
        const { data: post } = await supabase
          .from('community_posts')
          .select('title')
          .eq('id', data.post_id)
          .maybeSingle()
        return {
          title: post?.title ?? null,
          preview: `작성자: ${data.nickname}\n댓글: ${data.content}${post ? `\n원글 제목: ${post.title}` : ''}`,
          link: `/community?postId=${data.post_id}&openComments=1`,
        }
      }
    } else if (targetType === 'player_review_post') {
      const { data, error } = await supabase
        .from('player_review_posts')
        .select('title, nickname, player_name, player_id')
        .eq('id', targetId)
        .maybeSingle()
      if (error) console.error('[reports] player_review_post fetch error:', error)
      if (data) {
        return {
          title: `[${data.player_name}] ${data.title}`,
          preview: `작성자: ${data.nickname}\n선수: ${data.player_name}\n제목: ${data.title}`,
          link: data.player_id ? `/players/${data.player_id}?tab=review&postId=${targetId}` : '/players',
        }
      }
    } else if (targetType === 'player_review_comment') {
      const { data, error } = await supabase
        .from('player_review_comments')
        .select('content, nickname, review_post_id')
        .eq('id', targetId)
        .maybeSingle()
      if (error) console.error('[reports] player_review_comment fetch error:', error)
      if (data) {
        const { data: post } = await supabase
          .from('player_review_posts')
          .select('title, player_name, player_id')
          .eq('id', data.review_post_id)
          .maybeSingle()
        return {
          title: post ? `[${post.player_name}] ${post.title}` : null,
          preview: `작성자: ${data.nickname}\n댓글: ${data.content}${post ? `\n원글 제목: [${post.player_name}] ${post.title}` : ''}`,
          link: post?.player_id ? `/players/${post.player_id}?tab=review&postId=${data.review_post_id}&openComments=1` : '/players',
        }
      }
    }
  } catch (error) {
    console.error('[reports] fetchTargetInfo unexpected error:', error)
  }
  return { title: null, preview: `ID: ${targetId}`, link: fallbackLink }
}

function getPushAdminToken() {
  const token = process.env.PUSH_ADMIN_TOKEN?.trim()
  if (!token) throw new Error('Missing admin token.')
  return token
}

async function sendTelegramAlert(text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim().replace(/^"|"$/g, '')
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim().replace(/^"|"$/g, '')
  if (!botToken || !chatId) return

  await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
    cache: 'no-store',
  }).catch(() => undefined)
}

export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createSupabaseSsrClient()
    const { data: { user } } = await authSupabase.auth.getUser()

    if (!user) {
      return Response.json({ message: '로그인 후 이용해 주세요.' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const targetType = String(body?.targetType ?? '').trim()
    const targetId = String(body?.targetId ?? '').trim()
    const reason = String(body?.reason ?? '').trim()

    if (!VALID_TARGET_TYPES.includes(targetType) || !targetId || !reason) {
      return Response.json({ message: '입력값을 다시 확인해 주세요.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
    })

    if (error) {
      if (error.code === '23505') {
        return Response.json({ message: '이미 신고한 게시물입니다.' }, { status: 409 })
      }
      throw error
    }

    const typeLabel = TARGET_TYPE_LABELS[targetType] ?? targetType
    const createdAt = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    const { preview } = await fetchTargetInfo(supabase, targetType, targetId)
    await sendTelegramAlert(
      `[FConline Ground 신고]\n유형: ${typeLabel}\n${preview}\n사유: ${reason}\n시간: ${createdAt}`,
    )

    return Response.json({ success: true }, { status: 201 })
  } catch {
    return Response.json({ message: '신고를 접수하지 못했습니다.' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.nextUrl.searchParams.get('token')?.trim()
    if (!adminToken || adminToken !== getPushAdminToken()) {
      return Response.json({ message: '권한이 없습니다.' }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('reports')
      .select('id, target_type, target_id, reason, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    const items = await Promise.all(
      (data ?? []).map(async (report) => {
        const { preview, link } = await fetchTargetInfo(supabase, report.target_type, report.target_id)
        return { ...report, preview, link }
      }),
    )

    return Response.json({ items })
  } catch {
    return Response.json({ message: '신고 목록을 불러오지 못했습니다.' }, { status: 500 })
  }
}
