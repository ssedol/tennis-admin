import { NextResponse, type NextRequest } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from '@/lib/supabase/env'

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
    .select('id, role')
    .eq('id', user.id)
    .single()
  return profile
}

function makeAdmin() {
  const { url } = getSupabaseEnv()
  return createAdminClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

type RouteContext = { params: Promise<{ id: string; feedbackId: string }> }

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id: lessonId, feedbackId } = await params

  const profile = await getCallerProfile()
  if (!profile) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { content } = await request.json() as { content?: string }
  if (!content?.trim()) {
    return NextResponse.json({ error: '내용을 입력하세요' }, { status: 400 })
  }

  const admin = makeAdmin()

  const { data: feedback, error: fetchError } = await admin
    .from('lesson_feedbacks')
    .select('id, author_id, coach_id')
    .eq('id', feedbackId)
    .eq('lesson_id', lessonId)
    .single()

  if (fetchError || !feedback) {
    return NextResponse.json({ error: '피드백을 찾을 수 없습니다' }, { status: 404 })
  }

  const authorId = (feedback.author_id as string | null) ?? (feedback.coach_id as string)
  if (authorId !== profile.id) {
    return NextResponse.json({ error: '본인 피드백만 수정할 수 있습니다' }, { status: 403 })
  }

  const { error: updateError } = await admin
    .from('lesson_feedbacks')
    .update({ content: content.trim() })
    .eq('id', feedbackId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

  return NextResponse.json({ ok: true, content: content.trim() })
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const { id: lessonId, feedbackId } = await params

  const profile = await getCallerProfile()
  if (!profile) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const admin = makeAdmin()

  const { data: feedback, error: fetchError } = await admin
    .from('lesson_feedbacks')
    .select('id, author_id, coach_id')
    .eq('id', feedbackId)
    .eq('lesson_id', lessonId)
    .single()

  if (fetchError || !feedback) {
    return NextResponse.json({ error: '피드백을 찾을 수 없습니다' }, { status: 404 })
  }

  const authorId = (feedback.author_id as string | null) ?? (feedback.coach_id as string)
  if (authorId !== profile.id) {
    return NextResponse.json({ error: '본인 피드백만 삭제할 수 있습니다' }, { status: 403 })
  }

  const { error: deleteError } = await admin
    .from('lesson_feedbacks')
    .delete()
    .eq('id', feedbackId)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
