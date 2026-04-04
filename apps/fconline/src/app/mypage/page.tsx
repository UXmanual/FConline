const version = process.env.NEXT_PUBLIC_APP_VERSION

export default function MyPage() {
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
        <p className="text-sm font-medium text-[#96a0aa]">
          {version ? `Ver.${version} (Beta)` : 'Ver.11.13 (Beta)'}
        </p>
      </section>
    </div>
  )
}
