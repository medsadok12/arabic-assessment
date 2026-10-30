-- ================================================================
-- marketing_leads — عملاء محتملون من قمع "اختبار تحديد المستوى" التسويقي
-- ================================================================
-- السياق: نقطة دخول عامة جديدة بلا كود مسبق (assessment.aarem.net/?quick=1)
--   تقدّم اختباراً قصيراً (12 سؤالاً) لزائر بارد، وتحجب النتيجة خلف طلب
--   بيانات تواصل ولي الأمر (Lead Capture) — راجع src/quicktest/.
--
-- مقصود أن يكون هذا الجدول منفصلاً تماماً عن assessments/assessment_codes:
--   1) لا يُريد الأستاذ محمد أي ربط بأدوات خارجية — البيانات تبقى في
--      Supabase وتُعرَض مباشرة من bogga (تبويب "العملاء المحتملين").
--   2) اختلاط نتائج القمع التسويقي (اختبار قصير، زوار غير مسجَّلين) مع
--      assessments الحقيقية كان سيُلوِّث تحليلات bogga (تبويب "تحليلات
--      ذكية" المبني على assessments.answers للطلاب الفعليين).
-- ================================================================

CREATE TABLE IF NOT EXISTS marketing_leads (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_name  TEXT         NOT NULL,
  phone        TEXT         NOT NULL,
  email        TEXT,
  child_name   TEXT         NOT NULL,
  child_age    INTEGER,
  score        NUMERIC,
  level        TEXT,
  source       TEXT         NOT NULL DEFAULT 'quick_test',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_leads_created_at_idx ON marketing_leads (created_at DESC);

-- RLS — بنفس نمط family_links/students (القسم 11.5 من CLAUDE.md): الوصول
-- حصراً عبر service_role من مسارات الخادم (POST العام في api/leads،
-- وGET الإداري في api/bogga/leads)، لا وصول مباشر لـanon/authenticated أبداً.
ALTER TABLE marketing_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_direct_anon"          ON public.marketing_leads;
DROP POLICY IF EXISTS "deny_direct_authenticated" ON public.marketing_leads;
CREATE POLICY "deny_direct_anon"          ON public.marketing_leads AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.marketing_leads AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- إعادة تحميل كاش المخطط لطبقة PostgREST فوراً
NOTIFY pgrst, 'reload schema';
