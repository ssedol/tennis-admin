'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  getRelationName,
  groupLessonsByCourt,
  groupLessonsByDate,
  groupLessonsByMonthWeekDay,
  groupLessonsByWeekThenDay,
  type CourtMeta,
  type OwnerPeriod,
  type OwnerScheduleLesson,
} from '@/lib/owner-schedule-groups'
import { canDeleteLesson, type LessonDeleteTarget } from '@/lib/lesson-delete'
import {
  formatStoredScheduleTime,
  formatStoredScheduleTimeRange,
} from '@/lib/time-slots'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: '예정', className: 'bg-secondary text-muted-foreground' },
  IN_PROGRESS: { label: '진행 중', className: 'bg-volta/10 text-volta' },
  COMPLETED: { label: '완료', className: 'bg-emerald-500/10 text-emerald-400' },
  CANCELLED: { label: '취소', className: 'bg-red-500/10 text-red-400' },
}

function LessonRow({
  item,
  showCourt = false,
  deletingId,
  onDeleteRequest,
}: {
  item: OwnerScheduleLesson
  showCourt?: boolean
  deletingId: string | null
  onDeleteRequest: (target: LessonDeleteTarget) => void
}) {
  const s = STATUS_STYLE[item.status] ?? STATUS_STYLE.SCHEDULED
  const memberName = getRelationName(item.member)
  const coachName = getRelationName(item.coach)
  const courtName = getRelationName(item.court)
  const timeLabel = formatStoredScheduleTimeRange(item.scheduled_at, item.duration_min)
  const loading = deletingId === item.id

  return (
    <div
      className={`flex items-center gap-2 bg-card border rounded-xl px-3.5 py-3 ${
        item.status === 'IN_PROGRESS' ? 'border-volta/20' : 'border-border'
      }`}
    >
      <span className="text-[11px] text-muted-foreground w-[88px] shrink-0 tabular-nums">
        {timeLabel}
      </span>

      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <Link
          href={`/owner/lessons/${item.id}`}
          className="text-sm font-medium truncate hover:opacity-80 transition-opacity"
        >
          {memberName}
        </Link>
        <span className="text-muted-foreground shrink-0">·</span>
        <span className="text-xs text-muted-foreground truncate">{coachName}</span>
        {showCourt && courtName !== '—' && (
          <>
            <span className="text-muted-foreground shrink-0">·</span>
            <span className="text-xs text-muted-foreground truncate max-w-[72px] sm:max-w-none">
              {courtName}
            </span>
          </>
        )}
        {canDeleteLesson(item.status) && (
          <button
            type="button"
            onClick={() =>
              onDeleteRequest({
                id: item.id,
                memberName,
                courtName,
                timeLabel: formatStoredScheduleTime(item.scheduled_at),
              })
            }
            disabled={loading}
            className="ml-0.5 shrink-0 text-[10px] px-1.5 py-0.5 rounded-md border border-red-500/25 text-red-400/90 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            {loading ? '…' : '삭제'}
          </button>
        )}
      </div>

      <Link
        href={`/owner/lessons/${item.id}`}
        className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 hover:opacity-80 transition-opacity ${s.className}`}
      >
        {s.label}
      </Link>
    </div>
  )
}

function CourtSection({
  courtName,
  lessons,
  showCourtInRow,
  deletingId,
  onDeleteRequest,
}: {
  courtName: string
  lessons: OwnerScheduleLesson[]
  showCourtInRow: boolean
  deletingId: string | null
  onDeleteRequest: (target: LessonDeleteTarget) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold">{courtName}</span>
        <span className="text-[11px] text-muted-foreground">{lessons.length}건</span>
      </div>
      <div className="space-y-1.5 pl-1">
        {lessons.map((item) => (
          <LessonRow
            key={item.id}
            item={item}
            showCourt={showCourtInRow}
            deletingId={deletingId}
            onDeleteRequest={onDeleteRequest}
          />
        ))}
      </div>
    </div>
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

function ScheduleGroupCard({
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
  children: ReactNode
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
      {open && <div className="px-4 pb-4 border-t border-border">{children}</div>}
    </div>
  )
}

function ScheduleNestedToggle({
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
  children: ReactNode
}) {
  return (
    <div className="pt-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left mb-2"
      >
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground">{count}건</span>
      </button>
      {open && children}
    </div>
  )
}

function DayLessonList({
  label,
  count,
  lessons,
  showCourt,
  deletingId,
  onDeleteRequest,
}: {
  label: string
  count: number
  lessons: OwnerScheduleLesson[]
  showCourt: boolean
  deletingId: string | null
  onDeleteRequest: (target: LessonDeleteTarget) => void
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
        {label} · {count}건
      </p>
      <div className="space-y-1.5">
        {lessons.map((item) => (
          <LessonRow
            key={item.id}
            item={item}
            showCourt={showCourt}
            deletingId={deletingId}
            onDeleteRequest={onDeleteRequest}
          />
        ))}
      </div>
    </div>
  )
}

function TodayByCourtView({
  lessons,
  courts,
  deletingId,
  onDeleteRequest,
}: {
  lessons: OwnerScheduleLesson[]
  courts: CourtMeta[]
  deletingId: string | null
  onDeleteRequest: (target: LessonDeleteTarget) => void
}) {
  const courtGroups = useMemo(
    () => groupLessonsByCourt(lessons, courts),
    [lessons, courts]
  )

  return (
    <div className="space-y-5">
      {courtGroups.map((group) => (
        <CourtSection
          key={group.courtId ?? 'none'}
          courtName={group.courtName}
          lessons={group.lessons}
          showCourtInRow={false}
          deletingId={deletingId}
          onDeleteRequest={onDeleteRequest}
        />
      ))}
    </div>
  )
}

function WeeklyView({
  lessons,
  courts,
  deletingId,
  onDeleteRequest,
}: {
  lessons: OwnerScheduleLesson[]
  courts: CourtMeta[]
  deletingId: string | null
  onDeleteRequest: (target: LessonDeleteTarget) => void
}) {
  const days = useMemo(() => groupLessonsByDate(lessons), [lessons])
  const { openKeys, toggle } = useToggleSet()

  return (
    <div className="space-y-3">
      {days.map((day) => {
        const dayOpen = openKeys.has(day.key)
        return (
          <ScheduleGroupCard
            key={day.key}
            label={day.label}
            count={day.lessons.length}
            open={dayOpen}
            onToggle={() => toggle(day.key)}
          >
            <div className="pt-3 space-y-4">
              {groupLessonsByCourt(day.lessons, courts).map((group) => (
                <CourtSection
                  key={`${day.key}-${group.courtId ?? 'none'}`}
                  courtName={group.courtName}
                  lessons={group.lessons}
                  showCourtInRow={false}
                  deletingId={deletingId}
                  onDeleteRequest={onDeleteRequest}
                />
              ))}
            </div>
          </ScheduleGroupCard>
        )
      })}
    </div>
  )
}

function MonthlyView({
  lessons,
  deletingId,
  onDeleteRequest,
}: {
  lessons: OwnerScheduleLesson[]
  deletingId: string | null
  onDeleteRequest: (target: LessonDeleteTarget) => void
}) {
  const weeks = useMemo(() => groupLessonsByWeekThenDay(lessons), [lessons])
  const { openKeys: openWeeks, toggle: toggleWeek } = useToggleSet()
  const { openKeys: openDays, toggle: toggleDay } = useToggleSet()

  return (
    <div className="space-y-3">
      {weeks.map((week) => {
        const weekOpen = openWeeks.has(week.key)
        return (
          <ScheduleGroupCard
            key={week.key}
            label={week.label}
            count={week.lessons.length}
            open={weekOpen}
            onToggle={() => toggleWeek(week.key)}
          >
            <div className="space-y-1">
              {week.days.map((day) => {
                const dayKey = `${week.key}-${day.key}`
                const dayOpen = openDays.has(dayKey)
                return (
                  <ScheduleNestedToggle
                    key={dayKey}
                    label={day.label}
                    count={day.lessons.length}
                    open={dayOpen}
                    onToggle={() => toggleDay(dayKey)}
                  >
                    <div className="space-y-1.5 pl-2 border-l border-border ml-1 pb-1">
                      {day.lessons.map((item) => (
                        <LessonRow
                          key={item.id}
                          item={item}
                          showCourt
                          deletingId={deletingId}
                          onDeleteRequest={onDeleteRequest}
                        />
                      ))}
                    </div>
                  </ScheduleNestedToggle>
                )
              })}
            </div>
          </ScheduleGroupCard>
        )
      })}
    </div>
  )
}

function YearlyView({
  lessons,
  deletingId,
  onDeleteRequest,
}: {
  lessons: OwnerScheduleLesson[]
  deletingId: string | null
  onDeleteRequest: (target: LessonDeleteTarget) => void
}) {
  const months = useMemo(() => groupLessonsByMonthWeekDay(lessons), [lessons])
  const { openKeys: openMonths, toggle: toggleMonth } = useToggleSet()
  const { openKeys: openWeeks, toggle: toggleWeek } = useToggleSet()

  return (
    <div className="space-y-3">
      {months.map((month) => {
        const monthOpen = openMonths.has(month.key)
        return (
          <ScheduleGroupCard
            key={month.key}
            label={month.label}
            count={month.lessons.length}
            open={monthOpen}
            onToggle={() => toggleMonth(month.key)}
          >
            <div className="space-y-1">
              {month.weeks.map((week) => {
                const weekKey = `${month.key}-${week.key}`
                const weekOpen = openWeeks.has(weekKey)
                return (
                  <ScheduleNestedToggle
                    key={weekKey}
                    label={week.label}
                    count={week.lessons.length}
                    open={weekOpen}
                    onToggle={() => toggleWeek(weekKey)}
                  >
                    <div className="space-y-3 pl-2 border-l border-border ml-1 pb-1">
                      {week.days.map((day) => (
                        <DayLessonList
                          key={day.key}
                          label={day.label}
                          count={day.lessons.length}
                          lessons={day.lessons}
                          showCourt
                          deletingId={deletingId}
                          onDeleteRequest={onDeleteRequest}
                        />
                      ))}
                    </div>
                  </ScheduleNestedToggle>
                )
              })}
            </div>
          </ScheduleGroupCard>
        )
      })}
    </div>
  )
}

interface Props {
  period: OwnerPeriod
  lessons: OwnerScheduleLesson[]
  courts: CourtMeta[]
  emptyLabel: string
}

export function OwnerScheduleView({ period, lessons, courts, emptyLabel }: Props) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LessonDeleteTarget | null>(null)

  async function handleDeleteConfirm() {
    if (!deleteTarget) return

    setDeletingId(deleteTarget.id)
    const res = await fetch(`/api/lessons/${deleteTarget.id}`, { method: 'DELETE' })
    setDeletingId(null)

    if (!res.ok) {
      const json = await res.json()
      alert(json.error ?? '삭제 중 오류가 발생했습니다')
      return
    }

    setDeleteTarget(null)
    router.refresh()
  }

  if (lessons.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    )
  }

  const viewProps = {
    lessons,
    courts,
    deletingId,
    onDeleteRequest: setDeleteTarget,
  }

  return (
    <>
      {period === 'today' && <TodayByCourtView {...viewProps} />}
      {period === 'weekly' && <WeeklyView {...viewProps} />}
      {period === 'monthly' && <MonthlyView lessons={lessons} deletingId={deletingId} onDeleteRequest={setDeleteTarget} />}
      {period === 'yearly' && <YearlyView lessons={lessons} deletingId={deletingId} onDeleteRequest={setDeleteTarget} />}

      <DeleteConfirmModal
        open={deleteTarget !== null}
        description={
          deleteTarget
            ? `${deleteTarget.timeLabel} · ${deleteTarget.memberName}${
                deleteTarget.courtName !== '—' ? ` · ${deleteTarget.courtName}` : ''
              }\n\n이 레슨을 삭제합니다. 삭제 후 복구할 수 없습니다.`
            : ''
        }
        confirming={deleteTarget !== null && deletingId === deleteTarget.id}
        onCancel={() => {
          if (deletingId) return
          setDeleteTarget(null)
        }}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}
