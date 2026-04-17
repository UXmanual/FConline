import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/home',
    name: 'FCO Ground',
    short_name: 'FCO Ground',
    description:
      'FC Online 선수 검색, 선수 리뷰, 전적 분석, 메타 정보와 커뮤니티를 한곳에서 빠르게 확인할 수 있는 설치형 웹앱입니다.',
    start_url: '/home',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f0f3f5',
    theme_color: '#f0f3f5',
    categories: ['sports', 'games', 'utilities'],
    lang: 'ko-KR',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
