import webpush, { type PushSubscription } from 'web-push'

export type StoredPushSubscription = {
  id?: string
  endpoint: string
  p256dh: string
  auth: string
}

export type PushNotificationPayload = {
  title: string
  body: string
  data?: {
    url?: string
  }
}

export function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  const subject = process.env.VAPID_SUBJECT?.trim()

  if (!publicKey || !privateKey || !subject) {
    throw new Error('Missing VAPID configuration.')
  }

  return { publicKey, privateKey, subject }
}

export function configureWebPush() {
  const { publicKey, privateKey, subject } = getVapidConfig()

  webpush.setVapidDetails(subject, publicKey, privateKey)
}

export function mapStoredSubscriptionToWebPushPayload(subscription: StoredPushSubscription): PushSubscription {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  }
}

export async function sendPushNotificationBatch(
  subscriptions: StoredPushSubscription[],
  payload: PushNotificationPayload,
) {
  const failedEndpointIds: string[] = []
  const serializedPayload = JSON.stringify(payload)

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(mapStoredSubscriptionToWebPushPayload(subscription), serializedPayload)
    } catch (error) {
      const statusCode =
        typeof error === 'object' && error !== null && 'statusCode' in error
          ? Number((error as { statusCode?: number }).statusCode)
          : null

      if ((statusCode === 404 || statusCode === 410) && subscription.id) {
        failedEndpointIds.push(subscription.id)
        continue
      }

      throw error
    }
  }

  return {
    sent: subscriptions.length - failedEndpointIds.length,
    failedEndpointIds,
  }
}
