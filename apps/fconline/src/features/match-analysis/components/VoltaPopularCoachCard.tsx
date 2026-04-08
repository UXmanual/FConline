const VOLTA_RECOMMENDED_COACHES = [
  {
    id: '64',
    name: '\uD0C0\uC774\uD0C4',
    imageSrc: 'https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_64.png',
    summary: '\uACF5\uC911\uBCFC \uACBD\uD569 \uCCB4\uAC10\uC774 \uC88B\uC544 \uBCFC\uD0C0\uC5D0\uC11C \uC120\uD638\uB429\uB2C8\uB2E4.',
  },
  {
    id: '62',
    name: '\uBE14\uB85C\uCEE4',
    imageSrc: 'https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_62.png',
    summary: '\uC288\uD305 \uCC28\uB2E8 \uCCB4\uAC10 \uB54C\uBB38\uC5D0 \uC218\uBE44 \uCF54\uCE58\uB85C \uB9CE\uC774 \uC4F0\uC785\uB2C8\uB2E4.',
  },
  {
    id: '55',
    name: '2\uAC1C\uC758 \uC2EC\uC7A5',
    imageSrc: 'https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_55.png',
    summary: '\uD65C\uB3D9\uB7C9\uC774 \uB9CE\uC740 \uBCFC\uD0C0\uC5D0\uC11C \uC2A4\uD0DC\uBBF8\uB108 \uC720\uC9C0\uC5D0 \uC88B\uC2B5\uB2C8\uB2E4.',
  },
  {
    id: '56',
    name: '\uD30C\uC774\uD130',
    imageSrc: 'https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_56.png',
    summary: '\uBAB8\uC2F8\uC6C0\uACFC \uC555\uBC15 \uCCB4\uAC10 \uB54C\uBB38\uC5D0 \uC790\uC8FC \uCD94\uCC9C\uB429\uB2C8\uB2E4.',
  },
  {
    id: '54',
    name: '\uCCB4\uC774\uC11C',
    imageSrc: 'https://fco.dn.nexoncdn.co.kr/live/externalAssets/common/traits/trait_icon_54.png',
    summary: '\uC5ED\uC2B5 \uCD94\uACA9 \uCCB4\uAC10\uC774 \uC88B\uC544 \uC218\uBE44 \uCF54\uCE58\uB85C \uAC70\uB860\uB429\uB2C8\uB2E4.',
  },
] as const

export default function VoltaPopularCoachCard() {
  return (
    <section className="app-theme-card rounded-lg border px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="app-theme-title text-sm font-semibold">
            <span style={{ color: 'var(--app-volta-accent-fg)' }}>{'\uBCFC\uD0C0'}</span>
            <span>{' \uCD94\uCC9C \uD6C8\uB828\uCF54\uCE58 5\uC885'}</span>
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
