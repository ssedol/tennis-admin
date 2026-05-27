import { LogoutButton } from '@/components/layout/LogoutButton'
import { CoachClient } from '@/components/coach/CoachClient'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

type Period = 'today' | 'weekly' | 'monthly'

function getPeriodRange(period: Period) {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const d = now.getUTCDate()

  if (period === 'today') {
    return {
      start: new Date(Date.UTC(y, m, d)).toISOString(),
      end: new Date(Date.UTC(y, m, d + 1)).toISOString(),
    }
  }

  if (period === 'weekly') {
    const dow = now.getUTCDay()
    const mondayOffset = dow === 0 ? -6 : 1 - dow
    const startDay = d + mondayOffset
    return {
      start: new Date(Date.UTC(y, m, startDay)).toISOString(),
      end: new Date(Date.UTC(y, m, startDay + 7)).toISOString(),
    }
  }

  return {
    start: new Date(Date.UTC(y, m, 1)).toISOString(),
    end: new Date(Date.UTC(y, m + 1, 1)).toISOString(),
  }
}

function getPeriodMeta(period: Period, count: number) {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = now.getUTCMonth()
  const d = now.getUTCDate()

  if (period === 'today') {
    const dayLabel = now.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    const weekday = now.toLocaleDateString('ko-KR', { weekday: 'long' })
    return {
      title: `오늘 · ${dayLabel}`,
      sub: `${weekday} · 레슨 ${count}건`,
    }
  }

  if (period === 'weekly') {
    const dow = now.getUTCDay()
    const mondayOffset = dow === 0 ? -6 : 1 - dow
    const start = new Date(Date.UTC(y, m, d + mondayOffset))
    const end = new Date(Date.UTC(y, m, d + mondayOffset + 6))
    const fmt = (dt: Date) => dt.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    return {
      title: '이번 주',
      sub: `${fmt(start)} — ${fmt(end)} · 레슨 ${count}건`,
    }
  }

  const monthLabel = now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
  return {
    title: monthLabel,
    sub: `레슨 ${count}건`,
  }
}

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: rawPeriod } = await searchParams
  const period: Period =
    rawPeriod === 'weekly' || rawPeriod === 'monthly' ? rawPeriod : 'today'

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
  const { start, end } = getPeriodRange(period)

  const [membersRes, courtsRes, lessonsRes] = await Promise.all([
    admin
      .from('profiles')
      .select('id, name')
      .eq('organization_id', orgId!)
      .eq('role', 'MEMBER')
      .order('name'),
    admin
      .from('courts')
      .select('id, name')
      .eq('organization_id', orgId!)
      .eq('is_active', true)
      .order('sort_order'),
    admin
      .from('lesson_schedules')
      .select(`
        id, scheduled_at, duration_min, status,
        member:profiles!member_id(name),
        court:courts(name)
      `)
      .eq('coach_id', coachId!)
      .gte('scheduled_at', start)
      .lt('scheduled_at', end)
      .order('scheduled_at'),
  ])

  type LessonRow = {
    id: string
    scheduled_at: string
    duration_min: number
    status: string
    member: { name: string } | { name: string }[] | null
    court: { name: string } | { name: string }[] | null
  }

  const lessons = (lessonsRes.data ?? []) as unknown as LessonRow[]
  const meta = getPeriodMeta(period, lessons.length)

  return (
    <main className="max-w-screen-sm mx-auto px-5 pb-10">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-volta" />
          <span className="font-semibold text-[15px]">테니스 관리</span>
        </div>
        <LogoutButton />
      </header>

      <CoachClient
        period={period}
        title={meta.title}
        sub={meta.sub}
        members={membersRes.data ?? []}
        courts={courtsRes.data ?? []}
        lessons={lessons}
      />
    </main>
  )
}
