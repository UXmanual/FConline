import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing Supabase environment variable: ${name}.`)
  }

  return value
}

let browserClient: ReturnType<typeof createSupabaseBrowserClient> | null = null

const STALE_REFRESH_TOKEN_ERROR_MESSAGES = ['Invalid Refresh Token', 'Refresh Token Not Found']

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    requireEnv(supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv(supabaseAnonKey, 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  )
}

function isStaleRefreshTokenError(message: string | undefined) {
  if (!message) {
    return false
  }

  return STALE_REFRESH_TOKEN_ERROR_MESSAGES.some((fragment) => message.includes(fragment))
}

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createSupabaseBrowserClient()
  }

  return browserClient
}

export async function getSupabaseUserSafely(
  supabase: SupabaseClient = getSupabaseBrowserClient(),
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error && isStaleRefreshTokenError(error.message)) {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)

    return {
      user: null,
      recovered: true,
      error: null,
    }
  }

  return {
    user: user ?? null,
    recovered: false,
    error,
  }
}
