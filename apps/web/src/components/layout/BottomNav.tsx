'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  { href: '/home', icon: HomeIcon, label: '홈' },
  { href: '/players', icon: PlayerIcon, label: '선수' },
  { href: '/matches', icon: AnalysisIcon, label: '경기' },
  { href: '/community', icon: CommunityIcon, label: '커뮤니티' },
  { href: '/mypage', icon: MypageIcon, label: '더보기' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <>
      <div className="h-[70px]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />

      <nav
        className="fixed bottom-0 left-1/2 z-50 w-full -translate-x-1/2 rounded-t-[32px] bg-black sm:max-w-[480px]"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div className="flex h-[70px] items-center justify-around px-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname.startsWith(href)

            return (
              <motion.div
                key={href}
                whileTap={{ scale: 1.25 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                className="h-full flex-1"
              >
                <Link
                  href={href}
                  onClick={() => {
                    if (href === '/players') {
                      sessionStorage.setItem(RESET_KEY, '1')
                      sessionStorage.removeItem(PRESERVE_KEY)
                    }
                  }}
                  className="flex h-full w-full flex-col items-center justify-center gap-2"
                >
                  <Icon size={22} className={isActive ? 'text-white' : 'text-zinc-500'} />
                  <span
                    className={`text-[11px] font-semibold leading-none ${
                      isActive ? 'text-white' : 'text-zinc-500'
                    }`}
                  >
                    {label}
                  </span>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </nav>
    </>
  )
}
