export const OFFICIAL_APP_HOST = 'fconlineground.com'
export const OFFICIAL_APP_ORIGIN = `https://${OFFICIAL_APP_HOST}`

export function isOfficialAppHost(hostname: string) {
  return hostname.trim().toLowerCase() === OFFICIAL_APP_HOST
}

export function normalizePushTargetUrl(targetUrl: string) {
  const fallbackUrl = new URL('/home', OFFICIAL_APP_ORIGIN)
  const trimmedTargetUrl = targetUrl.trim()

  if (!trimmedTargetUrl) {
    return fallbackUrl.toString()
  }

  try {
    const normalizedUrl = new URL(trimmedTargetUrl, OFFICIAL_APP_ORIGIN)

    if (normalizedUrl.hostname.endsWith('.vercel.app')) {
      return new URL(
        `${normalizedUrl.pathname}${normalizedUrl.search}${normalizedUrl.hash}`,
        OFFICIAL_APP_ORIGIN,
      ).toString()
    }

    return normalizedUrl.toString()
  } catch {
    return fallbackUrl.toString()
  }
}
