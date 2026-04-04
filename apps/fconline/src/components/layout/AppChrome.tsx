'use client'

import { usePathname } from 'next/navigation'
import BottomNav from '@/components/layout/BottomNav'

export default function AppChrome() {
  const pathname = usePathname()
  const hideFooter = pathname.startsWith('/community')

  return (
    <>
      {!hideFooter ? (
        <>
          <div className="px-5 pb-0.5 text-left text-[11px] leading-5 text-[#b5bec8]">
            게임 배너, 이미지, 선수 정보의 저작권은 NEXON Korea Corporation에 있습니다.
          </div>
          <footer className="px-5 pb-4 text-left text-xs font-medium tracking-[0.02em] text-[#b5bec8]">
            {'\u00A9uxdmanual'}
          </footer>
        </>
      ) : null}
      <BottomNav />
    </>
  )
}
