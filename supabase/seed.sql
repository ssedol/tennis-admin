-- ================================================================
-- 테스트 시드 데이터
-- Supabase SQL Editor에서 전체 복사 후 Run
-- ================================================================

-- ─── 1. 조직 ──────────────────────────────────────────────────
INSERT INTO organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', '강남 테니스 아카데미')
ON CONFLICT (id) DO NOTHING;

-- ─── 2. Auth 계정 생성 ────────────────────────────────────────
-- 공통 비밀번호: tennis1234
-- 로그인: 이메일 + 비밀번호 입력

INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, confirmation_token, recovery_token,
  email_change_token_new, email_change
) VALUES
  -- 대표
  (
    'a0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'owner@tennis.test', crypt('tennis1234', gen_salt('bf', 10)),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"김철수","role":"OWNER","organization_id":"00000000-0000-0000-0000-000000000001"}',
    false, '', '', '', ''
  ),
  -- 코치 1
  (
    'a0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'coach1@tennis.test', crypt('tennis1234', gen_salt('bf', 10)),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"김민준","role":"COACH","organization_id":"00000000-0000-0000-0000-000000000001"}',
    false, '', '', '', ''
  ),
  -- 코치 2
  (
    'a0000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'coach2@tennis.test', crypt('tennis1234', gen_salt('bf', 10)),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"박서연","role":"COACH","organization_id":"00000000-0000-0000-0000-000000000001"}',
    false, '', '', '', ''
  ),
  -- 회원 1
  (
    'a0000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'member1@tennis.test', crypt('tennis1234', gen_salt('bf', 10)),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"이수진","role":"MEMBER","organization_id":"00000000-0000-0000-0000-000000000001"}',
    false, '', '', '', ''
  ),
  -- 회원 2
  (
    'a0000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'member2@tennis.test', crypt('tennis1234', gen_salt('bf', 10)),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"박준영","role":"MEMBER","organization_id":"00000000-0000-0000-0000-000000000001"}',
    false, '', '', '', ''
  ),
  -- 회원 3
  (
    'a0000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'member3@tennis.test', crypt('tennis1234', gen_salt('bf', 10)),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"최민서","role":"MEMBER","organization_id":"00000000-0000-0000-0000-000000000001"}',
    false, '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

-- ─── 3. 프로필 ────────────────────────────────────────────────
INSERT INTO profiles (id, name, phone, role, organization_id) VALUES
  ('a0000000-0000-0000-0000-000000000001', '김철수', '010-1111-0001', 'OWNER',  '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000002', '김민준', '010-2222-0002', 'COACH',  '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000003', '박서연', '010-3333-0003', 'COACH',  '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000004', '이수진', '010-4444-0004', 'MEMBER', '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000005', '박준영', '010-5555-0005', 'MEMBER', '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000006', '최민서', '010-6666-0006', 'MEMBER', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ─── 4. 레슨 일정 ─────────────────────────────────────────────
INSERT INTO lesson_schedules (id, organization_id, coach_id, member_id, scheduled_at, duration_min, status, started_at, completed_at) VALUES
  -- 완료된 레슨
  (
    'b0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000004',
    now() - interval '2 days' + interval '10 hours',
    60, 'COMPLETED',
    now() - interval '2 days' + interval '10 hours',
    now() - interval '2 days' + interval '11 hours'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000005',
    now() - interval '1 day' + interval '11 hours',
    60, 'COMPLETED',
    now() - interval '1 day' + interval '11 hours',
    now() - interval '1 day' + interval '12 hours'
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000006',
    now() - interval '1 day' + interval '14 hours',
    60, 'COMPLETED',
    now() - interval '1 day' + interval '14 hours',
    now() - interval '1 day' + interval '15 hours'
  ),
  -- 오늘 예정 레슨
  (
    'b0000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000004',
    date_trunc('day', now()) + interval '10 hours',
    60, 'SCHEDULED', null, null
  ),
  (
    'b0000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000005',
    date_trunc('day', now()) + interval '11 hours',
    60, 'SCHEDULED', null, null
  ),
  (
    'b0000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000006',
    date_trunc('day', now()) + interval '14 hours',
    60, 'SCHEDULED', null, null
  ),
  -- 내일 예정 레슨
  (
    'b0000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000004',
    date_trunc('day', now()) + interval '1 day' + interval '10 hours',
    60, 'SCHEDULED', null, null
  )
ON CONFLICT (id) DO NOTHING;

-- ─── 5. 레슨 피드백 ───────────────────────────────────────────
INSERT INTO lesson_feedbacks (lesson_id, coach_id, content) VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    '오늘 백핸드 폼이 많이 개선됐습니다. 팔꿈치 높이를 의식하면서 연습해오세요. 서비스 토스가 아직 불안정하니 매일 10분씩 반복 연습 권장합니다.'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000002',
    '체중 이동이 좋아졌습니다. 다음 레슨에서 네트 플레이 연습을 시작할게요.'
  )
ON CONFLICT DO NOTHING;

-- ─── 6. 테니스 일지 ───────────────────────────────────────────
INSERT INTO tennis_logs (member_id, log_type, lesson_id, content, recorded_at) VALUES
  (
    'a0000000-0000-0000-0000-000000000004',
    'LESSON',
    'b0000000-0000-0000-0000-000000000001',
    '백핸드 집중 레슨. 팔꿈치 교정 중. 코치님 피드백 참고해서 연습해야겠다.',
    now() - interval '2 days'
  ),
  (
    'a0000000-0000-0000-0000-000000000004',
    'PRACTICE',
    null,
    '서비스 토스 30분 반복. 점점 안정되는 느낌.',
    now() - interval '1 day'
  ),
  (
    'a0000000-0000-0000-0000-000000000004',
    'MATCH',
    null,
    '클럽 내부 대회 6-4 승. 백핸드 실수가 아직 많음. 더 집중해야겠다.',
    now() - interval '3 days'
  )
ON CONFLICT DO NOTHING;

-- ─── 확인 쿼리 ────────────────────────────────────────────────
SELECT '조직' as 테이블, count(*)::text as 건수 FROM organizations
UNION ALL SELECT '프로필', count(*)::text FROM profiles
UNION ALL SELECT '레슨 일정', count(*)::text FROM lesson_schedules
UNION ALL SELECT '레슨 피드백', count(*)::text FROM lesson_feedbacks
UNION ALL SELECT '테니스 일지', count(*)::text FROM tennis_logs;
