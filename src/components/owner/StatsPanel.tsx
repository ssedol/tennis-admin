'use client'

import { useState } from 'react'

type Period = 'yearly' | 'monthly' | 'weekly'

interface Props {
  yearly: number
  monthly: number
  weekly: number
  coachCount: number
  memberCount: number
}

const TABS: { id: Period; label: string }[] = [
  { id: 'weekly',  label: '주간' },
  { id: 'monthly', label: '월간' },
  { id: 'yearly',  label: '연간' },
]

export function StatsPanel({ yearly, monthly, weekly, coachCount, memberCount }: Props) {
  const [period, setPeriod] = useState<Period>('weekly')

  const counts: Record<Period, number> = { yearly, monthly, weekly }

  return (
    <div className="mb-6">
      {/* 코치 · 회원 수 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-volta" />
          <span className="text-xs text-muted-foreground">코치</span>
          <span className="text-xs font-semibold text-foreground">{coachCount}명</span>
        </div>
        <div className="w-px h-3 bg-border" />
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary border border-border" />
          <span className="text-xs text-muted-foreground">회원</span>
          <span className="text-xs font-semibold text-foreground">{memberCount}명</span>
        </div>
      </div>

      {/* 기간별 레슨 카드 */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* 탭 */}
        <div className="flex border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors relative ${
                period === tab.id
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {period === tab.id && (
                <span className="absolute bottom-0 inset-x-0 h-0.5 bg-volta rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* 숫자 */}
        <div className="px-5 py-4 flex items-end gap-2">
          <span className="text-4xl font-bold tracking-tight tabular-nums">
            {counts[period].toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground mb-1">레슨</span>
        </div>

        {/* 서브 텍스트 */}
        <div className="px-5 pb-4 -mt-1">
          <p className="text-[11px] text-muted-foreground">
            {period === 'yearly'  && `${new Date().getFullYear()}년 전체`}
            {period === 'monthly' && `${new Date().getMonth() + 1}월 전체`}
            {period === 'weekly'  && '이번 주 (월~일)'}
          </p>
        </div>
      </div>
    </div>
  )
}
