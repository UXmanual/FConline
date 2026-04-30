'use client'

import { MagnifyingGlass } from '@phosphor-icons/react'
import { useRef, useState } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
  onSearch: () => void
}

export default function PlayerSearchBar({ value, onChange, onSearch }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isFocused, setIsFocused] = useState(false)

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

  const handleContainerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('button')) {
      return
    }

    inputRef.current?.focus()
  }

  return (
    <div
      className="flex h-14 items-center gap-2 rounded-lg px-4"
      style={{
        backgroundColor: 'var(--app-player-card-bg)',
        border: isFocused ? '2px solid #457ae5' : '1px solid var(--app-player-input-border)',
      }}
      onClick={handleContainerClick}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="선수 이름을 입력해주세요"
        className="min-w-0 flex-1 bg-transparent text-[15px] outline-none"
        style={{ color: 'var(--app-player-title)' }}
      />

      <button
        type="button"
        onClick={runSearch}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
      >
        <MagnifyingGlass size={24} className="app-player-body" weight="bold" />
      </button>
    </div>
  )
}
