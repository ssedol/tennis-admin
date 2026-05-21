'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const ROLE_REDIRECTS: Record<string, string> = {
  OWNER: '/owner',
  COACH: '/coach',
  MEMBER: '/member',
}

export async function loginAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const email = (formData.get('email') as string ?? '').trim()
  const password = formData.get('password') as string ?? ''

  if (!email || !password) return '이메일과 비밀번호를 입력하세요'

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return '이메일 또는 비밀번호가 올바르지 않습니다'

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return '로그인 처리 중 오류가 발생했습니다'

  // 첫 로그인 감지 — 비밀번호 변경 필요
  if (user.user_metadata?.must_change_password === true) {
    redirect('/change-password')
  }

  // RLS 우회: 서버 액션에서 서비스 롤로 프로필 조회
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = ((profile as { role: string } | null)?.role ?? '').toUpperCase()
  const dest = ROLE_REDIRECTS[role]

  if (!dest) return '계정 역할을 확인할 수 없습니다. 관리자에게 문의하세요.'

  redirect(dest)
}
