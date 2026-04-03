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
      <body className="min-h-full bg-white">
        <div className="relative mx-auto min-h-screen w-full bg-[#f0f3f5] pt-[env(safe-area-inset-top)] sm:max-w-[480px]">
          <main className="px-5 pb-6">{children}</main>
          <div className="px-5 pb-0.5 text-left text-[11px] leading-5 text-[#b5bec8]">
            게임 배너, 이미지, 일부 정보의 저작권은 NEXON Korea Corporation에 있습니다.
          </div>
          <footer className="px-5 pb-4 text-left text-xs font-medium tracking-[0.02em] text-[#b5bec8]">
            {'\u00A9uxdmanual'}
          </footer>
          <BottomNav />
        </div>
      </body>
    </html>
  )
}
