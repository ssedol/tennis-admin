import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { CourtScheduleGrid } from '@/components/owner/CourtScheduleGrid'
import { CourtDatePicker } from '@/components/owner/CourtDatePicker'

type Slot = { type: 'LESSON' | 'CLUB' | 'EXTERNAL' | 'BLOCK' | 'EMPTY'; label?: string; sub?: string }

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
    const hour  = new Date(lesson.scheduled_at).getUTCHours()
    const hours = Math.ceil((lesson.duration_min ?? 60) / 60)
    const member = (lesson.member as { name: string } | null)?.name ?? '—'
    const coach  = (lesson.coach  as { name: string } | null)?.name ?? '—'
    if (!schedule[lesson.court_id]) schedule[lesson.court_id] = {}
    for (let h = 0; h < hours; h++) {
      schedule[lesson.court_id][hour + h] = { type: 'LESSON', label: member, sub: `코치 ${coach}` }
    }
  }

  for (const res of reservations ?? []) {
    if (!res.court_id) continue
    const startHour = new Date(res.start_at).getUTCHours()
    const endHour   = new Date(res.end_at).getUTCHours()
    if (!schedule[res.court_id]) schedule[res.court_id] = {}
    for (let h = startHour; h < endHour; h++) {
      schedule[res.court_id][h] = {
        id: res.id,          // ← 수정/삭제에 필요한 reservation ID
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
