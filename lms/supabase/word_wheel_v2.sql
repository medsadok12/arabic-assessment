-- ════════════════════════════════════════════════════════════════
-- عجلة الكلمات v2 — أنماط لعب ثلاثة + بطاقات تعلّم + تحكم إداري كامل (2026-10-17)
--
-- 1) word_wheel_words: بنك الكلمات = «بطاقة التعلّم» التي تظهر للطفل عند اكتشاف
--    الكلمة في أي عجلة وأي نمط: الكلمة مشكولة، صورة، نطق صوتي، شرح مبسّط، تلميح.
--    word = الكلمة بلا تشكيل (مفتاح المطابقة مع كلمات العجلات).
-- 2) word_wheel_configs (موجود): صار مصدر كل العجلات بكل الأنماط:
--    mode       picture  = المبتدئ: اكتشف الكلمة من الصورة
--               complete = المتوسط: أكمل الكلمة الناقصة (حرف مخفي أو تلميح نصي)
--               challenge = المتقدم: التحدي المفتوح (الحرف الأوسط إلزامي + مؤقت)
--    level      مرحلة التحدي 1..4 (مبتدئ/متوسط/متقدم/أسطوري) — ترتيب وتجميع
--    sort_order ترتيب العجلة داخل نمطها/مرحلتها
--    theme      ألوان العجلة لهذه العجلة فقط — NULL = المظهر العام
--    settings   إعدادات المساعدة لهذه العجلة فقط — NULL = الإعدادات العامة
--    valid_words مصفوفة كلمات (نصوص) — الصيغة القديمة [{word,image}] ما زالت مقروءة
--    is_active  ظاهرة للطلاب أم مخفية
-- 3) الإعدادات والمظهر العامّان: game_settings صف game_id = 'word-wheel'.
--
-- هجرة إضافية بحتة (لا حذف لأي شيء)، آمنة لإعادة التشغيل.
-- كل الوصول عبر مسارات خادم بـ service_role (lms/app/api/word-wheel/*).
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.word_wheel_words (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word        text NOT NULL,
  vocalized   text,
  emoji       text,
  image_url   text,
  audio_url   text,
  definition  text,
  hint        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS word_wheel_words_word_key ON public.word_wheel_words (word);

ALTER TABLE public.word_wheel_words ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'word_wheel_words' AND policyname = 'deny_direct_anon') THEN
    CREATE POLICY "deny_direct_anon" ON public.word_wheel_words AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'word_wheel_words' AND policyname = 'deny_direct_authenticated') THEN
    CREATE POLICY "deny_direct_authenticated" ON public.word_wheel_words AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;

ALTER TABLE public.word_wheel_configs
  ADD COLUMN IF NOT EXISTS mode       text NOT NULL DEFAULT 'challenge',
  ADD COLUMN IF NOT EXISTS level      int  NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS sort_order int  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS theme      jsonb,
  ADD COLUMN IF NOT EXISTS settings   jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$ BEGIN
  ALTER TABLE public.word_wheel_configs ADD CONSTRAINT word_wheel_configs_mode_check
    CHECK (mode IN ('picture', 'complete', 'challenge'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.word_wheel_configs ADD CONSTRAINT word_wheel_configs_level_check
    CHECK (level BETWEEN 1 AND 4);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS word_wheel_configs_mode_order_idx
  ON public.word_wheel_configs (mode, level, sort_order);

NOTIFY pgrst, 'reload schema';
