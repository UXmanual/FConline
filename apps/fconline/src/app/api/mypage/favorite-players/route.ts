import { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { createSupabaseSsrClient } from '@/lib/supabase/ssr'
import { getSeasonMeta } from '@/lib/nexon'

function getFavoritePlayersErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback
  }

  const message = error.message.toLowerCase()

  if (message.includes('player_favorites') || message.includes('relation') || message.includes('schema cache')) {
    return '선수 즐겨찾기 테이블이 아직 적용되지 않았거나 접근할 수 없습니다.'
  }

  return error.message || fallback
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

    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('player_favorites')
      .select('player_id, player_name, season_name, position, level, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const seasonMeta = await getSeasonMeta().catch(() => [])
    const seasonImgMap = new Map(seasonMeta.map((s) => [s.seasonId, s.seasonImg]))

    const items = (data ?? []).map((item) => ({
      ...item,
      season_img: seasonImgMap.get(Math.floor(item.player_id / 1000000)) ?? null,
    }))

    return Response.json({ items })
  } catch (error) {
    const message = getFavoritePlayersErrorMessage(error, '선수 즐겨찾기를 불러오지 못했습니다.')
    return Response.json({ message }, { status: 500 })
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
    const playerId = Number(body?.playerId)
    const playerName = String(body?.playerName ?? '').trim()
    const seasonName = typeof body?.seasonName === 'string' ? body.seasonName.trim() : null
    const position = typeof body?.position === 'string' ? body.position.trim() : null
    const level = Number.isFinite(Number(body?.level)) ? Number(body.level) : null

    if (!Number.isFinite(playerId) || !playerName) {
      return Response.json({ message: '입력값을 다시 확인해 주세요.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()
    const { data: existing } = await supabase
      .from('player_favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('player_id', playerId)
      .maybeSingle()

    if (existing?.id) {
      const { error: deleteError } = await supabase.from('player_favorites').delete().eq('id', existing.id)

      if (deleteError) {
        throw deleteError
      }

      return Response.json({ favorited: false })
    }

    const { error } = await supabase.from('player_favorites').insert(
      {
        user_id: user.id,
        player_id: playerId,
        player_name: playerName,
        season_name: seasonName,
        position,
        level,
      },
    )

    if (error) {
      throw error
    }

    return Response.json({ favorited: true })
  } catch (error) {
    const message = getFavoritePlayersErrorMessage(error, '선수 즐겨찾기를 저장하지 못했습니다.')
    return Response.json({ message }, { status: 500 })
  }
}
