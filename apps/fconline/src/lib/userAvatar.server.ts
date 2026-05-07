import { createSupabaseAdminClient } from '@/lib/supabase/server'

type AvatarRow = { user_id: string; avatar_url: string | null }

export async function getAvatarUrlMap(userIds: Array<string | null | undefined>) {
  const ids = [
    ...new Set(
      userIds.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      ),
    ),
  ]

  if (ids.length === 0) {
    return new Map<string, string>()
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('user_level_profiles')
    .select('user_id, avatar_url')
    .in('user_id', ids)

  if (error) {
    return new Map<string, string>()
  }

  const map = new Map<string, string>()
  for (const row of (data ?? []) as AvatarRow[]) {
    if (row.user_id && typeof row.avatar_url === 'string' && row.avatar_url.trim()) {
      map.set(row.user_id, row.avatar_url.trim())
    }
  }
  return map
}
