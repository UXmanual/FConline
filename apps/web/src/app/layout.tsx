import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import BottomNav from '@/components/layout/BottomNav'

const pretendard = localFont({
  src: [
    { path: '../../public/fonts/Pretendard-Regular.woff2', weight: '400' },
    { path: '../../public/fonts/Pretendard-Medium.woff2', weight: '500' },
    { path: '../../public/fonts/Pretendard-SemiBold.woff2', weight: '600' },
    { path: '../../public/fonts/Pretendard-Bold.woff2', weight: '700' },
  ],
  variable: '--font-pretendard',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'FC Online',
  description: 'FC Online 선수정보, 경기정보, 커뮤니티',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FC Online',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full bg-zinc-300">
        {/* 모바일 중앙 고정 래퍼 */}
        <div className="relative mx-auto w-full sm:max-w-[480px] min-h-screen bg-white">
          <main className="pt-14 pb-[60px]">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  )
}
