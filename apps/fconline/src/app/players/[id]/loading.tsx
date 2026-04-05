import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import LoadingDots from '@/components/ui/LoadingDots'

function PlayerSummarySkeleton() {
  return (
    <section className="rounded-lg bg-white px-5 py-5" aria-hidden="true">
      <div className="flex gap-4">
        <div className="home-image-shimmer h-24 w-24 shrink-0 rounded-lg" />

        <div className="min-w-0 flex-1 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="home-image-shimmer h-5 w-14 rounded-md" />
            <div className="home-image-shimmer h-7 w-32 rounded-full" />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="home-image-shimmer h-7 w-12 rounded-full" />
            <div className="home-image-shimmer h-7 w-10 rounded-full" />
          </div>

          <div className="mt-3 space-y-2">
            <div className="home-image-shimmer h-4 w-28 rounded-full" />
            <div className="home-image-shimmer h-4 w-24 rounded-full" />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="rounded-lg bg-[#f7f9fb] px-4 py-3">
            <div className="home-image-shimmer h-3.5 w-14 rounded-full" />
            <div className="home-image-shimmer mt-2 h-5 w-18 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  )
}

function PlayerAbilitySkeleton() {
  return (
    <section className="rounded-lg bg-white px-5 py-5" aria-hidden="true">
      <div className="flex items-center justify-between gap-3">
        <div className="home-image-shimmer h-5 w-20 rounded-full" />
        <div className="home-image-shimmer h-4 w-24 rounded-full" />
      </div>

      <div className="mt-4 flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="home-image-shimmer h-10 w-14 rounded-full" />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="rounded-lg bg-[#f7f9fb] px-4 py-3">
            <div className="home-image-shimmer h-3.5 w-16 rounded-full" />
            <div className="home-image-shimmer mt-2 h-6 w-10 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  )
}

export default function Loading() {
  return (
    <div>
      <div className="pb-4 pt-5">
        <div
          className="inline-flex items-center gap-1.5 text-[18px] font-bold tracking-[-0.02em] text-[#1e2124]"
          aria-hidden="true"
        >
          <ArrowLeft size={18} weight="bold" />
          <div className="home-image-shimmer h-6 w-28 rounded-full" />
        </div>
      </div>

      <div className="space-y-4">
        <PlayerSummarySkeleton />
        <PlayerAbilitySkeleton />
      </div>

      <LoadingDots className="pb-2" label="선수 상세 정보를 찾는 중이에요" />
    </div>
  )
}
