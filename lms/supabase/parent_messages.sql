CREATE TABLE IF NOT EXISTS parent_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_name TEXT NOT NULL,
  student_name TEXT,
  phone       TEXT,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE parent_messages DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
