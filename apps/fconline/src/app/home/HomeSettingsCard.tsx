import Link from 'next/link'

export default function HomeSettingsCard() {
  const cardStyle = {
    backgroundColor: 'var(--app-card-bg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--app-card-border)',
    transition: 'background-color 180ms ease, border-color 180ms ease, color 180ms ease',
  }
  const titleStyle = { color: 'var(--app-title)' }
  const badgeStyle = {
    backgroundColor: 'var(--app-action-badge-bg)',
    color: 'var(--app-action-badge-fg)',
    transition: 'background-color 180ms ease, color 180ms ease',
  }
  return (
    <section>
      <article className="rounded-lg px-5 py-4" style={cardStyle}>
        <Link
          href="/mypage"
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-1.5 text-sm font-semibold" style={titleStyle}>
            <span>{'\uD654\uBA74 \uC124\uC815'}</span>
            <span aria-hidden="true">{'\u2699\uFE0F'}</span>
          </div>

          <span className="inline-flex h-7 items-center justify-center rounded-[8px] px-3 text-[12px] font-semibold leading-none" style={badgeStyle}>
            {'\uC124\uC815\uD558\uAE30'}
          </span>
        </Link>
      </article>
    </section>
  )
}
