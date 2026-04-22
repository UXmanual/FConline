'use client'

import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  HomeIcon,
  PlayerIcon,
  AnalysisIcon,
  CommunityIcon,
  MypageIcon,
} from '@/components/icons/NavIcons'

const RESET_KEY = 'player-search-reset'
const PRESERVE_KEY = 'player-search-preserve'

const navItems = [
  { href: '/home', icon: HomeIcon, label: '\uD648' },
  { href: '/players', icon: PlayerIcon, label: '\uC120\uC218' },
  { href: '/matches', icon: AnalysisIcon, label: '\uBD84\uC11D' },
  { href: '/community', icon: CommunityIcon, label: '\uCEE4\uBBA4\uB2C8\uD2F0' },
  { href: '/mypage', icon: MypageIcon, label: '\uB9C8\uC774' },
]

type Props = {
  isStandaloneDisplayMode?: boolean
}

export default function BottomNav({ isStandaloneDisplayMode = false }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const pwaBottomCompensation = isStandaloneDisplayMode ? 14 : 0

  const navigateToRoot = (href: string) => {
    if (href === '/players') {
      sessionStorage.setItem(RESET_KEY, '1')
      sessionStorage.removeItem(PRESERVE_KEY)
    }

    if (pathname === href) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (pathname === '/mypage' && href !== '/mypage') {
      sessionStorage.removeItem('mypage-popup-dismissed')
    }

    router.push(href)
  }

  return (
    <>
      <div
        className="h-[70px]"
        style={{ paddingBottom: `calc(env(safe-area-inset-bottom) + ${pwaBottomCompensation}px)` }}
      />

      <div
        aria-hidden="true"
        className="fixed bottom-0 left-1/2 z-40 w-full -translate-x-1/2 sm:max-w-[480px]"
        style={{
          height: `calc(70px + env(safe-area-inset-bottom))`,
          backgroundColor: 'var(--app-nav-shell-bg)',
          transition: 'background-color 180ms ease',
          pointerEvents: 'none',
        }}
      />

      <nav
        className="fixed bottom-0 left-1/2 z-50 w-full -translate-x-1/2 rounded-t-[24px] sm:max-w-[480px]"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          backgroundColor: 'var(--app-nav-bg)',
          borderTop: '1px solid var(--app-nav-border)',
          transition: 'background-color 180ms ease, border-color 180ms ease',
        }}
      >
        <div className="flex h-[70px] items-center justify-around px-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname.startsWith(href)

            return (
              <motion.div
                key={href}
                whileTap={{ scale: 0.86 }}
                transition={{ type: 'spring', stiffness: 340, damping: 17, mass: 0.82 }}
                className="h-full flex-1"
              >
                <button
                  type="button"
                  onClick={() => navigateToRoot(href)}
                  className="flex h-full w-full flex-col items-center justify-center gap-2"
                >
                  <Icon
                    size={22}
                    className={
                      isActive
                        ? 'text-[var(--app-nav-active)]'
                        : 'text-[var(--app-nav-icon)]'
                    }
                  />
                  <span
                    className={`text-[11px] font-semibold leading-none ${
                      isActive
                        ? 'text-[var(--app-nav-active)]'
                        : 'text-[var(--app-nav-label)]'
                    }`}
                  >
                    {label}
                  </span>
                </button>
              </motion.div>
            )
          })}
        </div>
      </nav>
    </>
  )
}
