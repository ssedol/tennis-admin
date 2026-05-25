'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Period = 'today' | 'weekly' | 'monthly'
type Member = { id: string; name: string }
type Court = { id: string; name: string }
type Lesson = {
  id: string
  scheduled_at: string
  duration_min: number
  status: string
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

function formatTimeRange(iso: string, durationMin: number) {
  const start = new Date(iso)
  const end = new Date(start.getTime() + durationMin * 60_000)
  const fmt = (d: Date) =>
    d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${fmt(start)} — ${fmt(end)}`
}

function formatDateLabel(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

function dateKey(iso: string) {
  const d = new Date(iso)
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: '예정', className: 'bg-secondary text-muted-foreground' },
  IN_PROGRESS: { label: '진행 중', className: 'bg-volta-muted text-volta' },
  COMPLETED: { label: '완료', className: 'bg-emerald-500/10 text-emerald-400' },
  CANCELLED: { label: '취소', className: 'bg-red-500/10 text-red-400' },
}

const DURATION_OPTIONS = [
  { value: 60, label: '1시간' },
  { value: 90, label: '1시간 30분' },
  { value: 120, label: '2시간' },
]

function todayDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function LessonCard({
  lesson,
  showDate,
  actionLoading,
  onStart,
  onEnd,
  onFeedback,
}: {
  lesson: Lesson
  showDate?: boolean
  actionLoading?: string | null
  onStart?: (id: string) => void
  onEnd?: (id: string) => void
  onFeedback?: (id: string) => void
}) {
  const s = STATUS_STYLE[lesson.status] ?? STATUS_STYLE.SCHEDULED
  const memberName = getName(lesson.member)
  const loading = actionLoading === lesson.id

  return (
    <div className={`bg-card border rounded-xl p-4 ${lesson.status === 'IN_PROGRESS' ? 'border-volta/20' : 'border-border'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          {showDate && (
            <p className="text-[11px] text-muted-foreground mb-1">{formatDateLabel(lesson.scheduled_at)}</p>
          )}
          <p className="text-sm font-semibold">{formatTimeRange(lesson.scheduled_at, lesson.duration_min)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{getName(lesson.court)}</p>
        </div>
        <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${s.className}`}>{s.label}</span>
      </div>
      <div className="h-px bg-border mb-4" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-[11px] text-muted-foreground">
            {memberName[0]}
          </div>
          <p className="text-sm font-medium">{memberName}</p>
        </div>

        {lesson.status === 'SCHEDULED' && onStart && (
          <button
            onClick={() => onStart(lesson.id)}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg bg-volta text-black font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? '처리 중...' : '레슨 시작'}
          </button>
        )}
        {lesson.status === 'IN_PROGRESS' && onEnd && (
          <button
            onClick={() => onEnd(lesson.id)}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {loading ? '처리 중...' : '레슨 종료'}
          </button>
        )}
        {lesson.status === 'COMPLETED' && onFeedback && (
          <button
            onClick={() => onFeedback(lesson.id)}
            className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            피드백 보기
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
  return [...map.entries()].map(([key, items]) => ({
    key,
    label: formatDateLabel(items[0].scheduled_at),
    items,
  }))
}

type LessonActions = {
  actionLoading: string | null
  onStart: (id: string) => void
  onEnd: (id: string) => void
  onFeedback: (id: string) => void
}

function TodayView({ lessons, actions }: { lessons: Lesson[]; actions: LessonActions }) {
  const inProgress = lessons.filter((l) => l.status === 'IN_PROGRESS')
  const scheduled = lessons.filter((l) => l.status === 'SCHEDULED')
  const completed = lessons.filter((l) => l.status === 'COMPLETED')

  if (lessons.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        오늘 등록된 레슨이 없습니다
      </div>
    )
  }

  const cardProps = { ...actions }

  return (
    <>
      {inProgress.length > 0 && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">진행 중</p>
          <div className="space-y-2 mb-6">
            {inProgress.map((l) => <LessonCard key={l.id} lesson={l} {...cardProps} />)}
          </div>
        </>
      )}
      {scheduled.length > 0 && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">예정</p>
          <div className="space-y-2 mb-6">
            {scheduled.map((l) => <LessonCard key={l.id} lesson={l} {...cardProps} />)}
          </div>
        </>
      )}
      {completed.length > 0 && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">완료</p>
          <div className="space-y-2">
            {completed.map((l) => <LessonCard key={l.id} lesson={l} {...cardProps} />)}
          </div>
        </>
      )}
    </>
  )
}

function PeriodView({
  lessons,
  emptyLabel,
  actions,
}: {
  lessons: Lesson[]
  emptyLabel: string
  actions: LessonActions
}) {
  if (lessons.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  const groups = groupByDate(lessons)
  const cardProps = { ...actions }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.key}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            {g.label} · {g.items.length}건
          </p>
          <div className="space-y-2">
            {g.items.map((l) => <LessonCard key={l.id} lesson={l} {...cardProps} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

export function CoachClient({ period, title, sub, members, courts, lessons }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({
    memberId: '',
    courtId: courts[0]?.id ?? '',
    date: todayDateStr(),
    startHour: '10',
    durationMin: '60',
  })

  function switchPeriod(next: Period) {
    const param = PERIOD_TABS.find((t) => t.id === next)?.param
    router.push(param ? `/coach?period=${param}` : '/coach')
  }

  function openForm() {
    setForm({
      memberId: members[0]?.id ?? '',
      courtId: courts[0]?.id ?? '',
      date: todayDateStr(),
      startHour: '10',
      durationMin: '60',
    })
    setError(null)
    setDone(false)
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

  const lessonActions: LessonActions = {
    actionLoading,
    onStart: handleStart,
    onEnd: handleEnd,
    onFeedback: handleFeedback,
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.memberId || !form.courtId) {
      setError('회원과 코트를 선택하세요')
      return
    }

    setSubmitting(true)
    setError(null)

    const res = await fetch('/api/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: form.memberId,
        court_id: form.courtId,
        date: form.date,
        start_hour: Number(form.startHour),
        duration_min: Number(form.durationMin),
      }),
    })

    const json = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(json.error ?? '오류가 발생했습니다')
    } else {
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
        <PeriodView lessons={lessons} emptyLabel="이번 주 등록된 레슨이 없습니다" actions={lessonActions} />
      ) : (
        <PeriodView lessons={lessons} emptyLabel="이번 달 등록된 레슨이 없습니다" actions={lessonActions} />
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
                <p className="text-sm font-semibold text-white">레슨이 등록됐습니다</p>
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
                  <label className="text-xs text-zinc-400 mb-1.5 block">날짜 *</label>
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white outline-none focus:border-volta transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">시작 시간 *</label>
                    <select
                      required
                      value={form.startHour}
                      onChange={(e) => setForm((f) => ({ ...f, startHour: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white outline-none focus:border-volta transition-colors"
                    >
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={String(h)}>{String(h).padStart(2, '0')}:00</option>
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
    </>
  )
}
