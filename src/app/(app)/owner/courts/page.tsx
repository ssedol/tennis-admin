import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { CourtScheduleGrid } from '@/components/owner/CourtScheduleGrid'
import { CourtDatePicker } from '@/components/owner/CourtDatePicker'
import { durationToSlotCount, utcIsoRangeToSlotIndices, utcIsoToSlotIndex } from '@/lib/time-slots'

type Slot = { id?: string; type: 'LESSON' | 'CLUB' | 'EXTERNAL' | 'BLOCK' | 'EMPTY'; label?: string; sub?: string }

export default async function CourtsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date: dateParam } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: myProfile } = await admin
    .from('profiles').select('organization_id').eq('id', user!.id).single()
  const orgId = myProfile?.organization_id

  // 선택된 날짜 (없으면 오늘)
  const todayStr   = new Date().toISOString().slice(0, 10)
  const selectedDate = dateParam ?? todayStr
  const isToday    = selectedDate === todayStr

  const rangeStart = `${selectedDate}T00:00:00Z`
  const nextDay    = new Date(`${selectedDate}T00:00:00Z`)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const rangeEnd   = nextDay.toISOString()

  // 날짜 레이블
  const d = new Date(`${selectedDate}T12:00:00Z`)
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const dayLabel = `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${dayNames[d.getUTCDay()]})`

  // 코트 목록
  const { data: courts } = await admin
    .from('courts')
    .select('id, name, court_type, surface, sort_order')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('sort_order')

  // 레슨 (코트 지정된 것)
  const { data: lessons } = await admin
    .from('lesson_schedules')
    .select(`
      id, court_id, scheduled_at, duration_min, status,
      member:profiles!member_id(name),
      coach:profiles!coach_id(name)
    `)
    .eq('organization_id', orgId)
    .not('court_id', 'is', null)
    .gte('scheduled_at', rangeStart)
    .lt('scheduled_at', rangeEnd)

  // 코트 예약 (동호회 등)
  const { data: reservations } = await admin
    .from('court_reservations')
    .select('id, court_id, type, title, reserver_name, start_at, end_at')
    .eq('organization_id', orgId)
    .gte('start_at', rangeStart)
    .lt('start_at', rangeEnd)

  // 시간대별 슬롯 맵
  const schedule: Record<string, Record<number, Slot>> = {}

  for (const lesson of lessons ?? []) {
    if (!lesson.court_id) continue
    const startSlot = utcIsoToSlotIndex(lesson.scheduled_at)
    const slotCount = durationToSlotCount(lesson.duration_min ?? 60)
    const memberRaw = lesson.member as { name: string } | { name: string }[] | null
    const coachRaw  = lesson.coach  as { name: string } | { name: string }[] | null
    const member = (Array.isArray(memberRaw) ? memberRaw[0]?.name : memberRaw?.name) ?? '—'
    const coach  = (Array.isArray(coachRaw)  ? coachRaw[0]?.name  : coachRaw?.name)  ?? '—'
    if (!schedule[lesson.court_id]) schedule[lesson.court_id] = {}
    for (let s = 0; s < slotCount; s++) {
      schedule[lesson.court_id][startSlot + s] = { type: 'LESSON', label: member, sub: `코치 ${coach}` }
    }
  }

  for (const res of reservations ?? []) {
    if (!res.court_id) continue
    if (!schedule[res.court_id]) schedule[res.court_id] = {}
    for (const slot of utcIsoRangeToSlotIndices(res.start_at, res.end_at)) {
      schedule[res.court_id][slot] = {
        id: res.id,
        type: res.type as Slot['type'],
        label: res.title,
        sub: res.reserver_name ?? undefined,
      }
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <CourtDatePicker
          currentDate={selectedDate}
          isToday={isToday}
          dayLabel={dayLabel}
        />
      </div>

      <CourtScheduleGrid
        key={selectedDate}
        courts={courts ?? []}
        schedule={schedule}
        date={selectedDate}
      />
    </>
  )
}
