'use client'

import { MagnifyingGlass } from '@phosphor-icons/react'

interface Props {
  value: string
  onChange: (v: string) => void
  onSearch: () => void
}

export default function PlayerSearchBar({ value, onChange, onSearch }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch()
  }

  return (
    <div className="flex items-center h-14 bg-zinc-100 rounded-xl px-4 gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="선수 이름 검색"
        className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-zinc-400"
      />
      <button
        type="button"
        onClick={onSearch}
        className="flex items-center justify-center w-10 h-10 rounded-lg active:bg-zinc-200"
      >
        <MagnifyingGlass size={24} className="text-zinc-500" weight="bold" />
      </button>
    </div>
  )
}
