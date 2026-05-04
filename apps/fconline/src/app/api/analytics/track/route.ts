import { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getKoreaTimestampString } from '@/lib/community'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const path = typeof body?.path === 'string' ? body.path.slice(0, 500) : '/'
  const visitorId = typeof body?.visitorId === 'string' ? body.visitorId.slice(0, 100) : null
  const kstDate = getKoreaTimestampString().slice(0, 10)

  const supabase = createSupabaseAdminClient()
  await supabase.from('page_views').insert({ path, kst_date: kstDate, visitor_id: visitorId })

  return new Response(null, { status: 204 })
}
