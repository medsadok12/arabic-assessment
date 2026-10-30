-- ════════════════════════════════════════════════════════════════
-- الحروف الهجائية (/library/huroof) — تعديلات المعلم/الإدارة لكل حرف
-- المحتوى الافتراضي للحروف الـ28 يبقى في الكود (lib/huroof.js → DEFAULT_LETTERS)
-- كنسخة احتياطية؛ هذا الجدول يحفظ ما عُدِّل فقط، صف لكل حرف مُعدَّل:
--   idx              ترتيب الحرف 0..27 (أ = 0 … ي = 27)
--   name/word/emoji/sentence  نص بديل — NULL = الافتراضي
--   image_url        صورة تحل محل الإيموجي (Supabase Storage: media/huroof/)
--   letter_audio_url   صوت نطق الحرف (عند الضغط على بطاقة الحرف)
--   sentence_audio_url صوت الكلمة والجملة (زر «🔊 استمع»)
-- «إعادة الافتراضي» = حذف صف الحرف.
-- كل الوصول عبر مسارات خادم بـ service_role (lms/app/api/huroof/*).
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.huroof_letters (
  idx                smallint PRIMARY KEY CHECK (idx BETWEEN 0 AND 27),
  name               text,
  word               text,
  emoji              text,
  sentence           text,
  image_url          text,
  letter_audio_url   text,
  sentence_audio_url text,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  updated_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.huroof_letters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_anon"          ON public.huroof_letters;
DROP POLICY IF EXISTS "deny_direct_authenticated" ON public.huroof_letters;
CREATE POLICY "deny_direct_anon"          ON public.huroof_letters AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.huroof_letters AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

NOTIFY pgrst, 'reload schema';
