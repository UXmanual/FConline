function MatchDetailLoadingSkeleton() {
  return (
    <div className="pt-5" aria-hidden="true">
      <div className="flex items-center gap-2">
        <div className="home-image-shimmer h-8 w-8 rounded-full" />
        <div>
          <div className="home-image-shimmer h-3.5 w-20 rounded-full" />
          <div className="home-image-shimmer mt-2 h-3.5 w-28 rounded-full" />
        </div>
      </div>

      <div
        className="mt-6 rounded-lg border p-5"
        style={{
          backgroundColor: 'var(--app-card-bg)',
          borderColor: 'var(--app-input-border)',
          transition: 'background-color 180ms ease, border-color 180ms ease',
        }}
      >
        <div className="grid grid-cols-3 items-center">
          <div className="flex flex-col items-center gap-2">
            <div className="home-image-shimmer h-6 w-12 rounded-full" />
            <div className="home-image-shimmer h-4 w-20 rounded-full" />
            <div className="home-image-shimmer h-9 w-10 rounded-full" />
            <div className="home-image-shimmer h-3.5 w-16 rounded-full" />
          </div>
          <div className="mx-auto home-image-shimmer h-6 w-10 rounded-full" />
          <div className="flex flex-col items-center gap-2">
            <div className="home-image-shimmer h-6 w-12 rounded-full" />
            <div className="home-image-shimmer h-4 w-20 rounded-full" />
            <div className="home-image-shimmer h-9 w-10 rounded-full" />
            <div className="home-image-shimmer h-3.5 w-16 rounded-full" />
          </div>
        </div>
      </div>

      <div
        className="mt-4 rounded-lg border p-4"
        style={{
          backgroundColor: 'var(--app-card-bg)',
          borderColor: 'var(--app-input-border)',
          transition: 'background-color 180ms ease, border-color 180ms ease',
        }}
      >
        <div className="home-image-shimmer h-4 w-20 rounded-full" />
        <div
          className="mt-3 divide-y"
          style={{ borderColor: 'var(--app-divider)', transition: 'border-color 180ms ease' }}
        >
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2">
              <div className="justify-self-end home-image-shimmer h-4 w-10 rounded-full" />
              <div className="justify-self-center home-image-shimmer h-3.5 w-16 rounded-full" />
              <div className="home-image-shimmer h-4 w-10 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Loading() {
  return <MatchDetailLoadingSkeleton />
}
