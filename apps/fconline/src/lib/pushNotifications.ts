import webpush, { type PushSubscription } from 'web-push'

export type ExpoToken = {
  id: string
  token: string
}

export async function sendExpoPushBatch(tokens: ExpoToken[], payload: PushNotificationPayload) {
  const messages = tokens.map((t) => ({
    to: t.token,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    sound: 'default' as const,
  }))

  const chunks: (typeof messages)[] = []
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100))
  }

  const failedTokenIds: string[] = []

  for (const chunk of chunks) {
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk),
      })
      const json = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] }
      const results = json.data ?? []
      results.forEach((r, i) => {
        if (r.status === 'error' && (r.details?.error === 'DeviceNotRegistered' || r.details?.error === 'InvalidCredentials')) {
          const tokenId = tokens[i]?.id
          if (tokenId) failedTokenIds.push(tokenId)
        }
      })
    } catch {}
  }

  return { failedTokenIds, sent: tokens.length - failedTokenIds.length }
}

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
    kind?: string
    notificationId?: string
  }
}

export type PushNotificationBatchTransientFailure = {
  endpoint: string
  subscriptionId?: string
  statusCode: number | null
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
  const transientFailures: PushNotificationBatchTransientFailure[] = []
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

      transientFailures.push({
        endpoint: subscription.endpoint,
        subscriptionId: subscription.id,
        statusCode,
      })
    }
  }

  return {
    sent: subscriptions.length - failedEndpointIds.length - transientFailures.length,
    failedEndpointIds,
    transientFailures,
  }
}
