'use client'

import { useCallback, useEffect, useState } from 'react'

type Comment = {
  id: string
  author: string
  role: 'COACH' | 'MEMBER' | 'OWNER'
  content: string
  createdAt: string
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function normalizeRole(role: string): Comment['role'] {
  const r = role.toUpperCase()
  if (r === 'MEMBER') return 'MEMBER'
  if (r === 'OWNER') return 'OWNER'
  return 'COACH'
}

export function FeedbackThread({ lessonId, readOnly = false }: { lessonId: string; readOnly?: boolean }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFeedbacks = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/lessons/${lessonId}/feedbacks`)
    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? '피드백을 불러오지 못했습니다')
      return
    }

    setComments(
      (json.feedbacks ?? []).map((f: {
        id: string
        content: string
        created_at: string
        author: { name: string; role: string }
      }) => ({
        id: f.id,
        author: f.author.name,
        role: normalizeRole(f.author.role),
        content: f.content,
        createdAt: formatTime(f.created_at),
      }))
    )
  }, [lessonId])

  useEffect(() => {
    loadFeedbacks()
  }, [loadFeedbacks])

  async function handleSubmit() {
    if (!draft.trim() || submitting) return

    setSubmitting(true)
    setError(null)

    const res = await fetch(`/api/lessons/${lessonId}/feedbacks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: draft.trim() }),
    })

    const json = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(json.error ?? '등록 중 오류가 발생했습니다')
      return
    }

    const f = json.feedback
    setComments((prev) => [
      ...prev,
      {
        id: f.id,
        author: f.author.name,
        role: normalizeRole(f.author.role),
        content: f.content,
        createdAt: formatTime(f.created_at),
      },
    ])
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">불러오는 중...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">아직 등록된 피드백이 없습니다</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => {
            const isCoach = c.role === 'COACH' || c.role === 'OWNER'
            return (
              <div key={c.id} className={`flex gap-3 ${isCoach ? '' : 'flex-row-reverse'}`}>
                <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                  isCoach ? 'bg-volta/10 text-volta' : 'bg-secondary text-muted-foreground'
                }`}>
                  {c.author[0]}
                </div>

                <div className={`max-w-[80%] ${isCoach ? '' : 'items-end flex flex-col'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold">{c.author}</span>
                    <span className="text-[11px] text-muted-foreground">{c.createdAt}</span>
                  </div>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isCoach
                      ? 'bg-card border border-border text-foreground rounded-tl-sm'
                      : 'bg-volta/10 text-foreground rounded-tr-sm'
                  }`}>
                    {c.content}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!readOnly && (
      <div className="flex gap-2 pt-2 border-t border-border">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="피드백을 입력하세요..."
          rows={2}
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-volta transition-colors resize-none"
        />
        <button
          onClick={handleSubmit}
          disabled={!draft.trim() || submitting}
          className="self-end px-4 py-2.5 rounded-xl bg-volta text-black text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {submitting ? '등록 중...' : '등록'}
        </button>
      </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
