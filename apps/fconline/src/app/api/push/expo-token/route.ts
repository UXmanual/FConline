import { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    const userId = typeof body.userId === 'string' ? body.userId.trim() : null

    if (!token || !token.startsWith('ExponentPushToken[')) {
      return Response.json({ message: '유효하지 않은 토큰입니다.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    await supabase
      .from('expo_push_tokens')
      .upsert({ token, user_id: userId || null, enabled: true }, { onConflict: 'token' })

    return Response.json({ success: true })
  } catch {
    return Response.json({ message: '토큰 등록에 실패했습니다.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const token = typeof body.token === 'string' ? body.token.trim() : ''

    if (!token) {
      return Response.json({ message: '토큰이 없습니다.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    await supabase.from('expo_push_tokens').update({ enabled: false }).eq('token', token)

    return Response.json({ success: true })
  } catch {
    return Response.json({ message: '토큰 해제에 실패했습니다.' }, { status: 500 })
  }
}
