'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'

type Comment = {
  id: string
  author: string
  role: 'COACH' | 'MEMBER' | 'OWNER'
  content: string
  createdAt: string
  isMine: boolean
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const editRef = useRef<HTMLTextAreaElement>(null)

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
        is_mine: boolean
        author: { name: string; role: string }
      }) => ({
        id: f.id,
        author: f.author.name,
        role: normalizeRole(f.author.role),
        content: f.content,
        createdAt: formatTime(f.created_at),
        isMine: f.is_mine ?? false,
      }))
    )
  }, [lessonId])

  useEffect(() => {
    loadFeedbacks()
  }, [loadFeedbacks])

  useEffect(() => {
    if (editingId && editRef.current) {
      editRef.current.focus()
      editRef.current.setSelectionRange(editRef.current.value.length, editRef.current.value.length)
    }
  }, [editingId])

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
        isMine: true,
      },
    ])
    setDraft('')
  }

  function startEdit(comment: Comment) {
    setEditingId(comment.id)
    setEditContent(comment.content)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditContent('')
  }

  async function saveEdit(commentId: string) {
    if (!editContent.trim() || editSaving) return
    setEditSaving(true)

    const res = await fetch(`/api/lessons/${lessonId}/feedbacks/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent.trim() }),
    })

    const json = await res.json()
    setEditSaving(false)

    if (!res.ok) {
      setError(json.error ?? '수정 중 오류가 발생했습니다')
      return
    }

    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, content: editContent.trim() } : c))
    )
    setEditingId(null)
    setEditContent('')
  }

  async function handleDeleteConfirm() {
    if (!deleteTargetId) return
    setDeletingId(deleteTargetId)

    const res = await fetch(`/api/lessons/${lessonId}/feedbacks/${deleteTargetId}`, {
      method: 'DELETE',
    })

    const json = await res.json()
    setDeletingId(null)
    setDeleteTargetId(null)

    if (!res.ok) {
      setError(json.error ?? '삭제 중 오류가 발생했습니다')
      return
    }

    setComments((prev) => prev.filter((c) => c.id !== deleteTargetId))
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
            const isEditing = editingId === c.id
            const isDeleting = deletingId === c.id

            return (
              <div key={c.id} className={`flex gap-3 ${isCoach ? '' : 'flex-row-reverse'}`}>
                <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                  isCoach ? 'bg-volta/10 text-volta' : 'bg-secondary text-muted-foreground'
                }`}>
                  {c.author[0]}
                </div>

                <div className={`max-w-[80%] ${isCoach ? '' : 'items-end flex flex-col'}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isCoach ? '' : 'flex-row-reverse'}`}>
                    <span className="text-xs font-semibold">{c.author}</span>
                    <span className="text-[11px] text-muted-foreground">{c.createdAt}</span>
                    {c.isMine && !readOnly && !isEditing && (
                      <div className={`flex items-center gap-1 ${isCoach ? '' : 'flex-row-reverse'}`}>
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          수정
                        </button>
                        <span className="text-[10px] text-muted-foreground/40">·</span>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetId(c.id)}
                          disabled={isDeleting}
                          className="text-[10px] text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? '…' : '삭제'}
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="w-full space-y-1.5">
                      <textarea
                        ref={editRef}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl bg-card border border-volta/50 text-sm text-foreground outline-none resize-none"
                      />
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => saveEdit(c.id)}
                          disabled={editSaving || !editContent.trim()}
                          className="text-[11px] px-3 py-1.5 rounded-lg bg-volta text-black font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
                        >
                          {editSaving ? '저장 중…' : '저장'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={editSaving}
                          className="text-[11px] px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isCoach
                        ? 'bg-card border border-border text-foreground rounded-tl-sm'
                        : 'bg-volta/10 text-foreground rounded-tr-sm'
                    }`}>
                      {c.content}
                    </div>
                  )}
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

      <DeleteConfirmModal
        open={deleteTargetId !== null}
        title="피드백을 삭제할까요?"
        description="삭제한 피드백은 복구할 수 없습니다."
        confirming={deletingId !== null}
        onCancel={() => { if (!deletingId) setDeleteTargetId(null) }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
