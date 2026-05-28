import { LogoutButton } from '@/components/layout/LogoutButton'
import { MemberClient } from '@/components/member/MemberClient'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import {
  formatStoredScheduleDate,
  formatStoredScheduleTime,
  getKoreaYmd,
  storedScheduleDateKey,
} from '@/lib/time-slots'

function getName(val: { name: string } | { name: string }[] | null | undefined): string {
  if (!val) return '—'
  return Array.isArray(val) ? (val[0]?.name ?? '—') : val.name
}

function koreaTodayKey(): string {
  const { y, m, d } = getKoreaYmd()
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function dayDiffFromToday(iso: string): number {
  const lessonKey = storedScheduleDateKey(iso)
  const todayKey = koreaTodayKey()
  const lessonDate = new Date(`${lessonKey}T00:00:00Z`)
  const todayDate = new Date(`${todayKey}T00:00:00Z`)
  return Math.round((lessonDate.getTime() - todayDate.getTime()) / (24 * 60 * 60 * 1000))
}

function formatNextLessonTime(iso: string): string {
  const dayDiff = dayDiffFromToday(iso)
  const time = formatStoredScheduleTime(iso)

  if (dayDiff === 0) return `오늘 ${time}`
  if (dayDiff === 1) return `내일 ${time}`
  return `${formatStoredScheduleDate(iso)} ${time}`
}

function formatNextLessonDate(iso: string): string {
  return formatStoredScheduleDate(iso)
}

function getDaysUntil(iso: string): string {
  const diff = dayDiffFromToday(iso)
  if (diff === 0) return 'D-Day'
  if (diff > 0) return `D-${diff}`
  return `D+${Math.abs(diff)}`
}

function formatPastLessonDate(iso: string): string {
  return `${formatStoredScheduleDate(iso)} ${formatStoredScheduleTime(iso)}`
}

function formatFeedbackSummary(feedbackCount: number, videoCount: number): string {
  if (feedbackCount === 0 && videoCount === 0) return '피드백 없음'
  const parts: string[] = []
  if (feedbackCount > 0) parts.push(`피드백 댓글 ${feedbackCount}개`)
  if (videoCount > 0) parts.push(`영상 ${videoCount}개`)
  return parts.join(' · ')
}

function formatLogDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

export default async function MemberPage() {
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
    .select('id, organization_id, role')
    .eq('id', user.id)
    .single()

  const memberId = profile?.id
  const now = new Date().toISOString()

  type LessonRow = {
    id: string
    scheduled_at: string
    duration_min: number
    status: string
    coach: { name: string } | { name: string }[] | null
    court: { name: string } | { name: string }[] | null
  }

  const [nextRes, pastRes, logsRes] = await Promise.all([
    admin
      .from('lesson_schedules')
      .select(`
        id, scheduled_at, duration_min, status,
        coach:profiles!coach_id(name),
        court:courts(name)
      `)
      .eq('member_id', memberId!)
      .in('status', ['SCHEDULED', 'IN_PROGRESS'])
      .gte('scheduled_at', now)
      .order('scheduled_at')
      .limit(1),
    admin
      .from('lesson_schedules')
      .select(`
        id, scheduled_at, duration_min, status,
        coach:profiles!coach_id(name),
        court:courts(name)
      `)
      .eq('member_id', memberId!)
      .eq('status', 'COMPLETED')
      .order('scheduled_at', { ascending: false }),
    admin
      .from('tennis_logs')
      .select('id, log_type, content, recorded_at')
      .eq('member_id', memberId!)
      .order('recorded_at', { ascending: false }),
  ])

  const pastLessons = (pastRes.data ?? []) as unknown as LessonRow[]
  const pastIds = pastLessons.map((l) => l.id)

  let feedbackCounts: Record<string, number> = {}
  let videoCounts: Record<string, number> = {}

  if (pastIds.length > 0) {
    const [feedbacksRes, videosRes] = await Promise.all([
      admin.from('lesson_feedbacks').select('lesson_id').in('lesson_id', pastIds),
      admin.from('videos').select('lesson_id').in('lesson_id', pastIds),
    ])

    for (const row of feedbacksRes.data ?? []) {
      feedbackCounts[row.lesson_id] = (feedbackCounts[row.lesson_id] ?? 0) + 1
    }
    for (const row of videosRes.data ?? []) {
      videoCounts[row.lesson_id] = (videoCounts[row.lesson_id] ?? 0) + 1
    }
  }

  const nextRaw = (nextRes.data?.[0] ?? null) as unknown as LessonRow | null
  const nextLesson = nextRaw
    ? {
        timeLabel: formatNextLessonTime(nextRaw.scheduled_at),
        dateLabel: formatNextLessonDate(nextRaw.scheduled_at),
        daysUntil: getDaysUntil(nextRaw.scheduled_at),
        sub: `${getName(nextRaw.coach)} · ${getName(nextRaw.court)} · ${nextRaw.duration_min}분`,
      }
    : null

  const pastLessonItems = pastLessons.map((l) => ({
    id: l.id,
    date: formatPastLessonDate(l.scheduled_at),
    coach: `${getName(l.coach)} · ${getName(l.court)}`,
    feedback: formatFeedbackSummary(feedbackCounts[l.id] ?? 0, videoCounts[l.id] ?? 0),
  }))

  const logs = (logsRes.data ?? []).map((l) => ({
    id: l.id,
    type: l.log_type as 'LESSON' | 'PRACTICE' | 'MATCH',
    date: formatLogDate(l.recorded_at),
    content: l.content ?? '',
  }))

  return (
    <main className="max-w-screen-sm mx-auto px-5 pb-10">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-volta" />
          <span className="font-semibold text-[15px]">테니스 관리</span>
        </div>
        <LogoutButton />
      </header>

      <MemberClient
        nextLesson={nextLesson}
        pastLessons={pastLessonItems}
        initialLogs={logs}
      />
    </main>
  )
}
