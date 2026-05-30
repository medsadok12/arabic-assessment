-- جدول أكواد دعوة المعلمين
-- شغّل هذا في Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS teacher_invitation_codes (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  code       text        NOT NULL UNIQUE,
  is_used    boolean     NOT NULL DEFAULT false,
  used_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at    timestamptz,
  created_at timestamptz DEFAULT now()
);

-- تفعيل RLS (الوصول فقط عبر service role key من الـ API)
ALTER TABLE teacher_invitation_codes ENABLE ROW LEVEL SECURITY;

-- لا يوجد سياسة عامة — يمر الطلب عبر supabase-admin الذي يتجاوز RLS تلقائياً

-- مثال: أضف أكواد جديدة بهذا الأمر
-- INSERT INTO teacher_invitation_codes (code) VALUES
--   ('TEACH-2026-A1'),
--   ('TEACH-2026-B2'),
--   ('TEACH-2026-C3');
