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

    if (!deviceId && !endpoint) {
      return Response.json({ message: '구독 해제 대상이 없습니다.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    let query = supabase.from('push_subscriptions').update({ enabled: false })

    if (endpoint) {
      query = query.eq('endpoint', endpoint)
    } else {
      query = query.eq('device_id', deviceId)
    }

    const { error } = await query

    if (error) {
      return Response.json({ message: '푸시 구독 해제에 실패했습니다.' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch {
    return Response.json({ message: '푸시 구독 해제에 실패했습니다.' }, { status: 500 })
  }
}
