import { NextResponse, type NextRequest } from 'next/server'
import { DEV_COOKIE, IS_DEV, type DevRole } from '@/lib/dev-auth'

const ROLE_REDIRECTS: Record<DevRole, string> = {
  OWNER: '/owner',
  COACH: '/coach',
  MEMBER: '/member',
}

function getBaseUrl(request: NextRequest): string {
  // Docker 내부에서는 0.0.0.0으로 잡히므로 브라우저가 보낸 헤더를 우선 사용
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'http'
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`

  const host = request.headers.get('host')
  if (host) return `http://${host}`

  return request.nextUrl.origin
}

export function GET(request: NextRequest) {
  if (!IS_DEV) {
    return NextResponse.json({ error: 'dev only' }, { status: 403 })
  }

  const role = request.nextUrl.searchParams.get('role') as DevRole | null
  if (!role || !ROLE_REDIRECTS[role]) {
    return NextResponse.json({ error: 'invalid role' }, { status: 400 })
  }

  const dest = `${getBaseUrl(request)}${ROLE_REDIRECTS[role]}`
  const response = NextResponse.redirect(dest)
  response.cookies.set(DEV_COOKIE, role, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })
  return response
}

export function DELETE(request: NextRequest) {
  if (!IS_DEV) {
    return NextResponse.json({ error: 'dev only' }, { status: 403 })
  }
  const response = NextResponse.redirect(`${getBaseUrl(request)}/login`)
  response.cookies.delete(DEV_COOKIE)
  return response
}
