import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { MemberLessonDetailClient } from '@/components/member/MemberLessonDetailClient'

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  SCHEDULED: { label: '예정', className: 'bg-secondary text-muted-foreground' },
  IN_PROGRESS: { label: '진행 중', className: 'bg-volta/10 text-volta' },
  COMPLETED: { label: '완료', className: 'bg-emerald-500/10 text-emerald-400' },
  CANCELLED: { label: '취소', className: 'bg-red-500/10 text-red-400' },
}

function getName(val: { name: string } | { name: string }[] | null | undefined): string {
  if (!val) return '—'
  return Array.isArray(val) ? (val[0]?.name ?? '—') : val.name
}

export default async function LessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, organization_id')
    .eq('id', user.id)
    .single()

  const { data: lesson } = await admin
    .from('lesson_schedules')
    .select(`
      id, scheduled_at, duration_min, status, member_id, organization_id,
      coach:profiles!coach_id(name)
    `)
    .eq('id', id)
    .single()

  if (!lesson || lesson.organization_id !== profile?.organization_id) {
    redirect('/member')
  }

  const role = (profile?.role as string)?.toUpperCase()
  if (role === 'MEMBER' && lesson.member_id !== profile?.id) {
    redirect('/member')
  }

  const scheduled = new Date(lesson.scheduled_at)
  const status = STATUS_LABEL[lesson.status] ?? STATUS_LABEL.SCHEDULED
  const coachName = getName(lesson.coach as { name: string } | { name: string }[] | null)

  return (
    <main className="max-w-screen-sm mx-auto px-5 pb-10">
      <MemberLessonDetailClient
        lessonId={id}
        lesson={{
          date: `${scheduled.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })} ${scheduled.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}`,
          coach: coachName,
          duration: `${lesson.duration_min}분`,
          status: status.label,
          statusClass: status.className,
        }}
      />
    </main>
  )
}
