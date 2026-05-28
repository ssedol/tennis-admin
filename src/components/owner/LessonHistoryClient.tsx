'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatStoredScheduleDate, formatStoredScheduleTimeRange } from '@/lib/time-slots'

type HistoryItem = {
  id: string
  lesson_id: string
  action: 'CREATED' | 'DELETED'
  scheduled_at: string
  duration_min: number
  status: string
  created_at: string
  actor: string
  coach: string
  member: string
  court: string
}

type Filter = 'ALL' | 'CREATED' | 'DELETED'

const ACTION_META: Record<
  HistoryItem['action'],
  { label: string; badge: string; border: string; dot: string }
> = {
  CREATED: {
    label: '추가',
    badge: 'bg-emerald-500/10 text-emerald-400',
    border: 'border-l-emerald-500',
    dot: 'bg-emerald-500',
  },
  DELETED: {
    label: '삭제',
    badge: 'bg-red-500/10 text-red-400',
    border: 'border-l-red-500',
    dot: 'bg-red-500',
  },
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: '예정',
  IN_PROGRESS: '진행 중',
  COMPLETED: '완료',
  CANCELLED: '취소',
}

function formatActionTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function formatActionDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

function groupByActionDate(items: HistoryItem[]) {
  const map = new Map<string, HistoryItem[]>()
  for (const item of items) {
    const key = formatActionDate(item.created_at)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return [...map.entries()]
}

export function LessonHistoryClient() {
  const [items, setItems] = useState<HistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('ALL')

  const load = useCallback(async (offset = 0, append = false) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    setError(null)

    const res = await fetch(`/api/lessons/history?limit=50&offset=${offset}`)
    const json = await res.json()

    if (append) setLoadingMore(false)
    else setLoading(false)

    if (!res.ok) {
      setError(json.error ?? '이력을 불러오지 못했습니다')
      return
    }

    const rows = (json.history ?? []) as HistoryItem[]
    setTotal(json.total ?? rows.length)
    setItems((prev) => (append ? [...prev, ...rows] : rows))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = filter === 'ALL' ? items : items.filter((i) => i.action === filter)
  const createdCount = items.filter((i) => i.action === 'CREATED').length
  const deletedCount = items.filter((i) => i.action === 'DELETED').length
  const groups = groupByActionDate(filtered)
  const hasMore = items.length < total

  const FILTERS: { id: Filter; label: string; count?: number }[] = [
    { id: 'ALL', label: '전체', count: items.length },
    { id: 'CREATED', label: '추가', count: createdCount },
    { id: 'DELETED', label: '삭제', count: deletedCount },
  ]

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">레슨 이력 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          레슨 등록·삭제 기록 {total > 0 ? `· 총 ${total}건` : ''}
        </p>
      </div>

      <div className="flex gap-1 mb-5 bg-secondary rounded-xl p-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              filter === f.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
            {f.count !== undefined && f.count > 0 && (
              <span className="text-[10px] tabular-nums opacity-70">{f.count}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-16 text-center">불러오는 중...</p>
      ) : error ? (
        <p className="text-sm text-destructive py-16 text-center">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {filter === 'ALL' ? '아직 기록된 이력이 없습니다' : '해당 유형의 이력이 없습니다'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([dateLabel, dayItems]) => (
            <section key={dateLabel}>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5 sticky top-[7.25rem] bg-background/95 backdrop-blur-sm py-1 z-[1]">
                {dateLabel}
              </p>
              <ul className="space-y-2">
                {dayItems.map((item) => {
                  const meta = ACTION_META[item.action]
                  const lessonDate = formatStoredScheduleDate(item.scheduled_at)
                  const lessonTime = formatStoredScheduleTimeRange(
                    item.scheduled_at,
                    item.duration_min
                  )
                  const statusLabel = STATUS_LABEL[item.status] ?? item.status

                  return (
                    <li
                      key={item.id}
                      className={`bg-card border border-border border-l-[3px] ${meta.border} rounded-xl overflow-hidden`}
                    >
                      <div className="px-3.5 py-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.badge}`}>
                              {meta.label}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate">
                              {formatActionTime(item.created_at)} · {item.actor}
                            </span>
                          </div>
                        </div>

                        <p className="text-[15px] font-semibold leading-snug">
                          {lessonDate}{' '}
                          <span className="text-volta tabular-nums">{lessonTime}</span>
                        </p>

                        <div className="mt-2 grid grid-cols-3 gap-2">
                          <div className="bg-background rounded-lg px-2.5 py-2 min-w-0">
                            <p className="text-[10px] text-muted-foreground mb-0.5">코트</p>
                            <p className="text-xs font-medium truncate">{item.court}</p>
                          </div>
                          <div className="bg-background rounded-lg px-2.5 py-2 min-w-0">
                            <p className="text-[10px] text-muted-foreground mb-0.5">코치</p>
                            <p className="text-xs font-medium truncate">{item.coach}</p>
                          </div>
                          <div className="bg-background rounded-lg px-2.5 py-2 min-w-0">
                            <p className="text-[10px] text-muted-foreground mb-0.5">회원</p>
                            <p className="text-xs font-medium truncate">{item.member}</p>
                          </div>
                        </div>

                        <p className="text-[10px] text-muted-foreground mt-2">
                          당시 상태 {statusLabel} · {item.duration_min}분
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}

          {hasMore && filter === 'ALL' && (
            <button
              type="button"
              onClick={() => load(items.length, true)}
              disabled={loadingMore}
              className="w-full py-3 rounded-xl border border-border bg-card text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors disabled:opacity-50"
            >
              {loadingMore ? '불러오는 중...' : '더 보기'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
