import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DEV_COOKIE, IS_DEV } from '@/lib/dev-auth'
import { DevRoleSwitcher } from '@/components/dev/DevRoleSwitcher'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()

  // 개발 모드: dev 테스트 쿠키가 있으면 Supabase 없이 통과
  if (IS_DEV) {
    const devRole = cookieStore.get(DEV_COOKIE)?.value
    if (devRole) {
      return (
        <div className="min-h-screen bg-background pb-16">
          {children}
          <DevRoleSwitcher />
        </div>
      )
    }
  }

  // Supabase 실제 세션 확인 (dev/prod 공통)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className={`min-h-screen bg-background${IS_DEV ? ' pb-16' : ''}`}>
      {children}
      {IS_DEV && <DevRoleSwitcher />}
    </div>
  )
}
