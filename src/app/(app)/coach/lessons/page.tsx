import { LogoutButton } from '@/components/layout/LogoutButton'
import { CoachClient } from '@/components/coach/CoachClient'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getKoreaYmd, koreaDateToUtcIso } from '@/lib/time-slots'
import Link from 'next/link'

type Period = 'today' | 'weekly' | 'monthly' | 'past'

function getPeriodRange(period: Period) {
  const { y, m, d } = getKoreaYmd()

  if (period === 'today') {
    return { start: koreaDateToUtcIso(y, m, d), end: koreaDateToUtcIso(y, m, d + 1) }
  }
  if (period === 'weekly') {
    const dow = new Date(Date.UTC(y, m, d)).getUTCDay()
    const mondayOffset = dow === 0 ? -6 : 1 - dow
    const startDay = d + mondayOffset
    return { start: koreaDateToUtcIso(y, m, startDay), end: koreaDateToUtcIso(y, m, startDay + 7) }
  }
  if (period === 'past') {
    return { start: null, end: koreaDateToUtcIso(y, m, d) }
  }
  return { start: koreaDateToUtcIso(y, m, 1), end: koreaDateToUtcIso(y, m + 1, 1) }
}

function getPeriodMeta(period: Period, count: number) {
  if (period === 'past') {
    return { title: '지난 레슨', sub: `총 ${count}건` }
  }

  const { y, m, d } = getKoreaYmd()
  const koreaToday = new Date(Date.UTC(y, m, d))

  if (period === 'today') {
    const dayLabel = koreaToday.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', timeZone: 'UTC' })
    const weekday = koreaToday.toLocaleDateString('ko-KR', { weekday: 'long', timeZone: 'UTC' })
    return { title: `오늘 · ${dayLabel}`, sub: `${weekday} · 레슨 ${count}건` }
  }
  if (period === 'weekly') {
    const dow = new Date(Date.UTC(y, m, d)).getUTCDay()
    const mondayOffset = dow === 0 ? -6 : 1 - dow
    const start = new Date(Date.UTC(y, m, d + mondayOffset))
    const end = new Date(Date.UTC(y, m, d + mondayOffset + 6))
    const fmt = (dt: Date) => dt.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', timeZone: 'UTC' })
    return { title: '이번 주', sub: `${fmt(start)} — ${fmt(end)} · 레슨 ${count}건` }
  }
  const monthLabel = koreaToday.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', timeZone: 'UTC' })
  return { title: monthLabel, sub: `레슨 ${count}건` }
}

export default async function CoachLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: rawPeriod } = await searchParams
  const period: Period =
    rawPeriod === 'weekly' ? 'weekly' :
    rawPeriod === 'monthly' ? 'monthly' :
    rawPeriod === 'past' ? 'past' :
    'today'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profile } = await admin
    .from('profiles')
    .select('id, organization_id')
    .eq('id', user!.id)
    .single()

  const orgId = profile?.organization_id
  const coachId = profile?.id

  type LessonRow = {
    id: string
    scheduled_at: string
    duration_min: number
    status: string
    created_by: string
    member: { name: string } | { name: string }[] | null
    court: { name: string } | { name: string }[] | null
    feedbackCount?: number
  }

  let lessons: LessonRow[]

  if (period === 'past') {
    const { end } = getPeriodRange('past')
    type PastRaw = LessonRow & { lesson_feedbacks: { id: string }[] | null }
    const res = await admin.from('lesson_schedules').select(`
      id, scheduled_at, duration_min, status, created_by,
      member:profiles!member_id(name),
      court:courts(name),
      lesson_feedbacks(id)
    `).eq('coach_id', coachId!).lt('scheduled_at', end!).order('scheduled_at', { ascending: false }).limit(500)
    lessons = ((res.data ?? []) as unknown as PastRaw[]).map((l) => ({
      id: l.id,
      scheduled_at: l.scheduled_at,
      duration_min: l.duration_min,
      status: l.status,
      created_by: l.created_by,
      member: l.member,
      court: l.court,
      feedbackCount: l.lesson_feedbacks?.length ?? 0,
    }))
  } else {
    const { start, end } = getPeriodRange(period)
    const res = await admin.from('lesson_schedules').select(`
      id, scheduled_at, duration_min, status, created_by,
      member:profiles!member_id(name),
      court:courts(name)
    `).eq('coach_id', coachId!).gte('scheduled_at', start!).lt('scheduled_at', end!).order('scheduled_at')
    lessons = (res.data ?? []) as unknown as LessonRow[]
  }

  const membersRes = await admin.from('profiles').select('id, name').eq('organization_id', orgId!).eq('role', 'MEMBER').order('name')
  const meta = getPeriodMeta(period, lessons.length)

  return (
    <main className="max-w-screen-sm mx-auto px-5 pb-10">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-3">
          <Link href="/coach" className="text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold tracking-tight">레슨 관리</h1>
        </div>
        <LogoutButton />
      </header>

      <CoachClient
        period={period}
        title={meta.title}
        sub={meta.sub}
        members={membersRes.data ?? []}
        lessons={lessons}
        coachProfileId={coachId!}
      />
    </main>
  )
}
