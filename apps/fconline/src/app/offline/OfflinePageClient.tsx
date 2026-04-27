'use client'

import Link from 'next/link'

export default function OfflinePageClient() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-88px)] w-full max-w-[480px] flex-col justify-center pt-6">
      <section
        className="rounded-[24px] px-5 py-6 shadow-[0_18px_40px_rgba(37,58,110,0.08)]"
        style={{
          backgroundColor: 'var(--app-card-bg)',
          border: '1px solid var(--app-card-border)',
        }}
      >
        <div className="space-y-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--app-muted-text)' }}>
            오프라인 안내
          </p>
          <h1
            className="text-[22px] font-semibold tracking-[-0.02em]"
            style={{ color: 'var(--app-title)' }}
          >
            인터넷 연결을 확인해 주세요
          </h1>
          <p className="text-[14px] leading-[1.65]" style={{ color: 'var(--app-body-text)' }}>
            네트워크에 다시 연결되면 최신 정보와 커뮤니티 내용을 불러올 수 있습니다.
          </p>
          <p className="text-[14px] leading-[1.65]" style={{ color: 'var(--app-body-text)' }}>
            연결이 복구되면 아래 버튼으로 다시 시도해 주세요.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold text-white"
            style={{ backgroundColor: '#457ae5' }}
          >
            다시 시도
          </button>

          <Link
            href="/home"
            className="flex h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold"
            style={{
              backgroundColor: 'var(--app-surface-soft)',
              color: 'var(--app-title)',
            }}
          >
            홈으로 이동
          </Link>
        </div>
      </section>
    </div>
  )
}
