import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DEV_COOKIE, IS_DEV } from '@/lib/dev-auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // 개발 환경: dev 쿠키로 인증 우회
  if (IS_DEV) {
    const cookieStore = await cookies()
    const devRole = cookieStore.get(DEV_COOKIE)?.value
    if (!devRole) redirect('/login')
    return <div className="min-h-screen bg-background">{children}</div>
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}
