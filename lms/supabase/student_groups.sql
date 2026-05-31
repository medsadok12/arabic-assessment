-- ══════════════════════════════════════════════════════════════════
--  إعداد نظام المجموعات
--  شغّل هذا الكود مرة واحدة في Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- 1. جدول المجموعات
CREATE TABLE IF NOT EXISTS student_groups (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE student_groups DISABLE ROW LEVEL SECURITY;

-- 2. جدول تعيين الطلاب للمجموعات
CREATE TABLE IF NOT EXISTS student_group_assignments (
  user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  group_id   uuid        REFERENCES student_groups(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE student_group_assignments DISABLE ROW LEVEL SECURITY;
