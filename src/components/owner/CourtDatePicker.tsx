'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'

type Props = {
  currentDate: string   // YYYY-MM-DD
  isToday: boolean
  dayLabel: string
}

export function CourtDatePicker({ currentDate, isToday, dayLabel }: Props) {
  const router  = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.value) router.push(`/owner/courts?date=${e.target.value}`)
  }

  return (
    <div className="flex items-center gap-3">
      {/* 달력 아이콘 버튼 */}
      <div className="relative">
        <button
          onClick={() => inputRef.current?.showPicker?.()}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:border-zinc-500 transition-colors"
          aria-label="날짜 선택"
        >
          <svg className="w-4 h-4 text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </button>
        {/* 실제 date input — 보이지 않지만 showPicker()로 트리거 */}
        <input
          ref={inputRef}
          type="date"
          value={currentDate}
          onChange={handleChange}
          className="absolute inset-0 opacity-0 pointer-events-none"
          tabIndex={-1}
        />
      </div>

      {/* 날짜 텍스트 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">코트 관리</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {dayLabel}
          {isToday && (
            <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-volta/15 text-volta">
              오늘
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
