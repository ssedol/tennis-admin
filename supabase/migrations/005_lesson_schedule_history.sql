-- ================================================================
-- 레슨 추가·삭제 이력
-- ================================================================

create type lesson_history_action as enum ('CREATED', 'DELETED');

create table lesson_schedule_history (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) not null,
  lesson_id       uuid not null,
  action          lesson_history_action not null,
  actor_id        uuid references profiles(id),
  coach_id        uuid references profiles(id) not null,
  member_id       uuid references profiles(id) not null,
  court_id        uuid references courts(id),
  scheduled_at    timestamptz not null,
  duration_min    int not null,
  status          lesson_status not null,
  created_at      timestamptz default now()
);

create index lesson_schedule_history_org_idx
  on lesson_schedule_history(organization_id, created_at desc);

create index lesson_schedule_history_lesson_idx
  on lesson_schedule_history(lesson_id);

alter table lesson_schedule_history enable row level security;

-- 같은 조직 대표만 이력 조회
create policy "lesson_history_select"
  on lesson_schedule_history for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and role = 'OWNER'
        and organization_id = lesson_schedule_history.organization_id
    )
  );
