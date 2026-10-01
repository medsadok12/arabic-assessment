-- ================================================================
-- rollback لـ quicktest_matching.sql — يحذف جدولَي المطابقة بالكامل.
-- quicktest_matching_pairs يُحذَف أولاً (أو تلقائياً عبر CASCADE من
-- الحذف اللاحق لـquicktest_matching_settings)، لكن نحذفهما بالترتيب
-- الصريح للوضوح. آمن للتشغيل في أي وقت.
-- ================================================================

DROP TABLE IF EXISTS public.quicktest_matching_pairs;
DROP TABLE IF EXISTS public.quicktest_matching_settings;

NOTIFY pgrst, 'reload schema';
