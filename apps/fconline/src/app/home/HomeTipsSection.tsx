'use client'

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
          <article key={tip.id} className="rounded-lg bg-white px-5 py-4">
            <details className="group">
              <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-[#111827]">
                  <span>{'\uC624\uB298\uC758 \uD301'}</span>
                  <span aria-hidden="true">{'\uD83D\uDCA1'}</span>
                </div>

                <span className="inline-flex h-7 items-center justify-center rounded-[8px] bg-[#457ae5] px-3 text-[12px] font-semibold leading-none text-white group-open:invisible">
                  {'\uC790\uC138\uD788'}
                </span>
              </summary>

              <p className="mt-2 text-[13px] font-medium leading-5 text-[#86919e]">{tip.content}</p>
            </details>
          </article>
        ))}
      </div>
    </section>
  )
}
