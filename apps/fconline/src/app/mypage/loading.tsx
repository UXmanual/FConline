function MyPageLoadingSkeleton() {
  return (
    <div className="space-y-4 pt-5" aria-hidden="true">
      <div className="flex h-6 items-center">
        <div className="home-image-shimmer h-5 w-24 rounded-full" />
      </div>

      <section
        className="rounded-lg px-5 py-4"
        style={{ backgroundColor: 'var(--app-card-bg)', transition: 'background-color 180ms ease' }}
      >
        <div className="home-image-shimmer h-4 w-24 rounded-full" />
      </section>

      <section
        className="rounded-lg px-5 py-4"
        style={{ backgroundColor: 'var(--app-card-bg)', transition: 'background-color 180ms ease' }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="home-image-shimmer h-4 w-32 rounded-full" />
            <div className="home-image-shimmer h-4 w-40 rounded-full" />
          </div>
          <div className="home-image-shimmer h-9 w-9 shrink-0 rounded-full" />
        </div>
      </section>

      <section
        className="rounded-lg px-5 py-4"
        style={{ backgroundColor: 'var(--app-card-bg)', transition: 'background-color 180ms ease' }}
      >
        <div className="home-image-shimmer h-4 w-28 rounded-full" />
      </section>
    </div>
  )
}

export default function Loading() {
  return <MyPageLoadingSkeleton />
}
