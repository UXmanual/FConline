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
  const dates = Array.from({ length: 7 }, (_, i) => offsetKstDate(today, -i))

  const supabase = createSupabaseAdminClient()
  const stats = await Promise.all(dates.map((date) => getDayStats(supabase, date)))

  return Response.json({
    days: dates.map((date, i) => ({
      date,
      label: i === 0 ? '오늘' : i === 1 ? '어제' : '',
      ...stats[i],
    })),
  })
}
