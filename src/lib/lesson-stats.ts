import {
  countLessonsInScheduleDateRange,
  isScheduleDateKeyInRange,
  storedScheduleDateKey,
} from '@/lib/time-slots'

export type LessonForStats = {
  scheduled_at: string
  status: string
}

const ACTIVE_STATUSES = new Set(['SCHEDULED', 'IN_PROGRESS'])

export function isActiveScheduledLesson(status: string): boolean {
  return ACTIVE_STATUSES.has(status)
}

/** 예정·진행 중 레슨만 — 완료/취소 제외 */
export function filterActiveLessons(lessons: LessonForStats[]): LessonForStats[] {
  return lessons.filter((l) => isActiveScheduledLesson(l.status))
}

export function countActiveLessonsInDateRange(
  lessons: LessonForStats[],
  startKey: string,
  endKeyExclusive: string
): number {
  return filterActiveLessons(lessons).filter((l) =>
    isScheduleDateKeyInRange(l.scheduled_at, startKey, endKeyExclusive)
  ).length
}

/** 기간 내 레슨 중 오늘(포함) 이후 예정·진행 중만 — 주간/월간 통계용 */
export function countUpcomingActiveLessonsInPeriod(
  lessons: LessonForStats[],
  periodStartKey: string,
  periodEndKey: string,
  todayStartKey: string
): number {
  const effectiveStart = periodStartKey > todayStartKey ? periodStartKey : todayStartKey
  if (effectiveStart >= periodEndKey) return 0
  return countActiveLessonsInDateRange(lessons, effectiveStart, periodEndKey)
}

/** 디버그/검증용 — 날짜별 활성 레슨 수 */
export function groupActiveLessonsByDate(lessons: LessonForStats[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const l of filterActiveLessons(lessons)) {
    const key = storedScheduleDateKey(l.scheduled_at)
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return map
}
