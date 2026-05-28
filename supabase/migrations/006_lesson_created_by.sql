-- 레슨 등록자 (삭제 권한: 코치는 본인이 등록한 레슨만)
alter table lesson_schedules
  add column created_by uuid references profiles(id);

update lesson_schedules
set created_by = coach_id
where created_by is null;

alter table lesson_schedules
  alter column created_by set not null;

create index lesson_schedules_created_by_idx on lesson_schedules(created_by);
