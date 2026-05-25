'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Role = 'COACH' | 'MEMBER'

interface Person {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  role: string
  coach_id?: string | null
}

interface Props {
  coaches: Person[]
  members: Person[]
}

export function MembersClient({ coaches, members }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<Role>('COACH')

  // 등록 모달
  const [showForm, setShowForm] = useState(false)
  const [formRole, setFormRole] = useState<Role>('COACH')
  const [form, setForm] = useState({ name: '', phone: '', email: '', coachId: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // 수정/삭제 모달
  const [selected, setSelected] = useState<Person | null>(null)
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', coachId: '' })
  const [editError, setEditError] = useState<string | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const list = tab === 'COACH' ? coaches : members

  function openForm(role: Role) {
    setFormRole(role)
    setForm({ name: '', phone: '', email: '', coachId: '' })
    setError(null)
    setDone(false)
    setShowForm(true)
  }

  function resetForm() {
    setForm({ name: '', phone: '', email: '', coachId: '' })
    setError(null)
    setDone(false)
  }

  function openEdit(person: Person) {
    setSelected(person)
    setEditForm({ name: person.name, phone: person.phone ?? '', email: person.email ?? '', coachId: person.coach_id ?? '' })
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
      body: JSON.stringify({ ...form, role: formRole }),
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
      body: JSON.stringify({ name: editForm.name, phone: editForm.phone, email: editForm.email, coachId: editForm.coachId || null }),
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
      {/* 탭 */}
      <div className="flex gap-1 mb-5 bg-secondary rounded-xl p-1">
        {(['COACH', 'MEMBER'] as Role[]).map((r) => (
          <button
            key={r}
            onClick={() => setTab(r)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === r ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {r === 'COACH' ? `코치 ${coaches.length}` : `회원 ${members.length}`}
          </button>
        ))}
      </div>

      {/* 추가 버튼 */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => openForm(tab)}
          className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-volta text-black hover:opacity-90 transition-opacity"
        >
          <span className="text-base leading-none">+</span>
          {tab === 'COACH' ? '코치 등록' : '회원 등록'}
        </button>
      </div>

      {/* 목록 */}
      <div className="space-y-2">
        {list.map((person) => (
          <button
            key={person.id}
            onClick={() => openEdit(person)}
            className="w-full bg-card border border-border rounded-xl p-4 hover:bg-secondary/30 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0">
                {person.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{person.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {person.email ?? ''}{person.phone ? ` · ${person.phone}` : ''}
                </p>
                {(person.role as string).toUpperCase() === 'MEMBER' && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {person.coach_id
                      ? `담당 코치: ${coaches.find((c) => c.id === person.coach_id)?.name ?? '—'}`
                      : '담당 코치 미배정'}
                  </p>
                )}
              </div>
              <span className={`text-[10px] font-medium px-2 py-1 rounded-full shrink-0 ${
                (person.role as string).toUpperCase() === 'COACH'
                  ? 'bg-volta/10 text-volta'
                  : 'bg-secondary text-muted-foreground'
              }`}>
                {(person.role as string).toUpperCase() === 'COACH' ? '코치' : '회원'}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* 수정/삭제 모달 */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeEdit} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-white">
                {(selected.role as string).toUpperCase() === 'COACH' ? '코치' : '회원'} 정보 수정
              </h2>
              <button onClick={closeEdit} className="text-zinc-400 hover:text-white p-1 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {confirmDelete ? (
              <div className="space-y-4">
                <p className="text-sm text-zinc-300">
                  <span className="text-white font-semibold">{selected.name}</span> 계정을 삭제하시겠습니까?<br />
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
                    placeholder="email@example.com"
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

                {(selected.role as string).toUpperCase() === 'MEMBER' && (
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">담당 코치</label>
                    <select
                      value={editForm.coachId}
                      onChange={(e) => setEditForm((f) => ({ ...f, coachId: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white outline-none focus:border-volta transition-colors"
                    >
                      <option value="">미배정</option>
                      {coaches.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

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

      {/* 모달 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-white">
                {formRole === 'COACH' ? '코치 등록' : '회원 등록'}
              </h2>
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
                <button onClick={resetForm} className="text-xs text-muted-foreground underline underline-offset-2">
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

                {formRole === 'MEMBER' && (
                  <div>
                    <label className="text-xs text-zinc-400 mb-1.5 block">담당 코치</label>
                    <select
                      value={form.coachId}
                      onChange={(e) => setForm((f) => ({ ...f, coachId: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white outline-none focus:border-volta transition-colors"
                    >
                      <option value="">선택 안함</option>
                      {coaches.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}

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
