interface Props {
  size?: number
  className?: string
}

export default function SelectChevron({ size = 14, className }: Props) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute top-1/2 -translate-y-1/2 ${className ?? ''}`.trim()}
      style={{ color: 'var(--app-title)' }}
    >
      <svg width={size} height={size} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M3 4.5L6 7.5L9 4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
