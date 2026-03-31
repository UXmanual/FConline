interface IconProps {
  size?: number
  filled?: boolean
  className?: string
}

// 선수정보 — 에일리언 헤드 (눈 컷아웃 compound path)
export function PlayerIcon({ size = 26, filled = false, className }: IconProps) {
  if (filled) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          fill="currentColor"
          d="M12 1C6.8 1 2.5 5.2 2.5 10.5C2.5 17 7 22.5 12 24C17 22.5 21.5 17 21.5 10.5C21.5 5.2 17.2 1 12 1ZM7.8 10.2C8.2 7.6 10.6 6.8 11.8 9.4C12.4 11.3 11.2 13.4 9.4 13.4C7.8 13.4 7.5 11.6 7.8 10.2ZM16.2 10.2C15.8 7.6 13.4 6.8 12.2 9.4C11.6 11.3 12.8 13.4 14.6 13.4C16.2 13.4 16.5 11.6 16.2 10.2Z"
        />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 1C6.8 1 2.5 5.2 2.5 10.5C2.5 17 7 22.5 12 24C17 22.5 21.5 17 21.5 10.5C21.5 5.2 17.2 1 12 1Z"
        stroke="currentColor" strokeWidth="1.6"
      />
      <path
        d="M7.8 10.2C8.2 7.6 10.6 6.8 11.8 9.4C12.4 11.3 11.2 13.4 9.4 13.4C7.8 13.4 7.5 11.6 7.8 10.2Z"
        stroke="currentColor" strokeWidth="1.3"
      />
      <path
        d="M16.2 10.2C15.8 7.6 13.4 6.8 12.2 9.4C11.6 11.3 12.8 13.4 14.6 13.4C16.2 13.4 16.5 11.6 16.2 10.2Z"
        stroke="currentColor" strokeWidth="1.3"
      />
    </svg>
  )
}

// 경기정보 — 막대그래프 + 상승 추세 화살표
export function MatchIcon({ size = 26, filled = false, className }: IconProps) {
  if (filled) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
        <rect x="1" y="18" width="4" height="6" rx="1.3" fill="currentColor" />
        <rect x="6.5" y="14" width="4" height="10" rx="1.3" fill="currentColor" />
        <rect x="12" y="10" width="4" height="14" rx="1.3" fill="currentColor" />
        <rect x="17.5" y="6.5" width="5" height="17.5" rx="1.3" fill="currentColor" />
        {/* 굵은 추세 화살표 (솔리드) */}
        <path
          d="M2 19 L4 16.8 L16.5 7 L14 5.5 L22 2 L21.5 10 L19 8.5 L6.5 18.5 L8.5 20 Z"
          fill="currentColor"
        />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="1" y="18" width="4" height="6" rx="1.3" stroke="currentColor" strokeWidth="1.5" />
      <rect x="6.5" y="14" width="4" height="10" rx="1.3" stroke="currentColor" strokeWidth="1.5" />
      <rect x="12" y="10" width="4" height="14" rx="1.3" stroke="currentColor" strokeWidth="1.5" />
      <rect x="17.5" y="6.5" width="5" height="17.5" rx="1.3" stroke="currentColor" strokeWidth="1.5" />
      {/* 추세선 + 오픈 화살표 */}
      <path
        d="M2 18.5 L7.5 12.5 L12.5 16.5 L21 6"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M16.5 4.5 L22 4.5 L22 10"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

// 커뮤니티 — 둥근 말풍선 (꼬리 왼쪽 하단)
export function CommunityIcon({ size = 26, filled = false, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {filled ? (
        <path
          d="M4 3H20C21.7 3 23 4.3 23 6V16C23 17.7 21.7 19 20 19H12L5.5 23.5V19H4C2.3 19 1 17.7 1 16V6C1 4.3 2.3 3 4 3Z"
          fill="currentColor"
        />
      ) : (
        <path
          d="M4 3H20C21.7 3 23 4.3 23 6V16C23 17.7 21.7 19 20 19H12L5.5 23.5V19H4C2.3 19 1 17.7 1 16V6C1 4.3 2.3 3 4 3Z"
          stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

// 더보기 — 지문 (동심 호 5개)
export function MoreIcon({ size = 26, filled = false, className }: IconProps) {
  const sw = filled ? 2.0 : 1.65
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* 최외곽 호 */}
      <path
        d="M2.5 11C2.5 5.8 6.8 1.5 12 1.5C17.2 1.5 21.5 5.8 21.5 11"
        stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
      />
      {/* 두번째 호 */}
      <path
        d="M4.5 13.5C4.5 8.8 7.9 5.5 12 5.5C16.1 5.5 19.5 8.8 19.5 13.5"
        stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
      />
      {/* 세번째 호 — 루프 시작 */}
      <path
        d="M6.5 16C6.5 12 8.8 9 12 9C15.2 9 17.5 12 17.5 16C17.5 19 16 21 14.5 22"
        stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
      />
      {/* 네번째 호 */}
      <path
        d="M8.5 19C8.5 16 10 12.5 12 12.5C14 12.5 15.5 15 15 18C14.5 20.5 13 22 12 22.5"
        stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
      />
      {/* 내부 루프 */}
      <path
        d="M10.5 21.5C10.5 19.5 11 16.5 12 16.5C13 16.5 13.5 18.5 13 20.5"
        stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
      />
      {/* 하단 연결 호 */}
      <path
        d="M3 19C4.5 22.5 8 24.5 12 24.5C16 24.5 19.5 22.5 21 19"
        stroke="currentColor" strokeWidth={sw} strokeLinecap="round"
      />
    </svg>
  )
}
