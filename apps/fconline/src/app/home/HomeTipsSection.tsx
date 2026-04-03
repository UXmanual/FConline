'use client'

import { useState } from 'react'
import { getTodayTips } from './home-tips'

export default function HomeTipsSection() {
  const tips = getTodayTips(1)
  const [openTipId, setOpenTipId] = useState<string | null>(null)

  if (tips.length === 0) {
    return null
  }

  return (
    <section>
      <div className="grid gap-3">
        {tips.map((tip) => {
          const isOpen = openTipId === tip.id

          return (
            <article key={tip.id} className="rounded-lg bg-white px-5 py-4">
              <button
                type="button"
                onClick={() => setOpenTipId((current) => (current === tip.id ? null : tip.id))}
                className="block w-full text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-[#111827]">
                    <span>오늘의 팁</span>
                    <span aria-hidden="true">💡</span>
                  </div>

                  <span
                    className={`inline-flex h-7 items-center justify-center rounded-[8px] px-3 text-[12px] font-semibold leading-none ${
                      isOpen ? 'invisible' : 'bg-[#457ae5] text-white'
                    }`}
                  >
                    보기
                  </span>
                </div>

                {isOpen ? (
                  <p className="mt-2 text-[13px] font-medium leading-5 text-[#86919e]">
                    {tip.content}
                  </p>
                ) : null}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
