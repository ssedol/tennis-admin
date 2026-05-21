-- ================================================================
-- 코트 관리 스키마
-- Supabase SQL Editor에서 실행
-- ================================================================

-- ─── 코트 테이블 ──────────────────────────────────────────────
create type court_type    as enum ('INDOOR', 'OUTDOOR');
create type court_surface as enum ('HARD', 'CLAY', 'GRASS', 'ARTIFICIAL_TURF');

create table courts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  name            text not null,                          -- 코트 A, 1번 코트 등
  court_type      court_type    not null default 'OUTDOOR',
  surface         court_surface not null default 'HARD',
  is_active       boolean default true,
  sort_order      int  default 0,
  created_at      timestamptz default now()
);

create index courts_org_idx on courts(organization_id);

-- ─── lesson_schedules에 court_id 추가 ─────────────────────────
alter table lesson_schedules
  add column court_id uuid references courts(id);

-- ─── 코트 예약 (레슨 외 — 동호회, 네이버 예약 등) ─────────────
create type reservation_type as enum ('LESSON', 'CLUB', 'EXTERNAL', 'BLOCK');

create table court_reservations (
  id              uuid primary key default gen_random_uuid(),
  court_id        uuid references courts(id) on delete cascade not null,
  organization_id uuid references organizations(id) not null,
  type            reservation_type not null default 'EXTERNAL',
  title           text not null,            -- 예: '동호회 정기 모임', '네이버 예약'
  reserver_name   text,
  start_at        timestamptz not null,
  end_at          timestamptz not null,
  note            text,
  created_at      timestamptz default now(),
  check (end_at > start_at)
);

create index court_reservations_court_idx on court_reservations(court_id);
create index court_reservations_time_idx  on court_reservations(start_at, end_at);

-- ─── RLS ─────────────────────────────────────────────────────
alter table courts             enable row level security;
alter table court_reservations enable row level security;

create policy "courts_select"
  on courts for select
  using (organization_id = get_my_org_id());

create policy "courts_insert"
  on courts for insert
  with check (organization_id = get_my_org_id());

create policy "courts_update"
  on courts for update
  using (organization_id = get_my_org_id());

create policy "court_reservations_select"
  on court_reservations for select
  using (organization_id = get_my_org_id());

create policy "court_reservations_all"
  on court_reservations for all
  using (organization_id = get_my_org_id());

-- ─── 초기 샘플 데이터 (선택) ─────────────────────────────────
-- INSERT INTO courts (organization_id, name, court_type, surface, sort_order)
-- VALUES
--   ('00000000-0000-0000-0000-000000000001', '코트 A', 'OUTDOOR', 'HARD', 1),
--   ('00000000-0000-0000-0000-000000000001', '코트 B', 'OUTDOOR', 'CLAY', 2),
--   ('00000000-0000-0000-0000-000000000001', '실내 코트', 'INDOOR', 'HARD', 3);
