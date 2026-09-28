-- ================================================================
-- quicktest_alphabet — تمرين "التعرف على الحروف الأبجدية" القابل للتعديل
-- ================================================================
-- يحوّل شبكة الحروف الثابتة في الكود (src/quicktest/AlphabetGridAssessment.jsx
-- + ثوابت src/quicktest/blueprint.js) إلى محتوى يديره الأستاذ محمد من لوحة
-- bogga (تبويب "إدارة الاختبار الترويجي")، بنفس فلسفة quicktest_cms.sql
-- تماماً — جدول مستقل للحروف + أعمدة إعدادات على نفس صف quicktest_settings
-- الوحيد الموجود أصلاً (لا جدول إعدادات جديد).
--
-- الفرق عن quicktest_questions عمداً: لا "خيارات" ولا وسائط ولا وسم مهارة —
-- كل صف هو حرف واحد فقط بحالة تفعيل وترتيب، لأن شكل هذا التمرين (شبكة +
-- حالة ثلاثية عند الضغط) لا علاقة له ببنية الأسئلة العادية.
--
-- يعتمد على وجود quicktest_settings مسبقاً (من quicktest_cms.sql) —
-- ALTER TABLE أدناه يفشل صراحة إن لم يكن الجدول موجوداً.
-- ================================================================

-- 1) الحروف
CREATE TABLE IF NOT EXISTS public.quicktest_alphabet_letters (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_index INTEGER      NOT NULL DEFAULT 0,
  letter      TEXT         NOT NULL,
  enabled     BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quicktest_alphabet_letters_order_idx
  ON public.quicktest_alphabet_letters (order_index) WHERE enabled = true;

ALTER TABLE public.quicktest_alphabet_letters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_anon"          ON public.quicktest_alphabet_letters;
DROP POLICY IF EXISTS "deny_direct_authenticated" ON public.quicktest_alphabet_letters;
CREATE POLICY "deny_direct_anon"          ON public.quicktest_alphabet_letters AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.quicktest_alphabet_letters AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 2) إعدادات التمرين — أعمدة إضافية على صف quicktest_settings الوحيد
ALTER TABLE public.quicktest_settings
  ADD COLUMN IF NOT EXISTS alphabet_enabled  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alphabet_title    TEXT    NOT NULL DEFAULT '🔤 هل يعرف طفلك هذه الحروف؟',
  ADD COLUMN IF NOT EXISTS alphabet_subtitle TEXT    NOT NULL DEFAULT 'اطلب من طفلك قراءة كل حرف بصوت عالٍ، ثم اضغط على الحرف حسب إجابته. اضغط مرة أخرى لتغيير التقييم، ومرة ثالثة للعودة للوضع الافتراضي.';

-- 3) بذور — نفس الحروف الـ28 الثابتة في الكود حرفياً (من الألف إلى الياء)
INSERT INTO public.quicktest_alphabet_letters (order_index, letter)
SELECT * FROM (VALUES
  (1,'ا'),(2,'ب'),(3,'ت'),(4,'ث'),(5,'ج'),(6,'ح'),(7,'خ'),(8,'د'),(9,'ذ'),(10,'ر'),
  (11,'ز'),(12,'س'),(13,'ش'),(14,'ص'),(15,'ض'),(16,'ط'),(17,'ظ'),(18,'ع'),(19,'غ'),(20,'ف'),
  (21,'ق'),(22,'ك'),(23,'ل'),(24,'م'),(25,'ن'),(26,'ه'),(27,'و'),(28,'ي')
) AS seed(order_index, letter)
WHERE NOT EXISTS (SELECT 1 FROM public.quicktest_alphabet_letters);

NOTIFY pgrst, 'reload schema';
