import { NextRequest } from 'next/server'
import { deriveCommunityNickname } from '@/lib/community'
import { getAuthUserFromRequest } from '@/lib/supabase/getAuthUser'
import { getUserLevelProfile } from '@/lib/userLevel.server'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request)

    if (!user) {
      return Response.json({ message: '로그인 후 이용해 주세요.' }, { status: 401 })
    }

    const levelProfile = await getUserLevelProfile(user.id).catch(() => null)

    return Response.json({
      id: user.id,
      email: user.email ?? '',
      nickname: deriveCommunityNickname(user),
      level: levelProfile?.level ?? 1,
      xp: levelProfile?.xpTotal ?? 0,
      xpForNextLevel: levelProfile?.nextLevelXp ?? null,
      avatarUrl: levelProfile?.avatarUrl ?? null,
    })
  } catch {
    return Response.json({ message: '프로필을 불러오지 못했습니다.' }, { status: 500 })
  }
}
