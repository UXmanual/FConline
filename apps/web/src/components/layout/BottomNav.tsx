'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, Trophy, MessageCircle, MoreHorizontal } from 'lucide-react'

const navItems = [
  { href: '/players', icon: User },
  { href: '/matches', icon: Trophy },
  { href: '/community', icon: MessageCircle },
  { href: '/mypage', icon: MoreHorizontal },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <>
      <div className="h-[60px]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />

      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-black z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-center gap-10 h-[60px] px-8">
          {navItems.map(({ href, icon: Icon }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-center w-10 h-full"
              >
                <Icon
                  size={24}
                  className={isActive ? 'text-white' : 'text-zinc-500'}
                  strokeWidth={1.5}
                />
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
