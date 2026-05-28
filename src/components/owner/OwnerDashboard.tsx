'use client'

import { useMemo, useState } from 'react'
import {
  filterLessonsForPeriod,
  scheduleSectionTitle,
  type CourtMeta,
  type OwnerPeriod,
  type OwnerPeriodKeys,
  type OwnerScheduleLesson,
} from '@/lib/owner-schedule-groups'
import { StatsPanel } from '@/components/owner/StatsPanel'
import { OwnerScheduleView } from '@/components/owner/OwnerScheduleView'

interface Props {
  yearly: number
  monthly: number
  weekly: number
  today: number
  coachCount: number
  memberCount: number
  periodKeys: OwnerPeriodKeys
  lessons: OwnerScheduleLesson[]
  courts: CourtMeta[]
}

const EMPTY_LABELS: Record<OwnerPeriod, string> = {
  today: '오늘 등록된 레슨이 없습니다',
  weekly: '이번 주 남은 레슨이 없습니다',
  monthly: '이번 달 남은 레슨이 없습니다',
  yearly: '올해 남은 레슨이 없습니다',
}

export function OwnerDashboard({
  yearly,
  monthly,
  weekly,
  today,
  coachCount,
  memberCount,
  periodKeys,
  lessons,
  courts,
}: Props) {
  const [period, setPeriod] = useState<OwnerPeriod>('today')

  const filteredLessons = useMemo(
    () => filterLessonsForPeriod(lessons, period, periodKeys),
    [lessons, period, periodKeys]
  )

  return (
    <>
      <StatsPanel
        period={period}
        onPeriodChange={setPeriod}
        yearly={yearly}
        monthly={monthly}
        weekly={weekly}
        today={today}
        coachCount={coachCount}
        memberCount={memberCount}
        periodKeys={periodKeys}
      />

      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        {scheduleSectionTitle(period)} · {filteredLessons.length}건
      </p>

      <OwnerScheduleView
        period={period}
        lessons={filteredLessons}
        courts={courts}
        emptyLabel={EMPTY_LABELS[period]}
      />
    </>
  )
}
