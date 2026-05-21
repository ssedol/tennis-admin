import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { TodaySchedule } from '@/components/owner/TodaySchedule'
import { StatsPanel } from '@/components/owner/StatsPanel'

export default async function OwnerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // organization_id 조회
  const { data: myProfile } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const orgId = myProfile?.organization_id

  // 기간 계산
  const now        = new Date()
  const yearStart  = new Date(now.getFullYear(), 0, 1).toISOString()
  const yearEnd    = new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  const weekDay    = now.getDay() === 0 ? 6 : now.getDay() - 1  // 월요일 기준
  const weekStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekDay).toISOString()
  const weekEnd    = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekDay + 6, 23, 59, 59).toISOString()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString()

  const lessonCount = (start: string, end: string) =>
    admin.from('lesson_schedules').select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .gte('scheduled_at', start)
      .lte('scheduled_at', end)

  const [
    { count: coachCount },
    { count: memberCount },
    { count: yearlyCount },
    { count: monthlyCount },
    { count: weeklyCount },
    { data: todayLessons },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId).eq('role', 'COACH'),
    admin.from('profiles').select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId).eq('role', 'MEMBER'),
    lessonCount(yearStart, yearEnd),
    lessonCount(monthStart, monthEnd),
    lessonCount(weekStart, weekEnd),
    admin.from('lesson_schedules')
      .select(`id, scheduled_at, status,
        member:profiles!member_id(name),
        coach:profiles!coach_id(name)`)
      .eq('organization_id', orgId)
      .gte('scheduled_at', todayStart)
      .lte('scheduled_at', todayEnd)
      .order('scheduled_at'),
  ])

  type LessonRow = {
    id: string
    scheduled_at: string
    status: string
    member: { name: string } | { name: string }[] | null
    coach:  { name: string } | { name: string }[] | null
  }
  const lessons = (todayLessons ?? []) as unknown as LessonRow[]

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">현황</h1>
        <p className="text-sm text-muted-foreground mt-1">{now.getFullYear()}년</p>
      </div>

      <StatsPanel
        yearly={yearlyCount ?? 0}
        monthly={monthlyCount ?? 0}
        weekly={weeklyCount ?? 0}
        coachCount={coachCount ?? 0}
        memberCount={memberCount ?? 0}
      />

      {/* 오늘 일정 */}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        오늘 일정
      </p>

      <TodaySchedule lessons={lessons} />
    </>
  )
}
