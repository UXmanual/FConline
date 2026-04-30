import { NextRequest } from 'next/server'
import { getIpPrefixFromHeader } from '@/lib/community'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { createSupabaseSsrClient } from '@/lib/supabase/ssr'
import { hasSupabaseAuthCookie } from '@/lib/supabase/authCookie'

function getIpPrefix(request: NextRequest) {
  return (
    getIpPrefixFromHeader(request.headers.get('x-forwarded-for')) ??
    getIpPrefixFromHeader(request.headers.get('x-real-ip')) ??
    getIpPrefixFromHeader(request.headers.get('cf-connecting-ip'))
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const postId = String(body.postId ?? '').trim()
    const postType = String(body.postType ?? '').trim()

    if (!postId || !['community', 'player_review'].includes(postType)) {
      return Response.json({ message: '입력값을 다시 확인해 주세요.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient()

    const user = hasSupabaseAuthCookie(request)
      ? await createSupabaseSsrClient()
          .then((c) => c.auth.getUser())
          .then((r) => r.data.user)
          .catch(() => null)
      : null

    if (user) {
      const { data: existing } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', postId)
        .eq('post_type', postType)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existing) {
        await supabase.from('post_likes').delete().eq('id', existing.id)
        return Response.json({ liked: false })
      }

      await supabase.from('post_likes').insert({ post_id: postId, post_type: postType, user_id: user.id })
      return Response.json({ liked: true })
    }

    const ipPrefix = getIpPrefix(request)
    if (!ipPrefix) {
      return Response.json({ liked: true })
    }

    const { data: existing } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('post_type', postType)
      .eq('ip_prefix', ipPrefix)
      .is('user_id', null)
      .maybeSingle()

    if (existing) {
      await supabase.from('post_likes').delete().eq('id', existing.id)
      return Response.json({ liked: false })
    }

    await supabase.from('post_likes').insert({ post_id: postId, post_type: postType, ip_prefix: ipPrefix })
    return Response.json({ liked: true })
  } catch {
    return Response.json({ message: '처리하지 못했습니다.' }, { status: 500 })
  }
}
