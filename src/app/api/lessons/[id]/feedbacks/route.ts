import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from '@/lib/supabase/env'
import { canViewLessonFeedback, canWriteLessonFeedback, fetchLessonForFeedback } from '@/lib/lesson-access'

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

async function getLesson(lessonId: string) {
  const { url } = getSupabaseEnv()
  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return fetchLessonForFeedback(admin, lessonId)
}

function extractProfile(val: unknown): { name: string; role: string } | null {
  if (!val) return null
  if (Array.isArray(val)) return (val[0] as { name: string; role: string }) ?? null
  return val as { name: string; role: string }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params
  const callerProfile = await getCallerProfile()
  if (!callerProfile) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const lesson = await getLesson(lessonId)
  if (!lesson || !canViewLessonFeedback(callerProfile, lesson)) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const { url } = getSupabaseEnv()
  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // author_id JOIN 시도 (migration 003 적용된 경우)
  const withJoin = await admin
    .from('lesson_feedbacks')
    .select(`
      id, content, created_at, author_id, coach_id,
      author_profile:profiles!author_id(name, role),
      coach_profile:profiles!coach_id(name, role)
    `)
    .eq('lesson_id', lessonId)
    .order('created_at')

  if (!withJoin.error) {
    const feedbacks = (withJoin.data ?? []).map((row) => {
      const author = extractProfile(row.author_profile) ?? extractProfile(row.coach_profile)
      const resolvedAuthorId = (row.author_id as string | null) ?? (row.coach_id as string)
      return {
        id: row.id,
        content: row.content,
        created_at: row.created_at,
        is_mine: resolvedAuthorId === callerProfile.id,
        author: { name: author?.name ?? '—', role: author?.role ?? 'COACH' },
      }
    })
    return NextResponse.json({ feedbacks })
  }

  // fallback: author_id 컬럼 없는 경우 — coach_id로 author 조회
  const legacy = await admin
    .from('lesson_feedbacks')
    .select(`
      id, content, created_at, coach_id,
      coach_profile:profiles!coach_id(name, role)
    `)
    .eq('lesson_id', lessonId)
    .order('created_at')

  if (legacy.error) return NextResponse.json({ error: legacy.error.message }, { status: 400 })

  const feedbacks = (legacy.data ?? []).map((row) => {
    const author = extractProfile(row.coach_profile)
    return {
      id: row.id,
      content: row.content,
      created_at: row.created_at,
      is_mine: (row.coach_id as string) === callerProfile.id,
      author: { name: author?.name ?? '—', role: author?.role ?? 'COACH' },
    }
  })
  return NextResponse.json({ feedbacks })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params
  const profile = await getCallerProfile()
  if (!profile) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const role = (profile.role as string).toUpperCase()
  if (role !== 'COACH' && role !== 'MEMBER') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const lesson = await getLesson(lessonId)
  if (!lesson || !canWriteLessonFeedback(profile, lesson)) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

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

  // author_id 포함 INSERT 시도
  const withAuthor = await admin
    .from('lesson_feedbacks')
    .insert({ ...insertBase, author_id: profile.id })
    .select('id, content, created_at')
    .single()

  if (withAuthor.error) {
    // author_id 컬럼 없을 때 fallback
    const legacy = await admin
      .from('lesson_feedbacks')
      .insert(insertBase)
      .select('id, content, created_at')
      .single()
    if (legacy.error) return NextResponse.json({ error: legacy.error.message }, { status: 400 })

    return NextResponse.json({
      feedback: {
        id: legacy.data.id,
        content: legacy.data.content,
        created_at: legacy.data.created_at,
        author: { name: profile.name, role: profile.role },
      },
    })
  }

  return NextResponse.json({
    feedback: {
      id: withAuthor.data.id,
      content: withAuthor.data.content,
      created_at: withAuthor.data.created_at,
      author: { name: profile.name, role: profile.role },
    },
  })
}
