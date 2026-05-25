import { MembersClient } from '@/components/owner/MembersClient'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 현재 유저의 organization_id 조회
  const { data: myProfile } = await admin
    .from('profiles')
    .select('organization_id')
    .eq('id', user!.id)
    .single()

  const orgId = myProfile?.organization_id
  // 같은 조직의 코치·회원 조회 (orgId 없으면 전체)
  let query = admin
    .from('profiles')
    .select('id, name, phone, role, organization_id, coach_id')
    .in('role', ['COACH', 'MEMBER'])
    .order('role')
    .order('name')

  if (orgId) {
    query = query.eq('organization_id', orgId)
  }

  const { data: profiles } = await query

  // auth.users 에서 이메일 병합
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = Object.fromEntries(authUsers.map((u) => [u.id, u.email ?? '']))

  const withEmail = (profiles ?? []).map((p) => ({ ...p, email: emailMap[p.id] ?? '' }))
  const coaches = withEmail.filter((p) => p.role === 'COACH')
  const members = withEmail.filter((p) => p.role === 'MEMBER')

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight">구성원 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">코치와 회원을 등록하고 관리합니다</p>
      </div>
      <MembersClient coaches={coaches} members={members} />
    </>
  )
}
