function MatchesHeaderSkeleton() {
  return (
    <div className="flex h-6 items-center" aria-hidden="true">
      <div className="home-image-shimmer h-5 w-40 rounded-full" />
    </div>
  )
}

function MatchesSearchSkeleton() {
  return (
    <div
      className="mt-4 rounded-lg border px-4 py-4"
      aria-hidden="true"
      style={{
        backgroundColor: 'var(--app-card-bg)',
        borderColor: 'var(--app-input-border)',
        transition: 'background-color 180ms ease, border-color 180ms ease',
      }}
    >
      <div className="flex items-center gap-3">
        <div className="home-image-shimmer h-5 flex-1 rounded-full" />
        <div className="home-image-shimmer h-10 w-10 rounded-lg" />
      </div>
    </div>
  )
}

function RankingNoticeSkeleton() {
  return (
    <div className="mt-4" aria-hidden="true">
      <div className="home-image-shimmer h-3.5 w-44 rounded-full" />
    </div>
  )
}

function RankingCardSkeleton() {
  return (
    <section
      className="rounded-lg px-5 py-4"
      aria-hidden="true"
      style={{ backgroundColor: 'var(--app-card-bg)', transition: 'background-color 180ms ease' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="home-image-shimmer h-4 w-32 rounded-full" />
          <div className="home-image-shimmer h-3.5 w-24 rounded-full" />
        </div>
        <div className="home-image-shimmer h-7 w-16 rounded-[8px]" />
      </div>

      <div className="mt-3">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className={`flex items-center justify-between gap-3 py-3 ${
              index === 4 ? 'pb-0' : 'border-b'
            }`}
            style={index === 4 ? undefined : { borderColor: 'var(--app-divider)', transition: 'border-color 180ms ease' }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="home-image-shimmer h-11 w-11 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="home-image-shimmer h-4 w-[56%] rounded-full" />
                <div className="home-image-shimmer mt-2 h-3.5 w-[72%] rounded-full" />
              </div>
            </div>
            <div className="home-image-shimmer h-4 w-14 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  )
}

function BestStatsCardSkeleton() {
  return (
    <section
      className="rounded-lg px-5 py-4"
      aria-hidden="true"
      style={{ backgroundColor: 'var(--app-card-bg)', transition: 'background-color 180ms ease' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="home-image-shimmer h-4 w-28 rounded-full" />
          <div className="home-image-shimmer h-3.5 w-20 rounded-full" />
        </div>
        <div className="home-image-shimmer h-7 w-14 rounded-[8px]" />
      </div>

      <div className="mt-3">
        {Array.from({ length: 7 }, (_, index) => (
          <div
            key={index}
            className={`flex items-center justify-between gap-3 py-3 ${
              index === 6 ? 'pb-0' : 'border-b'
            }`}
            style={index === 6 ? undefined : { borderColor: 'var(--app-divider)', transition: 'border-color 180ms ease' }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="home-image-shimmer h-11 w-11 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <div className="home-image-shimmer h-4 w-[52%] rounded-full" />
                <div className="home-image-shimmer mt-2 h-3.5 w-[42%] rounded-full" />
              </div>
            </div>
            <div className="min-w-[52px] shrink-0">
              <div className="home-image-shimmer ml-auto h-4 w-10 rounded-full" />
              <div className="home-image-shimmer mt-2 ml-auto h-3.5 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function Loading() {
  return (
    <div className="pt-5">
      <MatchesHeaderSkeleton />
      <MatchesSearchSkeleton />
      <RankingNoticeSkeleton />

      <section className="mt-4">
        <RankingCardSkeleton />
      </section>

      <section className="mt-4">
        <BestStatsCardSkeleton />
      </section>
    </div>
  )
}
