'use client'

import { useState } from 'react'
import Link from 'next/link'
import { use } from 'react'
import { FeedbackThread } from '@/components/member/FeedbackThread'
import { VideoFeedback } from '@/components/member/VideoFeedback'

type Tab = 'feedback' | 'video'

const LESSON_MOCK: Record<string, {
  date: string; time: string; coach: string; member: string; duration: string; status: string; statusClass: string
}> = {
  '1': { date: '5월 21일 (수)', time: '10:00', coach: '코치 김민준', member: '이수진', duration: '60분', status: '완료',   statusClass: 'bg-emerald-500/10 text-emerald-400' },
  '2': { date: '5월 21일 (수)', time: '11:00', coach: '코치 김민준', member: '박준영', duration: '60분', status: '진행 중', statusClass: 'bg-volta/10 text-volta' },
  '3': { date: '5월 21일 (수)', time: '14:00', coach: '코치 박서연', member: '최민서', duration: '60분', status: '예정',   statusClass: 'bg-secondary text-muted-foreground' },
  '4': { date: '5월 21일 (수)', time: '15:00', coach: '코치 최태호', member: '강유진', duration: '60분', status: '예정',   statusClass: 'bg-secondary text-muted-foreground' },
}

export default function OwnerLessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const lesson = LESSON_MOCK[id] ?? LESSON_MOCK['1']
  const [tab, setTab] = useState<Tab>('feedback')

  return (
    <main className="max-w-screen-sm mx-auto px-5 pb-10">
      <header className="flex items-center gap-3 py-5">
        <Link
          href="/owner"
          className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <svg className="w-4 h-4 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground">레슨 상세</p>
          <p className="text-[15px] font-semibold truncate">{lesson.date} {lesson.time}</p>
        </div>
      </header>

      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${lesson.statusClass}`}>
            {lesson.status}
          </span>
          <span className="text-xs text-muted-foreground">{lesson.duration}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-background rounded-lg px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground mb-0.5">코치</p>
            <p className="text-sm font-semibold">{lesson.coach}</p>
          </div>
          <div className="bg-background rounded-lg px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground mb-0.5">회원</p>
            <p className="text-sm font-semibold">{lesson.member}</p>
          </div>
        </div>
      </div>

      <nav className="flex gap-1 border-b border-border mb-6">
        {([
          { id: 'feedback', label: '피드백' },
          { id: 'video',    label: '영상' },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`relative px-1 py-3 text-sm transition-colors ${
              tab === t.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-volta rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {tab === 'feedback' && <FeedbackThread lessonId={id} readOnly />}
      {tab === 'video'    && <VideoFeedback  lessonId={id} readOnly />}
    </main>
  )
}
