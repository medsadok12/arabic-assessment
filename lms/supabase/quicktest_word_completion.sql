-- ================================================================
-- quicktest_word_completion_items — تدريب "إكمال الكلمة الناقصة"
-- القابل للتعديل الكامل من لوحة bogga من أول دفعة (القسم 7.3 من CLAUDE.md)
-- ================================================================
-- يوسّع سؤال "اختر الحرف الناقص" الفردي (شمس، skill_tag='تهجئة') الذي كان
-- ضمن بنك الـ15 سؤالاً العادي، إلى تدريب مستقل من عدة كلمات — بطلب صريح
-- من الأستاذ محمد. السؤال الأصلي يُحذَف من quicktest_questions (لا تكرار
-- محتوى)، ويُستبدَل بهذا التدريب الأغنى.
--
-- تصميم الحرف الناقص: word_text هو الكلمة الكاملة الصحيحة، missing_index
-- موضع الحرف الناقص فيها (0-based). الخيارات الخاطئة فقط تُخزَّن
-- (distractor_options، عنصران) — الحرف الصحيح يُشتَق دائماً من
-- word_text[missing_index] عند العرض (لا يُخزَّن مكرراً، فلا يمكن لخطأ
-- إدخال إداري أن يُسقِط الحرف الصحيح من الخيارات بالخطأ).
-- ================================================================

-- 1) عناصر التدريب
CREATE TABLE IF NOT EXISTS public.quicktest_word_completion_items (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_index        INTEGER      NOT NULL DEFAULT 0,
  word_text          TEXT         NOT NULL,
  missing_index      INTEGER      NOT NULL,
  distractor_options JSONB        NOT NULL DEFAULT '[]'::jsonb,
  emoji              TEXT         NOT NULL,
  image_url          TEXT,
  enabled            BOOLEAN      NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quicktest_word_completion_items_order_idx
  ON public.quicktest_word_completion_items (order_index) WHERE enabled = true;

ALTER TABLE public.quicktest_word_completion_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_anon"          ON public.quicktest_word_completion_items;
DROP POLICY IF EXISTS "deny_direct_authenticated" ON public.quicktest_word_completion_items;
CREATE POLICY "deny_direct_anon"          ON public.quicktest_word_completion_items AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.quicktest_word_completion_items AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 2) إعدادات التدريب — أعمدة إضافية على صف quicktest_settings الوحيد
ALTER TABLE public.quicktest_settings
  ADD COLUMN IF NOT EXISTS word_completion_enabled  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS word_completion_title    TEXT    NOT NULL DEFAULT '🔤 أكمل الكلمة الناقصة',
  ADD COLUMN IF NOT EXISTS word_completion_subtitle TEXT    NOT NULL DEFAULT 'انظر إلى الصورة، واختر الحرف الناقص لتكتمل الكلمة بشكل صحيح.';

-- 3) بذور — الكلمات الثلاث المطلوبة (شمس/طاولة/سيارة)
INSERT INTO public.quicktest_word_completion_items (order_index, word_text, missing_index, distractor_options, emoji)
SELECT * FROM (VALUES
  (1, 'شمس',   1, '["ر","ل"]'::jsonb, '☀️'),
  (2, 'طاولة', 2, '["ب","س"]'::jsonb, '🪑'),
  (3, 'سيارة', 3, '["ن","ت"]'::jsonb, '🚗')
) AS seed(order_index, word_text, missing_index, distractor_options, emoji)
WHERE NOT EXISTS (SELECT 1 FROM public.quicktest_word_completion_items);

-- 4) حذف السؤال الأصلي المفرد من بنك الـ15 (استُبدل بهذا التدريب الأغنى)
DELETE FROM public.quicktest_questions WHERE id = 'aa138ce6-34d9-425a-95b9-b6abc7da6bb3';

NOTIFY pgrst, 'reload schema';
