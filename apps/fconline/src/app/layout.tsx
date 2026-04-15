import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import AppChrome from '@/components/layout/AppChrome'
import PwaBootstrap from '@/components/pwa/PwaBootstrap'

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

const metadataBase = (() => {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL

  if (!siteUrl) {
    return new URL('http://localhost:4000')
  }

  const normalizedUrl = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`
  return new URL(normalizedUrl)
})()

const siteTitle = 'FCO Ground'
const siteName = 'FCO Ground'
const siteDescription =
  'FCO Ground는 FC온라인 정보, 선수검색, 볼타 전적검색, 피드백, 내 닉네임 기록 보기, 커뮤니티를 한곳에서 확인할 수 있는 서비스입니다.'

export const metadata: Metadata = {
  metadataBase,
  title: siteTitle,
  applicationName: siteName,
  description: siteDescription,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico'],
  },
  openGraph: {
    title: siteTitle,
    siteName,
    locale: 'ko_KR',
    type: 'website',
    description: siteDescription,
    images: [{ url: '/og-image.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: ['/og-image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: siteTitle,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#f0f3f5" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var isDarkModeEnabled=window.localStorage.getItem('app-dark-mode')==='true';document.documentElement.classList.toggle('app-dark-mode',isDarkModeEnabled);var themeColorMeta=document.querySelector('meta[name="theme-color"]');if(themeColorMeta){themeColorMeta.setAttribute('content',isDarkModeEnabled?'#121318':'#f0f3f5');}}catch(_error){}})();`,
          }}
        />
      </head>
      <body className="min-h-full" style={{ backgroundColor: 'var(--app-body-bg)' }}>
        <PwaBootstrap />
        <div
          className="relative mx-auto min-h-[100dvh] w-full pt-[env(safe-area-inset-top)] sm:max-w-[480px]"
          style={{
            backgroundColor: 'var(--app-shell-bg)',
            transition: 'background-color 180ms ease',
          }}
        >
          <main
            className="px-5 pb-6"
            style={{
              backgroundColor: 'var(--app-page-bg)',
              transition: 'background-color 180ms ease',
            }}
          >
            {children}
          </main>
          <AppChrome />
        </div>
      </body>
    </html>
  )
}
