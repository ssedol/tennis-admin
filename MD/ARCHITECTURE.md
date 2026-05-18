# Architecture Document — 테니스장 관리 웹앱

> **상태:** 확정 (모든 결정사항 반영)
> **마지막 업데이트:** 피드백 반영 후 확정

---

## 1. 확정된 기술 스택

| 레이어 | 기술 | 역할 |
|---|---|---|
| **Frontend & Backend** | Next.js 14+ App Router + TypeScript | 풀스택 단일 프레임워크 |
| **Styling** | Tailwind CSS + shadcn/ui | 다크 테마, 카드 UI |
| **BaaS** | Supabase | Auth + PostgreSQL + Storage + Realtime 통합 |
| **DB Client** | @supabase/ssr | Next.js App Router 서버/클라이언트 통합 |
| **배포** | Vercel (Hobby 무료 플랜) | Next.js 제작사 플랫폼, 설정 최소화 |
| **로컬 개발** | Supabase CLI (`supabase start`) | 로컬에 Supabase 전체 스택 구동 |

### Vercel 선택 이유

- Next.js를 만든 팀의 배포 플랫폼 → 설정 거의 없음
- Hobby 플랜: 무료 (MVP 단계에 충분)
- Supabase와 공식 통합 지원
- Cloudflare Pages 대비: App Router + Supabase SSR이 Edge 런타임 제약 없이 동작

---

## 2. 인증 설계 — Supabase Magic Link

### 흐름

```
[대표/코치]                    [Supabase]              [회원]
    │                              │                      │
    ├─ 회원 정보 입력 (이름,폰)      │                      │
    ├─ inviteUserByEmail() ───────>│                      │
    │                              ├─ Magic Link 이메일 ──>│
    │                              │                      ├─ 링크 클릭
    │                              │<─ 세션 발급 ──────────┤
    │                              │                      ├─ 앱 진입 (세션 유지)
```

### 구현 포인트

- Supabase Admin SDK `auth.admin.inviteUserByEmail()` 로 초대 이메일 발송
- 회원은 이메일의 링크를 클릭하는 것만으로 계정 생성 + 로그인 완료
- 이후 세션은 Supabase가 자동 유지 (`@supabase/ssr`의 쿠키 기반 세션)
- 코치도 동일한 방식으로 초대 (`role` 값만 다르게 profiles 테이블에 저장)

### 역할 분기

Magic Link로 처음 로그인 후, `profiles` 테이블의 `role` 컬럼을 읽어 화면 분기:
- `OWNER` → 대표 대시보드
- `COACH` → 코치 화면
- `MEMBER` → 회원 화면

---

## 3. 데이터베이스 스키마 (Supabase SQL Migration)

> Supabase는 `auth.users` 테이블을 자체 관리합니다.
> 앱 도메인 데이터는 `public` 스키마에 별도 테이블로 관리하고 `auth.users.id`를 참조합니다.

