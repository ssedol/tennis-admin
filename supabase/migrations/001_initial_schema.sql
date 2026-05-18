-- ================================================================
-- 테니스장 관리 웹앱 초기 스키마
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

create index lesson_schedules_coach_id_idx  on lesson_schedules(coach_id);
create index lesson_schedules_member_id_idx on lesson_schedules(member_id);
create index lesson_schedules_scheduled_at_idx on lesson_schedules(scheduled_at);

-- ─── 레슨 피드백 (코치 → 회원 텍스트) ───────────────────────

create table lesson_feedbacks (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid references lesson_schedules(id) on delete cascade not null,
  coach_id   uuid references profiles(id) not null,
  content    text not null,
  created_at timestamptz default now()
);

-- ─── 영상 ─────────────────────────────────────────────────────

create table videos (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid references lesson_schedules(id) not null,
  uploader_id  uuid references profiles(id) not null,
  storage_path text not null,
  duration_sec int,
  created_at   timestamptz default now()
);

-- ─── 타임스탬프 댓글 (핵심 기능) ──────────────────────────────

create table video_comments (
  id            uuid primary key default gen_random_uuid(),
  video_id      uuid references videos(id) on delete cascade not null,
  author_id     uuid references profiles(id) not null,
  timestamp_sec int not null,
  content       text not null,
  created_at    timestamptz default now()
);

create index video_comments_video_id_idx on video_comments(video_id);

-- ─── 테니스 일지 ──────────────────────────────────────────────

create type log_type as enum ('LESSON', 'PRACTICE', 'MATCH');

create table tennis_logs (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid references profiles(id) not null,
  log_type    log_type not null,
  lesson_id   uuid references lesson_schedules(id),
  content     text,
  recorded_at timestamptz not null,
  created_at  timestamptz default now()
);

-- ─── 알림 ────────────────────────────────────────────────────

create type notification_type as enum (
  'LESSON_REMINDER',
  'VIDEO_UPLOADED',
  'FEEDBACK_ADDED'
);

create table notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) not null,
  type         notification_type not null,
  reference_id uuid,
  message      text not null,
  is_read      boolean default false,
  created_at   timestamptz default now()
);

create index notifications_user_id_idx on notifications(user_id, is_read);

-- ================================================================
-- Row Level Security (RLS)
-- ================================================================

alter table profiles          enable row level security;
alter table lesson_schedules  enable row level security;
alter table lesson_feedbacks  enable row level security;
alter table videos            enable row level security;
alter table video_comments    enable row level security;
alter table tennis_logs       enable row level security;
alter table notifications     enable row level security;

-- profiles: 본인 조회
create policy "profiles_select_own"
  on profiles for select
  using (auth.uid() = id);

-- profiles: 같은 조직 구성원 조회 (코치가 회원 목록 볼 수 있음)
create policy "profiles_select_same_org"
  on profiles for select
  using (
    organization_id in (
      select organization_id from profiles where id = auth.uid()
    )
  );

-- lesson_schedules: 관련자 (코치, 회원, 대표) 조회
create policy "lessons_select"
  on lesson_schedules for select
  using (
    auth.uid() = coach_id or
    auth.uid() = member_id or
    exists (
      select 1 from profiles
      where id = auth.uid()
        and role = 'OWNER'
        and organization_id = lesson_schedules.organization_id
    )
  );

-- lesson_schedules: 코치/대표만 생성
create policy "lessons_insert"
  on lesson_schedules for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and role in ('OWNER', 'COACH')
    )
  );

-- lesson_schedules: 담당 코치/대표만 수정
create policy "lessons_update"
  on lesson_schedules for update
  using (
    auth.uid() = coach_id or
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'OWNER'
    )
  );

-- lesson_feedbacks: 해당 레슨 관련자만 조회
create policy "feedbacks_select"
  on lesson_feedbacks for select
  using (
    exists (
      select 1 from lesson_schedules
      where id = lesson_feedbacks.lesson_id
        and (coach_id = auth.uid() or member_id = auth.uid())
    )
  );

-- videos: 해당 레슨 관련자만 조회
create policy "videos_select"
  on videos for select
  using (
    exists (
      select 1 from lesson_schedules
      where id = videos.lesson_id
        and (coach_id = auth.uid() or member_id = auth.uid())
    )
  );

-- video_comments: 해당 영상 관련자만 조회
create policy "video_comments_select"
  on video_comments for select
  using (
    exists (
      select 1 from videos v
      join lesson_schedules ls on ls.id = v.lesson_id
      where v.id = video_comments.video_id
        and (ls.coach_id = auth.uid() or ls.member_id = auth.uid())
    )
  );

-- tennis_logs: 본인만 조회
create policy "tennis_logs_select"
  on tennis_logs for select
  using (auth.uid() = member_id);

-- notifications: 본인만 조회
create policy "notifications_select"
  on notifications for select
  using (auth.uid() = user_id);
