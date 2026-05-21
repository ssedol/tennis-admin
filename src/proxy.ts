import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseEnv } from '@/lib/supabase/env'
import { DEV_COOKIE, IS_DEV, type DevRole } from '@/lib/dev-auth'

const ROLE_REDIRECTS: Record<DevRole, string> = {
  OWNER: '/owner',
  COACH: '/coach',
  MEMBER: '/member',
}

const PUBLIC_PATHS = ['/login', '/auth', '/api', '/change-password']

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // dev 테스트 버튼으로 로그인한 경우 — Supabase 없이 통과
  if (IS_DEV) {
    const devRole = request.cookies.get(DEV_COOKIE)?.value as DevRole | undefined
    if (pathname.startsWith('/api/dev')) return NextResponse.next()

    if (devRole && ROLE_REDIRECTS[devRole]) {
      if (pathname === '/login') {
        return NextResponse.redirect(new URL(ROLE_REDIRECTS[devRole], request.url))
      }
      return NextResponse.next()
    }
  }

  // Supabase 세션 확인 (dev/prod 공통)
  let url: string
  let anonKey: string
  try {
    ;({ url, anonKey } = getSupabaseEnv())
  } catch {
    if (isPublic(pathname)) return NextResponse.next()
    return NextResponse.redirect(new URL('/login', request.url))
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(list) {
        list.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        list.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !isPublic(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && pathname === '/login') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = (profile?.role as string | undefined)?.toUpperCase() as DevRole | undefined
    if (role && ROLE_REDIRECTS[role]) {
      return NextResponse.redirect(new URL(ROLE_REDIRECTS[role], request.url))
    }
    // role 없으면 로그인 페이지 그대로 표시 (루프 방지)
    return NextResponse.next()
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
