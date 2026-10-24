-- ════════════════════════════════════════════════════════════════
-- قصة الصفحة الرئيسية — stories.featured_home
-- المشرف يختار صراحةً القصة التي تظهر في «معاينة من داخل المنصة» على aarem.net
-- (زر «🏠 اعرضها في الصفحة الرئيسية» في تبويب القصص بـbogga). كانت القصة تُختار
-- ضمنياً: أحدث قصة مشارَكة عُدِّلت — فأي تعديل على قصة أخرى كان يبدّلها وحده.
-- قصة واحدة على الأكثر (فهرس فريد جزئي). بلا اختيار: يبقى السلوك القديم.
-- هجرة إضافية بحتة، آمنة لإعادة التشغيل — نُفِّذت على القاعدة الحيّة 2026-10-17.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS featured_home boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS stories_one_featured_home
  ON public.stories (featured_home) WHERE featured_home;

COMMENT ON COLUMN public.stories.featured_home IS
  'القصة المعروضة في الصفحة الرئيسية (قصة واحدة على الأكثر) — تحتاج رابط مشاركة وصفحة أولى بنص وصوت';

NOTIFY pgrst, 'reload schema';
