interface IconProps {
  size?: number
  filled?: boolean
  className?: string
}

// 선수정보 — 사람 실루엣 (SF Symbols 스타일)
export function PlayerIcon({ size = 26, filled = false, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" className={className}>
      {filled ? (
        <>
          <circle cx="13" cy="8" r="4" fill="currentColor" />
          <path
            d="M5 21.5c0-4.418 3.582-8 8-8s8 3.582 8 8"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none"
          />
        </>
      ) : (
        <>
          <circle cx="13" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M5 21.5c0-4.418 3.582-8 8-8s8 3.582 8 8"
            stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
          />
        </>
      )}
    </svg>
  )
}

// 경기정보 — 축구공 (FC Online 특화)
export function MatchIcon({ size = 26, filled = false, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" className={className}>
      <circle
        cx="13" cy="13" r="9"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor" strokeWidth={filled ? 0 : 1.7}
      />
      <polygon
        points="13,8.5 15.2,10.1 14.4,12.6 11.6,12.6 10.8,10.1"
        fill={filled ? 'black' : 'none'}
        stroke={filled ? 'black' : 'currentColor'}
        strokeWidth={filled ? 1.0 : 1.3}
        strokeLinejoin="round"
      />
      <line x1="13" y1="8.5" x2="13" y2="4.5" stroke={filled ? 'black' : 'currentColor'} strokeWidth={filled ? 1.0 : 1.3} strokeLinecap="round" />
      <line x1="15.2" y1="10.1" x2="19.8" y2="8.2" stroke={filled ? 'black' : 'currentColor'} strokeWidth={filled ? 1.0 : 1.3} strokeLinecap="round" />
      <line x1="14.4" y1="12.6" x2="17.2" y2="17" stroke={filled ? 'black' : 'currentColor'} strokeWidth={filled ? 1.0 : 1.3} strokeLinecap="round" />
      <line x1="11.6" y1="12.6" x2="8.8" y2="17" stroke={filled ? 'black' : 'currentColor'} strokeWidth={filled ? 1.0 : 1.3} strokeLinecap="round" />
      <line x1="10.8" y1="10.1" x2="6.2" y2="8.2" stroke={filled ? 'black' : 'currentColor'} strokeWidth={filled ? 1.0 : 1.3} strokeLinecap="round" />
    </svg>
  )
}

// 커뮤니티 — 겹친 말풍선
export function CommunityIcon({ size = 26, filled = false, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" className={className}>
      {filled ? (
        <>
          {/* 뒤 말풍선 */}
          <rect x="8.5" y="11" width="13.5" height="9.5" rx="3.2" fill="currentColor" opacity="0.55" />
          <path d="M9.5 20l-2 2.5V20" fill="currentColor" opacity="0.55" />
          {/* 앞 말풍선 */}
          <rect x="4" y="5.5" width="14" height="9.5" rx="3.2" fill="currentColor" />
          <path d="M6 15l-2 2.5V15" fill="currentColor" />
        </>
      ) : (
        <>
          {/* 뒤 말풍선 */}
          <rect x="8.5" y="11.5" width="13" height="9" rx="3" stroke="currentColor" strokeWidth="1.55" opacity="0.6" />
          <path d="M10 20.5l-1.5 2V20.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
          {/* 앞 말풍선 */}
          <rect x="4" y="5.5" width="13.5" height="9" rx="3" stroke="currentColor" strokeWidth="1.7" />
          <path d="M6 14.5l-2 2.5V14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  )
}

// 더보기 — 2x2 둥근 그리드
export function MoreIcon({ size = 26, filled = false, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" className={className}>
      {filled ? (
        <>
          <rect x="3.5" y="3.5" width="8.5" height="8.5" rx="2.5" fill="currentColor" />
          <rect x="14" y="3.5" width="8.5" height="8.5" rx="2.5" fill="currentColor" />
          <rect x="3.5" y="14" width="8.5" height="8.5" rx="2.5" fill="currentColor" />
          <rect x="14" y="14" width="8.5" height="8.5" rx="2.5" fill="currentColor" />
        </>
      ) : (
        <>
          <rect x="4" y="4" width="8" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.65" />
          <rect x="14" y="4" width="8" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.65" />
          <rect x="4" y="14" width="8" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.65" />
          <rect x="14" y="14" width="8" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.65" />
        </>
      )}
    </svg>
  )
}
