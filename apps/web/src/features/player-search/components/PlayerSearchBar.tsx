'use client'

import { MagnifyingGlass } from '@phosphor-icons/react'

interface Props {
  value: string
  onChange: (v: string) => void
}

export default function PlayerSearchBar({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 bg-zinc-100 rounded-xl px-4 py-3">
      <MagnifyingGlass size={18} className="text-zinc-400" weight="bold" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="선수 이름 검색"
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
      />
    </div>
  )
}
