// 개발 환경 전용 — 프로덕션에서는 동작하지 않음
export const DEV_COOKIE = 'x-dev-role'
export const IS_DEV = process.env.NODE_ENV === 'development'

export type DevRole = 'OWNER' | 'COACH' | 'MEMBER'

export const DEV_PROFILES: Record<DevRole, { id: string; name: string; role: DevRole; organization_id: string }> = {
  OWNER: { id: 'dev-owner-id', name: '테스트 대표', role: 'OWNER', organization_id: 'dev-org-id' },
  COACH: { id: 'dev-coach-id', name: '테스트 코치', role: 'COACH', organization_id: 'dev-org-id' },
  MEMBER: { id: 'dev-member-id', name: '테스트 회원', role: 'MEMBER', organization_id: 'dev-org-id' },
}

/** 개발 테스트 빠른 로그인 계정 (초기 비밀번호 1234) */
export const DEV_TEST_ACCOUNTS: Record<DevRole, string> = {
  OWNER: 'owner@tennis.test',
  COACH: 'coach01@test.com',
  MEMBER: 'member01@test.com',
}

export const DEV_TEST_PASSWORD = '1234'

export function resolveDevRoleFromEmail(email: string | undefined): DevRole | null {
  if (!email) return null
  const normalized = email.toLowerCase()
  for (const [role, accountEmail] of Object.entries(DEV_TEST_ACCOUNTS) as [DevRole, string][]) {
    if (accountEmail.toLowerCase() === normalized) return role
  }
  return null
}
