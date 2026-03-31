'use client'

const version = process.env.NEXT_PUBLIC_APP_VERSION

export default function Header({ title }: { title: string }) {
  return (
    <header className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between h-14 px-4">
        <span className="text-lg font-bold tracking-tight">{title}</span>
        {version && (
          <span className="text-[10px] text-zinc-400 font-mono">v{version}</span>
        )}
      </div>
    </header>
  )
}