```sql
-- ================================================================
-- 파일: supabase/migrations/001_initial_schema.sql
-- ================================================================

-- ─── 조직 (테니스장) ──────────────────────────────────────────

create table organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now()
);

-- ─── 사용자 프로필 (auth.users 확장) ─────────────────────────

create type user_role as enum ('OWNER', 'COACH', 'MEMBER');

create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  name            text not null,
  phone           text,
  role            user_role not null,
  organization_id uuid references organizations(id),
  created_at      timestamptz default now()
);

-- auth.users 생성 시 profiles 자동 생성 트리거
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role, organization_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    (new.raw_user_meta_data->>'role')::user_role,
    (new.raw_user_meta_data->>'organization_id')::uuid
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── 레슨 일정 ────────────────────────────────────────────────

create type lesson_status as enum ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

create table lesson_schedules (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) not null,
  coach_id        uuid references profiles(id) not null,
  member_id       uuid references profiles(id) not null,
  scheduled_at    timestamptz not null,
  duration_min    int not null,
  status          lesson_status default 'SCHEDULED',
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz default now()
);

-- ─── 레슨 피드백 (코치 → 회원 텍스트) ───────────────────────

create table lesson_feedbacks (
  id        uuid primary key default gen_random_uuid(),
  lesson_id uuid references lesson_schedules(id) on delete cascade not null,
  coach_id  uuid references profiles(id) not null,
  content   text not null,
  created_at timestamptz default now()
);

-- ─── 영상 ─────────────────────────────────────────────────────

create table videos (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid references lesson_schedules(id) not null,
  uploader_id  uuid references profiles(id) not null,
  storage_path text not null,   -- Supabase Storage 내 경로
  duration_sec int,             -- 업로드 완료 후 기록
  created_at   timestamptz default now()
);

-- ─── 타임스탬프 댓글 (핵심 기능) ──────────────────────────────

create table video_comments (
  id            uuid primary key default gen_random_uuid(),
  video_id      uuid references videos(id) on delete cascade not null,
  author_id     uuid references profiles(id) not null,
  timestamp_sec int not null,   -- 댓글이 달린 영상 재생 지점 (초)
  content       text not null,
  created_at    timestamptz default now()
);

-- ─── 테니스 일지 ──────────────────────────────────────────────

create type log_type as enum ('LESSON', 'PRACTICE', 'MATCH');

create table tennis_logs (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid references profiles(id) not null,
  log_type    log_type not null,
  lesson_id   uuid references lesson_schedules(id), -- LESSON 타입일 때 연결
  content     text,
  recorded_at timestamptz not null,
  created_at  timestamptz default now()
);

-- ─── 뱃지 ────────────────────────────────────────────────────

create table badges (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  description text not null,
  icon_url    text not null,
  condition   text not null    -- 예: "레슨 10회 완료"
);

create table member_badges (
  id        uuid primary key default gen_random_uuid(),
  member_id uuid references profiles(id) not null,
  badge_id  uuid references badges(id) not null,
  earned_at timestamptz default now(),
  unique(member_id, badge_id)
);

-- ─── 알림 ────────────────────────────────────────────────────

create type notification_type as enum (
  'LESSON_REMINDER',   -- 레슨 5분 전
  'VIDEO_UPLOADED',    -- 회원이 영상 업로드
  'FEEDBACK_ADDED'     -- 피드백 등록
);

create table notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) not null,
  type         notification_type not null,
  reference_id uuid,              -- 관련 레슨/영상 ID
  message      text not null,
  is_read      boolean default false,
  created_at   timestamptz default now()
);

-- ================================================================
-- Row Level Security (RLS) 정책
-- ================================================================

alter table profiles          enable row level security;
alter table lesson_schedules  enable row level security;
alter table lesson_feedbacks  enable row level security;
alter table videos            enable row level security;
alter table video_comments    enable row level security;
alter table tennis_logs       enable row level security;
alter table notifications     enable row level security;

-- profiles: 본인 또는 같은 조직의 OWNER/COACH만 조회 가능
create policy "profiles: 본인 조회"
  on profiles for select
  using (auth.uid() = id);

-- lesson_schedules: 같은 조직 내 코치(담당) + 해당 회원만 조회
create policy "lessons: 관련자만 조회"
  on lesson_schedules for select
  using (
    auth.uid() = coach_id or
    auth.uid() = member_id or
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'OWNER'
        and organization_id = lesson_schedules.organization_id
    )
  );

-- notifications: 본인 알림만 조회
create policy "notifications: 본인만"
  on notifications for select
  using (auth.uid() = user_id);
```

---

## 4. 폴더 구조

```
tennis-admin/
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── config.toml               # supabase CLI 설정
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx      # Magic Link 요청 화면
│   │   │
│   │   ├── (app)/                # 로그인 필요 라우트 그룹
│   │   │   ├── layout.tsx        # 공통 레이아웃 + 역할 분기
│   │   │   │
│   │   │   ├── owner/
│   │   │   │   └── page.tsx      # 코치별 레슨 대시보드 (년/월/일)
│   │   │   │
│   │   │   ├── coach/
│   │   │   │   ├── page.tsx      # 오늘의 레슨 목록
│   │   │   │   └── lessons/
│   │   │   │       └── [id]/
│   │   │   │           └── page.tsx  # 레슨 상세 (피드백 작성, 영상 확인)
│   │   │   │
│   │   │   └── member/
│   │   │       ├── page.tsx          # 내 레슨 카드 목록
│   │   │       ├── lessons/
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx  # 레슨 상세 (영상 업로드, 피드백 확인)
│   │   │       └── journal/
│   │   │           └── page.tsx      # 테니스 일지
│   │   │
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── invite/route.ts       # POST: 초대 이메일 발송
│   │   │   ├── lessons/
│   │   │   │   ├── route.ts              # GET/POST
│   │   │   │   └── [id]/
│   │   │   │       ├── route.ts          # GET/PATCH
│   │   │   │       ├── start/route.ts    # POST: 레슨 시작
│   │   │   │       ├── complete/route.ts # POST: 레슨 종료
│   │   │   │       └── feedback/route.ts # GET/POST: 텍스트 피드백
│   │   │   └── videos/
│   │   │       └── [id]/
│   │   │           └── comments/route.ts # GET/POST: 타임스탬프 댓글
│   │   │
│   │   ├── globals.css
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── ui/                   # shadcn/ui 기본 컴포넌트 (Card, Button 등)
│   │   ├── lesson/
│   │   │   ├── LessonItem.tsx        # 레슨 목록 아이템 (Card 레이아웃 사용)
│   │   │   └── LessonStatusButton.tsx # 시작/종료 버튼
│   │   ├── video/
│   │   │   ├── VideoPlayer.tsx       # 커스텀 플레이어 (타임스탬프 연동)
│   │   │   ├── TimestampComment.tsx  # 타임스탬프 댓글 항목
│   │   │   └── VideoUploader.tsx     # Supabase Storage 직접 업로드
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       └── Header.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         # 브라우저용 Supabase 클라이언트
│   │   │   ├── server.ts         # 서버 컴포넌트용 클라이언트
│   │   │   └── middleware.ts     # 세션 갱신 미들웨어
│   │   └── utils.ts
│   │
│   ├── hooks/
│   │   ├── useCurrentUser.ts
│   │   └── useRealtimeNotifications.ts  # Supabase Realtime 구독
│   │
│   ├── types/
│   │   └── database.ts           # supabase gen types 로 자동 생성
│   │
│   └── middleware.ts             # 인증 체크 + 역할 기반 리다이렉트
│
├── .env.local.example
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 5. 로컬 개발 환경

Docker Compose 대신 **Supabase CLI**가 로컬 환경을 전부 관리합니다.

```bash
# 최초 설정
npx supabase init
npx supabase start       # PostgreSQL + Auth + Storage + Studio 로컬 구동

