-- ================================================================
-- quicktest_matching — تدريبا "المطابقة" (الثاني والثالث) في الاختبار
-- الترويجي، قابلان للتعديل الكامل من لوحة bogga
-- ================================================================
-- نفس فلسفة quicktest_alphabet.sql تماماً — جدول إعدادات صغير (صفّان
-- ثابتان، واحد لكل تدريب) + جدول أزواج قابل للتعديل، بدل تعديل الكود.
-- MatchingAssessment.jsx (src/quicktest/) عام أصلاً ويقبل pairs/title/
-- subtitle/label كـprops، فلا حاجة لتغييره — فقط مصدر البيانات يتغيّر.
--
-- exercise_key ثابت لكل تدريب ('matching-1' | 'matching-2') ويُستخدَم
-- أيضاً كـquestionId في answers المُرسَلة لـmarketing_leads — لا علاقة له
-- بترتيب ظهور التدريبين (كلاهما يمكن تعطيله بمعزل عن الآخر).
-- ================================================================

-- 1) إعدادات كل تدريب (صفّان ثابتان فقط)
CREATE TABLE IF NOT EXISTS public.quicktest_matching_settings (
  exercise_key TEXT         PRIMARY KEY CHECK (exercise_key IN ('matching-1', 'matching-2')),
  enabled      BOOLEAN      NOT NULL DEFAULT true,
  title        TEXT         NOT NULL,
  subtitle     TEXT         NOT NULL,
  label        TEXT         NOT NULL,
  skill_tag    TEXT         NOT NULL,
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE public.quicktest_matching_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_anon"          ON public.quicktest_matching_settings;
DROP POLICY IF EXISTS "deny_direct_authenticated" ON public.quicktest_matching_settings;
CREATE POLICY "deny_direct_anon"          ON public.quicktest_matching_settings AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.quicktest_matching_settings AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 2) أزواج الصورة/الكلمة لكل تدريب
CREATE TABLE IF NOT EXISTS public.quicktest_matching_pairs (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_key TEXT         NOT NULL REFERENCES public.quicktest_matching_settings(exercise_key) ON DELETE CASCADE,
  order_index  INTEGER      NOT NULL DEFAULT 0,
  emoji        TEXT         NOT NULL,
  word         TEXT         NOT NULL,
  enabled      BOOLEAN      NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quicktest_matching_pairs_order_idx
  ON public.quicktest_matching_pairs (exercise_key, order_index) WHERE enabled = true;

ALTER TABLE public.quicktest_matching_pairs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_anon"          ON public.quicktest_matching_pairs;
DROP POLICY IF EXISTS "deny_direct_authenticated" ON public.quicktest_matching_pairs;
CREATE POLICY "deny_direct_anon"          ON public.quicktest_matching_pairs AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.quicktest_matching_pairs AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 3) بذور — نفس محتوى matchingData.js الحالي حرفياً
INSERT INTO public.quicktest_matching_settings (exercise_key, title, subtitle, label, skill_tag) VALUES
  ('matching-1', '🔗 اربط كل صورة بالكلمة المناسبة',
   'اضغط على الصورة ثم على الكلمة لربطهما، واضغط على أي منهما مرة أخرى لإلغاء الربط وتغيير إجابتك.',
   'التدريب الثاني', 'مطابقة الصور بالكلمات — الاحتياجات اليومية'),
  ('matching-2', '🔗 اربط كل صورة بالكلمة المناسبة',
   'اضغط على الصورة ثم على الكلمة لربطهما، واضغط على أي منهما مرة أخرى لإلغاء الربط وتغيير إجابتك.',
   'التدريب الثالث', 'مطابقة الصور بالكلمات — أشياء من حولي')
ON CONFLICT (exercise_key) DO NOTHING;

INSERT INTO public.quicktest_matching_pairs (exercise_key, order_index, emoji, word)
SELECT * FROM (VALUES
  ('matching-1', 1, '🥛', 'حليب'),
  ('matching-1', 2, '💧', 'ماء'),
  ('matching-1', 3, '🏠', 'بيت'),
  ('matching-1', 4, '🏫', 'مدرسة'),
  ('matching-1', 5, '✏️', 'قلم')
) AS seed(exercise_key, order_index, emoji, word)
WHERE NOT EXISTS (SELECT 1 FROM public.quicktest_matching_pairs WHERE exercise_key = 'matching-1');

INSERT INTO public.quicktest_matching_pairs (exercise_key, order_index, emoji, word)
SELECT * FROM (VALUES
  ('matching-2', 1, '🪑', 'كرسي'),
  ('matching-2', 2, '🐶', 'كلب'),
  ('matching-2', 3, '🐱', 'قط'),
  ('matching-2', 4, '🚪', 'باب'),
  ('matching-2', 5, '👦', 'ولد'),
  ('matching-2', 6, '👧', 'بنت')
) AS seed(exercise_key, order_index, emoji, word)
WHERE NOT EXISTS (SELECT 1 FROM public.quicktest_matching_pairs WHERE exercise_key = 'matching-2');

NOTIFY pgrst, 'reload schema';
