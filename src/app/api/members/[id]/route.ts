import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from '@/lib/supabase/env'
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
  const { data: profile } = await admin.from('profiles').select('id, organization_id, role').eq('id', user.id).single()
  return profile
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCallerProfile()
  if (!profile || (profile.role as string).toUpperCase() !== 'OWNER')
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const body = await request.json()
  const { name, phone, email, coachId } = body

  const { url } = getSupabaseEnv()
  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await admin
    .from('profiles')
    .update({ name, phone, coach_id: coachId ?? null })
    .eq('id', id)
    .eq('organization_id', profile.organization_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (email) {
    const { error: authError } = await admin.auth.admin.updateUserById(id, { email })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getCallerProfile()
  if (!profile || (profile.role as string).toUpperCase() !== 'OWNER')
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { url } = getSupabaseEnv()
  const admin = createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 해당 유저가 같은 조직인지 확인
  const { data: target } = await admin
    .from('profiles').select('organization_id').eq('id', id).single()
  if (!target || target.organization_id !== profile.organization_id)
    return NextResponse.json({ error: '대상을 찾을 수 없습니다' }, { status: 404 })

  // profiles 를 직접 참조하는 모든 FK를 순서대로 제거

  // 1. 이 유저가 작성한 video_comments (author_id)
  await admin.from('video_comments').delete().eq('author_id', id)

  // 2. 이 유저가 작성한 lesson_feedbacks (coach_id)
  await admin.from('lesson_feedbacks').delete().eq('coach_id', id)

  // 3. 이 유저가 업로드한 videos (uploader_id) → 먼저 댓글 삭제 후 영상 삭제
  const { data: ownVids } = await admin.from('videos').select('id').eq('uploader_id', id)
  const ownVidIds = (ownVids ?? []).map((v) => v.id)
  if (ownVidIds.length > 0) {
    await admin.from('video_comments').delete().in('video_id', ownVidIds)
    await admin.from('videos').delete().in('id', ownVidIds)
  }

  // 4. 이 유저가 참여한 레슨의 관련 데이터
  const { data: lessons } = await admin
    .from('lesson_schedules').select('id, organization_id, coach_id, member_id, court_id, scheduled_at, duration_min, status')
    .or(`coach_id.eq.${id},member_id.eq.${id}`)
  const lessonIds = (lessons ?? []).map((l) => l.id)

  if (lessonIds.length > 0) {
    const { data: lessonVids } = await admin.from('videos').select('id').in('lesson_id', lessonIds)
    const lessonVidIds = (lessonVids ?? []).map((v) => v.id)
    if (lessonVidIds.length > 0) {
      await admin.from('video_comments').delete().in('video_id', lessonVidIds)
      await admin.from('videos').delete().in('id', lessonVidIds)
    }
    await admin.from('lesson_feedbacks').delete().in('lesson_id', lessonIds)
    await admin.from('tennis_logs').delete().in('lesson_id', lessonIds)

    try {
      await recordLessonHistory(admin, 'DELETED', profile.id, lessons ?? [])
    } catch (historyError) {
      return NextResponse.json(
        { error: historyError instanceof Error ? historyError.message : '이력 기록에 실패했습니다' },
        { status: 500 }
      )
    }

    await admin.from('lesson_schedules').delete().in('id', lessonIds)
  }

  // 5. 일지 (lesson 없는 것 포함)
  await admin.from('tennis_logs').delete().eq('member_id', id)

  // 6. 알림
  await admin.from('notifications').delete().eq('user_id', id)

  // 7. auth 계정 삭제 → profiles 는 on delete cascade 로 자동 삭제
  const { error: authError } = await admin.auth.admin.deleteUser(id)
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
