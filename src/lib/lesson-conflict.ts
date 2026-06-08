import { formatStoredScheduleDate, formatStoredScheduleTimeRange } from '@/lib/time-slots'

type TimeInterval = { start: Date; end: Date }

export function toInterval(scheduledAt: string, durationMin: number): TimeInterval {
  const start = new Date(scheduledAt)
  return { start, end: new Date(start.getTime() + durationMin * 60_000) }
}

export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  return a.start < b.end && b.start < a.end
}

export function formatScheduleLabel(scheduledAt: string, durationMin: number): string {
  return `${formatStoredScheduleDate(scheduledAt)} ${formatStoredScheduleTimeRange(scheduledAt, durationMin)}`
}

export function getLessonQueryRange(lessonDates: string[]): { start: string; end: string } {
  const sorted = [...lessonDates].sort()
  const minDate = sorted[0]
  const maxDate = sorted[sorted.length - 1]

  const queryStart = new Date(`${minDate}T00:00:00Z`)
  queryStart.setUTCDate(queryStart.getUTCDate() - 1)

  const queryEnd = new Date(`${maxDate}T00:00:00Z`)
  queryEnd.setUTCDate(queryEnd.getUTCDate() + 2)

  return {
    start: queryStart.toISOString(),
    end: queryEnd.toISOString(),
  }
}

type NameRef = { name: string } | { name: string }[] | null | undefined

type ExistingLesson = {
  scheduled_at: string
  duration_min: number
  coach_id: string
  court_id: string | null
  member?: NameRef
  coach?: NameRef
  court?: NameRef
}

type ExistingReservation = {
  start_at: string
  end_at: string
  title: string
}

type ProposedLesson = {
  scheduled_at: string
  duration_min: number
}

function getName(val: NameRef, fallback: string): string {
  if (!val) return fallback
  return Array.isArray(val) ? (val[0]?.name ?? fallback) : val.name
}

function formatLessonConflictDetail(lesson: ExistingLesson): string {
  const court = getName(lesson.court, '—')
  const coach = getName(lesson.coach, '—')
  const member = getName(lesson.member, '—')
  const time = formatStoredScheduleTimeRange(lesson.scheduled_at, lesson.duration_min)
  return `코트 ${court} · ${coach} 코치 · ${member} 회원 · ${time}`
}

function formatReservationTimeRange(startAt: string, endAt: string): string {
  const startMs = new Date(startAt).getTime()
  const endMs = new Date(endAt).getTime()
  const durationMin = Math.max(1, Math.round((endMs - startMs) / 60_000))
  return formatStoredScheduleTimeRange(startAt, durationMin)
}

export function formatBulkRepeatConflict(
  courtName: string,
  scheduledAt: string,
  durationMin: number
): string {
  const time = formatStoredScheduleTimeRange(scheduledAt, durationMin)
  return courtName
    ? `등록하려는 반복 일정끼리 시간이 겹칩니다.\n코트 ${courtName} · ${time}`
    : `등록하려는 반복 일정끼리 시간이 겹칩니다.\n${time}`
}

export function findScheduleConflict(
  proposed: ProposedLesson,
  coachId: string,
  courtId: string | null,
  courtName: string,
  existingLessons: ExistingLesson[],
  reservations: ExistingReservation[]
): string | null {
  const proposedInterval = toInterval(proposed.scheduled_at, proposed.duration_min)

  for (const lesson of existingLessons) {
    const existing = toInterval(lesson.scheduled_at, lesson.duration_min)
    if (!intervalsOverlap(proposedInterval, existing)) continue

    const detail = formatLessonConflictDetail(lesson)

    if (courtId && lesson.court_id === courtId) {
      return `같은 코트·시간대에 이미 레슨이 있습니다.\n${detail}`
    }

    if (lesson.coach_id === coachId) {
      return `코치 일정이 다른 레슨과 겹칩니다.\n${detail}`
    }
  }

  for (const res of reservations) {
    const reservation: TimeInterval = {
      start: new Date(res.start_at),
      end: new Date(res.end_at),
    }
    if (!intervalsOverlap(proposedInterval, reservation)) continue
    const time = formatReservationTimeRange(res.start_at, res.end_at)
    return `코트 ${courtName} · ${time} · '${res.title}' 예약과 시간이 겹칩니다.`
  }

  return null
}
