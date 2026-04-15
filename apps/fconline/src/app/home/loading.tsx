function HomeHeaderSkeleton() {
  return (
    <header className="flex items-center justify-between gap-3" aria-hidden="true">
      <div className="flex h-6 items-center gap-3">
        <div className="home-image-shimmer h-5 w-28 rounded-full" />
      </div>
      <div className="home-image-shimmer h-4 w-24 rounded-full" />
    </header>
  )
}

function HomeStatusSkeleton() {
  const cardStyle = {
    backgroundColor: 'var(--app-card-bg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--app-card-border)',
    transition: 'background-color 180ms ease, border-color 180ms ease',
  }
  const softStyle = {
    backgroundColor: 'var(--app-surface-soft)',
    transition: 'background-color 180ms ease',
  }

  return (
    <section className="space-y-3" aria-hidden="true">
      <div className="space-y-3">
        <div className="rounded-lg px-5 py-4" style={cardStyle}>
          <div className="flex items-center justify-between gap-4">
            <div className="home-image-shimmer h-6 w-32 rounded-full" />
            <div className="flex items-center gap-2">
              <div className="home-image-shimmer h-5 w-28 rounded-full" />
              <div className="home-image-shimmer h-5 w-12 rounded-full" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 2 }, (_, index) => (
            <div
              key={index}
              className="flex min-h-[88px] items-center justify-between gap-3 rounded-lg px-4 py-5"
              style={cardStyle}
            >
              <div className="min-w-0 flex-1">
                <div className="home-image-shimmer h-4 w-[62%] rounded-full" />
                <div className="home-image-shimmer mt-2 h-4 w-[48%] rounded-full" />
              </div>
              <div className="home-image-shimmer h-[52px] w-[52px] rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg px-5 py-4" style={cardStyle}>
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 py-3 ${index === 0 ? 'pt-0' : ''} ${index === 2 ? 'pb-0' : 'border-b'}`}
            style={{
              borderColor: 'color-mix(in srgb, var(--app-card-border) 80%, transparent)',
            }}
          >
            <div className="home-image-shimmer h-12 w-12 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="home-image-shimmer h-3.5 w-20 rounded-full" />
                <div className="home-image-shimmer h-3.5 w-10 rounded-full" />
                <div className="home-image-shimmer h-3.5 w-14 rounded-full" />
              </div>
              <div className="home-image-shimmer mt-2 h-4 w-[72%] rounded-full" />
            </div>
            <div className="home-image-shimmer h-3.5 w-8 shrink-0 rounded-full self-start" />
          </div>
        ))}
      </div>

      <div className="rounded-lg px-5 py-4" style={cardStyle}>
        <div className="flex items-center justify-between gap-3">
          <div className="home-image-shimmer h-4 w-28 rounded-full" />
          <div className="home-image-shimmer h-3.5 w-12 rounded-full" />
        </div>
        <div className="home-image-shimmer mt-2 h-3.5 w-32 rounded-full" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="rounded-lg px-4 py-4" style={softStyle}>
              <div className="home-image-shimmer h-3.5 w-14 rounded-full" />
              <div className="home-image-shimmer mt-2 h-6 w-16 rounded-full" />
              <div className="home-image-shimmer mt-2 h-3.5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HomeBannerSkeleton() {
  return (
    <section aria-hidden="true">
      <div className="relative">
        <div className="pointer-events-none absolute right-3 top-3 z-10 home-image-shimmer h-6 w-11 rounded-full" />
        <div className="home-image-shimmer overflow-hidden rounded-lg" style={{ aspectRatio: '440 / 112' }} />
      </div>
    </section>
  )
}

function HomeLinkCardSkeleton() {
  const cardStyle = {
    backgroundColor: 'var(--app-card-bg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--app-card-border)',
    transition: 'background-color 180ms ease, border-color 180ms ease',
  }

  return (
    <article
      className="flex items-center justify-between gap-3 rounded-lg px-5 py-4"
      aria-hidden="true"
      style={cardStyle}
    >
      <div className="home-image-shimmer h-4 w-28 rounded-full" />
      <div className="home-image-shimmer h-7 w-20 rounded-[8px]" />
    </article>
  )
}

export default function Loading() {
  return (
    <div className="space-y-4 pt-5">
      <HomeHeaderSkeleton />

      <main className="space-y-3">
        <HomeStatusSkeleton />
        <HomeBannerSkeleton />
        <HomeLinkCardSkeleton />
        <HomeLinkCardSkeleton />
      </main>
    </div>
  )
}
