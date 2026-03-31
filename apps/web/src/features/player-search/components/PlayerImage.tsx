'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { getPlayerImageCandidates } from '../player-image'

interface Props {
  spid: number | string
  alt: string
  className?: string
  sizes?: string
}

export default function PlayerImage({ spid, alt, className, sizes }: Props) {
  const candidates = useMemo(() => getPlayerImageCandidates(spid), [spid])
  const [srcIndex, setSrcIndex] = useState(0)

  return (
    <Image
      src={candidates[srcIndex] ?? '/player-fallback.svg'}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      unoptimized
      onError={() => {
        setSrcIndex((current) => {
          if (current >= candidates.length) {
            return current
          }

          return current + 1
        })
      }}
    />
  )
}
