'use client'

import { useState } from 'react'

type Role = 'COACH' | 'MEMBER'

interface Person {
  id: string
  name: string
  phone?: string | null
  role: string
}

interface Props {
  coaches: Person[]
  members: Person[]
}

export function MembersClient({ coaches, members }: Props) {
  const [tab, setTab] = useState<Role>('COACH')
  const [showForm, setShowForm] = useState(false)
  const [formRole, setFormRole] = useState<Role>('COACH')
  const [form, setForm] = useState({ name: '', phone: '', email: '', coachId: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

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
      // 목록 갱신을 위해 페이지 리로드
      setTimeout(() => window.location.reload(), 1500)
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
          <div key={person.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0">
                {person.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{person.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {person.phone ?? '연락처 없음'}
                </p>
              </div>
              <span className={`text-[10px] font-medium px-2 py-1 rounded-full shrink-0 ${
                (person.role as string).toUpperCase() === 'COACH'
                  ? 'bg-volta/10 text-volta'
                  : 'bg-secondary text-muted-foreground'
              }`}>
                {(person.role as string).toUpperCase() === 'COACH' ? '코치' : '회원'}
              </span>
            </div>
          </div>
        ))}
      </div>

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
                    로그인 페이지에서 이메일을 입력하면 접속할 수 있습니다.
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
