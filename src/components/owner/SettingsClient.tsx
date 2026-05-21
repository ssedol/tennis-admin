'use client'

import { useState } from 'react'

type Court = {
  id: string
  name: string
  court_type: string
  surface: string
  is_active: boolean
  sort_order: number
}

type FormState = {
  name: string
  court_type: 'INDOOR' | 'OUTDOOR'
  surface: 'HARD' | 'CLAY' | 'GRASS' | 'ARTIFICIAL_TURF'
}

const SURFACE_OPTIONS = [
  { value: 'HARD',           label: '하드' },
  { value: 'CLAY',           label: '클레이' },
  { value: 'GRASS',          label: '잔디' },
  { value: 'ARTIFICIAL_TURF', label: '인조잔디' },
]

const SURFACE_COLOR: Record<string, string> = {
  HARD:            'bg-zinc-400',
  CLAY:            'bg-orange-400',
  GRASS:           'bg-green-500',
  ARTIFICIAL_TURF: 'bg-emerald-400',
}

const EMPTY_FORM: FormState = { name: '', court_type: 'OUTDOOR', surface: 'HARD' }

export function SettingsClient({ initialCourts }: { initialCourts: Court[] }) {
  const [courts, setCourts] = useState<Court[]>(initialCourts)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openForm() {
    setForm(EMPTY_FORM)
    setError(null)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return setError('코트 이름을 입력하세요')
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/courts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    setSubmitting(false)
    if (!res.ok) return setError(json.error ?? '오류가 발생했습니다')
    if (json.court) setCourts((prev) => [...prev, json.court].sort((a, b) => a.sort_order - b.sort_order))
    setShowForm(false)
  }

  async function toggleActive(court: Court) {
    await fetch(`/api/courts/${court.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !court.is_active }),
    })
    setCourts((prev) => prev.map((c) => c.id === court.id ? { ...c, is_active: !c.is_active } : c))
  }

  async function moveOrder(index: number, dir: -1 | 1) {
    const target = index + dir
    if (target < 0 || target >= courts.length) return

    const updated = [...courts]
    // sort_order 값 교환
    const aOrder = updated[index].sort_order
    const bOrder = updated[target].sort_order

    // 같으면 index 기반으로 재할당
    const newA = bOrder === aOrder ? target : bOrder
    const newB = bOrder === aOrder ? index  : aOrder

    updated[index] = { ...updated[index], sort_order: newA }
    updated[target] = { ...updated[target], sort_order: newB }
    updated.sort((a, b) => a.sort_order - b.sort_order)
    setCourts(updated)

    await Promise.all([
      fetch(`/api/courts/${courts[index].id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: newA }),
      }),
      fetch(`/api/courts/${courts[target].id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: newB }),
      }),
    ])
  }

  return (
    <>
      {/* 코트 목록 */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            코트 ({courts.length}면)
          </p>
          <button
            onClick={openForm}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-volta text-black hover:opacity-90 transition-opacity"
          >
            + 코트 추가
          </button>
        </div>

        {courts.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
            <p className="text-sm text-muted-foreground">등록된 코트가 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {courts.map((court, idx) => (
              <div key={court.id} className={`bg-card border rounded-xl p-4 flex items-center gap-3 transition-opacity ${!court.is_active ? 'opacity-50' : 'border-border'}`}>

                {/* 순서 변경 버튼 */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => moveOrder(idx, -1)}
                    disabled={idx === 0}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-500 hover:text-white hover:bg-zinc-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    aria-label="위로"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M18 15l-6-6-6 6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveOrder(idx, 1)}
                    disabled={idx === courts.length - 1}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-500 hover:text-white hover:bg-zinc-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    aria-label="아래로"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </div>

                {/* 순서 번호 */}
                <span className="text-xs font-bold text-zinc-600 w-4 text-center shrink-0">{idx + 1}</span>

                <div className={`w-2 h-2 rounded-full shrink-0 ${SURFACE_COLOR[court.surface] ?? 'bg-zinc-400'}`} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{court.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {court.court_type === 'INDOOR' ? '실내' : '실외'} ·{' '}
                    {SURFACE_OPTIONS.find((s) => s.value === court.surface)?.label ?? court.surface}
                  </p>
                </div>

                <button
                  onClick={() => toggleActive(court)}
                  className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors shrink-0 ${
                    court.is_active
                      ? 'bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:text-red-400'
                      : 'bg-secondary text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-400'
                  }`}
                >
                  {court.is_active ? '사용 중' : '비활성'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 코트 추가 모달 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-white">코트 추가</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-white p-1 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">코트 이름 *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="예: 코트 A, 1번 코트"
                  required
                  className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white placeholder:text-zinc-500 outline-none focus:border-volta transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">실내 / 실외</label>
                <div className="grid grid-cols-2 gap-2">
                  {[['OUTDOOR', '실외'], ['INDOOR', '실내']].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, court_type: val as FormState['court_type'] }))}
                      className={`py-2.5 text-sm rounded-lg border transition-colors ${
                        form.court_type === val
                          ? 'border-volta/40 bg-volta/10 text-volta font-medium'
                          : 'border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-zinc-500'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">바닥 재질</label>
                <div className="grid grid-cols-2 gap-2">
                  {SURFACE_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, surface: s.value as FormState['surface'] }))}
                      className={`py-2.5 text-sm rounded-lg border transition-colors flex items-center justify-center gap-2 ${
                        form.surface === s.value
                          ? 'border-volta/40 bg-volta/10 text-volta font-medium'
                          : 'border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-zinc-500'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${SURFACE_COLOR[s.value]}`} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-volta text-black text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? '추가 중...' : '코트 추가'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
