'use client'

import { useState } from 'react'

const version = process.env.NEXT_PUBLIC_APP_VERSION

export default function MyPage() {
  const [isDarkModeEnabled, setIsDarkModeEnabled] = useState(true)

  return (
    <div className="space-y-4 pt-5">
      <div className="flex h-6 items-center">
        <h1 className="text-[18px] font-bold tracking-[-0.02em] text-[#1e2124]">마이페이지</h1>
      </div>

      <section className="rounded-lg bg-white px-5 py-4">
        <div className="flex items-center gap-1">
          <p className="text-sm font-semibold text-[#1e2124]">준비중이에요</p>
          <span aria-hidden="true" className="text-[18px] leading-none">
            🤗
          </span>
        </div>
      </section>

      <section className="rounded-lg bg-white px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm leading-5 text-[#5f6b76]">현재 베타 테스트 중입니다.</p>
            <p className="text-sm leading-5 text-[#5f6b76]">문의사항은 이메일로 연락해주세요.</p>
          </div>

          <a
            href="mailto:uxdmanual@gmail.com"
            aria-label="이메일 보내기"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[18px] leading-none"
            style={{ backgroundColor: '#f3f6f8' }}
          >
            📧
          </a>
        </div>
      </section>

      <section className="rounded-lg bg-white px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#1e2124]">다크모드</p>
            <p className="text-sm leading-5 text-[#96a0aa]">준비 중인 기능이에요.</p>
          </div>

          <button
            type="button"
            aria-label="다크모드 토글"
            aria-pressed={isDarkModeEnabled}
            onClick={() => setIsDarkModeEnabled((current) => !current)}
            className="relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full transition-colors"
            style={{ backgroundColor: isDarkModeEnabled ? '#457ae5' : '#d5dbe3' }}
          >
            <span
              className="absolute h-6 w-6 rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.18)] transition-transform duration-200"
              style={{ transform: `translateX(${isDarkModeEnabled ? '24px' : '4px'})` }}
              aria-hidden="true"
            />
          </button>
        </div>
      </section>

      <section className="rounded-lg bg-white px-5 py-4">
        <p className="text-sm font-medium text-[#96a0aa]">
          {version ? `Ver.${version} (Beta)` : 'Ver.11.13 (Beta)'}
        </p>
      </section>
    </div>
  )
}
