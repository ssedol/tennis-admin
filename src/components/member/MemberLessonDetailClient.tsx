'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FeedbackThread } from '@/components/member/FeedbackThread'
import { VideoFeedback } from '@/components/member/VideoFeedback'

type Tab = 'feedback' | 'video'

type LessonInfo = {
  date: string
  coach: string
  duration: string
  status: string
  statusClass: string
}

interface Props {
  lessonId: string
  lesson: LessonInfo
}

export function MemberLessonDetailClient({ lessonId, lesson }: Props) {
  const [tab, setTab] = useState<Tab>('feedback')

  return (
    <>
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

      <div className="bg-card border border-border rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold">{lesson.coach}</p>
            <p className="text-xs text-muted-foreground">{lesson.duration}</p>
          </div>
          <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${lesson.statusClass}`}>
            {lesson.status}
          </span>
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

      {tab === 'feedback' && <FeedbackThread lessonId={lessonId} />}
      {tab === 'video'    && <VideoFeedback  lessonId={lessonId} />}
    </>
  )
}
