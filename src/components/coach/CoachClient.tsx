'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getWeekdayFromDate, WEEKDAY_OPTIONS, type Weekday } from '@/lib/lesson-recurrence'
import {
  DEFAULT_START_SLOT,
  formatStoredScheduleDate,
  formatStoredScheduleTimeRange,
  LESSON_DURATION_OPTIONS,
  storedScheduleDateKey,
  TIME_SLOT_OPTIONS,
  slotIndexToTimeLabel,
} from '@/lib/time-slots'
import { canCoachDeleteLesson, type LessonDeleteTarget } from '@/lib/lesson-delete'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'

type Period = 'today' | 'weekly' | 'monthly'
type Member = { id: string; name: string }
type Court = { id: string; name: string }
type Lesson = {
  id: string
  scheduled_at: string
  duration_min: number
  status: string
  created_by: string
  member: { name: string } | { name: string }[] | null
  court: { name: string } | { name: string }[] | null
}

interface Props {
  period: Period
  title: string
  sub: string
  members: Member[]
  courts: Court[]
  lessons: Lesson[]
  coachProfileId: string
}

const PERIOD_TABS: { id: Period; label: string; param: string }[] = [
  { id: 'today', label: '오늘', param: '' },
  { id: 'weekly', label: '주간', param: 'weekly' },
  { id: 'monthly', label: '월간', param: 'monthly' },
]

function getName(val: { name: string } | { name: string }[] | null | undefined): string {
  if (!val) return '—'
  return Array.isArray(val) ? (val[0]?.name ?? '—') : val.name
}

function formatDateLabel(iso: string) {
  return formatStoredScheduleDate(iso)
}

function formatTimeShort(iso: string, durationMin: number) {
  return formatStoredScheduleTimeRange(iso, durationMin)
}

function dateKey(iso: string) {
  return storedScheduleDateKey(iso)
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: '예정', className: 'bg-secondary text-muted-foreground' },
  IN_PROGRESS: { label: '진행 중', className: 'bg-volta-muted text-volta' },
  COMPLETED: { label: '완료', className: 'bg-emerald-500/10 text-emerald-400' },
  CANCELLED: { label: '취소', className: 'bg-red-500/10 text-red-400' },
}

const DURATION_OPTIONS = LESSON_DURATION_OPTIONS

function todayDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addWeeksDateStr(dateStr: string, weeks: number) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + weeks * 7)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function sortLessonsByTime(lessons: Lesson[]) {
  return [...lessons].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  )
}

