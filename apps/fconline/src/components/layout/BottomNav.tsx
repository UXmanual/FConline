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
  { href: '/home', icon: HomeIcon, label: '\uD648' },
  { href: '/players', icon: PlayerIcon, label: '\uC120\uC218' },
  { href: '/matches', icon: AnalysisIcon, label: '\uBD84\uC11D' },
  { href: '/community', icon: CommunityIcon, label: '\uCEE4\uBBA4\uB2C8\uD2F0' },
  { href: '/mypage', icon: MypageIcon, label: '\uB354\uBCF4\uAE30' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <>
      <div className="h-[70px]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />

      <nav
        className="fixed bottom-0 left-1/2 z-50 w-full -translate-x-1/2 rounded-t-[24px] bg-white sm:max-w-[480px]"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          borderTop: '1px solid #f0f3f5',
        }}
      >
        <div className="flex h-[70px] items-center justify-around px-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname.startsWith(href)

            return (
              <motion.div
                key={href}
                whileTap={{ scale: 1.08 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
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
                  <Icon size={22} className={isActive ? 'text-[#343e4d]' : 'text-[#ced3d9]'} />
                  <span
                    className={`text-[11px] font-semibold leading-none ${
                      isActive ? 'text-[#343e4d]' : 'text-[#86919e]'
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
