import { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getKoreaTimestampString } from '@/lib/community'

function getAdminToken() {
  const token = process.env.PUSH_ADMIN_TOKEN?.trim()
  if (!token) throw new Error('Missing admin token.')
  return token
}

function offsetKstDate(base: string, days: number) {
  const [y, m, d] = base.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return getKoreaTimestampString(date).slice(0, 10)
}

async function getDayStats(supabase: ReturnType<typeof createSupabaseAdminClient>, kstDate: string) {
  const [viewsResult, visitorsResult] = await Promise.all([
    supabase.from('page_views').select('*', { count: 'exact', head: true }).eq('kst_date', kstDate),
    supabase.from('page_views').select('visitor_id').eq('kst_date', kstDate).not('visitor_id', 'is', null),
  ])

  const uniqueVisitors = new Set(
    (visitorsResult.data ?? []).map((row: { visitor_id: string }) => row.visitor_id)
  ).size

  return {
    views: viewsResult.count ?? 0,
    visitors: uniqueVisitors,
  }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')?.trim()

  try {
    if (token !== getAdminToken()) {
      return Response.json({ message: '인증에 실패했습니다.' }, { status: 401 })
    }
  } catch {
    return Response.json({ message: '서버 설정 오류입니다.' }, { status: 500 })
  }

  const today = getKoreaTimestampString().slice(0, 10)
  const yesterday = offsetKstDate(today, -1)
  const twoDaysAgo = offsetKstDate(today, -2)

  const supabase = createSupabaseAdminClient()

  const [s0, s1, s2] = await Promise.all([
    getDayStats(supabase, today),
    getDayStats(supabase, yesterday),
    getDayStats(supabase, twoDaysAgo),
  ])

  return Response.json({
    days: [
      { date: today, label: '오늘', ...s0 },
      { date: yesterday, label: '어제', ...s1 },
      { date: twoDaysAgo, label: '그저께', ...s2 },
    ],
  })
}
