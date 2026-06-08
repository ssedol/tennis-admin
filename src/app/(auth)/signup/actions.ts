'use server'

import { redirect } from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function signupAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const name = (formData.get('name') as string ?? '').trim()
  const email = (formData.get('email') as string ?? '').trim()
  const password = formData.get('password') as string ?? ''
  const passwordConfirm = formData.get('passwordConfirm') as string ?? ''

  if (!name || !email || !password) return '모든 항목을 입력해주세요'
  if (password.length < 6) return '비밀번호는 6자 이상이어야 합니다'
  if (password !== passwordConfirm) return '비밀번호가 일치하지 않습니다'

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1. organization 먼저 생성
  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name: `${name} 코치` })
    .select('id')
    .single()

  if (orgError || !org) return '가입 처리 중 오류가 발생했습니다'

  // 2. Supabase Auth 계정 생성
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      role: 'COACH',
      organization_id: org.id,
      must_change_password: false,
    },
  })

  if (authError) {
    // 계정 생성 실패 시 organization 롤백
    await admin.from('organizations').delete().eq('id', org.id)
    if (authError.message.includes('already registered')) {
      return '이미 사용 중인 이메일입니다'
    }
    return '가입 처리 중 오류가 발생했습니다'
  }

  // 3. profiles upsert (트리거 실패 보완)
  if (created.user) {
    await admin.from('profiles').upsert({
      id: created.user.id,
      name,
      role: 'COACH',
      organization_id: org.id,
    }, { onConflict: 'id' })
  }

  redirect('/login?signup=success')
}
