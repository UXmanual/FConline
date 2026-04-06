const VOLTA_RECOMMENDED_COACHES = [
  {
    id: '64',
    name: '타이탄',
    imageSrc: 'https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_64.png',
    summary: '공중볼 경합 체감이 좋아 볼타에서 선호됩니다.',
  },
  {
    id: '62',
    name: '블로커',
    imageSrc: 'https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_62.png',
    summary: '슈팅 차단 체감 때문에 수비 코치로 많이 씁니다.',
  },
  {
    id: '55',
    name: '2개의 심장',
    imageSrc: 'https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_55.png',
    summary: '활동량이 많은 볼타에서 스태미너 유지에 좋습니다.',
  },
  {
    id: '56',
    name: '파이터',
    imageSrc: 'https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_56.png',
    summary: '몸싸움과 압박 체감 때문에 자주 추천됩니다.',
  },
  {
    id: '54',
    name: '체이서',
    imageSrc: 'https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_54.png',
    summary: '역습 추격 체감이 좋아 수비 코치로 거론됩니다.',
  },
] as const

export default function VoltaPopularCoachCard() {
  return (
    <section className="app-theme-card rounded-lg border px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="app-theme-title text-sm font-semibold">
            <span style={{ color: 'var(--app-volta-accent-fg)' }}>볼타</span>
            <span>{' 추천 훈련코치 5종'}</span>
          </h2>
        </div>
        <span
          className="inline-flex h-7 items-center justify-center rounded-[8px] px-3 text-[12px] font-semibold leading-none"
          style={{
            backgroundColor: 'var(--app-volta-accent-bg)',
            color: 'var(--app-volta-accent-fg)',
          }}
        >
          COACH
        </span>
      </div>

      <div className="mt-3">
        {VOLTA_RECOMMENDED_COACHES.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-start justify-between gap-3 py-3 ${index === VOLTA_RECOMMENDED_COACHES.length - 1 ? 'pb-0' : 'app-theme-divider border-b'}`}
          >
            <div className="flex min-w-0 items-start gap-3">
              <img
                src={item.imageSrc}
                alt={item.name}
                className="h-11 w-11 shrink-0 rounded-lg object-cover"
                draggable={false}
              />

              <div className="min-w-0">
                <p className="app-theme-title text-sm font-semibold">{item.name}</p>
                <p className="app-theme-body mt-1 text-[12px] leading-5">{item.summary}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
