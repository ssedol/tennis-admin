import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  countActiveLessonsInDateRange,
  countUpcomingActiveLessonsInPeriod,
} from '@/lib/lesson-stats'
import type { OwnerScheduleLesson } from '@/lib/owner-schedule-groups'
import { getKoreaPeriodKeyRanges, getKoreaYmd, koreaDateToUtcIso } from '@/lib/time-slots'
import { OwnerDashboard } from '@/components/owner/OwnerDashboard'

export default async function OwnerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: myProfile } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const orgId = myProfile?.organization_id
  const { y } = getKoreaYmd()
  const periodKeys = getKoreaPeriodKeyRanges()

  const yearQueryStart = koreaDateToUtcIso(y, 0, 1)
  const yearQueryEnd = koreaDateToUtcIso(y + 1, 0, 1)

  const [
    { count: coachCount },
    { count: memberCount },
    { data: allLessons },
    { data: scheduleLessonsRaw },
    { data: courtsRaw },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId).eq('role', 'COACH'),
    admin.from('profiles').select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId).eq('role', 'MEMBER'),
    admin.from('lesson_schedules')
      .select('scheduled_at, status')
      .eq('organization_id', orgId)
      .in('status', ['SCHEDULED', 'IN_PROGRESS']),
    admin.from('lesson_schedules')
      .select(`id, scheduled_at, duration_min, status, court_id,
        member:profiles!member_id(name),
        coach:profiles!coach_id(name),
        court:courts(name)`)
      .eq('organization_id', orgId)
      .in('status', ['SCHEDULED', 'IN_PROGRESS'])
      .gte('scheduled_at', yearQueryStart)
      .lt('scheduled_at', yearQueryEnd)
      .order('scheduled_at'),
    admin.from('courts')
      .select('id, name, sort_order')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('sort_order'),
  ])

  const lessonRows = allLessons ?? []
  const scheduleLessons = (scheduleLessonsRaw ?? []) as unknown as OwnerScheduleLesson[]
  const courts = courtsRaw ?? []

  const todayCount = countActiveLessonsInDateRange(
    lessonRows,
    periodKeys.todayStart,
    periodKeys.todayEnd
  )
  const weeklyCount = countUpcomingActiveLessonsInPeriod(
    lessonRows,
    periodKeys.weekStart,
    periodKeys.weekEnd,
    periodKeys.todayStart
  )
  const monthlyCount = countUpcomingActiveLessonsInPeriod(
    lessonRows,
    periodKeys.monthStart,
    periodKeys.monthEnd,
    periodKeys.todayStart
  )
  const yearlyCount = countUpcomingActiveLessonsInPeriod(
    lessonRows,
    periodKeys.yearStart,
    periodKeys.yearEnd,
    periodKeys.todayStart
  )

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">현황</h1>
        <p className="text-sm text-muted-foreground mt-1">{y}년</p>
      </div>

      <OwnerDashboard
        yearly={yearlyCount}
        monthly={monthlyCount}
        weekly={weeklyCount}
        today={todayCount}
        coachCount={coachCount ?? 0}
        memberCount={memberCount ?? 0}
        periodKeys={periodKeys}
        lessons={scheduleLessons}
        courts={courts}
      />
    </>
  )
}
