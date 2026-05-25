-- lesson_feedbacks: 작성자 구분 (코치/회원 모두 댓글 가능)
ALTER TABLE lesson_feedbacks
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES profiles(id);

UPDATE lesson_feedbacks SET author_id = coach_id WHERE author_id IS NULL;
