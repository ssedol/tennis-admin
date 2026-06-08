import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from '@/lib/supabase/env'

const BUCKET = 'lesson-videos'

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

// Step 3: 브라우저가 Supabase에 직접 업로드 완료 후 DB 레코드 저장
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: lessonId } = await params
    const profile = await getCallerProfile()
    if (!profile) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

    const role = (profile.role as string).toUpperCase()
    if (role !== 'MEMBER' && role !== 'COACH') {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }

    const body = await request.json() as { storagePath?: string; durationSec?: number | null }

    if (!body.storagePath) {
      return NextResponse.json({ error: '스토리지 경로가 필요합니다' }, { status: 400 })
    }

    const { url } = getSupabaseEnv()
    const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: lesson } = await admin
      .from('lesson_schedules')
      .select('id, coach_id, member_id, organization_id')
      .eq('id', lessonId)
      .single()

    if (!lesson || lesson.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }

    // storagePath가 이 레슨/조직에 속하는지 검증
    const expectedPrefix = `${lesson.organization_id}/${lessonId}/`
    if (!body.storagePath.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: '잘못된 스토리지 경로입니다' }, { status: 400 })
    }

    const durationSec = typeof body.durationSec === 'number' && body.durationSec > 0
      ? Math.floor(body.durationSec)
      : null

    // 본인이 이미 올린 영상이 있으면 교체 (uploader_id로 필터)
    const { data: existing } = await admin
      .from('videos')
      .select('id, storage_path')
      .eq('lesson_id', lessonId)
      .eq('uploader_id', profile.id)
      .maybeSingle()

    let videoId: string

    if (existing) {
      // 기존 파일 삭제 후 레코드 업데이트
      await admin.storage.from(BUCKET).remove([existing.storage_path])
      const { data: updated, error: updateError } = await admin
        .from('videos')
        .update({ storage_path: body.storagePath, duration_sec: durationSec })
        .eq('id', existing.id)
        .select('id')
        .single()

      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })
      videoId = updated.id
    } else {
      const { data: inserted, error: insertError } = await admin
        .from('videos')
        .insert({ lesson_id: lessonId, uploader_id: profile.id, storage_path: body.storagePath, duration_sec: durationSec })
        .select('id')
        .single()

      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 })
      videoId = inserted.id
    }

    const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(body.storagePath, 3600)

    return NextResponse.json({
      video: {
        id: videoId,
        storage_path: body.storagePath,
        duration_sec: durationSec,
        url: signed?.signedUrl ?? null,
      },
    })
  } catch (err) {
    console.error('[video/upload/confirm] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '오류가 발생했습니다' },
      { status: 500 }
    )
  }
}
