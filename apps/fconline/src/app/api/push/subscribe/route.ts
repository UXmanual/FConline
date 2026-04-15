import { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

function normalizeValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const deviceId = normalizeValue(body.deviceId)
    const endpoint = normalizeValue(body.endpoint)
    const p256dh = normalizeValue(body.p256dh)
    const auth = normalizeValue(body.auth)
    const platform = normalizeValue(body.platform)
    const userAgent = normalizeValue(body.userAgent)

    if (!deviceId || !endpoint || !p256dh || !auth) {
      return Response.json({ message: '필수 구독 정보가 누락되었습니다.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        device_id: deviceId,
        endpoint,
        p256dh,
        auth,
        platform: platform || null,
        user_agent: userAgent || null,
        enabled: true,
      },
      { onConflict: 'endpoint' },
    )

    if (error) {
      return Response.json({ message: '푸시 구독 저장에 실패했습니다.' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch {
    return Response.json({ message: '푸시 구독 저장에 실패했습니다.' }, { status: 500 })
  }
}
