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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { action } = await request.json() as { action: 'start' | 'end' }

  if (action !== 'start' && action !== 'end') {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const profile = await getCallerProfile()
  if (!profile) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const role = (profile.role as string).toUpperCase()
  if (role !== 'COACH' && role !== 'OWNER') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const { url } = getSupabaseEnv()
  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: lesson } = await admin
    .from('lesson_schedules')
    .select('id, coach_id, organization_id, status')
    .eq('id', id)
    .single()

  if (!lesson) return NextResponse.json({ error: '레슨을 찾을 수 없습니다' }, { status: 404 })
  if (lesson.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }
  if (role === 'COACH' && lesson.coach_id !== profile.id) {
    return NextResponse.json({ error: '본인 레슨만 변경할 수 있습니다' }, { status: 403 })
  }

  const now = new Date().toISOString()

  if (action === 'start') {
    if (lesson.status !== 'SCHEDULED') {
      return NextResponse.json({ error: '예정 상태의 레슨만 시작할 수 있습니다' }, { status: 400 })
    }
    const { error } = await admin
      .from('lesson_schedules')
      .update({ status: 'IN_PROGRESS', started_at: now })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  } else {
    if (lesson.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: '진행 중인 레슨만 종료할 수 있습니다' }, { status: 400 })
    }
    const { error } = await admin
      .from('lesson_schedules')
      .update({ status: 'COMPLETED', completed_at: now })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
