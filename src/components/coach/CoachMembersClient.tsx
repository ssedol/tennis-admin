'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Member {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  coach_id?: string | null
}

interface Props {
  members: Member[]
  coachId: string
}

export function CoachMembersClient({ members, coachId }: Props) {
  const router = useRouter()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const [selected, setSelected] = useState<Member | null>(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '' })
  const [editError, setEditError] = useState<string | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function openForm() {
    setForm({ name: '', phone: '', email: '' })
    setError(null)
    setDone(false)
    setShowForm(true)
  }

  function openEdit(member: Member) {
    setSelected(member)
    setEditForm({ name: member.name, phone: member.phone ?? '', email: member.email ?? '' })
    setEditError(null)
    setConfirmDelete(false)
  }

  function closeEdit() {
    setSelected(null)
    setConfirmDelete(false)
    setEditError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const res = await fetch('/api/members/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, role: 'MEMBER', coachId }),
    })

    const json = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(json.error ?? '오류가 발생했습니다')
    } else {
      setDone(true)
      router.refresh()
    }
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setEditSubmitting(true)
    setEditError(null)

    const res = await fetch(`/api/members/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editForm.name, phone: editForm.phone, email: editForm.email }),
    })

    const json = await res.json()
    setEditSubmitting(false)

    if (!res.ok) {
      setEditError(json.error ?? '오류가 발생했습니다')
    } else {
      closeEdit()
      router.refresh()
    }
  }

  async function handleDelete() {
    if (!selected) return
    setEditSubmitting(true)

    const res = await fetch(`/api/members/${selected.id}`, { method: 'DELETE' })
    setEditSubmitting(false)

    if (!res.ok) {
      const json = await res.json()
      setEditError(json.error ?? '삭제 중 오류가 발생했습니다')
      setConfirmDelete(false)
    } else {
      closeEdit()
      router.refresh()
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-muted-foreground">회원 {members.length}명</p>
        <button
          onClick={openForm}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-volta text-black hover:opacity-90 transition-opacity"
        >
          <span className="text-base leading-none">+</span>
          회원 추가
        </button>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          등록된 회원이 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <button
              key={member.id}
              onClick={() => openEdit(member)}
              className="w-full bg-card border border-border rounded-xl p-4 hover:bg-secondary/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0">
                  {member.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{member.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {member.email ?? ''}{member.phone ? ` · ${member.phone}` : ''}
                  </p>
                </div>
                <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-secondary text-muted-foreground shrink-0">
                  회원
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 회원 수정/삭제 모달 */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeEdit} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-white">회원 정보 수정</h2>
              <button onClick={closeEdit} className="text-zinc-400 hover:text-white p-1 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {confirmDelete ? (
              <div className="space-y-4">
                <p className="text-sm text-zinc-300">
                  <span className="text-white font-semibold">{selected.name}</span> 계정을 삭제하시겠습니까?
                  <span className="text-xs text-zinc-500 mt-1 block">삭제 후 복구할 수 없습니다.</span>
                </p>
                {editError && <p className="text-xs text-destructive">{editError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2.5 rounded-xl border border-zinc-600 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={editSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-red-500/80 text-white text-sm font-semibold hover:bg-red-500 transition-colors disabled:opacity-50"
                  >
                    {editSubmitting ? '삭제 중...' : '삭제'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleEditSave} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">이름 *</label>
                  <input
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white outline-none focus:border-volta transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">이메일 * (로그인 시 사용)</label>
                  <input
                    required
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white placeholder:text-zinc-500 outline-none focus:border-volta transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">연락처</label>
                  <input
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="010-0000-0000"
                    className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white placeholder:text-zinc-500 outline-none focus:border-volta transition-colors"
                  />
                </div>
                {editError && <p className="text-xs text-destructive">{editError}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="px-4 py-2.5 rounded-xl border border-red-500/40 text-red-400 text-sm hover:bg-red-500/10 transition-colors"
                  >
                    삭제
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-volta text-black text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {editSubmitting ? '저장 중...' : '저장'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 회원 추가 모달 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-white">회원 등록</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-white p-1 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {done ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-volta-muted border border-volta/20 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-volta" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold">{form.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    계정이 생성됐습니다.<br />
                    초기 비밀번호는 <span className="text-white font-semibold">1234</span>입니다.
                  </p>
                </div>
                <button
                  onClick={() => { setForm({ name: '', phone: '', email: '' }); setDone(false) }}
                  className="text-xs text-muted-foreground underline underline-offset-2"
                >
                  한 명 더 등록
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">이름 *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="홍길동"
                    className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white placeholder:text-zinc-500 outline-none focus:border-volta transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">연락처</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="010-0000-0000"
                    className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white placeholder:text-zinc-500 outline-none focus:border-volta transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 block">이메일 * (로그인 시 사용)</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white placeholder:text-zinc-500 outline-none focus:border-volta transition-colors"
                  />
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-volta text-black text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? '등록 중...' : '계정 생성'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
