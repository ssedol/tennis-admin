const MAX_RECURRING_LESSONS = 200

/** JavaScript Date.getDay() — 0=일, 1=월 … 6=토 */
export const WEEKDAY_OPTIONS = [
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' },
  { value: 0, label: '일' },
] as const

export type Weekday = (typeof WEEKDAY_OPTIONS)[number]['value']

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getWeekdayFromDate(dateStr: string): Weekday {
  return parseLocalDate(dateStr).getDay() as Weekday
}

/** 시작일~종료일 사이 선택 요일에 해당하는 날짜 목록 */
export function getRecurringLessonDates(
  startDate: string,
  endDate: string,
  weekdays: number[]
): string[] {
  const validWeekdays = new Set(
    weekdays.filter((d) => d >= 0 && d <= 6)
  )
  if (validWeekdays.size === 0) return []

  const start = parseLocalDate(startDate)
  const end = parseLocalDate(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return []
  }

  const dates: string[] = []
  const cur = new Date(start)
  while (cur <= end) {
    if (validWeekdays.has(cur.getDay())) {
      dates.push(formatLocalDate(cur))
      if (dates.length >= MAX_RECURRING_LESSONS) break
    }
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

export { MAX_RECURRING_LESSONS }
