import { NextRequest } from 'next/server'
import {
  configureWebPush,
  sendPushNotificationBatch,
  type PushNotificationPayload,
  type StoredPushSubscription,
} from '@/lib/pushNotifications'
import { normalizePushTargetUrl } from '@/lib/appUrl'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

type PushSubscriptionRow = StoredPushSubscription & {
  id: string
}

function normalizeValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function getPushAdminToken() {
  const token = process.env.PUSH_ADMIN_TOKEN?.trim()

  if (!token) {
    throw new Error('Missing push admin token.')
  }

  return token
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const adminToken = normalizeValue(body.adminToken)
    const title = normalizeValue(body.title)
    const bodyText = normalizeValue(body.body)
    const targetUrl = normalizePushTargetUrl(normalizeValue(body.url))

    if (!adminToken || adminToken !== getPushAdminToken()) {
      return Response.json({ message: '운영 공지 발송 권한이 없습니다.' }, { status: 401 })
    }

    if (!title || !bodyText) {
      return Response.json({ message: '제목과 내용을 입력해 주세요.' }, { status: 400 })
    }

    configureWebPush()

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('enabled', true)

    if (error) {
      return Response.json({ message: '푸시 구독 조회에 실패했습니다.' }, { status: 500 })
    }

    const subscriptions = (data ?? []) as PushSubscriptionRow[]

    if (subscriptions.length === 0) {
      return Response.json({ message: '활성화된 푸시 구독이 없습니다.' }, { status: 404 })
    }

    const payload: PushNotificationPayload = {
      title,
      body: bodyText,
      data: {
        url: targetUrl,
      },
    }

    const { failedEndpointIds, sent } = await sendPushNotificationBatch(subscriptions, payload)

    if (failedEndpointIds.length > 0) {
      await supabase.from('push_subscriptions').update({ enabled: false }).in('id', failedEndpointIds)
    }

    return Response.json({ success: true, sent, total: subscriptions.length })
  } catch (error) {
    if (error instanceof Error && error.message === 'Missing push admin token.') {
      return Response.json({ message: '운영 공지 토큰이 설정되지 않았습니다.' }, { status: 500 })
    }

    if (error instanceof Error && error.message === 'Missing VAPID configuration.') {
      return Response.json({ message: '푸시 알림 환경변수가 누락되었습니다.' }, { status: 500 })
    }

    return Response.json({ message: '운영 공지 발송에 실패했습니다.' }, { status: 500 })
  }
}
