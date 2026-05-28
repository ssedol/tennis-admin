'use client'

import { useCallback, useRef, useState } from 'react'
import {
  getCurrentSlotIndex,
  slotIndexToTimeLabel,
  slotRangeToUtcIso,
  SLOTS_PER_DAY,
  TIME_SLOT_OPTIONS,
} from '@/lib/time-slots'

const SLOTS = Array.from({ length: SLOTS_PER_DAY }, (_, i) => i)

type SlotType = 'LESSON' | 'CLUB' | 'EXTERNAL' | 'BLOCK' | 'EMPTY'

export type Slot = {
  id?: string
  type: SlotType
  label?: string
  sub?: string
}

export type Court = {
  id: string
  name: string
  court_type: string
  surface: string
}

type CourtScheduleGridProps = {
  courts: Court[]
  schedule: Record<string, Record<number, Slot>>
  date: string  // YYYY-MM-DD
}


const SURFACE_LABEL: Record<string, string> = {
  HARD:            '하드',
  CLAY:            '클레이',
  GRASS:           '잔디',
  ARTIFICIAL_TURF: '인조잔디',
}

const SLOT_STYLE: Record<SlotType, string> = {
  LESSON:   'bg-amber-400/25  border-amber-400/70  text-amber-300',
  CLUB:     'bg-blue-500/25   border-blue-400/70   text-blue-300',
  EXTERNAL: 'bg-violet-500/25 border-violet-400/70 text-violet-300',
  BLOCK:    'bg-zinc-600/50   border-zinc-500/80   text-zinc-300',
  EMPTY:    'bg-transparent border-transparent',
}

const TYPE_DOT: Record<SlotType, string> = {
  LESSON:   'bg-amber-400',
  CLUB:     'bg-blue-400',
  EXTERNAL: 'bg-violet-400',
  BLOCK:    'bg-zinc-500',
  EMPTY:    '',
}

const TYPE_OPTIONS: { value: Exclude<SlotType, 'EMPTY'>; label: string }[] = [
  { value: 'CLUB',     label: '동호회' },
  { value: 'EXTERNAL', label: '외부 예약' },
  { value: 'BLOCK',    label: '사용 불가' },
]

// 등록 폼 기본값 (레슨 제외)
const DEFAULT_FORM_TYPE: Exclude<SlotType, 'EMPTY' | 'LESSON'> = 'CLUB'

// ─── 예약 저장/수정 공용 폼 컴포넌트 ──────────────────────────────
type ReservationFormProps = {
  title: string
  courtName: string
  startSlot: number
  endSlot: number
  type: Exclude<SlotType, 'EMPTY'>
  label: string
  saving: boolean
  error: string | null
  onChangeType:  (v: Exclude<SlotType, 'EMPTY'>) => void
  onChangeLabel: (v: string) => void
  onChangeStart: (v: number) => void
  onChangeEnd:   (v: number) => void
  onSave:  () => void
  onClose: () => void
}

