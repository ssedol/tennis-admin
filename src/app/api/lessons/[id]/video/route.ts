import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from '@/lib/supabase/env'
import { canViewLessonFeedback, canWriteLessonFeedback, fetchLessonForFeedback } from '@/lib/lesson-access'

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

async function getLesson(lessonId: string) {
  const { url } = getSupabaseEnv()
  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return fetchLessonForFeedback(admin, lessonId)
}

function canUploadVideo(
  profile: { id: string; role: string },
  lesson: { coach_id: string; member_id: string }
): boolean {
  const role = (profile.role as string).toUpperCase()
  if (role === 'MEMBER') return lesson.member_id === profile.id
  if (role === 'COACH') return lesson.coach_id === profile.id
  return false
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params
  const profile = await getCallerProfile()
  if (!profile) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const lesson = await getLesson(lessonId)
  if (!lesson || !canViewLessonFeedback(profile, lesson)) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const { url } = getSupabaseEnv()
  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: videos } = await admin
    .from('videos')
    .select('id, storage_path, duration_sec, uploader_id')
    .eq('lesson_id', lessonId)

  const coachVideoRow = (videos ?? []).find((v) => v.uploader_id === lesson.coach_id) ?? null
  const memberVideoRow = (videos ?? []).find((v) => v.uploader_id === lesson.member_id) ?? null

  const profileId = profile.id

  async function buildVideo(row: { id: string; storage_path: string; duration_sec: number | null; uploader_id: string } | null) {
    if (!row) return null

    const [signedResult, commentResult] = await Promise.all([
      admin.storage.from('lesson-videos').createSignedUrl(row.storage_path, 3600),
      admin.from('video_comments').select('id, timestamp_sec, content, author_id').eq('video_id', row.id).order('timestamp_sec'),
    ])

    const commentRows = commentResult.data ?? []
    const authorIds = [...new Set(commentRows.map((c) => c.author_id))]
    const { data: profiles } = authorIds.length > 0
      ? await admin.from('profiles').select('id, name, role').in('id', authorIds)
      : { data: [] as ProfileRow[] }

    const profileMap = new Map<string, ProfileRow>(
      ((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p])
    )

    const comments = commentRows.map((c) => {
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

    return {
      id: row.id,
      storage_path: row.storage_path,
      duration_sec: row.duration_sec,
      url: signedResult.data?.signedUrl ?? null,
      comments,
      isUploader: row.uploader_id === profileId,
    }
  }

  const [coachVideo, memberVideo] = await Promise.all([
    buildVideo(coachVideoRow),
    buildVideo(memberVideoRow),
  ])

  const role = (profile.role as string).toUpperCase()

  return NextResponse.json({
    coachVideo,
    memberVideo,
    canUpload: canUploadVideo(profile, lesson),
    myRole: role === 'MEMBER' ? 'MEMBER' : role === 'COACH' ? 'COACH' : null,
  })
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
    return NextResponse.json({ error: '본인 레슨에만 댓글을 등록할 수 있습니다' }, { status: 403 })
  }
  if (role === 'MEMBER' && lesson.member_id !== profile.id) {
    return NextResponse.json({ error: '본인 레슨에만 댓글을 등록할 수 있습니다' }, { status: 403 })
  }

  const body = await request.json() as { content?: string; timestamp_sec?: number; videoId?: string }
  if (!body.content?.trim()) {
    return NextResponse.json({ error: '내용을 입력하세요' }, { status: 400 })
  }
  if (typeof body.timestamp_sec !== 'number' || body.timestamp_sec < 0) {
    return NextResponse.json({ error: '유효하지 않은 타임스탬프입니다' }, { status: 400 })
  }
  if (!body.videoId) {
    return NextResponse.json({ error: '영상 ID가 필요합니다' }, { status: 400 })
  }

  const { url } = getSupabaseEnv()
  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: video } = await admin
    .from('videos')
    .select('id')
    .eq('lesson_id', lessonId)
    .eq('id', body.videoId)
    .single()

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

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: lessonId } = await params
    const profile = await getCallerProfile()
    if (!profile) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const lesson = await getLesson(lessonId)
    if (!lesson || !canWriteLessonFeedback(profile, lesson)) {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }

    const { url } = getSupabaseEnv()
    const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: video } = await admin
      .from('videos')
      .select('id, storage_path')
      .eq('lesson_id', lessonId)
      .eq('uploader_id', profile.id)
      .maybeSingle()

    if (!video) return NextResponse.json({ error: '삭제할 영상이 없습니다' }, { status: 404 })

    await admin.storage.from('lesson-videos').remove([video.storage_path])
    await admin.from('videos').delete().eq('id', video.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[video DELETE] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
