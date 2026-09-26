-- ── فضاء المعلمين ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS teacher_space_posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   UUID NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  content     TEXT,
  media_type  TEXT CHECK (media_type IN ('image','audio')),
  media_data  TEXT,   -- base64 encoded
  media_mime  TEXT,
  likes       JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE teacher_space_posts DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS tsp_created_idx ON teacher_space_posts (created_at DESC);

CREATE TABLE IF NOT EXISTS teacher_space_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES teacher_space_posts(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE teacher_space_comments DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS tsc_post_idx ON teacher_space_comments (post_id, created_at);

NOTIFY pgrst, 'reload schema';
