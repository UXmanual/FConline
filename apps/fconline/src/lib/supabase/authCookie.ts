import type { NextRequest } from 'next/server'

const SUPABASE_AUTH_COOKIE_PATTERN = /(?:^|;\s*)sb-[^=]+-auth-token(?:\.\d+)?=/

export function hasSupabaseAuthCookie(request: NextRequest) {
  const cookieHeader = request.headers.get('cookie') ?? ''
  return SUPABASE_AUTH_COOKIE_PATTERN.test(cookieHeader)
}
