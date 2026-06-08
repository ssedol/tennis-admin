'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Tab = 'lesson' | 'log'
type LogType = 'LESSON' | 'PRACTICE' | 'MATCH'

const TABS: { id: Tab; label: string }[] = [
  { id: 'lesson', label: '레슨' },
  { id: 'log', label: '일지' },
]

type NextLesson = {
  timeLabel: string
  dateLabel: string
  daysUntil: string
  sub: string
}

type PastLesson = {
  id: string
  date: string
  coach: string
  feedback: string
}

type LogItem = {
  id: string
  type: LogType
  date: string
  content: string
}

interface Props {
  nextLesson: NextLesson | null
  pastLessons: PastLesson[]
  initialLogs: LogItem[]
}

function LessonTab({ nextLesson, pastLessons }: { nextLesson: NextLesson | null; pastLessons: PastLesson[] }) {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          다음 레슨
        </p>
        {nextLesson ? (
          <div className="bg-card border border-volta/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl font-bold tracking-tight">{nextLesson.timeLabel}</p>
                <p className="text-xs text-muted-foreground mt-1">{nextLesson.sub}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">{nextLesson.dateLabel}</p>
                <p className="text-[11px] text-volta font-semibold mt-1">{nextLesson.daysUntil}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">예정된 레슨이 없습니다</p>
        )}
      </section>

      <section>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          지난 레슨
        </p>
        {pastLessons.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">완료된 레슨이 없습니다</p>
        ) : (
          <div className="space-y-2">
            {pastLessons.map((item) => (
              <div key={item.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold">{item.date}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.coach}</p>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
                    완료
                  </span>
                </div>
                <div className="h-px bg-border mb-3" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{item.feedback}</span>
                  <Link
                    href={`/member/lessons/${item.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    피드백보기
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

const LOG_TYPE_STYLE: Record<LogType, { dot: string; label: string; text: string }> = {
  LESSON:   { dot: 'bg-volta',    label: '레슨',      text: 'text-volta' },
  PRACTICE: { dot: 'bg-blue-400', label: '자율 연습', text: 'text-blue-400' },
  MATCH:    { dot: 'bg-red-400',  label: '경기',      text: 'text-red-400' },
}

function LogTab({ initialLogs }: { initialLogs: LogItem[] }) {
  const [showForm, setShowForm] = useState(false)
  const [logType, setLogType] = useState<LogType>('PRACTICE')
  const [content, setContent] = useState('')
  const [logs, setLogs] = useState(initialLogs)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/member/logs')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json?.logs) return
        setLogs(
          json.logs.map((l: { id: string; log_type: string; recorded_at: string; content: string | null }) => ({
            id: l.id,
            type: l.log_type as LogType,
            date: new Date(l.recorded_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }),
            content: l.content ?? '',
          }))
        )
      })
      .catch(() => {/* 조용히 무시 — initialLogs 그대로 표시 */})
  }, [])

  async function handleSave() {
    if (!content.trim() || submitting) return

    setSubmitting(true)
    setError(null)

    const res = await fetch('/api/member/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_type: logType, content: content.trim() }),
    })

    const json = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(json.error ?? '저장 중 오류가 발생했습니다')
      return
    }

    const l = json.log
    setLogs((prev) => [
      {
        id: l.id,
        type: l.log_type as LogType,
        date: new Date(l.recorded_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }),
        content: l.content ?? '',
      },
      ...prev,
    ])
    setContent('')
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {logs.length}개의 기록
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          {showForm ? '취소' : '+ 기록 추가'}
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(['LESSON', 'PRACTICE', 'MATCH'] as const).map((t) => {
              const s = LOG_TYPE_STYLE[t]
              return (
                <button
                  key={t}
                  onClick={() => setLogType(t)}
                  className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
                    logType === t
                      ? 'border-volta/40 bg-volta/10 text-volta'
                      : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="오늘 연습 내용을 기록하세요..."
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-volta transition-colors resize-none"
          />
          <button
            onClick={handleSave}
            disabled={!content.trim() || submitting}
            className="w-full py-2.5 rounded-lg bg-volta text-black text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {submitting ? '저장 중...' : '저장'}
          </button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">아직 기록이 없습니다</p>
      ) : (
        <div className="space-y-2">
          {logs.map((item) => {
            const s = LOG_TYPE_STYLE[item.type]
            return (
              <div key={item.id} className="bg-card border border-border rounded-xl p-4 flex gap-3">
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold ${s.text}`}>{s.label}</span>
                    <span className="text-[11px] text-muted-foreground">{item.date}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.content}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function MemberClient({ nextLesson, pastLessons, initialLogs }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('lesson')

  return (
    <>
      <nav className="flex gap-1 border-b border-border mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-1 py-3 text-sm transition-colors ${
              activeTab === tab.id
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-volta rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {activeTab === 'lesson' && <LessonTab nextLesson={nextLesson} pastLessons={pastLessons} />}
      {activeTab === 'log'    && <LogTab initialLogs={initialLogs} />}
    </>
  )
}
