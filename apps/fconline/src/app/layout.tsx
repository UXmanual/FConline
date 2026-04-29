import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import Image from 'next/image'
import './globals.css'
import AppChrome from '@/components/layout/AppChrome'
import PwaBootstrap from '@/components/pwa/PwaBootstrap'

const HOME_SPLASH_SESSION_KEY = 'fc_home_splash_seen'
const HOME_SPLASH_VISIBLE_MS = 1000
const HOME_SPLASH_FADE_MS = 420
const HOME_SPLASH_BG_LIGHT = '#f0f3f5'
const HOME_SPLASH_BG_DARK = '#121318'

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
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.ico', '/favicon.png'],
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
        <style>{`
          #startup-splash {
            position: fixed;
            inset: 0;
            z-index: 200;
            display: none;
            align-items: center;
            justify-content: center;
            background: ${HOME_SPLASH_BG_LIGHT};
            opacity: 0;
            pointer-events: none;
            transition: opacity ${HOME_SPLASH_FADE_MS}ms ease-out;
          }

          .startup-splash-logo {
            width: 151px;
            max-width: calc(100vw - 80px);
            height: auto;
            filter: invert(1);
          }

          html.app-dark-mode #startup-splash {
            background: ${HOME_SPLASH_BG_DARK};
          }

          html.app-dark-mode .startup-splash-logo {
            filter: none;
          }

          #app-shell {
            visibility: hidden;
          }

          html.home-startup-splash-active #startup-splash {
            display: flex;
            opacity: 1;
          }

          html.home-startup-splash-active #app-shell {
            visibility: hidden;
          }

          html.home-startup-splash-fading #startup-splash {
            display: flex;
            opacity: 0;
            transition-duration: ${HOME_SPLASH_FADE_MS}ms;
          }

          html.home-startup-splash-ready #startup-splash,
          html.home-startup-splash-hidden #startup-splash {
            display: none;
            opacity: 0;
          }

          html.home-startup-splash-ready #app-shell,
          html.home-startup-splash-fading #app-shell,
          html.home-startup-splash-hidden #app-shell {
            visibility: visible;
          }
        `}</style>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var root=document.documentElement;var isDarkModeEnabled=window.localStorage.getItem('app-dark-mode')==='true';var finalBackgroundColor=isDarkModeEnabled?'#121318':'#f0f3f5';var splashBackgroundColor=isDarkModeEnabled?'${HOME_SPLASH_BG_DARK}':'${HOME_SPLASH_BG_LIGHT}';root.style.backgroundColor=finalBackgroundColor;root.classList.toggle('app-dark-mode',isDarkModeEnabled);var themeColorMeta=document.querySelector('meta[name="theme-color"]');if(themeColorMeta){themeColorMeta.setAttribute('content',finalBackgroundColor);}var isHomePath=window.location.pathname==='/'||window.location.pathname==='/home';var hasSeenHomeSplash=window.sessionStorage.getItem('${HOME_SPLASH_SESSION_KEY}')==='1';if(isHomePath&&!hasSeenHomeSplash){root.style.backgroundColor=splashBackgroundColor;root.classList.add('home-startup-splash-active');window.sessionStorage.setItem('${HOME_SPLASH_SESSION_KEY}','1');window.setTimeout(function(){root.classList.remove('home-startup-splash-active');root.classList.add('home-startup-splash-fading');},${HOME_SPLASH_VISIBLE_MS});window.setTimeout(function(){root.classList.remove('home-startup-splash-fading');root.classList.add('home-startup-splash-hidden');root.style.backgroundColor=finalBackgroundColor;},${HOME_SPLASH_VISIBLE_MS + HOME_SPLASH_FADE_MS});}else{root.classList.add('home-startup-splash-ready');}}catch(_error){var fallbackRoot=document.documentElement;fallbackRoot.style.backgroundColor='${HOME_SPLASH_BG_LIGHT}';fallbackRoot.classList.add('home-startup-splash-ready');}})();`,
          }}
        />
      </head>
      <body className="min-h-full" style={{ backgroundColor: 'var(--app-body-bg)' }}>
        <PwaBootstrap />
        <div id="startup-splash" aria-hidden="true">
          <Image
            src="/logo-dark.svg"
            alt=""
            width={151}
            height={32}
            priority
            className="startup-splash-logo"
          />
        </div>
        <div
          id="app-shell"
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
