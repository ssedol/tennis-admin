import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from '@/components/owner/SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: myProfile } = await admin
    .from('profiles').select('organization_id').eq('id', user!.id).single()
  const orgId = myProfile?.organization_id

  const { data: courts } = await admin
    .from('courts')
    .select('id, name, court_type, surface, is_active, sort_order')
    .eq('organization_id', orgId)
    .order('sort_order')

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">설정</h1>
        <p className="text-sm text-muted-foreground mt-1">테니스장 코트 구성을 관리합니다</p>
      </div>

      <SettingsClient initialCourts={courts ?? []} />
    </>
  )
}
