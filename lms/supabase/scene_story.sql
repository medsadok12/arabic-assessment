-- ════════════════════════════════════════════════════════════════
-- «مشهدٌ وحكاية» — نشاط النصوص الأدبية (2026-10-20)
-- يضع المعلم/الإدارة مشهداً (صورة + سؤال + كلمات + عدسات)، ويعبّر الطفل عنه
-- كتابةً أو بصوته أو بصورة لورقته/رسمته، ثم يقيّمه معلمه أو الإدارة.
--
-- scenes            المشاهد — يديرها المعلم (لطلابه) والإدارة (للجميع)
-- scene_responses   ردّ واحد لكل طالب على كل مشهد، قابل للتعديل حتى يُقيَّم
-- student-work      دلو تخزين **خاص**: تسجيلات الأطفال وصورهم لا تُفتح إلا
--                   بروابط موقَّعة مؤقتة لصاحبها ولمعلمه وللإدارة
--
-- هجرة إضافية آمنة لإعادة التشغيل. الوصول عبر مسارات الخادم فقط (service_role).
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.scenes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL,
  image_url        text NOT NULL,
  prompt           text NOT NULL,
  prompt_audio_url text,
  words            jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{ w, gold }]
  tiles            jsonb NOT NULL DEFAULT '[]'::jsonb,   -- بطاقات جملة الصغار (الصف 1–2)
  starters         jsonb NOT NULL DEFAULT '[]'::jsonb,   -- بدايات جمل (الصف 3–4)
  hotspots         jsonb NOT NULL DEFAULT '[]'::jsonb,   -- عدسات المحقّق [{ x, y, q }] بالنسبة المئوية
  what_if          jsonb NOT NULL DEFAULT '[]'::jsonb,   -- بطاقات «ماذا لو؟»
  feeling_q        text,                                  -- «كيف يشعر فهيم؟» — فارغ = بلا وجوه
  modes            jsonb NOT NULL DEFAULT '["write","speak","photo"]'::jsonb,
  band             text NOT NULL DEFAULT 'auto',          -- auto | 1 | 2 | 3
  audience         text NOT NULL DEFAULT 'all',           -- all | mine (طلاب المنشئ)
  is_active        boolean NOT NULL DEFAULT true,
  publish_at       timestamptz NOT NULL DEFAULT now(),
  sort_order       int NOT NULL DEFAULT 0,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scenes_band_check     CHECK (band IN ('auto', '1', '2', '3')),
  CONSTRAINT scenes_audience_check CHECK (audience IN ('all', 'mine'))
);
CREATE INDEX IF NOT EXISTS scenes_live_idx ON public.scenes (is_active, publish_at DESC);

CREATE TABLE IF NOT EXISTS public.scene_responses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id      uuid NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_email text,
  student_name  text,
  student_grade int,
  text          text,
  audio_path    text,
  photo_path    text,
  feeling       text,
  word_count    int NOT NULL DEFAULT 0,
  gold_used     int NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'submitted',   -- submitted | reviewed
  review        jsonb,                               -- { idea, words, order, stickers[], comment }
  reviewed_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scene_responses_status_check CHECK (status IN ('submitted', 'reviewed')),
  CONSTRAINT scene_responses_one_per_scene UNIQUE (scene_id, student_id)
);
CREATE INDEX IF NOT EXISTS scene_responses_inbox_idx ON public.scene_responses (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS scene_responses_email_idx ON public.scene_responses (student_email);

ALTER TABLE public.scenes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scene_responses ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['scenes', 'scene_responses'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = 'deny_direct_anon') THEN
      EXECUTE format('CREATE POLICY "deny_direct_anon" ON public.%I AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false)', t);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = 'deny_direct_authenticated') THEN
      EXECUTE format('CREATE POLICY "deny_direct_authenticated" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false)', t);
    END IF;
  END LOOP;
END $$;

-- دلو خاص لعمل الطلاب: 10MB للملف، صور وصوت فقط. بلا سياسات = لا وصول إلا لمفتاح الخادم
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('student-work', 'student-work', false, 10485760,
        ARRAY['image/webp', 'image/jpeg', 'image/png',
              'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/webm', 'audio/ogg'])
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- 2026-10-21 «💡 بطاقات المساعدة» (طلب الأستاذ محمد): أفكار يكتبها المعلم
-- تُعرض للطفل كما هي ولا تُلمس. تحلّ محل سلّة الكلمات (words) وبطاقات الجملة
-- (tiles) وبدايات الجمل (starters) — وهي و what_if أعمدة مهجورة باقية للتوافق.
-- تعبئة لمرة واحدة: ما كتبه المعلم في الأعمدة القديمة يُنقل بترتيبه بلا تكرار.
-- ════════════════════════════════════════════════════════════════
ALTER TABLE public.scenes ADD COLUMN IF NOT EXISTS help_cards jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.scenes s SET help_cards = COALESCE((
  SELECT jsonb_agg(card ORDER BY first_pos) FROM (
    SELECT card, min(pos) AS first_pos FROM (
      SELECT btrim(w->>'w') AS card, ord AS pos FROM jsonb_array_elements(s.words) WITH ORDINALITY AS t(w, ord)
      UNION ALL SELECT btrim(x), 100 + ord FROM jsonb_array_elements_text(s.tiles) WITH ORDINALITY AS t(x, ord)
      UNION ALL SELECT btrim(x), 200 + ord FROM jsonb_array_elements_text(s.starters) WITH ORDINALITY AS t(x, ord)
    ) all_cards
    WHERE coalesce(card, '') <> ''
    GROUP BY card
    ORDER BY first_pos
    LIMIT 8
  ) uniq
), '[]'::jsonb)
WHERE s.help_cards = '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
