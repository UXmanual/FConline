'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserRound, Trophy, MessageCircle, LayoutGrid } from 'lucide-react'

const navItems = [
  { href: '/players', icon: UserRound, label: '선수' },
  { href: '/matches', icon: Trophy, label: '경기' },
  { href: '/community', icon: MessageCircle, label: '커뮤니티' },
  { href: '/mypage', icon: LayoutGrid, label: '더보기' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <>
      <div className="h-[68px]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />

      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-black z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around h-[68px] px-4">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-center gap-1 flex-1 h-full"
              >
                {/* 활성 시 필 배경 */}
                <div
                  className={`flex items-center justify-center rounded-2xl transition-all duration-200 ${
                    isActive ? 'bg-zinc-800 px-5 py-1.5' : 'px-5 py-1.5'
                  }`}
                >
                  <Icon
                    size={26}
                    className={isActive ? 'text-white' : 'text-zinc-500'}
                    strokeWidth={1.5}
                  />
                </div>
                <span
                  className={`text-[10px] tracking-tight ${
                    isActive ? 'text-white' : 'text-zinc-600'
                  }`}
                >
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
