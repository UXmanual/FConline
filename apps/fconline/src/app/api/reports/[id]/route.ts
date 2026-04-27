import { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

function getPushAdminToken() {
  const token = process.env.PUSH_ADMIN_TOKEN?.trim()
  if (!token) throw new Error('Missing admin token.')
  return token
}

const TARGET_TABLE: Record<string, string> = {
  community_post: 'community_posts',
  community_comment: 'community_comments',
  player_review_post: 'player_review_posts',
  player_review_comment: 'player_review_comments',
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json().catch(() => null)
    const adminToken = String(body?.adminToken ?? '').trim()
    if (!adminToken || adminToken !== getPushAdminToken()) {
      return Response.json({ message: '권한이 없습니다.' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase
      .from('reports')
      .update({ status: 'resolved' })
      .eq('id', id)

    if (error) throw error

    return Response.json({ success: true })
  } catch {
    return Response.json({ message: '신고를 처리하지 못했습니다.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json().catch(() => null)
    const adminToken = String(body?.adminToken ?? '').trim()
    if (!adminToken || adminToken !== getPushAdminToken()) {
      return Response.json({ message: '권한이 없습니다.' }, { status: 401 })
    }

    const { id } = await params
    const supabase = createSupabaseAdminClient()

    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('target_type, target_id')
      .eq('id', id)
      .single()

    if (fetchError || !report) {
      return Response.json({ message: '신고를 찾을 수 없습니다.' }, { status: 404 })
    }

    const table = TARGET_TABLE[report.target_type]
    if (table) {
      await supabase.from(table).delete().eq('id', report.target_id).then(() => undefined, () => undefined)
    }

    await supabase.from('reports').update({ status: 'resolved' }).eq('id', id)

    return Response.json({ success: true })
  } catch {
    return Response.json({ message: '콘텐츠를 삭제하지 못했습니다.' }, { status: 500 })
  }
}
