'use client'

const deletedDataItems = [
  '커뮤니티 게시글 및 댓글 등 사용자가 직접 작성한 콘텐츠',
  '문의 접수 시 사용자가 직접 입력한 연락 정보와 문의 내용',
  '푸시 알림 구독 정보와 기기 식별 정보',
]

const retainedDataItems = [
  '법령 준수, 보안 대응, 분쟁 확인을 위해 필요한 최소 로그는 관련 목적 달성 시점까지 보관될 수 있습니다.',
  '삭제 요청이 접수된 뒤에도 법적 의무 또는 정당한 보관 사유가 있는 데이터는 해당 사유가 끝날 때까지 별도 보관될 수 있습니다.',
]

export default function DataDeletionPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-88px)] w-full max-w-[480px] flex-col pt-6">
      <section
        className="rounded-[24px] px-5 py-5 shadow-[0_18px_40px_rgba(37,58,110,0.08)]"
        style={{
          backgroundColor: 'var(--app-card-bg)',
          border: '1px solid var(--app-card-border)',
        }}
      >
        <div className="space-y-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--app-muted-text)' }}>
            FCO Ground 데이터 삭제 요청
          </p>
          <h1
            className="text-[20px] font-semibold tracking-[-0.02em]"
            style={{ color: 'var(--app-title)' }}
          >
            사용자 데이터 삭제 안내
          </h1>
          <p className="text-[13px] leading-[1.6]" style={{ color: 'var(--app-body-text)' }}>
            FCO Ground 또는 개발자 uxdmanual은 사용자의 삭제 요청을 접수하고 처리할 수 있는 방편을 제공합니다.
          </p>
        </div>

        <div className="mt-5 space-y-5">
          <section className="space-y-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--app-title)' }}>
              삭제 요청 방법
            </p>
            <ol className="space-y-2 text-[13px] leading-[1.6]" style={{ color: 'var(--app-body-text)' }}>
              <li>1. 아래 이메일 주소로 삭제 요청을 보냅니다.</li>
              <li>2. 요청 본문에 삭제를 원하는 데이터 유형 또는 계정/기기 식별 정보를 함께 적어주세요.</li>
              <li>3. 운영팀이 요청 내용을 확인한 뒤 삭제 또는 보관 대상 정보를 안내합니다.</li>
            </ol>
            <p className="text-[13px] leading-[1.6]" style={{ color: 'var(--app-body-text)' }}>
              이메일:
              {' '}
              <a href="mailto:uxdmanual@gmail.com" className="underline underline-offset-2">
                uxdmanual@gmail.com
              </a>
            </p>
          </section>

          <section className="space-y-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--app-title)' }}>
              삭제 가능한 데이터 유형
            </p>
            <ul className="space-y-2 text-[13px] leading-[1.6]" style={{ color: 'var(--app-body-text)' }}>
              {deletedDataItems.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </section>

          <section className="space-y-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--app-title)' }}>
              추가 보관될 수 있는 데이터
            </p>
            <ul className="space-y-2 text-[13px] leading-[1.6]" style={{ color: 'var(--app-body-text)' }}>
              {retainedDataItems.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    </div>
  )
}
