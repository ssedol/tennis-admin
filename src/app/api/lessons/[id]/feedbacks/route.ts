import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from '@/lib/supabase/env'

type ProfileRow = { id: string; name: string; role: string }
type FeedbackRow = {
  id: string
  content: string
  created_at: string
  coach_id: string
  author_id?: string | null
}

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
    .select('id, organization_id, role, name')
    .eq('id', user.id)
    .single()
  return profile
}

async function getLessonAccess(lessonId: string, profile: { id: string; organization_id: string | null; role: string }) {
  const { url } = getSupabaseEnv()
  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: lesson } = await admin
    .from('lesson_schedules')
    .select('id, coach_id, member_id, organization_id')
    .eq('id', lessonId)
    .single()

  if (!lesson || lesson.organization_id !== profile.organization_id) return null

  const role = (profile.role as string).toUpperCase()
  const canAccess =
    role === 'OWNER' ||
    lesson.coach_id === profile.id ||
    lesson.member_id === profile.id

  return canAccess ? lesson : null
}

function toAuthor(profile: ProfileRow | undefined, fallbackName = '—') {
  return {
    name: profile?.name ?? fallbackName,
    role: profile?.role ?? 'COACH',
  }
}

function mapFeedbacks(rows: FeedbackRow[], profileMap: Map<string, ProfileRow>) {
  return rows.map((row) => {
    const authorId = row.author_id ?? row.coach_id
    return {
      id: row.id,
      content: row.content,
      created_at: row.created_at,
      author: toAuthor(profileMap.get(authorId)),
    }
  })
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params
  const profile = await getCallerProfile()
  if (!profile) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const lesson = await getLessonAccess(lessonId, profile)
  if (!lesson) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { url } = getSupabaseEnv()
  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let rows: FeedbackRow[] = []

  const withAuthor = await admin
    .from('lesson_feedbacks')
    .select('id, content, created_at, coach_id, author_id')
    .eq('lesson_id', lessonId)
    .order('created_at')

  if (withAuthor.error?.message.includes('author_id')) {
    const legacy = await admin
      .from('lesson_feedbacks')
      .select('id, content, created_at, coach_id')
      .eq('lesson_id', lessonId)
      .order('created_at')
    if (legacy.error) return NextResponse.json({ error: legacy.error.message }, { status: 400 })
    rows = (legacy.data ?? []) as FeedbackRow[]
  } else {
    if (withAuthor.error) return NextResponse.json({ error: withAuthor.error.message }, { status: 400 })
    rows = (withAuthor.data ?? []) as FeedbackRow[]
  }

  const authorIds = [...new Set(rows.map((r) => r.author_id ?? r.coach_id))]
  const { data: profiles } = authorIds.length > 0
    ? await admin.from('profiles').select('id, name, role').in('id', authorIds)
    : { data: [] as ProfileRow[] }

  const profileMap = new Map<string, ProfileRow>(
    ((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p])
  )

  return NextResponse.json({ feedbacks: mapFeedbacks(rows, profileMap) })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params
  const profile = await getCallerProfile()
  if (!profile) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const role = (profile.role as string).toUpperCase()
  if (role !== 'COACH' && role !== 'MEMBER' && role !== 'OWNER') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const lesson = await getLessonAccess(lessonId, profile)
  if (!lesson) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  if (role === 'COACH' && lesson.coach_id !== profile.id) {
    return NextResponse.json({ error: '본인 레슨에만 피드백을 등록할 수 있습니다' }, { status: 403 })
  }
  if (role === 'MEMBER' && lesson.member_id !== profile.id) {
    return NextResponse.json({ error: '본인 레슨에만 피드백을 등록할 수 있습니다' }, { status: 403 })
  }

  const { content } = await request.json() as { content?: string }
  if (!content?.trim()) {
    return NextResponse.json({ error: '내용을 입력하세요' }, { status: 400 })
  }

  const { url } = getSupabaseEnv()
  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const insertBase = {
    lesson_id: lessonId,
    coach_id: lesson.coach_id,
    content: content.trim(),
  }

  const withAuthor = await admin
    .from('lesson_feedbacks')
    .insert({ ...insertBase, author_id: profile.id })
    .select('id, content, created_at, coach_id, author_id')
    .single()

  let row: FeedbackRow | null = null

  if (withAuthor.error?.message.includes('author_id')) {
    const legacy = await admin
      .from('lesson_feedbacks')
      .insert(insertBase)
      .select('id, content, created_at, coach_id')
      .single()
    if (legacy.error) return NextResponse.json({ error: legacy.error.message }, { status: 400 })
    row = legacy.data as FeedbackRow
  } else {
    if (withAuthor.error) return NextResponse.json({ error: withAuthor.error.message }, { status: 400 })
    row = withAuthor.data as FeedbackRow
  }

  if (!row) return NextResponse.json({ error: '등록에 실패했습니다' }, { status: 400 })

  return NextResponse.json({
    feedback: {
      id: row.id,
      content: row.content,
      created_at: row.created_at,
      author: { name: profile.name, role: profile.role },
    },
  })
}
