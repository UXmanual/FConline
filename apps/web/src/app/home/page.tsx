const version = process.env.NEXT_PUBLIC_APP_VERSION

export default function HomePage() {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold">홈</h1>
        {version && (
          <span className="text-[11px] text-zinc-400 font-mono">v{version}</span>
        )}
      </div>
    </div>
  )
}
