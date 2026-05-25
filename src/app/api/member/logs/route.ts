import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from '@/lib/supabase/env'

async function getMemberProfile() {
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
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role as string).toUpperCase() !== 'MEMBER') return null
  return profile
}

export async function GET() {
  const profile = await getMemberProfile()
  if (!profile) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { url } = getSupabaseEnv()
  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await admin
    .from('tennis_logs')
    .select('id, log_type, content, recorded_at')
    .eq('member_id', profile.id)
    .order('recorded_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ logs: data ?? [] })
}

export async function POST(request: NextRequest) {
  const profile = await getMemberProfile()
  if (!profile) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const body = await request.json() as {
    log_type?: string
    content?: string
  }

  const logType = body.log_type?.toUpperCase()
  if (logType !== 'LESSON' && logType !== 'PRACTICE' && logType !== 'MATCH') {
    return NextResponse.json({ error: '유효하지 않은 일지 유형입니다' }, { status: 400 })
  }
  if (!body.content?.trim()) {
    return NextResponse.json({ error: '내용을 입력하세요' }, { status: 400 })
  }

  const { url } = getSupabaseEnv()
  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await admin
    .from('tennis_logs')
    .insert({
      member_id: profile.id,
      log_type: logType,
      content: body.content.trim(),
      recorded_at: new Date().toISOString(),
    })
    .select('id, log_type, content, recorded_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ log: data })
}
