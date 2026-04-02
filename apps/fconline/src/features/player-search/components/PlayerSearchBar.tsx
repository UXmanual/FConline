'use client'

import { MagnifyingGlass } from '@phosphor-icons/react'
import { useRef } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  onSearch: () => void
}

export default function PlayerSearchBar({
  value,
  onChange,
  onSearch,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const runSearch = () => {
    onSearch()
    inputRef.current?.blur()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return
    }

    event.preventDefault()
    runSearch()
  }

  return (
    <div className="flex h-14 items-center gap-2 rounded-lg border border-[#58616a] bg-white px-4 focus-within:border-2 focus-within:border-[#256ef4]">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="선수 이름 검색"
        className="min-w-0 flex-1 bg-transparent text-[15px] text-[#1e2124] outline-none placeholder:text-[#8a949e]"
      />

      <button
        type="button"
        onClick={runSearch}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md active:bg-[#f4f5f6]"
      >
        <MagnifyingGlass size={24} className="text-[#464c53]" weight="bold" />
      </button>
    </div>
  )
}
