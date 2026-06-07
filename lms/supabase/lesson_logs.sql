-- ── كراس الدروس الرقمي ────────────────────────────────────────────────────

-- 1. سجلات الدروس
CREATE TABLE IF NOT EXISTS lesson_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id     UUID NOT NULL,
  teacher_name   TEXT NOT NULL,
  group_name     TEXT NOT NULL,
  lesson_date    DATE NOT NULL,
  lesson_title   TEXT NOT NULL,
  lesson_content TEXT,          -- ما تم تدريسه فعلياً
  homework       TEXT,          -- الواجبات والأنشطة
  future_plan    TEXT,          -- الخطة للحصص القادمة
  status         TEXT NOT NULL DEFAULT 'planned'
    CONSTRAINT lesson_status_check CHECK (status IN ('taught','planned','postponed')),
  teacher_notes  TEXT,          -- ملاحظات المعلم الخاصة
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE lesson_logs DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS lesson_logs_teacher_idx ON lesson_logs (teacher_id, lesson_date);

-- 2. ملاحظات/توجيهات الإدارة والمشرف
CREATE TABLE IF NOT EXISTS lesson_feedback (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_log_id  UUID NOT NULL REFERENCES lesson_logs(id) ON DELETE CASCADE,
  author_id      UUID NOT NULL,
  author_name    TEXT NOT NULL,
  author_role    TEXT NOT NULL,  -- 'admin' | 'super_admin' | 'supervisor'
  content        TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE lesson_feedback DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS lesson_feedback_log_idx ON lesson_feedback (lesson_log_id);

NOTIFY pgrst, 'reload schema';
