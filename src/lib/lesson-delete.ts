import type { SupabaseClient } from '@supabase/supabase-js'

export const DELETABLE_LESSON_STATUSES = new Set(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'])

export type LessonDeleteTarget = {
  id: string
  memberName: string
  courtName: string
  timeLabel: string
}

export function canDeleteLesson(status: string): boolean {
  return DELETABLE_LESSON_STATUSES.has(status)
}

/** 코치: 본인이 등록한 레슨만 삭제 버튼 표시 */
export function canCoachDeleteLesson(
  status: string,
  createdBy: string,
  coachProfileId: string
): boolean {
  return canDeleteLesson(status) && createdBy === coachProfileId
}

/** 레슨 삭제 전 연관 데이터 정리 (영상·일지 등) */
export async function cleanupLessonDependencies(admin: SupabaseClient, lessonId: string) {
  const { data: lessonVids } = await admin.from('videos').select('id').eq('lesson_id', lessonId)
  const videoIds = (lessonVids ?? []).map((v) => v.id)

  if (videoIds.length > 0) {
    await admin.from('video_comments').delete().in('video_id', videoIds)
    await admin.from('videos').delete().in('id', videoIds)
  }

  await admin.from('tennis_logs').delete().eq('lesson_id', lessonId)
}
