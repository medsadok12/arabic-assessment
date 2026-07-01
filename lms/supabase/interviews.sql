-- جدول المقابلات الوظيفية
CREATE TABLE IF NOT EXISTS interviews (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    UUID        NOT NULL REFERENCES recruitment_applications(id) ON DELETE CASCADE,
  interviewer_name  TEXT        NOT NULL,
  interview_date    DATE        NOT NULL,
  start_time        TIME        NOT NULL,
  candidate_response TEXT       NOT NULL DEFAULT 'pending'
    CONSTRAINT valid_response CHECK (
      candidate_response IN ('pending','confirmed','reschedule_requested','rejected')
    ),
  reschedule_reason TEXT,
  response_token    UUID        NOT NULL DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE interviews DISABLE ROW LEVEL SECURITY;

-- فهرس لفحص تعارض المواعيد بسرعة
CREATE INDEX IF NOT EXISTS interviews_slot_idx
  ON interviews (interviewer_name, interview_date, start_time);
