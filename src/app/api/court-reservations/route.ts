import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from '@/lib/supabase/env'

export async function POST(request: NextRequest) {
  const { court_id, type, title, start_at, end_at } = await request.json()
  if (!court_id || !type || !start_at || !end_at)
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
  if (type === 'LESSON')
    return NextResponse.json({ error: '레슨은 레슨 일정에서 등록하세요' }, { status: 400 })

  const { url, anonKey } = getSupabaseEnv()
  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: profile } = await admin
    .from('profiles').select('organization_id, role').eq('id', user.id).single()
  if (!profile || (profile.role as string)?.toUpperCase() !== 'OWNER')
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { data: reservation, error } = await admin
    .from('court_reservations')
    .insert({ court_id, type, title, start_at, end_at, organization_id: profile.organization_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ reservation })
}
