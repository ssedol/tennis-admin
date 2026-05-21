'use client'

import { useState } from 'react'
import Link from 'next/link'
import { use } from 'react'
import { FeedbackThread } from '@/components/member/FeedbackThread'
import { VideoFeedback } from '@/components/member/VideoFeedback'

type Tab = 'feedback' | 'video'

const LESSON_MOCK: Record<string, { date: string; coach: string; duration: string; status: string }> = {
  '1': { date: '5월 19일 (월) 10:00', coach: '코치 김민준', duration: '60분', status: '완료' },
  '2': { date: '5월 15일 (목) 10:00', coach: '코치 김민준', duration: '60분', status: '완료' },
  '3': { date: '5월 8일 (목) 10:00',  coach: '코치 김민준', duration: '60분', status: '완료' },
}

export default function LessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const lesson = LESSON_MOCK[id] ?? LESSON_MOCK['1']
  const [tab, setTab] = useState<Tab>('feedback')

  return (
    <main className="max-w-screen-sm mx-auto px-5 pb-10">
      {/* 헤더 */}
      <header className="flex items-center gap-3 py-5">
        <Link
          href="/member"
          className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <svg className="w-4 h-4 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground">레슨 상세</p>
          <p className="text-[15px] font-semibold truncate">{lesson.date}</p>
        </div>
      </header>

      {/* 레슨 정보 카드 */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{lesson.coach}</p>
            <p className="text-xs text-muted-foreground">{lesson.duration}</p>
          </div>
          <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400">
            {lesson.status}
          </span>
        </div>
      </div>

      {/* 탭 */}
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

      {/* 탭 콘텐츠 */}
      {tab === 'feedback' && <FeedbackThread lessonId={id} />}
      {tab === 'video'    && <VideoFeedback  lessonId={id} />}
    </main>
  )
}
