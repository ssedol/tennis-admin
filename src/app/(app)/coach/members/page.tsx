import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { LogoutButton } from '@/components/layout/LogoutButton'
import { CoachMembersClient } from '@/components/coach/CoachMembersClient'
import Link from 'next/link'

export default async function CoachMembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profile } = await admin
    .from('profiles')
    .select('id, organization_id')
    .eq('id', user!.id)
    .single()

  const { data: members } = await admin
    .from('profiles')
    .select('id, name, phone, role')
    .eq('organization_id', profile!.organization_id)
    .eq('role', 'MEMBER')
    .order('name')

  const { data: authUsers } = await admin.auth.admin.listUsers()
  const emailMap = Object.fromEntries(
    (authUsers?.users ?? []).map((u) => [u.id, u.email ?? ''])
  )

  const membersWithEmail = (members ?? []).map((m) => ({
    ...m,
    email: emailMap[m.id] ?? null,
  }))

  return (
    <main className="max-w-screen-sm mx-auto px-5 pb-10">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-3">
          <Link
            href="/coach"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold tracking-tight">회원 관리</h1>
        </div>
        <LogoutButton />
      </header>

      <CoachMembersClient
        members={membersWithEmail}
        coachId={profile!.id}
      />
    </main>
  )
}
