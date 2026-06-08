import type { SupabaseClient } from '@supabase/supabase-js'

export type LessonHistoryAction = 'CREATED' | 'DELETED'

export type LessonHistorySnapshot = {
  id: string
  organization_id: string
  coach_id: string
  member_id: string
  court_id?: string | null
  scheduled_at: string
  duration_min: number
  status: string
}

export async function recordLessonHistory(
  admin: SupabaseClient,
  action: LessonHistoryAction,
  actorId: string,
  lessons: LessonHistorySnapshot[]
) {
  if (lessons.length === 0) return

  const rows = lessons.map((lesson) => ({
    organization_id: lesson.organization_id,
    lesson_id: lesson.id,
    action,
    actor_id: actorId,
    coach_id: lesson.coach_id,
    member_id: lesson.member_id,
    court_id: lesson.court_id,
    scheduled_at: lesson.scheduled_at,
    duration_min: lesson.duration_min,
    status: lesson.status,
  }))

  const { error } = await admin.from('lesson_schedule_history').insert(rows)
  if (error) throw new Error(error.message)
}
