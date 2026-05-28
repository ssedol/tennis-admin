'use client'

import type { OwnerPeriod, OwnerPeriodKeys } from '@/lib/owner-schedule-groups'

interface Props {
  period: OwnerPeriod
  onPeriodChange: (period: OwnerPeriod) => void
  yearly: number
  monthly: number
  weekly: number
  today: number
  coachCount: number
  memberCount: number
  periodKeys: OwnerPeriodKeys
}

const TABS: { id: OwnerPeriod; label: string }[] = [
  { id: 'today', label: '오늘' },
  { id: 'weekly', label: '주간' },
  { id: 'monthly', label: '월간' },
  { id: 'yearly', label: '연간' },
]

function formatWeekLabel(weekStart: string, weekEnd: string) {
  const [, sm, sd] = weekStart.split('-').map(Number)
  const end = new Date(`${weekEnd}T00:00:00.000Z`)
  end.setUTCDate(end.getUTCDate() - 1)
  const em = end.getUTCMonth() + 1
  const ed = end.getUTCDate()
  return `${sm}/${sd} ~ ${em}/${ed} (월~일)`
}

export function StatsPanel({
  period,
  onPeriodChange,
  yearly,
  monthly,
  weekly,
  today,
  coachCount,
  memberCount,
  periodKeys,
}: Props) {
  const counts: Record<OwnerPeriod, number> = { today, yearly, monthly, weekly }
  const year = periodKeys.yearStart.slice(0, 4)
  const month = Number(periodKeys.monthStart.split('-')[1])

  return (
    <div className="mb-6">
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

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onPeriodChange(tab.id)}
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

        <div className="px-5 py-4 flex items-end gap-2">
          <span className="text-4xl font-bold tracking-tight tabular-nums">
            {counts[period].toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground mb-1">레슨</span>
        </div>

        <div className="px-5 pb-4 -mt-1">
          <p className="text-[11px] text-muted-foreground">
            {period === 'today' && '오늘 예정·진행 중'}
            {period === 'yearly' && `${year}년 남은 일정 (오늘부터 · 예정·진행 중)`}
            {period === 'monthly' && `${month}월 남은 일정 (오늘부터 · 예정·진행 중)`}
            {period === 'weekly' &&
              `${formatWeekLabel(periodKeys.weekStart, periodKeys.weekEnd)} · 오늘부터 · 예정·진행 중`}
          </p>
        </div>
      </div>
    </div>
  )
}
