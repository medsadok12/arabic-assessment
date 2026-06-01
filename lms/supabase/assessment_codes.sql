-- ══════════════════════════════════════════════════════════════════
--  أكواد التقييم التشخيصي — شغّل مرة واحدة في Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS assessment_codes (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  code       text        NOT NULL UNIQUE,
  is_used    boolean     NOT NULL DEFAULT false,
  used_at    timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE assessment_codes DISABLE ROW LEVEL SECURITY;
