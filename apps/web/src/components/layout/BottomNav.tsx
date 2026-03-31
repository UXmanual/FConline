'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, Trophy, ChatCircle, SquaresFour } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

const navItems = [
  { href: '/players', icon: User, label: '선수' },
  { href: '/matches', icon: Trophy, label: '경기' },
  { href: '/community', icon: ChatCircle, label: '커뮤니티' },
  { href: '/mypage', icon: SquaresFour, label: '더보기' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <>
      <div className="h-[72px]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />

      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-black z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around h-[72px] px-3">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className="relative flex items-center justify-center h-full flex-1"
              >
                {/* 리퀴드 슬라이딩 필 배경 */}
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-y-3 rounded-2xl bg-zinc-800"
                    style={{ left: 4, right: 4 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}

                {/* 아이콘 + 텍스트 */}
                <div className="relative z-10 flex items-center justify-center">
                  <Icon
                    size={24}
                    weight={isActive ? 'fill' : 'regular'}
                    className={isActive ? 'text-white' : 'text-zinc-500'}
                  />
                  <motion.span
                    animate={{
                      opacity: isActive ? 1 : 0,
                      maxWidth: isActive ? 56 : 0,
                      marginLeft: isActive ? 6 : 0,
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    className="text-[12px] font-medium text-white overflow-hidden whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                </div>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
