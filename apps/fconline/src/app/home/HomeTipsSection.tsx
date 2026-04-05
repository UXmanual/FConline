'use client'

import { getTodayTips } from './home-tips'

export default function HomeTipsSection() {
  const tips = getTodayTips(1)
  const cardStyle = {
    backgroundColor: 'var(--app-card-bg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--app-card-border)',
    transition: 'background-color 180ms ease, border-color 180ms ease, color 180ms ease',
  }
  const titleStyle = { color: 'var(--app-title)' }
  const mutedStyle = { color: 'var(--app-muted-text)' }

  if (tips.length === 0) {
    return null
  }

  return (
    <section>
      <div className="grid gap-3">
        {tips.map((tip) => (
          <article key={tip.id} className="rounded-lg px-5 py-4" style={cardStyle}>
            <details className="group">
              <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-1.5 text-sm font-semibold" style={titleStyle}>
                  <span>{'\uC624\uB298\uC758 \uD301'}</span>
                  <span aria-hidden="true">{'\uD83D\uDCA1'}</span>
                </div>

                <span className="inline-flex h-7 items-center justify-center rounded-[8px] bg-[#457ae5] px-3 text-[12px] font-semibold leading-none text-white group-open:invisible">
                  {'\uC790\uC138\uD788'}
                </span>
              </summary>

              <p className="mt-2 text-[13px] font-medium leading-5" style={mutedStyle}>{tip.content}</p>
            </details>
          </article>
        ))}
      </div>
    </section>
  )
}
