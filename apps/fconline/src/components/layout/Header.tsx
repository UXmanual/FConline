'use client'

import { APP_VERSION } from '@/lib/appVersion'

export default function Header({ title }: { title: string }) {
  return (
    <header className="fixed left-1/2 top-0 z-50 w-full -translate-x-1/2 border-b border-[#e6e8ea] bg-white pt-[env(safe-area-inset-top)] sm:max-w-[480px]">
      <div className="flex h-14 items-center justify-between px-4">
        <span className="text-lg font-bold tracking-tight text-[#1e2124]">{title}</span>
        <span className="font-mono text-[10px] text-[#8a949e]">v{APP_VERSION}</span>
      </div>
    </header>
  )
}
