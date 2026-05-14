import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseSsrClient } from '@/lib/supabase/ssr'

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createSupabaseSsrClient()
    await supabase.auth.signOut()
  } catch {}
  return NextResponse.json({ ok: true })
}
