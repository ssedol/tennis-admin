import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from '@/lib/supabase/env'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, phone, email, role, coachId } = body as {
    name: string
    phone?: string
    email: string
    role: 'COACH' | 'MEMBER'
    coachId?: string
  }

  if (!name || !email || !role) {
    return NextResponse.json({ error: '이름, 이메일, 역할은 필수입니다' }, { status: 400 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY 미설정' }, { status: 500 })
  }

  const { url, anonKey } = getSupabaseEnv()
  const cookieStore = await cookies()

  // RLS 완전 우회 — @supabase/supabase-js 직접 사용
  const adminClient = createAdminClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 호출자 세션 확인 (anon 클라이언트로 쿠키 기반 인증)
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(list) { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
    },
  })
  const { data: { user: caller } } = await supabase.auth.getUser()
  if (!caller) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }
  const { data: callerProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('role, organization_id')
    .eq('id', caller.id)
    .single()

  if ((callerProfile?.role as string | undefined)?.toUpperCase() !== 'OWNER') {
    return NextResponse.json({ error: '대표 계정만 등록 가능합니다' }, { status: 403 })
  }

  const orgId = callerProfile.organization_id

  // 이메일 중복 확인
  const { data: existing } = await adminClient
    .from('profiles')
    .select('id')
    .eq('id', (await adminClient.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id ?? '')
    .maybeSingle()

  // Supabase Auth 계정 생성 — 기본 비밀번호 1234, 첫 로그인 시 변경 필요
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: '1234',
    email_confirm: true,
    user_metadata: {
      name,
      phone: phone ?? '',
      role,
      organization_id: orgId,
      must_change_password: true,
    },
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 })
  }

  // 프로필 upsert — 트리거가 실패했을 경우에도 보장
  if (created.user) {
    await adminClient
      .from('profiles')
      .upsert({
        id: created.user.id,
        name,
        phone: phone ?? '',
        role: role as 'COACH' | 'MEMBER',
        organization_id: orgId,
      }, { onConflict: 'id' })
  }

  return NextResponse.json({ ok: true })
}
