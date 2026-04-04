function MatchListLoadingSkeleton() {
  return (
    <div className="pt-5" aria-hidden="true">
      <div className="flex items-center gap-2">
        <div className="home-image-shimmer h-8 w-8 rounded-full" />
        <div>
          <div className="home-image-shimmer h-5 w-28 rounded-full" />
          <div className="home-image-shimmer mt-2 h-3.5 w-16 rounded-full" />
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-hidden">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="home-image-shimmer h-9 w-24 rounded-full" />
        ))}
      </div>

      <div className="mt-4 space-y-1">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-center gap-3 border-b border-[#e6e8ea] py-3.5">
            <div className="home-image-shimmer h-10 w-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <div className="home-image-shimmer h-4 w-[72%] rounded-full" />
              <div className="home-image-shimmer mt-2 h-3.5 w-[42%] rounded-full" />
            </div>
            <div className="home-image-shimmer h-4 w-4 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Loading() {
  return <MatchListLoadingSkeleton />
}
