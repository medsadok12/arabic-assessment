-- ================================================================
-- rollback لـ quicktest_voice.sql — يحذف جدول الجمل وأعمدة الإعدادات
-- الثلاثة المضافة على quicktest_settings. آمن للتشغيل في أي وقت.
-- ================================================================

DROP TABLE IF EXISTS public.quicktest_voice_sentences;

ALTER TABLE public.quicktest_settings
  DROP COLUMN IF EXISTS voice_enabled,
  DROP COLUMN IF EXISTS voice_title,
  DROP COLUMN IF EXISTS voice_subtitle;

NOTIFY pgrst, 'reload schema';
