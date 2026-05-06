import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// 엔드포인트별 제한 설정
const writeLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 글쓰기: 1분에 5회
  prefix: 'rl:write',
})

const commentLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 댓글: 1분에 10회
  prefix: 'rl:comment',
})

const searchLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'), // 검색/조회: 1분에 30회
  prefix: 'rl:search',
})

const contactLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '10 m'), // 문의: 10분에 3회
  prefix: 'rl:contact',
})

function getIp(req: NextRequest) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

function rateLimitedResponse() {
  return NextResponse.json(
    { error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
    { status: 429 },
  )
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const method = req.method
  const ip = getIp(req)

  try {
    // 글쓰기 (POST)
    if (
      method === 'POST' &&
      (pathname === '/api/community/posts' ||
        pathname === '/api/player-reviews/posts')
    ) {
      const { success } = await writeLimiter.limit(ip)
      if (!success) return rateLimitedResponse()
    }

    // 댓글 (POST)
    if (
      method === 'POST' &&
      (pathname === '/api/community/comments' ||
        pathname === '/api/player-reviews/comments')
    ) {
      const { success } = await commentLimiter.limit(ip)
      if (!success) return rateLimitedResponse()
    }

    // 선수/매치 검색 (GET)
    if (
      method === 'GET' &&
      (pathname.startsWith('/api/nexon/players') ||
        pathname.startsWith('/api/nexon/matches'))
    ) {
      const { success } = await searchLimiter.limit(ip)
      if (!success) return rateLimitedResponse()
    }

    // 문의하기
    if (method === 'POST' && pathname === '/api/contact') {
      const { success } = await contactLimiter.limit(ip)
      if (!success) return rateLimitedResponse()
    }
  } catch {
    // Upstash 연결 오류 시 서비스 중단 없이 통과
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/community/:path*', '/api/player-reviews/:path*', '/api/nexon/:path*', '/api/contact'],
}
