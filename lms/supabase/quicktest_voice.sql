-- ================================================================
-- quicktest_voice_sentences — تقييم "القراءة الجهرية والتسجيل الصوتي"
-- القابل للتعديل الكامل من لوحة bogga
-- ================================================================
-- يحوّل الجمل الأربع الثابتة في الكود (src/quicktest/VoiceReadingAssessment.jsx)
-- إلى محتوى يديره الأستاذ محمد من لوحة bogga (تبويب "إدارة الاختبار
-- الترويجي")، بنفس فلسفة quicktest_alphabet.sql تماماً — جدول مستقل للجمل +
-- أعمدة إعدادات على نفس صف quicktest_settings الوحيد الموجود أصلاً (لا
-- جدول إعدادات جديد).
--
-- قاعدة دائمة (القسم 7.3 من CLAUDE.md): أي تدريب جديد في الاختبار الترويجي
-- يُبنى بتحكم إداري كامل من أول دفعة — هذه الهجرة تطبيق فوري لتلك القاعدة
-- على تدريب بُني في نفس الجلسة بمحتوى ثابت، بدل انتظار طلب متابعة لاحق.
--
-- يعتمد على وجود quicktest_settings مسبقاً (من quicktest_cms.sql) —
-- ALTER TABLE أدناه يفشل صراحة إن لم يكن الجدول موجوداً.
-- ================================================================

-- 1) الجمل
CREATE TABLE IF NOT EXISTS public.quicktest_voice_sentences (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_index   INTEGER      NOT NULL DEFAULT 0,
  sentence_text TEXT         NOT NULL,
  emoji         TEXT         NOT NULL,
  enabled       BOOLEAN      NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quicktest_voice_sentences_order_idx
  ON public.quicktest_voice_sentences (order_index) WHERE enabled = true;

ALTER TABLE public.quicktest_voice_sentences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_anon"          ON public.quicktest_voice_sentences;
DROP POLICY IF EXISTS "deny_direct_authenticated" ON public.quicktest_voice_sentences;
CREATE POLICY "deny_direct_anon"          ON public.quicktest_voice_sentences AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.quicktest_voice_sentences AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 2) إعدادات التمرين — أعمدة إضافية على صف quicktest_settings الوحيد
ALTER TABLE public.quicktest_settings
  ADD COLUMN IF NOT EXISTS voice_enabled  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS voice_title    TEXT    NOT NULL DEFAULT '🎙️ اقرأ هذه الجمل بصوتك',
  ADD COLUMN IF NOT EXISTS voice_subtitle TEXT    NOT NULL DEFAULT 'اضغط "ابدأ التسجيل"، واقرأ كل جملة بصوت عالٍ وواضح. يمكنك الاستماع لصوتك أو حذفه وإعادة التسجيل قبل المتابعة.';

-- 3) بذور — نفس الجمل الأربع الثابتة في الكود حرفياً
INSERT INTO public.quicktest_voice_sentences (order_index, sentence_text, emoji)
SELECT * FROM (VALUES
  (1, 'هَذَا أَبِي',             '👨'),
  (2, 'هَذِهِ أُمِّي',            '👩'),
  (3, 'هَذَا أَخِي',              '👦'),
  (4, 'أَنَا أُحِبُّ مَدْرَسَتِي', '🏫')
) AS seed(order_index, sentence_text, emoji)
WHERE NOT EXISTS (SELECT 1 FROM public.quicktest_voice_sentences);

NOTIFY pgrst, 'reload schema';
