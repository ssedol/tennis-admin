export const SLOT_MINUTES = 20
export const SLOTS_PER_HOUR = 60 / SLOT_MINUTES
export const SLOTS_PER_DAY = 24 * SLOTS_PER_HOUR

export function minutesToTimeLabel(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function slotIndexToMinutes(slot: number): number {
  return slot * SLOT_MINUTES
}

export function slotIndexToTimeLabel(slot: number): string {
  return minutesToTimeLabel(slotIndexToMinutes(slot))
}

export function timeLabelToSlotIndex(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * SLOTS_PER_HOUR + Math.floor(m / SLOT_MINUTES)
}

/** 앱에서 사용하는 UTC ISO(시각을 Z로 저장) → 20분 슬롯 인덱스 */
export function utcIsoToSlotIndex(iso: string): number {
  const d = new Date(iso)
  return d.getUTCHours() * SLOTS_PER_HOUR + Math.floor(d.getUTCMinutes() / SLOT_MINUTES)
}

export function durationToSlotCount(durationMin: number): number {
  return Math.max(1, Math.ceil(durationMin / SLOT_MINUTES))
}

export function dateSlotToUtcIso(date: string, slot: number): string {
  const total = slotIndexToMinutes(slot)
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`
}

/** endSlot 포함 구간 → [start_at, end_at) ISO */
export function slotRangeToUtcIso(
  date: string,
  startSlot: number,
  endSlotInclusive: number
): { start_at: string; end_at: string } {
  const start = Math.min(startSlot, endSlotInclusive)
  const end = Math.max(startSlot, endSlotInclusive)
  const start_at = dateSlotToUtcIso(date, start)
  const endExclusive = end + 1

  if (endExclusive < SLOTS_PER_DAY) {
    return { start_at, end_at: dateSlotToUtcIso(date, endExclusive) }
  }

  const nextDay = new Date(`${date}T00:00:00Z`)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  return { start_at, end_at: `${nextDay.toISOString().slice(0, 10)}T00:00:00Z` }
}

export function utcIsoRangeToSlotIndices(startIso: string, endIso: string): number[] {
  const start = utcIsoToSlotIndex(startIso)
  const endExclusive = utcIsoToSlotIndex(endIso)
  const slots: number[] = []
  for (let s = start; s < endExclusive; s++) slots.push(s)
  return slots
}

export function getCurrentSlotIndex(now = new Date()): number {
  return now.getHours() * SLOTS_PER_HOUR + Math.floor(now.getMinutes() / SLOT_MINUTES)
}

export function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}분`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return h === 1 ? '1시간' : `${h}시간`
  return h === 1 ? `1시간 ${m}분` : `${h}시간 ${m}분`
}

export const TIME_SLOT_OPTIONS = Array.from({ length: SLOTS_PER_DAY }, (_, slot) => ({
  value: slot,
  label: slotIndexToTimeLabel(slot),
}))

export const LESSON_DURATION_OPTIONS = [20, 40, 60, 80, 100, 120].map((value) => ({
  value,
  label: formatDurationLabel(value),
}))

export const DEFAULT_START_SLOT = timeLabelToSlotIndex('10:00')

/** DB ISO — 의도한 시·분을 UTC 필드에 그대로 저장한 값 */
export function formatStoredScheduleTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

export function formatStoredScheduleTimeRange(iso: string, durationMin: number): string {
  const start = new Date(iso)
  const end = new Date(start.getTime() + durationMin * 60_000)
  const fmt = (d: Date) =>
    `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
  return `${fmt(start)}–${fmt(end)}`
}

export function formatStoredScheduleDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    timeZone: 'UTC',
  })
}

export function storedScheduleDateKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

const KOREA_TZ = 'Asia/Seoul'

/** 서버/클라이언트 TZ와 무관하게 한국 기준 오늘 날짜 */
export function getKoreaYmd(date = new Date()): { y: number; m: number; d: number } {
  const [y, mo, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: KOREA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .split('-')
    .map(Number)
  return { y, m: mo - 1, d: day }
}

export function koreaDateToUtcIso(y: number, m: number, d: number): string {
  return new Date(Date.UTC(y, m, d)).toISOString()
}

export function ymdKey(y: number, m: number, d: number): string {
  const dt = new Date(Date.UTC(y, m, d))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

/** 한국 기준 today/week/month/year — scheduled_at UTC 날짜 키와 비교 */
export function getKoreaPeriodKeyRanges(date = new Date()) {
  const { y, m, d } = getKoreaYmd(date)
  const dow = new Date(Date.UTC(y, m, d)).getUTCDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow

  return {
    todayStart: ymdKey(y, m, d),
    todayEnd: ymdKey(y, m, d + 1),
    weekStart: ymdKey(y, m, d + mondayOffset),
    weekEnd: ymdKey(y, m, d + mondayOffset + 7),
    monthStart: ymdKey(y, m, 1),
    monthEnd: ymdKey(y, m + 1, 1),
    yearStart: ymdKey(y, 0, 1),
    yearEnd: ymdKey(y + 1, 0, 1),
  }
}

export function isScheduleDateKeyInRange(
  scheduledAt: string,
  startKey: string,
  endKeyExclusive: string
): boolean {
  const key = storedScheduleDateKey(scheduledAt)
  return key >= startKey && key < endKeyExclusive
}

export function countLessonsInScheduleDateRange(
  lessons: { scheduled_at: string }[],
  startKey: string,
  endKeyExclusive: string
): number {
  return lessons.filter((l) =>
    isScheduleDateKeyInRange(l.scheduled_at, startKey, endKeyExclusive)
  ).length
}

/** 기간 내 레슨 중 오늘(포함) 이후 일정만 집계 — 주간/월간/연간 통계용 */
export function countUpcomingLessonsInPeriod(
  lessons: { scheduled_at: string }[],
  periodStartKey: string,
  periodEndKey: string,
  todayStartKey: string
): number {
  const start = periodStartKey > todayStartKey ? periodStartKey : todayStartKey
  if (start >= periodEndKey) return 0
  return countLessonsInScheduleDateRange(lessons, start, periodEndKey)
}
