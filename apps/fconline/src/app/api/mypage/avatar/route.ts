import { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { createSupabaseSsrClient } from '@/lib/supabase/ssr'

export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createSupabaseSsrClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return Response.json({ message: '로그인 후 이용해 주세요.' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const avatarUrl = String(body?.avatarUrl ?? '').trim()

    if (!avatarUrl) {
      return Response.json({ message: '유효하지 않은 URL입니다.' }, { status: 400 })
    }

    const adminSupabase = createSupabaseAdminClient()
    const { error } = await adminSupabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        custom_avatar_url: avatarUrl,
      },
    })

    if (error) throw error

    return Response.json({ avatarUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : '프로필 사진을 저장하지 못했습니다.'
    return Response.json({ message }, { status: 500 })
  }
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

    const adminSupabase = createSupabaseAdminClient()
    const { error } = await adminSupabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        custom_avatar_url: null,
      },
    })

    if (error) throw error

    return Response.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : '프로필 사진을 삭제하지 못했습니다.'
    return Response.json({ message }, { status: 500 })
  }
}
