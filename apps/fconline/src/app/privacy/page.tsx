'use client'

import Link from 'next/link'
import { privacyContent } from '@/app/mypage/page'

const linkedServices = [
  {
    label: '[Supabase](https://supabase.com)',
    href: 'https://supabase.com',
    text: 'Supabase',
  },
  {
    label: '[Vercel](https://vercel.com)',
    href: 'https://vercel.com',
    text: 'Vercel',
  },
  {
    label: '[Nexon Open API](https://openapi.nexon.com/ko/)',
    href: 'https://openapi.nexon.com/ko/',
    text: 'Nexon Open API',
  },
]

function renderPolicyLine(item: string) {
  const matchedService = linkedServices.find((service) => item.includes(service.label))

  if (item.includes('uxdmanual@gmail.com')) {
    const [before, after] = item.split('uxdmanual@gmail.com')

    return (
      <>
        {before}
        <a href="mailto:uxdmanual@gmail.com" className="underline underline-offset-2">
          uxdmanual@gmail.com
        </a>
        {after}
      </>
    )
  }

  if (matchedService) {
    const [before, after] = item.split(matchedService.label)

    return (
      <>
        {before}
        <a
          href={matchedService.href}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          {matchedService.text}
        </a>
        {after}
      </>
    )
  }

  return item
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-88px)] w-full max-w-[480px] flex-col pt-6">
      <section
        className="rounded-[24px] px-5 py-5 shadow-[0_18px_40px_rgba(37,58,110,0.08)]"
        style={{
          backgroundColor: 'var(--app-card-bg)',
          border: '1px solid var(--app-card-border)',
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--app-muted-text)' }}>
            개인정보처리방침
          </p>
          <Link
            href="/mypage/privacy"
            className="text-[12px] font-semibold underline underline-offset-2"
            style={{ color: '#457AE5' }}
          >
            마이페이지 형태로 보기
          </Link>
        </div>

        <div className="space-y-2">
          {privacyContent.map((item) => (
            <p
              key={item}
              className="text-[12px] font-medium leading-[1.6]"
              style={{ color: 'var(--app-body-text)' }}
            >
              {renderPolicyLine(item)}
            </p>
          ))}
        </div>
      </section>
    </div>
  )
}
