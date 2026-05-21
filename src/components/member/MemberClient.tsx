'use client'

import { useState } from 'react'
import Link from 'next/link'

type Tab = 'lesson' | 'log'

const TABS: { id: Tab; label: string }[] = [
  { id: 'lesson', label: '레슨' },
  { id: 'log', label: '일지' },
]

// ── 레슨 탭 ──────────────────────────────────────────────────
function LessonTab() {
  return (
    <div className="space-y-6">
      {/* 다음 레슨 */}
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          다음 레슨
        </p>
        <div className="bg-card border border-volta/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-bold tracking-tight">내일 10:00</p>
              <p className="text-xs text-muted-foreground mt-1">코치 김민준 · 코트 A · 60분</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted-foreground">5월 21일 목요일</p>
              <p className="text-[11px] text-volta font-semibold mt-1">D-1</p>
            </div>
          </div>
        </div>
      </section>

      {/* 지난 레슨 */}
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          지난 레슨
        </p>
        <div className="space-y-2">
          {[
            { date: '5월 19일 (월) 10:00', coach: '코치 김민준 · 코트 A', feedback: '피드백 1개 · 영상 1개', id: '1' },
            { date: '5월 15일 (목) 10:00', coach: '코치 김민준 · 코트 A', feedback: '피드백 1개', id: '2' },
            { date: '5월 8일 (목) 10:00',  coach: '코치 김민준 · 코트 A', feedback: '피드백 없음', id: '3' },
          ].map((item) => (
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
                  상세
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// ── 일지 탭 ──────────────────────────────────────────────────
const LOG_TYPE_STYLE: Record<string, { dot: string; label: string; text: string }> = {
  LESSON:   { dot: 'bg-volta',    label: '레슨',      text: 'text-volta' },
  PRACTICE: { dot: 'bg-blue-400', label: '자율 연습', text: 'text-blue-400' },
  MATCH:    { dot: 'bg-red-400',  label: '경기',      text: 'text-red-400' },
}

function LogTab() {
  const [showForm, setShowForm] = useState(false)
  const [logType, setLogType] = useState<'LESSON' | 'PRACTICE' | 'MATCH'>('PRACTICE')

  const logs = [
    { id: '1', type: 'LESSON',   date: '5월 19일', content: '백핸드 집중 레슨. 팔꿈치 교정 중.' },
    { id: '2', type: 'PRACTICE', date: '5월 16일', content: '서비스 토스 30분 반복. 점점 안정됨.' },
    { id: '3', type: 'MATCH',    date: '5월 14일', content: '클럽 내부 대회 6-4 승. 백핸드 실수 多.' },
  ]

  return (
    <div>
      {/* 추가 버튼 */}
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

      {/* 추가 폼 */}
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
            placeholder="오늘 연습 내용을 기록하세요..."
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-volta transition-colors resize-none"
          />
          <button className="w-full py-2.5 rounded-lg bg-volta text-black text-sm font-semibold hover:opacity-90 transition-opacity">
            저장
          </button>
        </div>
      )}

      {/* 일지 목록 */}
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
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export function MemberClient() {
  const [activeTab, setActiveTab] = useState<Tab>('lesson')

  return (
    <>
      {/* 탭 네비게이션 */}
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

      {/* 탭 콘텐츠 */}
      {activeTab === 'lesson' && <LessonTab />}
      {activeTab === 'log'    && <LogTab />}
    </>
  )
}
