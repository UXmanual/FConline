import { NextRequest } from 'next/server'
import webpush from 'web-push'
import {
  configureWebPush,
  mapStoredSubscriptionToWebPushPayload,
  type StoredPushSubscription,
} from '@/lib/pushNotifications'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

type PushSubscriptionRow = StoredPushSubscription & {
  id: string
}

function normalizeValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const deviceId = normalizeValue(body.deviceId)

    if (!deviceId) {
      return Response.json({ message: 'deviceId가 필요합니다.' }, { status: 400 })
    }

    configureWebPush()

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('device_id', deviceId)
      .eq('enabled', true)

    if (error) {
      return Response.json({ message: '푸시 구독 조회에 실패했습니다.' }, { status: 500 })
    }

    const subscriptions = (data ?? []) as PushSubscriptionRow[]

    if (subscriptions.length === 0) {
      return Response.json({ message: '활성화된 푸시 구독이 없습니다.' }, { status: 404 })
    }

    const payload = JSON.stringify({
      title: 'FCO Ground 테스트 알림',
      body: '앱 알림 테스트가 정상적으로 도착했습니다.',
      data: {
        url: '/mypage',
      },
    })

    const failedEndpointIds: string[] = []

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(mapStoredSubscriptionToWebPushPayload(subscription), payload)
      } catch (error) {
        const statusCode =
          typeof error === 'object' && error !== null && 'statusCode' in error
            ? Number((error as { statusCode?: number }).statusCode)
            : null

        if (statusCode === 404 || statusCode === 410) {
          failedEndpointIds.push(subscription.id)
          continue
        }

        throw error
      }
    }

    if (failedEndpointIds.length > 0) {
      await supabase.from('push_subscriptions').update({ enabled: false }).in('id', failedEndpointIds)
    }

    return Response.json({ success: true, sent: subscriptions.length - failedEndpointIds.length })
  } catch (error) {
    if (error instanceof Error && error.message === 'Missing VAPID configuration.') {
      return Response.json({ message: '푸시 알림 환경변수가 누락되었습니다.' }, { status: 500 })
    }

    return Response.json({ message: '테스트 알림 발송에 실패했습니다.' }, { status: 500 })
  }
}
