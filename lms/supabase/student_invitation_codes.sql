-- ══════════════════════════════════════════════════════════════════
--  إعداد جدول أكواد تفعيل الطلاب
--  شغّل هذا الكود مرة واحدة في Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS student_invitation_codes (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  code       text        NOT NULL UNIQUE,
  is_used    boolean     NOT NULL DEFAULT false,
  used_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at    timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE student_invitation_codes DISABLE ROW LEVEL SECURITY;
