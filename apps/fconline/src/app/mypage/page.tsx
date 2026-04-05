'use client'

import { useState } from 'react'

const version = process.env.NEXT_PUBLIC_APP_VERSION

const openSourceLicenses = [
  {
    name: '여기어때 잘난체',
    href: 'https://gccompany.co.kr/font',
  },
  {
    name: '넥슨 Open API',
    href: 'https://openapi.nexon.com/ko/',
  },
]

export default function MyPage() {
  const [isDarkModeEnabled, setIsDarkModeEnabled] = useState(true)
  const [isLicenseOpen, setIsLicenseOpen] = useState(false)

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
          <div className="space-y-1">
            <p className="text-sm leading-[1.45] text-[#5f6b76]">현재 베타 테스트 중입니다.</p>
            <p className="text-sm leading-[1.45] text-[#5f6b76]">문의사항은 이메일로 연락해주세요.</p>
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
            <p className="text-sm leading-5 text-[#96a0aa]">준비 중인 기능이에요</p>
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
          {version ? `버전 ${version} (Beta)` : '버전 11.4 (Beta)'}
        </p>
        <div className="mt-2.5 space-y-0.5">
          <p className="text-[12px] font-medium leading-[1.35] text-[#7f8a95]">- 분석 상세 사용 선수 카드 추가</p>
          <p className="text-[12px] font-medium leading-[1.35] text-[#7f8a95]">- 기타 버그 수정</p>
        </div>
      </section>

      <section className="rounded-lg bg-white px-5 py-4">
        <button
          type="button"
          onClick={() => setIsLicenseOpen((current) => !current)}
          className="block w-full text-left"
          aria-expanded={isLicenseOpen}
        >
          <p
            className={`text-sm font-medium text-[#96a0aa] ${isLicenseOpen ? '' : 'underline underline-offset-2'}`}
          >
            오픈소스 라이선스 보기
          </p>
        </button>

        {isLicenseOpen ? (
          <div className="mt-3 space-y-2">
            {openSourceLicenses.map((license) => (
              <a
                key={license.name}
                href={license.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-sm font-medium text-[#5f6b76]"
              >
                <span aria-hidden="true" className="text-[12px] leading-none text-[#8a949e]">
                  ↗
                </span>
                <span>{license.name}</span>
              </a>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}
