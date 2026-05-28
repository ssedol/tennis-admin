import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from '@/lib/supabase/env'
import { getRecurringLessonDates, MAX_RECURRING_LESSONS } from '@/lib/lesson-recurrence'
import {
  findScheduleConflict,
  formatBulkRepeatConflict,
  getLessonQueryRange,
  intervalsOverlap,
  toInterval,
} from '@/lib/lesson-conflict'
import { dateSlotToUtcIso, timeLabelToSlotIndex } from '@/lib/time-slots'
import { recordLessonHistory } from '@/lib/lesson-history'

async function getCallerProfile() {
  const { url, anonKey } = getSupabaseEnv()
  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: profile } = await admin
    .from('profiles')
    .select('id, organization_id, role')
    .eq('id', user.id)
    .single()
  return profile
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { member_id, court_id, date, start_time, start_hour, duration_min, repeat_until, repeat_weekdays } = body as {
    member_id: string
    court_id: string
    date: string
    start_time?: string
    start_hour?: number
    duration_min: number
    repeat_until?: string
    repeat_weekdays?: number[]
  }

  let startSlot: number | null = null
  if (start_time) {
    startSlot = timeLabelToSlotIndex(start_time)
  } else if (start_hour != null) {
    startSlot = start_hour * 3
  }

  if (!member_id || !court_id || !date || startSlot == null || !duration_min) {
    return NextResponse.json({ error: '필수 항목을 모두 입력하세요' }, { status: 400 })
  }

  let lessonDates: string[]
  if (repeat_until) {
    if (!repeat_weekdays?.length) {
      return NextResponse.json({ error: '반복 요일을 하나 이상 선택하세요' }, { status: 400 })
    }
    lessonDates = getRecurringLessonDates(date, repeat_until, repeat_weekdays)
  } else {
    lessonDates = [date]
  }
  if (lessonDates.length === 0) {
    return NextResponse.json(
      { error: repeat_until ? '선택한 요일에 해당하는 날짜가 없습니다' : '날짜를 확인하세요' },
      { status: 400 }
    )
  }
  if (lessonDates.length > MAX_RECURRING_LESSONS) {
    return NextResponse.json(
      { error: `반복 레슨은 최대 ${MAX_RECURRING_LESSONS}회까지 등록할 수 있습니다` },
      { status: 400 }
    )
  }

  const profile = await getCallerProfile()
  if (!profile) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const role = (profile.role as string).toUpperCase()
  if (role !== 'COACH' && role !== 'OWNER') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const coachId = profile.id

  const { url } = getSupabaseEnv()
  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: member } = await admin
    .from('profiles')
    .select('id, role, organization_id')
    .eq('id', member_id)
    .single()

  if (!member || (member.role as string).toUpperCase() !== 'MEMBER') {
    return NextResponse.json({ error: '회원을 찾을 수 없습니다' }, { status: 400 })
  }
  if (member.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: '같은 조직의 회원만 등록할 수 있습니다' }, { status: 400 })
  }

  const { data: court } = await admin
    .from('courts')
    .select('id, is_active, name')
    .eq('id', court_id)
    .eq('organization_id', profile.organization_id)
    .single()

  if (!court || !court.is_active) {
    return NextResponse.json({ error: '코트를 찾을 수 없습니다' }, { status: 400 })
  }

  const courtName = court.name as string

  const rows = lessonDates.map((lessonDate) => ({
    organization_id: profile.organization_id,
    coach_id: coachId,
    created_by: profile.id,
    member_id,
    court_id,
    scheduled_at: dateSlotToUtcIso(lessonDate, startSlot),
    duration_min,
    status: 'SCHEDULED' as const,
  }))

  const { start: queryStart, end: queryEnd } = getLessonQueryRange(lessonDates)

  const { data: existingLessons } = await admin
    .from('lesson_schedules')
    .select(`
      scheduled_at, duration_min, coach_id, court_id, status,
      member:profiles!member_id(name),
      coach:profiles!coach_id(name),
      court:courts(name)
    `)
    .eq('organization_id', profile.organization_id)
    .neq('status', 'CANCELLED')
    .gte('scheduled_at', queryStart)
    .lt('scheduled_at', queryEnd)
    .or(`coach_id.eq.${coachId},court_id.eq.${court_id}`)

  const { data: reservations } = await admin
    .from('court_reservations')
    .select('start_at, end_at, title')
    .eq('court_id', court_id)
    .lt('start_at', queryEnd)
    .gt('end_at', queryStart)

  const lessonsList = (existingLessons ?? []) as {
    scheduled_at: string
    duration_min: number
    coach_id: string
    court_id: string | null
    member?: { name: string } | { name: string }[] | null
    coach?: { name: string } | { name: string }[] | null
    court?: { name: string } | { name: string }[] | null
  }[]

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      if (
        intervalsOverlap(
          toInterval(rows[i].scheduled_at, rows[i].duration_min),
          toInterval(rows[j].scheduled_at, rows[j].duration_min)
        )
      ) {
        return NextResponse.json(
          {
            error: formatBulkRepeatConflict(
              courtName,
              rows[i].scheduled_at,
              rows[i].duration_min
            ),
          },
          { status: 409 }
        )
      }
    }
  }

  for (const row of rows) {
    const conflict = findScheduleConflict(
      row,
      coachId,
      court_id,
      courtName,
      lessonsList,
      reservations ?? []
    )
    if (conflict) {
      return NextResponse.json({ error: conflict }, { status: 409 })
    }
  }

  const { data: lessons, error } = await admin
    .from('lesson_schedules')
    .insert(rows)
    .select('id, organization_id, coach_id, member_id, court_id, scheduled_at, duration_min, status')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  try {
    await recordLessonHistory(admin, 'CREATED', profile.id, lessons ?? [])
  } catch (historyError) {
    return NextResponse.json(
      { error: historyError instanceof Error ? historyError.message : '이력 기록에 실패했습니다' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    lessons: (lessons ?? []).map((l) => ({ id: l.id })),
    count: lessons?.length ?? 0,
  })
}
