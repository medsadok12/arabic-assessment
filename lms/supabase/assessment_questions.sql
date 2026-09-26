-- بنية CMS التقييم الديناميكي — تحويل بنك أسئلة التقييم (src/data/questions.js
-- في مستودع arabic-assessment) من ملف ثابت إلى جداول Supabase يديرها المعلم
-- عبر لوحة bogga. هجرة إضافية بحتة (لا تلمس أي جدول قائم).
--
-- ملاحظة أمنية مقصودة: خلافاً لـletter_catcher_words (لعبة منخفضة الحساسية)،
-- هذا الجدول يحتوي الإجابات الصحيحة لتقييم فعلي — RLS تُمنَع بالكامل عن
-- anon/authenticated (كالجداول الحساسة في القسم 11.5 من CLAUDE.md)، وكل
-- قراءة (حتى من تطبيق التقييم العام بلا تسجيل دخول) تمر عبر دالة خادم تحمل
-- service_role، تماماً كما تفعل letter_catcher_words اليوم — لا قراءة مباشرة
-- بمفتاح anon تكشف بنك الإجابات لمن يفتح devtools.

CREATE TABLE IF NOT EXISTS public.assessment_skills (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  weight      numeric NOT NULL DEFAULT 1,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all_anon_assessment_skills ON public.assessment_skills;
CREATE POLICY deny_all_anon_assessment_skills ON public.assessment_skills
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

CREATE TABLE IF NOT EXISTS public.assessment_questions (
  id                    text PRIMARY KEY,
  level                 smallint NOT NULL CHECK (level IN (1, 2, 3)),
  skill                 text NOT NULL REFERENCES public.assessment_skills(id),
  -- نوع السؤال كما يستهلكه Assessment.jsx (question.type) — 'mcq' هو
  -- الاصطلاح الداخلي لما كان سابقاً "بلا type" (اختيار من متعدد عادي)؛
  -- طبقة القراءة تحذفه من الاستجابة فلا يتغيّر سلوك العميل إطلاقاً.
  type                  text NOT NULL DEFAULT 'mcq',
  order_index           integer NOT NULL DEFAULT 0,
  -- true = ينتمي لمجموعة تُخلَط عشوائياً وقت التحميل (تكرار سلوك shuffle()
  -- الحالي في buildLevelData)، بعد كل الأسئلة الثابتة الترتيب لنفس المستوى.
  shuffle_within_level  boolean NOT NULL DEFAULT false,
  enabled               boolean NOT NULL DEFAULT true,
  weight                numeric NOT NULL DEFAULT 1,
  -- كل الحقول الخاصة بالنوع (text/options/pairs/items/syllables/words/
  -- lines/audioText/answer/...) — تماماً كما كانت مبعثرة في questions.js،
  -- بلا إعادة تسمية، لتُبعث كما هي (spread) في استجابة API القراءة.
  payload               jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assessment_questions_level_order_idx
  ON public.assessment_questions (level, shuffle_within_level, order_index)
  WHERE enabled = true;

ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all_anon_assessment_questions ON public.assessment_questions;
CREATE POLICY deny_all_anon_assessment_questions ON public.assessment_questions
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

NOTIFY pgrst, 'reload schema';
