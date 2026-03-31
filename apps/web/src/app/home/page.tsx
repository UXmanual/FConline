const version = process.env.NEXT_PUBLIC_APP_VERSION

export default function HomePage() {
  return (
    <div className="pt-5">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-black tracking-[-0.04em] text-[#1e2124]">
          FCO manual
        </h1>
        {version && <span className="font-mono text-[11px] text-zinc-400">v{version}</span>}
      </div>
    </div>
  )
}
