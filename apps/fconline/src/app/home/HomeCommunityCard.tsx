import Link from 'next/link'

export default function HomeCommunityCard() {
  return (
    <section>
      <article className="rounded-lg bg-white px-5 py-4">
        <Link
          href="/community"
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-1.5 text-sm font-semibold text-[#111827]">
            <span>{'\uC640\uAE00\uC640\uAE00 \uCEE4\uBBA4\uB2C8\uD2F0'}</span>
            <span aria-hidden="true">{'\u2328\uFE0F'}</span>
          </div>

          <span className="inline-flex h-7 items-center justify-center rounded-[8px] bg-[#e8f1ff] px-3 text-[12px] font-semibold leading-none text-[#457ae5]">
            {'\uCC38\uC5EC\uD558\uAE30'}
          </span>
        </Link>
      </article>
    </section>
  )
}
