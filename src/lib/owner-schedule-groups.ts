import { isActiveScheduledLesson } from '@/lib/lesson-stats'
import {
  formatStoredScheduleDate,
  isScheduleDateKeyInRange,
  storedScheduleDateKey,
  ymdKey,
} from '@/lib/time-slots'

export type OwnerPeriod = 'today' | 'weekly' | 'monthly' | 'yearly'

export type OwnerPeriodKeys = {
  todayStart: string
  todayEnd: string
  weekStart: string
  weekEnd: string
  monthStart: string
  monthEnd: string
  yearStart: string
  yearEnd: string
}

export type OwnerScheduleLesson = {
  id: string
  scheduled_at: string
  duration_min: number
  status: string
  court_id: string | null
  member: { name: string } | { name: string }[] | null
  coach: { name: string } | { name: string }[] | null
  court: { name: string } | { name: string }[] | null
}

export type CourtMeta = { id: string; name: string; sort_order: number }

export function getRelationName(val: { name: string } | { name: string }[] | null): string {
  if (!val) return '—'
  return Array.isArray(val) ? (val[0]?.name ?? '—') : val.name
}

export function sortLessonsByTime(lessons: OwnerScheduleLesson[]): OwnerScheduleLesson[] {
  return [...lessons].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  )
}

export function filterLessonsForPeriod(
  lessons: OwnerScheduleLesson[],
  period: OwnerPeriod,
  periodKeys: OwnerPeriodKeys
): OwnerScheduleLesson[] {
  const active = lessons.filter((l) => isActiveScheduledLesson(l.status))

  const rangeByPeriod: Record<OwnerPeriod, [string, string, boolean]> = {
    today: [periodKeys.todayStart, periodKeys.todayEnd, false],
    weekly: [periodKeys.weekStart, periodKeys.weekEnd, true],
    monthly: [periodKeys.monthStart, periodKeys.monthEnd, true],
    yearly: [periodKeys.yearStart, periodKeys.yearEnd, true],
  }

  const [start, end, upcomingOnly] = rangeByPeriod[period]
  const effectiveStart =
    upcomingOnly && start < periodKeys.todayStart ? periodKeys.todayStart : start

  if (effectiveStart >= end) return []

  return sortLessonsByTime(
    active.filter((l) =>
      isScheduleDateKeyInRange(l.scheduled_at, effectiveStart, end)
    )
  )
}

export function scheduleSectionTitle(period: OwnerPeriod): string {
  const titles: Record<OwnerPeriod, string> = {
    today: '오늘 일정',
    weekly: '주간 일정',
    monthly: '월간 일정',
    yearly: '연간 일정',
  }
  return titles[period]
}

export function weekStartKeyFromDateKey(dateKey: string): string {
  const [y, mo, d] = dateKey.split('-').map(Number)
  const dt = new Date(Date.UTC(y, mo - 1, d))
  const dow = dt.getUTCDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  return ymdKey(y, mo - 1, d + mondayOffset)
}

export function formatWeekDateRange(weekStartKey: string): string {
  const [y, mo, d] = weekStartKey.split('-').map(Number)
  const start = new Date(Date.UTC(y, mo - 1, d))
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)
  const fmt = (dt: Date) =>
    `${String(dt.getUTCMonth() + 1).padStart(2, '0')}/${String(dt.getUTCDate()).padStart(2, '0')}`
  return `${fmt(start)} ~ ${fmt(end)}`
}

export function formatWeekOrdinalLabel(weekIndex: number, weekStartKey: string): string {
  return `${weekIndex}주차 (${formatWeekDateRange(weekStartKey)})`
}

export function formatMonthLabel(monthKey: string): string {
  const [y, mo] = monthKey.split('-').map(Number)
  return `${y}년 ${mo}월`
}

export function groupLessonsByCourt(
  lessons: OwnerScheduleLesson[],
  courts: CourtMeta[]
): { courtId: string | null; courtName: string; lessons: OwnerScheduleLesson[] }[] {
  const orderMap = new Map(courts.map((c) => [c.id, c.sort_order]))
  const nameMap = new Map(courts.map((c) => [c.id, c.name]))
  const map = new Map<string | null, OwnerScheduleLesson[]>()

  for (const lesson of lessons) {
    const id = lesson.court_id ?? null
    if (!map.has(id)) map.set(id, [])
    map.get(id)!.push(lesson)
  }

  const groups = [...map.entries()].map(([courtId, items]) => ({
    courtId,
    courtName: courtId
      ? (nameMap.get(courtId) ?? getRelationName(items[0]?.court ?? null))
      : '코트 미지정',
    lessons: sortLessonsByTime(items),
  }))

  groups.sort((a, b) => {
    if (a.courtId === null) return 1
    if (b.courtId === null) return -1
    return (orderMap.get(a.courtId) ?? 999) - (orderMap.get(b.courtId) ?? 999)
  })

  return groups
}

export function groupLessonsByDate(lessons: OwnerScheduleLesson[]) {
  const map = new Map<string, OwnerScheduleLesson[]>()
  for (const lesson of lessons) {
    const key = storedScheduleDateKey(lesson.scheduled_at)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(lesson)
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({
      key,
      label: formatStoredScheduleDate(items[0].scheduled_at),
      lessons: sortLessonsByTime(items),
    }))
}

export function groupLessonsByWeek(lessons: OwnerScheduleLesson[]) {
  const map = new Map<string, OwnerScheduleLesson[]>()
  for (const lesson of lessons) {
    const dateKey = storedScheduleDateKey(lesson.scheduled_at)
    const weekKey = weekStartKeyFromDateKey(dateKey)
    if (!map.has(weekKey)) map.set(weekKey, [])
    map.get(weekKey)!.push(lesson)
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items], index) => ({
      key,
      label: formatWeekOrdinalLabel(index + 1, key),
      lessons: sortLessonsByTime(items),
    }))
}

export function groupLessonsByMonth(lessons: OwnerScheduleLesson[]) {
  const map = new Map<string, OwnerScheduleLesson[]>()
  for (const lesson of lessons) {
    const monthKey = storedScheduleDateKey(lesson.scheduled_at).slice(0, 7)
    if (!map.has(monthKey)) map.set(monthKey, [])
    map.get(monthKey)!.push(lesson)
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({
      key,
      label: formatMonthLabel(key),
      lessons: sortLessonsByTime(items),
    }))
}

export function groupLessonsByWeekThenDay(lessons: OwnerScheduleLesson[]) {
  return groupLessonsByWeek(lessons).map((week) => ({
    ...week,
    days: groupLessonsByDate(week.lessons),
  }))
}

export function groupLessonsByMonthWeekDay(lessons: OwnerScheduleLesson[]) {
  return groupLessonsByMonth(lessons).map((month) => ({
    ...month,
    weeks: groupLessonsByWeekThenDay(month.lessons),
  }))
}
