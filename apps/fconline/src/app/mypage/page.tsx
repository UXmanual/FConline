'use client'

import { useState } from 'react'
import { setDarkModeEnabled, useDarkModeEnabled } from '@/lib/darkMode'

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

const releaseNotesByVersion: Record<string, string[]> = {
  '11.5': ['홈, 분석, 선수 탭 다크모드 적용', '탭별 라이트/다크 톤 정리 및 UI 개선'],
  '11.4': ['분석 상세 사용 선수 카드 추가', '기타 버그 수정'],
}

export default function MyPage() {
  const isDarkModeEnabled = useDarkModeEnabled()
  const [isLicenseOpen, setIsLicenseOpen] = useState(false)
  const releaseNotes = releaseNotesByVersion[version ?? ''] ?? releaseNotesByVersion['11.4']

  const handleDarkModeToggle = () => {
    const nextValue = !isDarkModeEnabled
    setDarkModeEnabled(nextValue)
  }

  const cardStyle = {
    backgroundColor: 'var(--app-card-bg)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--app-card-border)',
  }
  const titleStyle = { color: 'var(--app-title)' }
  const bodyStyle = { color: 'var(--app-body-text)' }
  const mutedStyle = { color: 'var(--app-muted-text)' }
  const badgeStyle = {
    backgroundColor: 'var(--app-badge-bg)',
    color: 'var(--app-badge-fg)',
    transition: 'background-color 180ms ease, color 180ms ease',
  }
  const surfaceTransitionStyle = {
    transition: 'background-color 180ms ease, border-color 180ms ease, color 180ms ease',
  }

  return (
    <div
      className="-mx-5 px-5 pt-5"
      style={{
        backgroundColor: 'var(--app-page-bg)',
        transition: 'background-color 180ms ease',
      }}
    >
      <div className="space-y-4">
        <div className="flex h-6 items-center">
          <h1 className="text-[18px] font-bold tracking-[-0.02em]" style={titleStyle}>
            마이페이지
          </h1>
        </div>

        <section className="rounded-lg px-5 py-4" style={{ ...cardStyle, ...surfaceTransitionStyle }}>
          <div className="flex items-center gap-1">
            <p className="text-sm font-semibold" style={titleStyle}>
              준비중이에요
            </p>
            <span aria-hidden="true" className="text-[18px] leading-none">
              👀
            </span>
          </div>
        </section>

        <section className="rounded-lg px-5 py-4" style={{ ...cardStyle, ...surfaceTransitionStyle }}>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm leading-[1.45]" style={bodyStyle}>
                현재 베타 테스트 중입니다.
              </p>
              <p className="text-sm leading-[1.45]" style={bodyStyle}>
                문의사항은 이메일로 연락해 주세요.
              </p>
            </div>

            <a
              href="mailto:uxdmanual@gmail.com"
              aria-label="이메일 보내기"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[18px] leading-none"
              style={badgeStyle}
            >
              ✉
            </a>
          </div>
        </section>

        <section className="rounded-lg px-5 py-4" style={{ ...cardStyle, ...surfaceTransitionStyle }}>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold" style={titleStyle}>
                다크모드
              </p>
              <p className="text-sm leading-5" style={mutedStyle}>
                더 어두운 화면 테마로 전환합니다.
              </p>
            </div>

            <button
              type="button"
              aria-label="다크모드 토글"
              aria-pressed={isDarkModeEnabled}
              onClick={handleDarkModeToggle}
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

        <section className="rounded-lg px-5 py-4" style={{ ...cardStyle, ...surfaceTransitionStyle }}>
          <p className="text-sm font-medium" style={mutedStyle}>
            {version ? `버전 ${version} (Beta)` : '버전 11.4 (Beta)'}
          </p>
          <div className="mt-2.5 space-y-0.5">
            {releaseNotes.map((note) => (
              <p key={note} className="text-[12px] font-medium leading-[1.35]" style={mutedStyle}>
                - {note}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-lg px-5 py-4" style={{ ...cardStyle, ...surfaceTransitionStyle }}>
          <button
            type="button"
            onClick={() => setIsLicenseOpen((current) => !current)}
            className="block w-full text-left"
            aria-expanded={isLicenseOpen}
          >
            <p
              className={`text-sm font-medium ${isLicenseOpen ? '' : 'underline underline-offset-2'}`}
              style={mutedStyle}
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
                  className="flex items-center gap-1.5 text-sm font-medium"
                  style={bodyStyle}
                >
                  <span aria-hidden="true" className="text-[12px] leading-none" style={mutedStyle}>
                    •
                  </span>
                  <span>{license.name}</span>
                </a>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}
