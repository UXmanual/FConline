import { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { createSupabaseSsrClient } from '@/lib/supabase/ssr'

export async function GET() {
  try {
    const authSupabase = await createSupabaseSsrClient()
    const { data: { user } } = await authSupabase.auth.getUser()

    if (!user) {
      return Response.json({ message: '로그인 후 이용해 주세요.' }, { status: 401 })
    }

    const gameClubName = String(user.user_metadata?.game_club_name ?? '').trim()
    return Response.json({ gameClubName })
  } catch (error) {
    const message = error instanceof Error ? error.message : '게임 구단주명을 불러오지 못했습니다.'
    return Response.json({ message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createSupabaseSsrClient()
    const { data: { user } } = await authSupabase.auth.getUser()

    if (!user) {
      return Response.json({ message: '로그인 후 이용해 주세요.' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const gameClubName = String(body?.gameClubName ?? '').trim()

    if (!gameClubName) {
      return Response.json({ message: '게임 구단주명을 입력해주세요.' }, { status: 400 })
    }

    if (gameClubName.length > 20) {
      return Response.json({ message: '게임 구단주명은 20자 이하로 입력해주세요.' }, { status: 400 })
    }

    const adminSupabase = createSupabaseAdminClient()
    const { error } = await adminSupabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        game_club_name: gameClubName,
      },
    })

    if (error) throw error

    return Response.json({ gameClubName })
  } catch (error) {
    const message = error instanceof Error ? error.message : '게임 구단주명을 저장하지 못했습니다.'
    return Response.json({ message }, { status: 500 })
  }
}
