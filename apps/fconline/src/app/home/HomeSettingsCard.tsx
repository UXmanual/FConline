import Link from 'next/link'

export default function HomeSettingsCard() {
  return (
    <section>
      <article className="rounded-lg bg-white px-5 py-4">
        <Link
          href="/mypage"
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-1.5 text-sm font-semibold text-[#111827]">
            <span>{'\uC5EC\uB7EC\uAC00\uC9C0 \uC7A1\uB3D9\uC0AC\uB2C8'}</span>
            <span aria-hidden="true">{'\u2699\uFE0F'}</span>
          </div>

          <span className="inline-flex h-7 items-center justify-center rounded-[8px] bg-[#e8f1ff] px-3 text-[12px] font-semibold leading-none text-[#457ae5]">
            {'\uC124\uC815\uD558\uAE30'}
          </span>
        </Link>
      </article>
    </section>
  )
}