# 마이그레이션 적용
npx supabase db push

# TypeScript 타입 자동 생성
npx supabase gen types typescript --local > src/types/database.ts

# 개발 서버
npm run dev
```

Supabase CLI 구동 시 제공되는 로컬 서비스:

| 서비스 | 주소 |
|---|---|
| API | http://localhost:54321 |
| Studio (DB 관리 UI) | http://localhost:54323 |
| Inbucket (이메일 테스트) | http://localhost:54324 |

**환경변수 (`.env.local.example`):**
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase start 출력값>
SUPABASE_SERVICE_ROLE_KEY=<supabase start 출력값>
```

---

## 6. 실시간 알림 설계

Supabase Realtime으로 별도 WebSocket 서버 없이 구현합니다.

```typescript
// hooks/useRealtimeNotifications.ts 예시
supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`,
  }, (payload) => {
    // 새 알림 수신 → UI 업데이트
  })
  .subscribe()
```

레슨 5분 전 알림은 **Supabase Edge Function + pg_cron**으로 처리:
```
pg_cron: 매분 실행 → 5분 내 레슨 조회 → notifications 테이블 INSERT → Realtime이 클라이언트에 푸시
```

---

## 7. 핵심 API 엔드포인트

| Method | URI | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/invite` | 초대 이메일 발송 (Magic Link) | OWNER/COACH |
| GET | `/api/lessons` | 레슨 목록 (역할별 필터) | 필요 |
| POST | `/api/lessons` | 레슨 일정 생성 | OWNER/COACH |
| PATCH | `/api/lessons/[id]` | 레슨 정보 수정 | OWNER/COACH |
| POST | `/api/lessons/[id]/start` | 레슨 시작 | COACH |
| POST | `/api/lessons/[id]/complete` | 레슨 종료 | COACH |
| GET/POST | `/api/lessons/[id]/feedback` | 텍스트 피드백 조회/작성 | 필요 |
| GET/POST | `/api/videos/[id]/comments` | 타임스탬프 댓글 조회/작성 | 필요 |

---

## 8. 디자인 시스템

> 기능이 단순한 만큼 **디자인 완성도가 핵심**. 모든 화면은 이 가이드를 최우선으로 따른다.

### 8.1 컬러

| 역할 | 값 | 용도 |
|---|---|---|
| Background | `#0a0a0a` | 전체 배경 |
| Surface | `#141414` | 카드, 패널 배경 |
| Border | `#222222` | 구분선, 카드 테두리 |
| Text Primary | `#ffffff` | 제목, 본문 |
| Text Secondary | `#888888` | 부제목, 메타 정보 |
| **Volta (accent)** | `#c8f000` | 포인트 컬러 (테니스공 색상). 버튼, 배지, 강조 텍스트에만 사용 |
| Danger | `#ff4444` | 오류, 취소 |

> Volta 색상은 **절제해서** 사용. 페이지 전체에 2~3곳 이하.

### 8.2 타이포그래피

- **폰트:** Geist Sans (Next.js 기본 제공)
- 제목: `font-semibold`, 크기 `text-lg` 이상
- 본문: `font-normal`, `text-sm` ~ `text-base`
- 메타(날짜, 역할 등): `text-xs text-[#888888]`

### 8.3 카드 스타일 (디자인 패턴)

"카드"는 특정 컴포넌트 이름이 아니라 **목록 아이템에 공통 적용하는 레이아웃 패턴**.
shadcn/ui의 `Card`를 기반으로 아래 스타일을 항상 적용:

```
배경: bg-[#141414]
테두리: border border-[#222222] rounded-xl
내부 여백: p-4 ~ p-5
hover: 테두리 색상을 border-[#333333]으로 밝게
transition: transition-colors duration-150
```

### 8.4 버튼

- **Primary (Volta):** `bg-[#c8f000] text-black font-semibold` — 핵심 액션 1개에만
- **Secondary:** `bg-[#1e1e1e] text-white border border-[#333]` — 보조 액션
- **Ghost:** `text-[#888] hover:text-white` — 삭제, 취소 등

### 8.5 전반적인 원칙

- 여백을 충분히. 빽빽하게 채우지 않는다.
- 아이콘은 `lucide-react` 사용. 텍스트 레이블과 함께 표시.
- 애니메이션은 최소화. 필요한 경우 `duration-150` 이하의 짧은 transition만.
- 모바일 우선 (375px 기준). 코치와 회원은 주로 모바일로 접근.
