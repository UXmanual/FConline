import { getTodayTips } from './home-tips'

export default function HomeTipsSection() {
  const tips = getTodayTips(1)

  if (tips.length === 0) {
    return null
  }

  return (
    <section>
      <div className="grid gap-3">
        {tips.map((tip) => (
          <article key={tip.id} className="rounded-xl bg-white px-5 py-4">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-[#111827]">
              <span>오늘의 팁</span>
              <span aria-hidden="true">💡</span>
            </div>

            <p className="mt-2 line-clamp-2 text-[13px] font-medium leading-5 text-[#86919e]">
              {tip.content}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
