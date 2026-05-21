'use client'

import { useState } from 'react'
import Link from 'next/link'

type Lesson = {
  id: string
  scheduled_at: string
  status: string
  member: { name: string } | null
  coach: { name: string } | null
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  SCHEDULED:   { label: '예정',    className: 'bg-secondary text-muted-foreground' },
  IN_PROGRESS: { label: '진행 중', className: 'bg-volta/10 text-volta' },
  COMPLETED:   { label: '완료',    className: 'bg-emerald-500/10 text-emerald-400' },
  CANCELLED:   { label: '취소',    className: 'bg-red-500/10 text-red-400' },
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function LessonRow({ item }: { item: Lesson }) {
  const s = STATUS_STYLE[item.status] ?? STATUS_STYLE['SCHEDULED']
  return (
    <Link
      href={`/owner/lessons/${item.id}`}
      className={`flex items-center gap-3 bg-card border rounded-xl px-3.5 py-3 transition-colors hover:bg-secondary/30 ${
        item.status === 'IN_PROGRESS' ? 'border-volta/20' : 'border-border'
      }`}
    >
      <span className="text-[11px] text-muted-foreground w-10 shrink-0 tabular-nums">
        {formatTime(item.scheduled_at)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.member?.name ?? '—'}</p>
      </div>
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${s.className}`}>
        {s.label}
      </span>
    </Link>
  )
}

function CoachSection({ coachName, lessons }: { coachName: string; lessons: Lesson[] }) {
  const doneCount = lessons.filter((l) => l.status === 'COMPLETED').length
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-full bg-volta/10 flex items-center justify-center shrink-0">
          <span className="text-[9px] font-bold text-volta">{coachName[0]}</span>
        </div>
        <span className="text-xs font-semibold">{coachName}</span>
        <span className="text-[11px] text-muted-foreground">
          {lessons.length}개{doneCount > 0 && ` · 완료 ${doneCount}`}
        </span>
      </div>
      <div className="space-y-1.5 pl-7">
        {lessons.map((item) => <LessonRow key={item.id} item={item} />)}
      </div>
    </div>
  )
}

export function TodaySchedule({ lessons }: { lessons: Lesson[] }) {
  // 코치별 그룹핑
  const grouped = lessons.reduce<Record<string, Lesson[]>>((acc, l) => {
    const key = l.coach?.name ?? '미배정'
    if (!acc[key]) acc[key] = []
    acc[key].push(l)
    return acc
  }, {})
  const coachNames = Object.keys(grouped)

  const [activeTab, setActiveTab] = useState('전체')
  const tabs = ['전체', ...coachNames]

  if (lessons.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-sm text-muted-foreground">오늘 예정된 레슨이 없습니다</p>
      </div>
    )
  }

  return (
    <>
      {/* 탭 */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none border-b border-border mb-4">
        {tabs.map((tab) => {
          const count = tab === '전체' ? lessons.length : (grouped[tab]?.length ?? 0)
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative flex items-center gap-1.5 px-2 py-2.5 text-sm whitespace-nowrap shrink-0 transition-colors ${
                isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-volta/10 text-volta' : 'bg-secondary text-muted-foreground'
              }`}>
                {count}
              </span>
              {isActive && (
                <span className="absolute bottom-0 inset-x-0 h-0.5 bg-volta rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* 콘텐츠 */}
      {activeTab === '전체' ? (
        <div className="space-y-5">
          {coachNames.map((name) => (
            <CoachSection key={name} coachName={name} lessons={grouped[name]} />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {(grouped[activeTab] ?? []).map((item) => (
            <LessonRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </>
  )
}