function ReservationForm({
  title, courtName, startSlot, endSlot, type, label, saving, error,
  onChangeType, onChangeLabel, onChangeStart, onChangeEnd, onSave, onClose,
}: ReservationFormProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-zinc-400 mb-5">{courtName}</p>

        {/* 시간 범위 */}
        <label className="text-xs text-zinc-400 mb-1.5 block">시간</label>
        <div className="flex items-center gap-2 mb-4">
          <select
            value={startSlot}
            onChange={(e) => onChangeStart(Number(e.target.value))}
            className="flex-1 px-3 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white outline-none focus:border-volta"
          >
            {TIME_SLOT_OPTIONS.map(({ value, label: timeLabel }) => (
              <option key={value} value={value}>{timeLabel}</option>
            ))}
          </select>
          <span className="text-zinc-500 text-sm shrink-0">~</span>
          <select
            value={endSlot}
            onChange={(e) => onChangeEnd(Number(e.target.value))}
            className="flex-1 px-3 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white outline-none focus:border-volta"
          >
            {TIME_SLOT_OPTIONS.filter(({ value }) => value >= startSlot).map(({ value, label: timeLabel }) => (
              <option key={value} value={value}>{timeLabel}</option>
            ))}
          </select>
        </div>

        {/* 유형 */}
        <label className="text-xs text-zinc-400 mb-1.5 block">유형</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {TYPE_OPTIONS.map(({ value, label: optLabel }) => (
            <button
              key={value}
              type="button"
              onClick={() => onChangeType(value)}
              className={`py-2.5 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                type === value
                  ? `${SLOT_STYLE[value]} font-semibold`
                  : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-600'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${TYPE_DOT[value]}`} />
              {optLabel}
            </button>
          ))}
        </div>

        {/* 제목 */}
        {type !== 'BLOCK' && (
          <>
            <label className="text-xs text-zinc-400 mb-1.5 block">제목</label>
            <input
              value={label}
              onChange={(e) => onChangeLabel(e.target.value)}
              placeholder={
                type === 'LESSON'   ? '예: 김민준 레슨' :
                type === 'CLUB'     ? '예: 화요 동호회' :
                '예: 네이버 예약'
              }
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white placeholder:text-zinc-500 outline-none focus:border-volta mb-4"
            />
          </>
        )}

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        <button
          onClick={onSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-volta text-black text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────
export function CourtScheduleGrid({ courts, schedule: initialSchedule, date }: CourtScheduleGridProps) {
  const [schedule, setSchedule] = useState(initialSchedule)

  // 신규 등록 폼
  const [pending, setPending] = useState<{ courtId: string; startSlot: number; endSlot: number } | null>(null)
  const [formType,  setFormType]  = useState<Exclude<SlotType, 'EMPTY'>>('CLUB')
  const [formLabel, setFormLabel] = useState('')
  const [formStart, setFormStart] = useState(0)
  const [formEnd,   setFormEnd]   = useState(0)
  const [saving,    setSaving]    = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // 상세 / 수정 팝업
  const [detail, setDetail] = useState<{ court: Court; startSlot: number; endSlot: number; slot: Slot } | null>(null)
  const [editMode,    setEditMode]    = useState(false)
  const [editType,    setEditType]    = useState<Exclude<SlotType, 'EMPTY'>>('CLUB')
  const [editLabel,   setEditLabel]   = useState('')
  const [editStart,   setEditStart]   = useState(0)
  const [editEnd,     setEditEnd]     = useState(0)
  const [editSaving,  setEditSaving]  = useState(false)
  const [editError,   setEditError]   = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const nowSlot = getCurrentSlotIndex()
  const isToday = date === new Date().toISOString().slice(0, 10)

  // 헤더↔바디 가로 스크롤 동기화
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const bodyScrollRef   = useRef<HTMLDivElement>(null)

  const syncHeaderScroll = useCallback(() => {
    if (headerScrollRef.current && bodyScrollRef.current) {
      headerScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft
    }
  }, [])

  // 코트 열 너비 (헤더·바디 동일하게 사용해야 정렬 유지)
  const COURT_COL = 100  // px
  const TIME_COL  = 52   // px

  // ─── 셀 탭 ────────────────────────────────────────────────────
  function handleCellTap(court: Court, slot: number) {
    const slotData = schedule[court.id]?.[slot]
    if (slotData && slotData.type !== 'EMPTY') {
      setDetail({ court, startSlot: slot, endSlot: slot, slot: slotData })
      setEditMode(false)
      setConfirmDelete(false)
    } else {
      setFormType('CLUB')
      setFormLabel('')
      setFormStart(slot)
      setFormEnd(slot)
      setFormError(null)
      setPending({ courtId: court.id, startSlot: slot, endSlot: slot })
    }
  }

  // ─── 신규 저장 ────────────────────────────────────────────────
  async function handleSave() {
    if (!pending) return
    if (formType !== 'BLOCK' && !formLabel.trim()) return setFormError('제목을 입력하세요')

    const start = Math.min(formStart, formEnd)
    const end   = Math.max(formStart, formEnd)
    const { start_at: startAt, end_at: endAt } = slotRangeToUtcIso(date, start, end)

    setSaving(true)
    const res = await fetch('/api/court-reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ court_id: pending.courtId, type: formType, title: formLabel.trim() || '사용 불가', start_at: startAt, end_at: endAt }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) return setFormError(json.error ?? '오류가 발생했습니다')

    setSchedule((prev) => {
      const next = { ...prev, [pending.courtId]: { ...(prev[pending.courtId] ?? {}) } }
      for (let s = start; s <= end; s++) {
        next[pending.courtId][s] = { id: json.reservation?.id, type: formType, label: formLabel.trim() || '사용 불가' }
      }
      return next
    })
    setPending(null)
  }

  // ─── 수정 열기 ────────────────────────────────────────────────
  function openEdit() {
    if (!detail) return
    setEditType(detail.slot.type as Exclude<SlotType, 'EMPTY'>)
    setEditLabel(detail.slot.label ?? '')
    setEditStart(detail.startSlot)
    setEditEnd(detail.endSlot)
    setEditError(null)
    setEditMode(true)
  }

  // ─── 수정 저장 ────────────────────────────────────────────────
  async function handleEditSave() {
    if (!detail?.slot?.id) return
    if (editType !== 'BLOCK' && !editLabel.trim()) return setEditError('제목을 입력하세요')

    const start = Math.min(editStart, editEnd)
    const end   = Math.max(editStart, editEnd)
    const { start_at: startAt, end_at: endAt } = slotRangeToUtcIso(date, start, end)

    setEditSaving(true)
    const res = await fetch(`/api/court-reservations/${detail.slot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: editType, title: editLabel.trim() || '사용 불가', start_at: startAt, end_at: endAt }),
    })
    setEditSaving(false)
    if (!res.ok) {
      const json = await res.json()
      return setEditError(json.error ?? '오류가 발생했습니다')
    }

    setSchedule((prev) => {
      const courtMap = { ...(prev[detail.court.id] ?? {}) }
      for (const s of Object.keys(courtMap).map(Number)) {
        if (courtMap[s]?.id === detail.slot.id) delete courtMap[s]
      }
      for (let s = start; s <= end; s++) {
        courtMap[s] = { id: detail.slot.id, type: editType, label: editLabel.trim() || '사용 불가' }
      }
      return { ...prev, [detail.court.id]: courtMap }
    })
    setDetail(null)
    setEditMode(false)
  }

  // ─── 삭제 ────────────────────────────────────────────────────
  async function handleDelete() {
    if (!detail?.slot?.id) return
    await fetch(`/api/court-reservations/${detail.slot.id}`, { method: 'DELETE' })
    setSchedule((prev) => {
      const courtMap = { ...(prev[detail.court.id] ?? {}) }
      for (const s of Object.keys(courtMap).map(Number)) {
        if (courtMap[s]?.id === detail.slot.id) delete courtMap[s]
      }
      return { ...prev, [detail.court.id]: courtMap }
    })
    setDetail(null)
    setConfirmDelete(false)
  }

  if (courts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="w-12 h-12 rounded-xl bg-card border-2 border-dashed border-border flex items-center justify-center">
          <span className="text-xl">🎾</span>
        </div>
        <p className="text-sm font-medium">등록된 코트가 없습니다</p>
        <p className="text-xs text-muted-foreground">설정 탭에서 코트를 추가해주세요</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 범례 */}
      <div className="flex items-center gap-3 flex-wrap">
        {TYPE_OPTIONS.map(({ value, label }) => (
          <div key={value} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${TYPE_DOT[value]}`} />
            <span className="text-[11px] text-muted-foreground">{label}</span>
          </div>
        ))}
        <span className="text-[11px] text-muted-foreground ml-auto hidden sm:block">
          빈 칸을 탭해서 예약 추가
        </span>
      </div>

      {/*
        ┌─────────────────────────────────────────────────────┐
        │  헤더 고정 (sticky top) + 시간 레이블 고정 (sticky left)  │
        │  → 하나의 overflow: auto 컨테이너 안에서만 작동         │
        └─────────────────────────────────────────────────────┘
      */}
      {/*
        ─ 코트 헤더 : sticky top-[100px] + overflow-x hidden
        ─ 타임 바디 : overflow-x auto + onScroll → 헤더 동기화
        overflow-x:auto 부모 안에서는 sticky가 viewport 기준으로 작동하지 않아서
        헤더를 분리하고 JS scrollLeft 동기화로 해결
      */}

      {/* ── 코트 헤더 (sticky) ── */}
      <div
        className="sticky z-20 -mx-5"
        style={{ top: '100px' }}   /* layout header 높이: h-14(56) + OwnerNav(44) = 100px */
      >
        <div
          ref={headerScrollRef}
          className="overflow-x-hidden"
          /* 스크롤바 숨기고 scrollLeft 만 JS로 제어 */
        >
          <div
            className="flex border border-white/15 rounded-t-xl overflow-hidden bg-background"
            style={{ minWidth: `${courts.length * 80 + TIME_COL}px` }}
          >
            {/* time 열 자리 */}
            <div style={{ width: `${TIME_COL}px`, flexShrink: 0 }} />
            {courts.map((court, i) => (
              <div
                key={court.id}
                className={`flex-1 min-w-[80px] text-center py-2.5 bg-zinc-800 ${i > 0 ? 'border-l border-white/15' : ''}`}
              >
                <p className="text-xs font-bold text-white truncate px-2">{court.name}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  {court.court_type === 'INDOOR' ? '실내' : '실외'} · {SURFACE_LABEL[court.surface] ?? court.surface}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 타임 바디 (가로 스크롤) ── */}
      <div
        ref={bodyScrollRef}
        className="overflow-x-auto -mx-5"
        onScroll={syncHeaderScroll}
      >
        <div
          className="border-l border-r border-b border-white/15 rounded-b-xl overflow-hidden"
          style={{ minWidth: `${courts.length * 80 + TIME_COL}px` }}
        >
          {SLOTS.map((slot) => {
            const isPast    = isToday && slot < nowSlot
            const isCurrent = isToday && slot === nowSlot
            const isHourMark = slot % 3 === 0
            return (
              <div
                key={slot}
                className={`flex border-t border-white/10 ${isPast ? 'opacity-35' : ''} ${
                  isCurrent ? 'bg-amber-400/5' : slot % 6 === 0 ? 'bg-white/[0.015]' : ''
                }`}
              >
                {/* 시간 레이블 */}
                <div
                  className={`shrink-0 flex items-center justify-end pr-2 py-0 tabular-nums select-none ${
                    isCurrent
                      ? 'text-amber-400 text-[11px] font-bold'
                      : isHourMark
                        ? 'text-zinc-400 text-[11px]'
                        : 'text-zinc-500 text-[10px]'
                  }`}
                  style={{ width: `${TIME_COL}px` }}
                >
                  {slotIndexToTimeLabel(slot)}
                  {isCurrent && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                </div>

                {/* 코트별 셀 */}
                {courts.map((court, i) => {
                  const slotData = schedule[court.id]?.[slot]
                  const slotType = slotData?.type ?? 'EMPTY'
                  return (
                    <button
                      key={court.id}
                      onClick={() => handleCellTap(court, slot)}
                      className={`flex-1 min-w-[80px] h-8 text-left px-2 transition-colors ${
                        i > 0 ? 'border-l border-white/10' : ''
                      } ${
                        slotType !== 'EMPTY'
                          ? `${SLOT_STYLE[slotType]} hover:brightness-110`
                          : 'hover:bg-white/5'
                      }`}
                    >
                      {slotType !== 'EMPTY' && (
                        <p className="text-[10px] font-semibold leading-tight truncate drop-shadow-sm">
                          {slotData?.label}
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* ─── 신규 등록 폼 ──────────────────────────────────────── */}
      {pending && (
        <ReservationForm
          title="예약 추가"
          courtName={courts.find((c) => c.id === pending.courtId)?.name ?? ''}
          startSlot={formStart}
          endSlot={formEnd}
          type={formType}
          label={formLabel}
          saving={saving}
          error={formError}
          onChangeType={setFormType}
          onChangeLabel={setFormLabel}
          onChangeStart={setFormStart}
          onChangeEnd={setFormEnd}
          onSave={handleSave}
          onClose={() => setPending(null)}
        />
      )}

      {/* ─── 상세 / 수정 / 삭제 팝업 ──────────────────────────── */}
      {detail && !editMode && !confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDetail(null)} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs text-zinc-400">
                {detail.court.name} · {slotIndexToTimeLabel(detail.startSlot)}
              </p>
              <button onClick={() => setDetail(null)} className="text-zinc-400 hover:text-white p-1 -mt-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-base font-semibold text-white mt-0.5 mb-1">{detail.slot.label || '—'}</p>
            {detail.slot.sub && <p className="text-xs text-zinc-400 mb-3">{detail.slot.sub}</p>}

            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium mb-5 ${SLOT_STYLE[detail.slot.type]}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${TYPE_DOT[detail.slot.type]}`} />
              {TYPE_OPTIONS.find((t) => t.value === detail.slot.type)?.label}
            </div>

            {detail.slot.type !== 'LESSON' && detail.slot.id && (
              <div className="flex gap-2">
                <button onClick={openEdit} className="flex-1 py-2.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium transition-colors">
                  수정
                </button>
                <button onClick={() => setConfirmDelete(true)} className="flex-1 py-2.5 rounded-xl border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors">
                  삭제
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 삭제 확인 ─────────────────────────────────────────── */}
      {detail && confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmDelete(false)} />
          <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <p className="text-sm font-semibold text-white mb-1">정말 삭제할까요?</p>
            <p className="text-xs text-zinc-400 mb-5">&ldquo;{detail.slot.label}&rdquo; 예약이 삭제됩니다</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium transition-colors">
                취소
              </button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors">
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 수정 폼 ────────────────────────────────────────────── */}
      {detail && editMode && (
        <ReservationForm
          title="예약 수정"
          courtName={detail.court.name}
          startSlot={editStart}
          endSlot={editEnd}
          type={editType}
          label={editLabel}
          saving={editSaving}
          error={editError}
          onChangeType={setEditType}
          onChangeLabel={setEditLabel}
          onChangeStart={setEditStart}
          onChangeEnd={setEditEnd}
          onSave={handleEditSave}
          onClose={() => { setEditMode(false); setEditError(null) }}
        />
      )}
    </div>
  )
}
