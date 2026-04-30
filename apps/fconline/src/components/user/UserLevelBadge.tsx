import { formatLevelLabel, getLevelTextColor } from '@/lib/userLevel'

type Props = {
  level?: number | null
  className?: string
}

export default function UserLevelBadge({ level, className = '' }: Props) {
  if (!Number.isFinite(level)) {
    return null
  }

  return (
    <span
      className={`inline-flex items-center text-[12px] font-semibold leading-none ${className}`.trim()}
      style={{ color: getLevelTextColor(level) }}
    >
      {formatLevelLabel(level)}
    </span>
  )
}
