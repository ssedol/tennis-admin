'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const ROLE_REDIRECTS: Record<string, string> = {
  OWNER: '/owner',
  COACH: '/coach',
  MEMBER: '/member',
}

export async function changePasswordAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const password = formData.get('password') as string ?? ''
  const confirm = formData.get('confirm') as string ?? ''

  if (!password || password.length < 6) return '비밀번호는 6자 이상이어야 합니다'
  if (password !== confirm) return '비밀번호가 일치하지 않습니다'
  if (password === '1234') return '초기 비밀번호와 다른 비밀번호를 설정해주세요'

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (!user || userError) return '인증 정보를 확인할 수 없습니다'

  // 비밀번호 변경
  const { error: updateError } = await supabase.auth.updateUser({ password })
  if (updateError) return '비밀번호 변경 중 오류가 발생했습니다'

  // must_change_password 플래그 해제
  await supabase.auth.updateUser({
    data: { must_change_password: false },
  })

  // 역할별 페이지로 이동
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = ((profile as { role: string } | null)?.role ?? '').toUpperCase()
  redirect(ROLE_REDIRECTS[role] ?? '/login')
}
