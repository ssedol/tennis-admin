import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from '@/lib/supabase/env'

async function getCallerProfile() {
  const { url, anonKey } = getSupabaseEnv()
  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: profile } = await admin
    .from('profiles')
    .select('id, organization_id, role')
    .eq('id', user.id)
    .single()
  return profile
}

export async function GET(request: NextRequest) {
  const profile = await getCallerProfile()
  if (!profile) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const role = (profile.role as string).toUpperCase()
  if (role !== 'OWNER') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }
  if (!profile.organization_id) {
    return NextResponse.json({ error: '조직 정보가 없습니다' }, { status: 400 })
  }

  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 50), 100)
  const offset = Math.max(Number(request.nextUrl.searchParams.get('offset') ?? 0), 0)

  const { url } = getSupabaseEnv()
  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error, count } = await admin
    .from('lesson_schedule_history')
    .select(
      `
      id, lesson_id, action, scheduled_at, duration_min, status, created_at,
      actor:profiles!actor_id(name),
      coach:profiles!coach_id(name),
      member:profiles!member_id(name),
      court:courts(name)
    `,
      { count: 'exact' }
    )
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  type NameRef = { name: string } | { name: string }[] | null
  const getName = (val: NameRef) => {
    if (!val) return '—'
    return Array.isArray(val) ? (val[0]?.name ?? '—') : val.name
  }

  const history = (data ?? []).map((row) => ({
    id: row.id,
    lesson_id: row.lesson_id,
    action: row.action,
    scheduled_at: row.scheduled_at,
    duration_min: row.duration_min,
    status: row.status,
    created_at: row.created_at,
    actor: getName(row.actor as NameRef),
    coach: getName(row.coach as NameRef),
    member: getName(row.member as NameRef),
    court: getName(row.court as NameRef),
  }))

  return NextResponse.json({ history, total: count ?? history.length })
}
