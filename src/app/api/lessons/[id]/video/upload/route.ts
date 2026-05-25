import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from '@/lib/supabase/env'

const BUCKET = 'lesson-videos'
const MAX_BYTES = 100 * 1024 * 1024
const ALLOWED_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm'])

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

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: lessonId } = await params
  const profile = await getCallerProfile()
  if (!profile) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const role = (profile.role as string).toUpperCase()
  if (role !== 'MEMBER') {
    return NextResponse.json({ error: '회원만 영상을 업로드할 수 있습니다' }, { status: 403 })
  }

  const { url } = getSupabaseEnv()
  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: lesson } = await admin
    .from('lesson_schedules')
    .select('id, member_id, organization_id')
    .eq('id', lessonId)
    .single()

  if (!lesson || lesson.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }
  if (lesson.member_id !== profile.id) {
    return NextResponse.json({ error: '본인 레슨에만 영상을 업로드할 수 있습니다' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '영상 파일을 선택하세요' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'MP4, MOV, WEBM 형식만 업로드할 수 있습니다' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: '100MB 이하 영상만 업로드할 수 있습니다' }, { status: 400 })
  }

  const rawDuration = formData.get('duration_sec')
  const durationSec =
    typeof rawDuration === 'string' && rawDuration !== ''
      ? Math.max(0, Math.floor(Number(rawDuration)))
      : null

  const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4'
  const storagePath = `${lesson.organization_id}/${lessonId}/${crypto.randomUUID()}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: file.type,
    upsert: false,
  })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 })
  }

  const { data: existing } = await admin
    .from('videos')
    .select('id, storage_path')
    .eq('lesson_id', lessonId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let videoId: string

  if (existing) {
    await admin.storage.from(BUCKET).remove([existing.storage_path])
    const { data: updated, error: updateError } = await admin
      .from('videos')
      .update({
        storage_path: storagePath,
        uploader_id: profile.id,
        duration_sec: durationSec,
      })
      .eq('id', existing.id)
      .select('id')
      .single()

    if (updateError) {
      await admin.storage.from(BUCKET).remove([storagePath])
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }
    videoId = updated.id
  } else {
    const { data: inserted, error: insertError } = await admin
      .from('videos')
      .insert({
        lesson_id: lessonId,
        uploader_id: profile.id,
        storage_path: storagePath,
        duration_sec: durationSec,
      })
      .select('id')
      .single()

    if (insertError) {
      await admin.storage.from(BUCKET).remove([storagePath])
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }
    videoId = inserted.id
  }

  const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(storagePath, 3600)

  return NextResponse.json({
    video: {
      id: videoId,
      storage_path: storagePath,
      duration_sec: durationSec,
      url: signed?.signedUrl ?? null,
    },
  })
}
