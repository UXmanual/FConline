import { NextRequest } from 'next/server'
import {
  canBypassCommunityNicknamePolicy,
  deriveCommunityNickname,
  normalizeCommunityNickname,
  validateCommunityNickname,
} from '@/lib/community'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { createSupabaseSsrClient } from '@/lib/supabase/ssr'

async function isDuplicateCommunityNickname(targetNickname: string, currentUserId: string) {
  const adminSupabase = createSupabaseAdminClient()
  const normalizedTarget = normalizeCommunityNickname(targetNickname).toLowerCase()
  let page = 1

  while (true) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    })

    if (error) {
      throw error
    }

    const users = data.users ?? []

    const duplicatedUser = users.find((candidate) => {
      if (candidate.id === currentUserId) {
        return false
      }

      return deriveCommunityNickname(candidate).toLowerCase() === normalizedTarget
    })

    if (duplicatedUser) {
      return true
    }

    if (users.length < 1000) {
      return false
    }

    page += 1
  }
}

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
    const nickname = normalizeCommunityNickname(String(body?.nickname ?? ''))
    const validationMessage = validateCommunityNickname(nickname, user.email)

    if (validationMessage) {
      return Response.json({ message: validationMessage }, { status: 400 })
    }

    if (!canBypassCommunityNicknamePolicy(user.email)) {
      const duplicated = await isDuplicateCommunityNickname(nickname, user.id)

      if (duplicated) {
        return Response.json({ message: '이미 사용 중인 닉네임입니다.' }, { status: 409 })
      }
    }

    const adminSupabase = createSupabaseAdminClient()
    const { data, error } = await adminSupabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        community_nickname: nickname,
      },
    })

    if (error) {
      throw error
    }

    return Response.json({
      nickname,
      user: data.user,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '닉네임을 저장하지 못했습니다.'
    return Response.json({ message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const authSupabase = await createSupabaseSsrClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return Response.json({ message: '로그인 후 이용해 주세요.' }, { status: 401 })
    }

    return Response.json({
      nickname: deriveCommunityNickname(user),
      user,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '닉네임을 불러오지 못했습니다.'
    return Response.json({ message }, { status: 500 })
  }
}
