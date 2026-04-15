import webpush, { type PushSubscription } from 'web-push'

export type StoredPushSubscription = {
  endpoint: string
  p256dh: string
  auth: string
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
