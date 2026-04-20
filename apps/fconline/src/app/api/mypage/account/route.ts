import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { createSupabaseSsrClient } from '@/lib/supabase/ssr'

async function detachRowsForUser(userId: string) {
  const supabase = createSupabaseAdminClient()

  await supabase.from('community_posts').update({ author_user_id: null }).eq('author_user_id', userId)
  await supabase.from('community_comments').update({ author_user_id: null }).eq('author_user_id', userId)
  await supabase.from('player_review_posts').update({ author_user_id: null }).eq('author_user_id', userId)
  await supabase.from('player_review_comments').update({ author_user_id: null }).eq('author_user_id', userId)
}

export async function DELETE() {
  try {
    const authSupabase = await createSupabaseSsrClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return Response.json({ message: '로그인 후 이용해 주세요.' }, { status: 401 })
    }

    await detachRowsForUser(user.id)

    const adminSupabase = createSupabaseAdminClient()
    const { error } = await adminSupabase.auth.admin.deleteUser(user.id)

    if (error) {
      throw error
    }

    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : '연동 계정을 삭제하지 못했습니다.'
    return Response.json({ message }, { status: 500 })
  }
}
