'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { HomeIcon, PlayerIcon, AnalysisIcon, CommunityIcon, MypageIcon } from '@/components/icons/NavIcons'

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
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-black z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around h-[70px] px-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className="relative flex items-center justify-center flex-1 h-full"
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-y-2 rounded-2xl bg-zinc-800"
                    style={{ left: 4, right: 4 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}

                <div className="relative z-10 flex flex-col items-center justify-center gap-1">
                  <Icon
                    size={22}
                    className={isActive ? 'text-white' : 'text-zinc-500'}
                  />
                  <span className={`text-[10px] font-medium leading-none ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                    {label}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
