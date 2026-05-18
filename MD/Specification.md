# Technical Specification

## 1. 기술 스택 (Tech Stack)

- **Frontend & Backend:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Database & Backend as a Service:** Supabase (Auth, PostgreSQL, Storage, Realtime)
- **Styling:** Tailwind CSS + shadcn/ui
- **DB Client:** @supabase/ssr (서버/클라이언트 통합)
- **배포:** Vercel (Hobby 무료 플랜)
- **로컬 개발:** Supabase CLI (`supabase start`)

## 2. 시스템 아키텍처 및 폴더 구조 규칙

- **아키텍처:** Next.js App Router 기반 풀스택. 역할(OWNER/COACH/MEMBER)별 라우트 그룹으로 분리
- **인증:** Supabase Magic Link. 로그인 후 `profiles.role` 값으로 라우트 분기
- **폴더 구조:**
  - `src/app/(auth)/` — 로그인 전 접근 가능 화면
  - `src/app/(app)/owner|coach|member/` — 역할별 화면
  - `src/app/api/` — Next.js API Routes (서버 전용 로직)
  - `src/components/ui/` — shadcn/ui 기본 컴포넌트
  - `src/components/cards/` — LessonCard 등 도메인 카드 컴포넌트
  - `src/components/video/` — VideoPlayer, TimestampComment, VideoUploader
  - `src/lib/supabase/` — client.ts / server.ts / middleware.ts
  - `src/hooks/` — useCurrentUser, useRealtimeNotifications
  - `src/types/database.ts` — `supabase gen types` 자동 생성 타입
  - `supabase/migrations/` — SQL 마이그레이션 파일

## 3. 데이터 모델 (Supabase PostgreSQL)

### 핵심 엔티티

| 테이블 | 설명 |
|---|---|
| `profiles` | `auth.users` 확장. name, phone, role, organization_id 보관 |
| `organizations` | 테니스장 단위 |
| `lesson_schedules` | 레슨 일정. coach_id + member_id + 시간 + 상태(SCHEDULED/IN_PROGRESS/COMPLETED) |
| `lesson_feedbacks` | 코치가 레슨 후 작성하는 텍스트 피드백 |
| `videos` | 회원이 업로드한 영상. Supabase Storage 경로 저장 |
| `video_comments` | 타임스탬프(초) + 텍스트. 핵심 기능 |
| `tennis_logs` | 회원 테니스 일지 (LESSON/PRACTICE/MATCH) |
| `badges` / `member_badges` | 뱃지 정의 및 회원 획득 기록 |
| `notifications` | 알림 (LESSON_REMINDER / VIDEO_UPLOADED / FEEDBACK_ADDED) |

> 전체 SQL DDL 및 RLS 정책은 `MD/ARCHITECTURE.md` 섹션 3 참조
> 마이그레이션 파일: `supabase/migrations/001_initial_schema.sql`

## 4. 핵심 API 엔드포인트

| Method | URI | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/invite` | Magic Link 초대 이메일 발송 | OWNER/COACH |
| GET | `/api/lessons` | 레슨 목록 (역할별 자동 필터) | 필요 |
| POST | `/api/lessons` | 레슨 일정 생성 | OWNER/COACH |
| PATCH | `/api/lessons/[id]` | 레슨 정보 수정/취소 | OWNER/COACH |
| POST | `/api/lessons/[id]/start` | 레슨 시작 (상태 → IN_PROGRESS) | COACH |
| POST | `/api/lessons/[id]/complete` | 레슨 종료 (상태 → COMPLETED) | COACH |
| GET/POST | `/api/lessons/[id]/feedback` | 텍스트 피드백 조회/작성 | 필요 |
| GET/POST | `/api/videos/[id]/comments` | 타임스탬프 댓글 조회/작성 | 필요 |

## 5. 인프라 및 개발 환경

- **로컬 개발:** `supabase start` + `npm run dev`
  - Supabase CLI가 PostgreSQL, Auth, Storage, Studio를 Docker로 로컬 구동
  - Inbucket(http://localhost:54324)으로 Magic Link 이메일 로컬 테스트 가능
- **배포:** Vercel. GitHub 연동 후 main 브랜치 push 시 자동 배포
- **환경변수:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (초대 이메일 발송용 서버 전용)

## 6. 테스트 및 QA 전략

- **Unit Test:** Jest를 이용한 비즈니스 로직 검증 (레슨 상태 전이, 타임스탬프 정렬 등)
- **테스트 커버리지:** 핵심 도메인 로직 (레슨 시작/종료, 피드백 작성) 필수 커버
