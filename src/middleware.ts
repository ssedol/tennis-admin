import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseEnv } from '@/lib/supabase/env'
import { DEV_COOKIE, IS_DEV, type DevRole } from '@/lib/dev-auth'

const ROLE_REDIRECTS: Record<DevRole, string> = {
  OWNER: '/owner',
  COACH: '/coach',
  MEMBER: '/member',
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 개발 전용 우회 ──────────────────────────────────────────
  if (IS_DEV) {
    const devRole = request.cookies.get(DEV_COOKIE)?.value as DevRole | undefined

    // 정적 API 경로는 그냥 통과
    if (pathname.startsWith('/api/dev')) return NextResponse.next()

    if (devRole && ROLE_REDIRECTS[devRole]) {
      // 로그인 페이지 → 역할별 홈으로
      if (pathname === '/login') {
        return NextResponse.redirect(new URL(ROLE_REDIRECTS[devRole], request.url))
      }
      // 인증된 것으로 처리
      return NextResponse.next()
    }

    // dev 쿠키 없으면 → 로그인 페이지만 허용
    if (!pathname.startsWith('/login') && !pathname.startsWith('/auth') && !pathname.startsWith('/api')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // ── 프로덕션 Supabase 인증 ──────────────────────────────────
  let url: string
  let anonKey: string
  try {
    ;({ url, anonKey } = getSupabaseEnv())
  } catch {
    if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !pathname.startsWith('/login') && !pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname === '/login') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const dest = ROLE_REDIRECTS[profile?.role as DevRole] ?? '/login'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
