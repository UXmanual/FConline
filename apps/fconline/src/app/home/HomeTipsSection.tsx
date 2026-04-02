import { getTodayTips } from './home-tips'

const SECTION_LABEL = '오늘의 팁'
const SECTION_DESC = '볼타 플레이에 바로 써먹기 좋은 미세 팁만 짧게 모아봤어요.'
const TIP_EMOJI: Record<string, string> = {
  운영: '🧭',
  수비: '🛡️',
  침투: '🏃',
  패스: '🎯',
  연계: '🤝',
  팀플레이: '🧩',
  마무리: '⚽',
  포지션: '📍',
  분석: '📊',
  반응: '⚡',
  움직임: '💨',
  터치: '👟',
  선수선택: '🪪',
  탈압박: '🌀',
  시야: '👀',
  체력: '🔋',
}

export default function HomeTipsSection() {
  const tips = getTodayTips(2)

  if (tips.length === 0) {
    return null
  }

  return (
    <section>
      <div>
        <p className="text-xl font-extrabold tracking-[0.02em] text-[#111827]">{SECTION_LABEL}</p>
        <p className="mt-1 text-sm text-[#6b7280]">{SECTION_DESC}</p>
      </div>

      <div className="mt-4 grid gap-3">
        {tips.map((tip, index) => (
          <article
            key={tip.id}
            className="rounded-[6px] border border-[#e9edf2] bg-white px-4 py-4"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-[#256ef4]">
                TIP {String(index + 1).padStart(2, '0')}
              </span>
              <span
                className="inline-flex h-[1.25em] items-center justify-center overflow-visible text-base leading-[1.25]"
                aria-hidden="true"
              >
                {TIP_EMOJI[tip.label] ?? '✨'}
              </span>
              <span className="text-sm font-bold tracking-[0.02em] text-[#58616a]">
                {tip.label}
              </span>
            </div>

            <p className="mt-2.5 line-clamp-2 text-sm leading-6 text-[#2f343a]">
              {tip.content}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
