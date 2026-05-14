import { createClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { createSupabaseSsrClient } from './ssr'

export async function getAuthUserFromRequest(request: Request): Promise<User | null> {
  // Bearer token (mobile app)
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: { user } } = await supabase.auth.getUser(token)
    if (user) return user
  }

  // Cookie-based (web)
  const supabase = await createSupabaseSsrClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
}