function LessonRow({
  lesson,
  actionLoading,
  onStart,
  onEnd,
  onFeedback,
  onDeleteRequest,
  coachProfileId,
}: {
  lesson: Lesson
  actionLoading?: string | null
  coachProfileId: string
  onStart?: (id: string) => void
  onEnd?: (id: string) => void
  onFeedback?: (id: string) => void
  onDeleteRequest?: (target: LessonDeleteTarget) => void
}) {
  const s = STATUS_STYLE[lesson.status] ?? STATUS_STYLE.SCHEDULED
  const memberName = getName(lesson.member)
  const courtName = getName(lesson.court)
  const loading = actionLoading === lesson.id
  const timeLabel = formatTimeShort(lesson.scheduled_at, lesson.duration_min)

  return (
    <div
      className={`flex items-center gap-2 sm:gap-3 px-3 py-2.5 bg-card border rounded-xl ${
        lesson.status === 'IN_PROGRESS' ? 'border-volta/20' : 'border-border'
      }`}
    >
      <span className="text-xs sm:text-sm font-semibold tabular-nums shrink-0 text-foreground w-[92px] sm:w-[100px]">
        {timeLabel}
      </span>

      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="text-sm font-medium truncate">{memberName}</span>
        {courtName !== '—' && (
          <>
            <span className="text-muted-foreground shrink-0">·</span>
            <span className="text-xs text-muted-foreground truncate max-w-[72px] sm:max-w-none">
              {courtName}
            </span>
          </>
        )}
        {canCoachDeleteLesson(lesson.status, lesson.created_by, coachProfileId) && onDeleteRequest && (
          <button
            type="button"
            onClick={() =>
              onDeleteRequest({ id: lesson.id, memberName, courtName, timeLabel })
            }
            disabled={loading}
            className="ml-0.5 shrink-0 text-[10px] px-1.5 py-0.5 rounded-md border border-red-500/25 text-red-400/90 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            {loading ? '…' : '삭제'}
          </button>
        )}
      </div>

      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${s.className}`}>
        {s.label}
      </span>

      <div className="flex items-center gap-1.5 shrink-0">
        {lesson.status === 'SCHEDULED' && onStart && (
          <button
            onClick={() => onStart(lesson.id)}
            disabled={loading}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-volta text-black font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? '…' : '시작'}
          </button>
        )}
        {lesson.status === 'IN_PROGRESS' && onEnd && (
          <button
            onClick={() => onEnd(lesson.id)}
            disabled={loading}
            className="text-[11px] px-2.5 py-1 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {loading ? '…' : '종료'}
          </button>
        )}
        {lesson.status === 'COMPLETED' && onFeedback && (
          <button
            onClick={() => onFeedback(lesson.id)}
            className="text-[11px] px-2.5 py-1 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            피드백
          </button>
        )}
      </div>
    </div>
  )
}

function groupByDate(lessons: Lesson[]) {
  const map = new Map<string, Lesson[]>()
  for (const l of lessons) {
    const key = dateKey(l.scheduled_at)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(l)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({
      key,
      label: formatDateLabel(items[0].scheduled_at),
      items: sortLessonsByTime(items),
    }))
}

type LessonActions = {
  actionLoading: string | null
  coachProfileId: string
  onStart: (id: string) => void
  onEnd: (id: string) => void
  onFeedback: (id: string) => void
  onDeleteRequest: (target: LessonDeleteTarget) => void
}

function TodayView({ lessons, actions }: { lessons: Lesson[]; actions: LessonActions }) {
  const inProgress = sortLessonsByTime(lessons.filter((l) => l.status === 'IN_PROGRESS'))
  const scheduled = sortLessonsByTime(lessons.filter((l) => l.status === 'SCHEDULED'))
  const completed = sortLessonsByTime(lessons.filter((l) => l.status === 'COMPLETED'))

  if (lessons.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        오늘 등록된 레슨이 없습니다
      </div>
    )
  }

  const rowProps = { ...actions }

  return (
    <>
      {inProgress.length > 0 && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">진행 중</p>
          <div className="space-y-1.5 mb-5">
            {inProgress.map((l) => <LessonRow key={l.id} lesson={l} {...rowProps} />)}
          </div>
        </>
      )}
      {scheduled.length > 0 && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">예정</p>
          <div className="space-y-1.5 mb-5">
            {scheduled.map((l) => <LessonRow key={l.id} lesson={l} {...rowProps} />)}
          </div>
        </>
      )}
      {completed.length > 0 && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">완료</p>
          <div className="space-y-1.5">
            {completed.map((l) => <LessonRow key={l.id} lesson={l} {...rowProps} />)}
          </div>
        </>
      )}
    </>
  )
}

function useToggleSet() {
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set())

  function toggle(key: string) {
    setOpenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return { openKeys, toggle }
}

function CollapsibleDayCard({
  label,
  count,
  open,
  onToggle,
  children,
}: {
  label: string
  count: number
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-secondary/30 transition-colors text-left"
      >
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">{count}건</span>
      </button>
      {open && <div className="px-4 pb-4 pt-3 border-t border-border space-y-1.5">{children}</div>}
    </div>
  )
}

function WeeklyView({
  lessons,
  emptyLabel,
  actions,
}: {
  lessons: Lesson[]
  emptyLabel: string
  actions: LessonActions
}) {
  const { openKeys, toggle } = useToggleSet()

  if (lessons.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  const groups = groupByDate(lessons)
  const rowProps = { ...actions }

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <CollapsibleDayCard
          key={g.key}
          label={g.label}
          count={g.items.length}
          open={openKeys.has(g.key)}
          onToggle={() => toggle(g.key)}
        >
          {g.items.map((l) => (
            <LessonRow key={l.id} lesson={l} {...rowProps} />
          ))}
        </CollapsibleDayCard>
      ))}
    </div>
  )
}

function MonthlyView({
  lessons,
  emptyLabel,
  actions,
}: {
  lessons: Lesson[]
  emptyLabel: string
  actions: LessonActions
}) {
  const { openKeys, toggle } = useToggleSet()

  if (lessons.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  const groups = groupByDate(lessons)
  const rowProps = { ...actions }

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <CollapsibleDayCard
          key={g.key}
          label={g.label}
          count={g.items.length}
          open={openKeys.has(g.key)}
          onToggle={() => toggle(g.key)}
        >
          {g.items.map((l) => (
            <LessonRow key={l.id} lesson={l} {...rowProps} />
          ))}
        </CollapsibleDayCard>
      ))}
    </div>
  )
}

export function CoachClient({ period, title, sub, members, courts, lessons, coachProfileId }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LessonDeleteTarget | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [createdCount, setCreatedCount] = useState(1)
  const [form, setForm] = useState({
    memberId: '',
    courtId: courts[0]?.id ?? '',
    date: todayDateStr(),
    startSlot: String(DEFAULT_START_SLOT),
    durationMin: '60',
    repeat: false,
    repeatEndDate: addWeeksDateStr(todayDateStr(), 4),
    repeatWeekdays: [] as Weekday[],
  })

  function switchPeriod(next: Period) {
    const param = PERIOD_TABS.find((t) => t.id === next)?.param
    router.push(param ? `/coach?period=${param}` : '/coach')
  }

  function openForm() {
    const today = todayDateStr()
    setForm({
      memberId: members[0]?.id ?? '',
      courtId: courts[0]?.id ?? '',
      date: today,
      startSlot: String(DEFAULT_START_SLOT),
      durationMin: '60',
      repeat: false,
      repeatEndDate: addWeeksDateStr(today, 4),
      repeatWeekdays: [getWeekdayFromDate(today)],
    })
    setError(null)
    setDone(false)
    setCreatedCount(1)
    setShowForm(true)
  }

  async function handleLessonAction(id: string, action: 'start' | 'end') {
    setActionLoading(id)
    const res = await fetch(`/api/lessons/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setActionLoading(null)
    if (!res.ok) {
      const json = await res.json()
      alert(json.error ?? '오류가 발생했습니다')
      return
    }
    router.refresh()
  }

  function handleStart(id: string) {
    handleLessonAction(id, 'start')
  }

  function handleEnd(id: string) {
    handleLessonAction(id, 'end')
  }

  function handleFeedback(id: string) {
    router.push(`/coach/lessons/${id}`)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return

    setActionLoading(deleteTarget.id)
    const res = await fetch(`/api/lessons/${deleteTarget.id}`, { method: 'DELETE' })
    setActionLoading(null)

    if (!res.ok) {
      const json = await res.json()
      alert(json.error ?? '삭제 중 오류가 발생했습니다')
      return
    }

    setDeleteTarget(null)
    router.refresh()
  }

  const lessonActions: LessonActions = {
    actionLoading,
    coachProfileId,
    onStart: handleStart,
    onEnd: handleEnd,
    onFeedback: handleFeedback,
    onDeleteRequest: setDeleteTarget,
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.memberId || !form.courtId) {
      setError('회원과 코트를 선택하세요')
      return
    }
    if (form.repeat && form.repeatEndDate < form.date) {
      setError('반복 종료일은 시작일 이후여야 합니다')
      return
    }
    if (form.repeat && form.repeatWeekdays.length === 0) {
      setError('반복 요일을 하나 이상 선택하세요')
      return
    }

    setSubmitting(true)
    setError(null)

    const payload: Record<string, unknown> = {
      member_id: form.memberId,
      court_id: form.courtId,
      date: form.date,
      start_time: slotIndexToTimeLabel(Number(form.startSlot)),
      duration_min: Number(form.durationMin),
    }
    if (form.repeat) {
      payload.repeat_until = form.repeatEndDate
      payload.repeat_weekdays = form.repeatWeekdays
    }

    const res = await fetch('/api/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const json = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      const msg = json.error ?? '오류가 발생했습니다'
      setError(msg)
      if (res.status === 409) alert(msg)
    } else {
      setCreatedCount(json.count ?? 1)
      setDone(true)
      router.refresh()
    }
  }

  return (
    <>
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{sub}</p>
        </div>
        <button
          onClick={openForm}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-volta text-black hover:opacity-90 transition-opacity shrink-0"
        >
          <span className="text-base leading-none">+</span>
          레슨 추가
        </button>
      </div>

      {/* 기간 탭 */}
      <div className="flex gap-1 mb-5 bg-secondary rounded-xl p-1">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchPeriod(tab.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === tab.id
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {period === 'today' ? (
        <TodayView lessons={lessons} actions={lessonActions} />
      ) : period === 'weekly' ? (
        <WeeklyView lessons={lessons} emptyLabel="이번 주 등록된 레슨이 없습니다" actions={lessonActions} />
      ) : (
        <MonthlyView lessons={lessons} emptyLabel="이번 달 등록된 레슨이 없습니다" actions={lessonActions} />
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-white">레슨 등록</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-white p-1 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {done ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-volta-muted border border-volta/20 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-volta" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-white">
                  {createdCount > 1 ? `레슨 ${createdCount}건이 등록됐습니다` : '레슨이 등록됐습니다'}
                </p>
                <button
                  onClick={() => { setDone(false); setShowForm(false) }}
                  className="text-xs text-muted-foreground underline underline-offset-2"
                >
                  닫기
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">회원 *</label>
                  <select
                    required
                    value={form.memberId}
                    onChange={(e) => setForm((f) => ({ ...f, memberId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white outline-none focus:border-volta transition-colors"
                  >
                    <option value="">선택</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  {members.length === 0 && (
                    <p className="text-xs text-red-400 mt-1">등록 가능한 회원이 없습니다</p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">코트 *</label>
                  <select
                    required
                    value={form.courtId}
                    onChange={(e) => setForm((f) => ({ ...f, courtId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white outline-none focus:border-volta transition-colors"
                  >
                    <option value="">선택</option>
                    {courts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  {courts.length === 0 && (
                    <p className="text-xs text-red-400 mt-1">등록된 코트가 없습니다</p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">시작 날짜 *</label>
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={(e) => {
                      const date = e.target.value
                      setForm((f) => ({
                        ...f,
                        date,
                        repeatEndDate: f.repeatEndDate < date ? date : f.repeatEndDate,
                      }))
                    }}
                    className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white outline-none focus:border-volta transition-colors"
                  />
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.repeat}
                    onChange={(e) => {
                      const repeat = e.target.checked
                      setForm((f) => ({
                        ...f,
                        repeat,
                        repeatWeekdays:
                          repeat && f.repeatWeekdays.length === 0
                            ? [getWeekdayFromDate(f.date)]
                            : f.repeatWeekdays,
                      }))
                    }}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-volta focus:ring-volta focus:ring-offset-zinc-900"
                  />
                  <span className="text-sm text-white">반복 등록</span>
                </label>

                {form.repeat && (
                  <>
                    <div>
                      <label className="text-xs text-zinc-400 mb-1.5 block">반복 요일 *</label>
                      <div className="grid grid-cols-7 gap-1">
                        {WEEKDAY_OPTIONS.map(({ value, label }) => {
                          const selected = form.repeatWeekdays.includes(value)
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  repeatWeekdays: selected
                                    ? f.repeatWeekdays.filter((d) => d !== value)
                                    : [...f.repeatWeekdays, value].sort((a, b) => a - b),
                                }))
                              }
                              className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                                selected
                                  ? 'bg-volta text-black'
                                  : 'bg-zinc-800 border border-zinc-600 text-zinc-400 hover:text-white'
                              }`}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 mb-1.5 block">반복 종료일 *</label>
                      <input
                        required
                        type="date"
                        min={form.date}
                        value={form.repeatEndDate}
                        onChange={(e) => setForm((f) => ({ ...f, repeatEndDate: e.target.value }))}
                        className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white outline-none focus:border-volta transition-colors"
                      />
                      <p className="text-[11px] text-zinc-500 mt-1.5">
                        시작일부터 선택한 요일마다 종료일까지 레슨이 등록됩니다
                      </p>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">시작 시간 *</label>
                    <select
                      required
                      value={form.startSlot}
                      onChange={(e) => setForm((f) => ({ ...f, startSlot: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white outline-none focus:border-volta transition-colors"
                    >
                      {TIME_SLOT_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={String(value)}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">레슨 시간 *</label>
                    <select
                      required
                      value={form.durationMin}
                      onChange={(e) => setForm((f) => ({ ...f, durationMin: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white outline-none focus:border-volta transition-colors"
                    >
                      {DURATION_OPTIONS.map((o) => (
                        <option key={o.value} value={String(o.value)}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting || members.length === 0 || courts.length === 0}
                  className="w-full py-3 rounded-xl bg-volta text-black text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? '등록 중...' : '레슨 등록'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <DeleteConfirmModal
        open={deleteTarget !== null}
        description={
          deleteTarget
            ? `${deleteTarget.timeLabel} · ${deleteTarget.memberName}${
                deleteTarget.courtName !== '—' ? ` · ${deleteTarget.courtName}` : ''
              }\n\n이 레슨을 삭제합니다. 삭제 후 복구할 수 없습니다.`
            : ''
        }
        confirming={deleteTarget !== null && actionLoading === deleteTarget.id}
        onCancel={() => {
          if (actionLoading) return
          setDeleteTarget(null)
        }}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}
