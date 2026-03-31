'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { PlayerIcon, MatchIcon, CommunityIcon, MoreIcon } from '@/components/icons/NavIcons'

const navItems = [
  { href: '/players', icon: PlayerIcon, label: '선수' },
  { href: '/matches', icon: MatchIcon, label: '경기' },
  { href: '/community', icon: CommunityIcon, label: '커뮤니티' },
  { href: '/mypage', icon: MoreIcon, label: '더보기' },
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
        <div className="flex items-center justify-around h-[70px] px-2">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className="relative flex items-center justify-center flex-1 h-full"
              >
                {/* 리퀴드 슬라이딩 필 */}
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-y-2 rounded-2xl bg-zinc-800"
                    style={{ left: 6, right: 6 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}

                {/* 아이콘 + 텍스트 (세로 배치) */}
                <div className="relative z-10 flex flex-col items-center justify-center gap-1">
                  <Icon
                    size={24}
                    filled={isActive}
                    className={isActive ? 'text-white' : 'text-zinc-500'}
                  />
                  <span
                    className={`text-[10px] font-medium leading-none ${
                      isActive ? 'text-white' : 'text-zinc-500'
                    }`}
                  >
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
