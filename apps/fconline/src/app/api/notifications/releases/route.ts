import { NextResponse } from 'next/server'
import { RELEASE_NOTES_BY_VERSION, RELEASE_PUBLISHED_AT_BY_VERSION } from '@/lib/appVersion'

export const dynamic = 'force-static'
export const revalidate = 3600

export async function GET() {
  return NextResponse.json({
    publishedAt: RELEASE_PUBLISHED_AT_BY_VERSION,
    notes: RELEASE_NOTES_BY_VERSION,
  })
}
