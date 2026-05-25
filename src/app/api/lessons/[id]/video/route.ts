import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from '@/lib/supabase/env'

type ProfileRow = { id: string; name: string; role: string }

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

function canUploadVideo(
  profile: { id: string; role: string },
  lesson: { member_id: string }
): boolean {
  return (profile.role as string).toUpperCase() === 'MEMBER' && lesson.member_id === profile.id
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

  const { data: video } = await admin
    .from('videos')
    .select('id, storage_path, duration_sec')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!video) return NextResponse.json({ video: null, comments: [], canUpload: canUploadVideo(profile, lesson) })

  const { data: signed } = await admin.storage.from('lesson-videos').createSignedUrl(video.storage_path, 3600)

  const { data: commentRows, error } = await admin
    .from('video_comments')
    .select('id, timestamp_sec, content, author_id')
    .eq('video_id', video.id)
    .order('timestamp_sec')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const authorIds = [...new Set((commentRows ?? []).map((c) => c.author_id))]
  const { data: profiles } = authorIds.length > 0
    ? await admin.from('profiles').select('id, name, role').in('id', authorIds)
    : { data: [] as ProfileRow[] }

  const profileMap = new Map<string, ProfileRow>(
    ((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p])
  )

  const comments = (commentRows ?? []).map((c) => {
    const author = profileMap.get(c.author_id)
    const role = (author?.role ?? 'COACH').toUpperCase()
    return {
      id: c.id,
      author: author?.name ?? '—',
      role: role === 'MEMBER' ? 'MEMBER' as const : 'COACH' as const,
      timestamp: c.timestamp_sec,
      content: c.content,
    }
  })

  return NextResponse.json({
    video: {
      ...video,
      url: signed?.signedUrl ?? null,
    },
    comments,
    canUpload: canUploadVideo(profile, lesson),
  })
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

  const body = await request.json() as { content?: string; timestamp_sec?: number }
  if (!body.content?.trim()) {
    return NextResponse.json({ error: '내용을 입력하세요' }, { status: 400 })
  }
  if (typeof body.timestamp_sec !== 'number' || body.timestamp_sec < 0) {
    return NextResponse.json({ error: '유효하지 않은 타임스탬프입니다' }, { status: 400 })
  }

  const { url } = getSupabaseEnv()
  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: video } = await admin
    .from('videos')
    .select('id')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!video) return NextResponse.json({ error: '영상이 없습니다' }, { status: 404 })

  const { data, error } = await admin
    .from('video_comments')
    .insert({
      video_id: video.id,
      author_id: profile.id,
      timestamp_sec: Math.floor(body.timestamp_sec),
      content: body.content.trim(),
    })
    .select('id, timestamp_sec, content, author_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const commentRole = role === 'MEMBER' ? 'MEMBER' as const : 'COACH' as const
  return NextResponse.json({
    comment: {
      id: data.id,
      author: profile.name,
      role: commentRole,
      timestamp: data.timestamp_sec,
      content: data.content,
    },
  })
}
