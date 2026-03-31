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
    <div className="flex items-center h-14 bg-white border border-[#58616a] rounded-lg px-4 gap-2 focus-within:border-2 focus-within:border-[#256ef4]">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="선수 이름 검색"
        className="flex-1 bg-transparent text-[15px] text-[#1e2124] outline-none placeholder:text-[#8a949e]"
      />
      <button
        type="button"
        onClick={onSearch}
        className="flex items-center justify-center w-10 h-10 rounded-md active:bg-[#f4f5f6]"
      >
        <MagnifyingGlass size={24} className="text-[#464c53]" weight="bold" />
      </button>
    </div>
  )
}
