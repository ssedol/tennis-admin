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

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { member_id, court_id, date, start_hour, duration_min } = body as {
    member_id: string
    court_id: string
    date: string
    start_hour: number
    duration_min: number
  }

  if (!member_id || !court_id || !date || start_hour == null || !duration_min) {
    return NextResponse.json({ error: '필수 항목을 모두 입력하세요' }, { status: 400 })
  }

  const profile = await getCallerProfile()
  if (!profile) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const role = (profile.role as string).toUpperCase()
  if (role !== 'COACH' && role !== 'OWNER') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const coachId = profile.id
  const scheduled_at = `${date}T${String(start_hour).padStart(2, '0')}:00:00Z`

  const { url } = getSupabaseEnv()
  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: member } = await admin
    .from('profiles')
    .select('id, role, organization_id')
    .eq('id', member_id)
    .single()

  if (!member || (member.role as string).toUpperCase() !== 'MEMBER') {
    return NextResponse.json({ error: '회원을 찾을 수 없습니다' }, { status: 400 })
  }
  if (member.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: '같은 조직의 회원만 등록할 수 있습니다' }, { status: 400 })
  }

  const { data: court } = await admin
    .from('courts')
    .select('id, is_active')
    .eq('id', court_id)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!court || !court.is_active) {
    return NextResponse.json({ error: '코트를 찾을 수 없습니다' }, { status: 400 })
  }

  const { data: lesson, error } = await admin
    .from('lesson_schedules')
    .insert({
      organization_id: profile.organization_id,
      coach_id: coachId,
      member_id,
      court_id,
      scheduled_at,
      duration_min,
      status: 'SCHEDULED',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ lesson })
}
