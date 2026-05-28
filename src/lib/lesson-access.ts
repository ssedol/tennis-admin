import type { SupabaseClient } from '@supabase/supabase-js'

export type LessonParticipant = {
  coach_id: string
  member_id: string
  organization_id: string
}

type ProfileContext = {
  id: string
  organization_id: string | null
  role?: string
}

function isSameOrganization(profile: ProfileContext, lesson: LessonParticipant): boolean {
  return !!profile.organization_id && lesson.organization_id === profile.organization_id
}

function isLessonParticipant(profile: ProfileContext, lesson: LessonParticipant): boolean {
  return lesson.coach_id === profile.id || lesson.member_id === profile.id
}

/** 코치·회원·대표(같은 조직) — 피드백/영상 열람 */
export function canViewLessonFeedback(profile: ProfileContext, lesson: LessonParticipant): boolean {
  if (!isSameOrganization(profile, lesson)) return false
  if ((profile.role as string | undefined)?.toUpperCase() === 'OWNER') return true
  return isLessonParticipant(profile, lesson)
}

/** 해당 레슨 코치·회원만 — 피드백/영상 작성 */
export function canWriteLessonFeedback(profile: ProfileContext, lesson: LessonParticipant): boolean {
  if (!isSameOrganization(profile, lesson)) return false
  return isLessonParticipant(profile, lesson)
}

/** 코치·회원 레슨 상세 페이지 접근 (당사자만) */
export function canAccessLessonFeedback(profile: ProfileContext, lesson: LessonParticipant): boolean {
  return canWriteLessonFeedback(profile, lesson)
}

export async function fetchLessonForFeedback(
  admin: SupabaseClient,
  lessonId: string
): Promise<LessonParticipant | null> {
  const { data: lesson } = await admin
    .from('lesson_schedules')
    .select('coach_id, member_id, organization_id')
    .eq('id', lessonId)
    .single()

  if (!lesson) return null
  return lesson as LessonParticipant
}
