function CommunityHeaderSkeleton() {
  return (
    <header className="space-y-2" aria-hidden="true">
      <div className="flex h-6 items-center">
        <div className="home-image-shimmer h-5 w-24 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="home-image-shimmer h-4 w-[78%] rounded-full" />
        <div className="home-image-shimmer h-4 w-[62%] rounded-full" />
      </div>
    </header>
  )
}

function CommunityTabsSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3" aria-hidden="true">
      <div className="flex flex-wrap gap-2">
        <div className="home-image-shimmer h-9 w-28 rounded-lg" />
      </div>
      <div className="home-image-shimmer h-9 w-[78px] shrink-0 rounded-lg" />
    </div>
  )
}

function CommunityPostCardSkeleton() {
  return (
    <div className="rounded-lg bg-white px-5 py-4" aria-hidden="true">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="home-image-shimmer h-7 w-14 rounded-lg" />
          <div className="home-image-shimmer h-3.5 w-16 rounded-full" />
          <div className="home-image-shimmer h-3.5 w-2 rounded-full" />
          <div className="home-image-shimmer h-3.5 w-14 rounded-full" />
        </div>
        <div className="home-image-shimmer h-3.5 w-8 rounded-full" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="home-image-shimmer h-4 w-[74%] rounded-full" />
        <div className="home-image-shimmer h-4 w-[56%] rounded-full" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <div className="home-image-shimmer h-3.5 w-8 rounded-full" />
          <div className="home-image-shimmer h-3.5 w-4 rounded-full" />
        </div>
        <div className="home-image-shimmer h-3.5 w-10 rounded-full" />
      </div>
    </div>
  )
}

function CommunityPaginationSkeleton() {
  return (
    <div
      className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3"
      aria-hidden="true"
    >
      <div className="home-image-shimmer h-9 w-14 rounded-lg" />
      <div className="flex items-center gap-1.5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="home-image-shimmer h-9 w-9 rounded-lg" />
        ))}
      </div>
      <div className="home-image-shimmer h-9 w-14 rounded-lg" />
    </div>
  )
}

export default function Loading() {
  return (
    <div className="space-y-4 pt-5">
      <CommunityHeaderSkeleton />
      <CommunityTabsSkeleton />

      <section className="space-y-3">
        {Array.from({ length: 5 }, (_, index) => (
          <CommunityPostCardSkeleton key={index} />
        ))}

        <CommunityPaginationSkeleton />
        <div className="home-image-shimmer h-[54px] w-full rounded-2xl" aria-hidden="true" />
      </section>
    </div>
  )
}
