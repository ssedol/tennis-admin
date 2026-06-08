import { LogoutButton } from '@/components/layout/LogoutButton'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getKoreaYmd, koreaDateToUtcIso } from '@/lib/time-slots'
import Link from 'next/link'

export default async function CoachPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profile } = await admin
    .from('profiles')
    .select('id, name, organization_id')
    .eq('id', user!.id)
    .single()

  const { y, m, d } = getKoreaYmd()
  const todayStart = koreaDateToUtcIso(y, m, d)
  const todayEnd = koreaDateToUtcIso(y, m, d + 1)

  const [{ count: todayCount }, { count: memberCount }] = await Promise.all([
    admin
      .from('lesson_schedules')
      .select('id', { count: 'exact', head: true })
      .eq('coach_id', profile!.id)
      .gte('scheduled_at', todayStart)
      .lt('scheduled_at', todayEnd),
    admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', profile!.organization_id)
      .eq('role', 'MEMBER'),
  ])

  const today = new Date(Date.UTC(y, m, d))
  const dateLabel = today.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long', timeZone: 'UTC' })

  return (
    <main className="max-w-screen-sm mx-auto px-5 pb-10">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-volta" />
          <span className="font-semibold text-[15px]">테니스 관리</span>
        </div>
        <LogoutButton />
      </header>

      <div className="mt-2 mb-8">
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
        <h1 className="text-2xl font-bold tracking-tight mt-1">
          안녕하세요, {profile?.name} 코치님
        </h1>
      </div>

      {/* 오늘 요약 */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">오늘 레슨</p>
          <p className="text-2xl font-bold">{todayCount ?? 0}<span className="text-sm font-normal text-muted-foreground ml-1">건</span></p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">전체 회원</p>
          <p className="text-2xl font-bold">{memberCount ?? 0}<span className="text-sm font-normal text-muted-foreground ml-1">명</span></p>
        </div>
      </div>

      {/* 관리 메뉴 */}
      <div className="space-y-3">
        <Link
          href="/coach/lessons"
          className="flex items-center justify-between w-full bg-card border border-border rounded-xl p-5 hover:bg-secondary/30 transition-colors"
        >
          <div>
            <p className="font-semibold">레슨 관리</p>
            <p className="text-sm text-muted-foreground mt-0.5">레슨 일정 확인 및 등록</p>
          </div>
          <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>

        <Link
          href="/coach/members"
          className="flex items-center justify-between w-full bg-card border border-border rounded-xl p-5 hover:bg-secondary/30 transition-colors"
        >
          <div>
            <p className="font-semibold">회원 관리</p>
            <p className="text-sm text-muted-foreground mt-0.5">회원 등록 및 정보 관리</p>
          </div>
          <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </Link>
      </div>
    </main>
  )
}
