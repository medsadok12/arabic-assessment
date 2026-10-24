-- ================================================================
-- rollback لـ quicktest_cms.sql — يحذف الجداول الثلاثة بالكامل مع كل
-- صفوفها. آمن للتشغيل في أي وقت (لا جدول آخر يعتمد عليها عبر REFERENCES).
-- ================================================================

DROP TABLE IF EXISTS public.quicktest_questions;
DROP TABLE IF EXISTS public.quicktest_levels;
DROP TABLE IF EXISTS public.quicktest_settings;

NOTIFY pgrst, 'reload schema';
