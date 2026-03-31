'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Trophy, MessageCircle, User } from 'lucide-react'

const navItems = [
  { href: '/players', label: '선수정보', icon: Users },
  { href: '/matches', label: '경기정보', icon: Trophy },
  { href: '/community', label: '커뮤니티', icon: MessageCircle },
  { href: '/mypage', label: '마이페이지', icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <>
      {/* 하단 네비 실제 높이만큼 콘텐츠 밀기 */}
      <div className="h-[60px]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />

      {/* 하단 네비바 */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-black z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center h-[60px]">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-1 flex-col items-center justify-center gap-1 h-full"
              >
                <Icon
                  size={22}
                  className={isActive ? 'text-white' : 'text-zinc-500'}
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
                <span
                  className={`text-[10px] ${isActive ? 'text-white font-semibold' : 'text-zinc-500'}`}
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
