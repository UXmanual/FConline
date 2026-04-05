type Props = {
  rows?: number
  iconShape?: 'square' | 'circle'
  iconSizeClassName?: string
  className?: string
}

export default function CardListSkeleton({
  rows = 5,
  iconShape = 'square',
  iconSizeClassName = 'h-12 w-12',
  className = '',
}: Props) {
  const iconRadiusClassName = iconShape === 'circle' ? 'rounded-full' : 'rounded-lg'

  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className={`flex items-center justify-between gap-3 py-3 ${index === rows - 1 ? 'pb-0' : 'border-b'}`}
          style={index === rows - 1 ? undefined : { borderColor: 'var(--app-divider)', transition: 'border-color 180ms ease' }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={`home-image-shimmer shrink-0 ${iconSizeClassName} ${iconRadiusClassName}`}
            />
            <div className="min-w-0 flex-1">
              <div className="home-image-shimmer h-4 w-[58%] rounded-full" />
              <div className="home-image-shimmer mt-2 h-3.5 w-[74%] rounded-full" />
            </div>
          </div>
          <div className="home-image-shimmer h-4 w-14 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  )
}
