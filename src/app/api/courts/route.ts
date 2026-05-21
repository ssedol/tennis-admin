import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from '@/lib/supabase/env'

export async function POST(request: NextRequest) {
  const { name, court_type, surface } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: '이름 필수' }, { status: 400 })

  const { url, anonKey } = getSupabaseEnv()
  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: profile } = await admin.from('profiles').select('organization_id, role').eq('id', user.id).single()
  if (!profile || (profile.role as string)?.toUpperCase() !== 'OWNER') return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { data: court, error } = await admin
    .from('courts')
    .insert({ name: name.trim(), court_type, surface, organization_id: profile.organization_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ court })
}
