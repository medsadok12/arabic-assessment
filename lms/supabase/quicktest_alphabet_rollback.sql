-- ================================================================
-- rollback لـ quicktest_alphabet.sql — يحذف جدول الحروف وأعمدة الإعدادات
-- الثلاثة المضافة على quicktest_settings. آمن للتشغيل في أي وقت.
-- ================================================================

DROP TABLE IF EXISTS public.quicktest_alphabet_letters;

ALTER TABLE public.quicktest_settings
  DROP COLUMN IF EXISTS alphabet_enabled,
  DROP COLUMN IF EXISTS alphabet_title,
  DROP COLUMN IF EXISTS alphabet_subtitle;

NOTIFY pgrst, 'reload schema';
