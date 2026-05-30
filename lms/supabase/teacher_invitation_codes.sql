-- ══════════════════════════════════════════════════════════════════
--  إعداد جدول أكواد تفعيل المعلمين
--  شغّل هذا الكود مرة واحدة في Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- 1. إنشاء الجدول إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS teacher_invitation_codes (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  code       text        NOT NULL UNIQUE,
  is_used    boolean     NOT NULL DEFAULT false,
  used_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at    timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 2. تعطيل RLS حتى يستطيع السيرفر الحفظ والقراءة مباشرة
--    (الجدول لا يحتوي على بيانات حساسة — فقط أكواد عشوائية)
ALTER TABLE teacher_invitation_codes DISABLE ROW LEVEL SECURITY;
