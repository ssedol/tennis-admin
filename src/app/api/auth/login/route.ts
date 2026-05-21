import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from '@/lib/supabase/env'

const ROLE_REDIRECTS: Record<string, string> = {
  OWNER: '/owner',
  COACH: '/coach',
  MEMBER: '/member',
}

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: '이메일과 비밀번호를 입력하세요' }, { status: 400 })
  }

  const { url, anonKey } = getSupabaseEnv()
  const cookieStore = await cookies()

  // 쿠키를 모아뒀다가 최종 response에 붙인다
  const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(list) {
        pendingCookies.push(...list)
      },
    },
  })

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

  if (signInError) {
    return NextResponse.json(
      { error: '이메일 또는 비밀번호가 올바르지 않습니다' },
      { status: 401 }
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .maybeSingle()

  const role = (profile as { role: string } | null)?.role ?? ''
  const dest = ROLE_REDIRECTS[role] ?? '/login'

  // JSON 응답에 세션 쿠키를 함께 실어서 반환
  const response = NextResponse.json({ dest })
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
  })
  return response
}
