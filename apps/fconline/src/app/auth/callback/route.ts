import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseSsrClient } from '@/lib/supabase/ssr'
import { rewardLoginXp } from '@/lib/userLevel.server'

function getSafeRedirect(request: NextRequest) {
  const nextPath = request.nextUrl.searchParams.get('next')

  if (!nextPath || !nextPath.startsWith('/')) {
    return '/mypage'
  }

  return nextPath
}

function getRequestOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost ?? request.headers.get('host')
  const forwardedProto = request.headers.get('x-forwarded-proto')

  if (host) {
    const protocol =
      forwardedProto ??
      (host.startsWith('localhost') || host.startsWith('127.') || /^\d+\.\d+\.\d+\.\d+/.test(host)
        ? 'http'
        : 'https')

    return `${protocol}://${host}`
  }

  return request.nextUrl.origin
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const redirectPath = getSafeRedirect(request)
  const redirectUrl = new URL(redirectPath, getRequestOrigin(request))

  if (!code) {
    redirectUrl.searchParams.set('auth', 'error')
    return NextResponse.redirect(redirectUrl)
  }

  try {
    const supabase = await createSupabaseSsrClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      redirectUrl.searchParams.set('auth', 'error')
      return NextResponse.redirect(redirectUrl)
    }

    if (user?.id) {
      await rewardLoginXp(user.id).catch(() => undefined)
    }

    redirectUrl.searchParams.set('auth', 'success')
    return NextResponse.redirect(redirectUrl)
  } catch {
    redirectUrl.searchParams.set('auth', 'error')
    return NextResponse.redirect(redirectUrl)
  }
}
