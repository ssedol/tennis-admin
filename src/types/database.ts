// supabase gen types typescript --local > src/types/database.ts 로 자동 생성 가능
// 아래는 로컬 개발 전 수동 정의한 타입 (Supabase CLI 연동 후 교체)

export type UserRole = 'OWNER' | 'COACH' | 'MEMBER'
export type LessonStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type LogType = 'LESSON' | 'PRACTICE' | 'MATCH'
export type LessonHistoryAction = 'CREATED' | 'DELETED'
export type NotificationType = 'LESSON_REMINDER' | 'VIDEO_UPLOADED' | 'FEEDBACK_ADDED'

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['organizations']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          name: string
          phone: string | null
          role: UserRole
          organization_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      lesson_schedules: {
        Row: {
          id: string
          organization_id: string
          coach_id: string
          created_by: string
          member_id: string
          court_id: string | null
          scheduled_at: string
          duration_min: number
          status: LessonStatus
          started_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['lesson_schedules']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['lesson_schedules']['Insert']>
      }
      lesson_schedule_history: {
        Row: {
          id: string
          organization_id: string
          lesson_id: string
          action: LessonHistoryAction
          actor_id: string | null
          coach_id: string
          member_id: string
          court_id: string | null
          scheduled_at: string
          duration_min: number
          status: LessonStatus
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['lesson_schedule_history']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['lesson_schedule_history']['Insert']>
      }
      lesson_feedbacks: {
        Row: {
          id: string
          lesson_id: string
          coach_id: string
          content: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['lesson_feedbacks']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['lesson_feedbacks']['Insert']>
      }
      videos: {
        Row: {
          id: string
          lesson_id: string
          uploader_id: string
          storage_path: string
          duration_sec: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['videos']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['videos']['Insert']>
      }
      video_comments: {
        Row: {
          id: string
          video_id: string
          author_id: string
          timestamp_sec: number
          content: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['video_comments']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['video_comments']['Insert']>
      }
      tennis_logs: {
        Row: {
          id: string
          member_id: string
          log_type: LogType
          lesson_id: string | null
          content: string | null
          recorded_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['tennis_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['tennis_logs']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          reference_id: string | null
          message: string
          is_read: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
    }
  }
}
