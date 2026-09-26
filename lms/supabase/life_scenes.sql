-- جدول مشاهد الحياة التفاعلية
CREATE TABLE IF NOT EXISTS life_scenes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   UUID        NOT NULL,
  teacher_name TEXT,
  situation    TEXT        NOT NULL,
  grade        TEXT        NOT NULL,
  skill        TEXT        NOT NULL,
  dialogue     JSONB       NOT NULL DEFAULT '[]',
  is_published BOOLEAN     NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE life_scenes DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS life_scenes_pub_idx      ON life_scenes (is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS life_scenes_teacher_idx  ON life_scenes (teacher_id, created_at DESC);

NOTIFY pgrst, 'reload schema';
