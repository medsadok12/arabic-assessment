-- ════════════════════════════════════════════════════════════════
-- تحدّي «الحروف الهجائية» (2026-10-25): بطاقات مغلقة مخلوطة، لغز فهيم لكل حرف،
-- والطفل يكتب الكلمة صحيحة إملاءً ليكشف الحرف ويصعد فهيم محطة في مساره (28 محطة).
--
-- 1) huroof_letters — حقول اللغز والإملاء التي يعدّلها المعلم/المدير (NULL = الافتراضي في lib/huroof.js):
--      riddle           نص اللغز («ملك الغابة وصوتي زئير، من أنا؟»)
--      riddle_audio_url تسجيل المعلم للغز (media/huroof/) — لا صوت آلي في هذا التدريب
--      answer           الكلمة المطلوبة إملاءً (بلا تشكيل؛ الافتراضي من كلمة البطاقة)
--      accept           jsonb: إجابات أخرى مقبولة ["قط"] — [] = لا شيء غير الإجابة
--      spell_rules      jsonb: قواعد المعلم [{"wrong":"هرة","msg":"..."}]
-- 2) huroof_progress — الحروف التي حلّها كل طالب في الجولة الحالية (epoch من game_settings 'huroof').
--      «إعادة ضبط مسار الجميع» تزيد الجولة؛ «إعادة ضبط طالب» تحذف صفوفه في الجولة.
-- كل الوصول عبر مسارات خادم بـ service_role (lms/app/api/huroof/*) — RLS يمنع الوصول المباشر.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.huroof_letters ADD COLUMN IF NOT EXISTS riddle           text;
ALTER TABLE public.huroof_letters ADD COLUMN IF NOT EXISTS riddle_audio_url text;
ALTER TABLE public.huroof_letters ADD COLUMN IF NOT EXISTS answer           text;
ALTER TABLE public.huroof_letters ADD COLUMN IF NOT EXISTS accept           jsonb;
ALTER TABLE public.huroof_letters ADD COLUMN IF NOT EXISTS spell_rules      jsonb;

CREATE TABLE IF NOT EXISTS public.huroof_progress (
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  epoch        integer     NOT NULL DEFAULT 0,
  idx          smallint    NOT NULL CHECK (idx BETWEEN 0 AND 27),
  attempts     smallint    NOT NULL DEFAULT 0,
  hints        smallint    NOT NULL DEFAULT 0,
  student_name text,
  solved_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, epoch, idx)
);
CREATE INDEX IF NOT EXISTS huroof_progress_epoch_idx ON public.huroof_progress (epoch, solved_at DESC);

ALTER TABLE public.huroof_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deny_direct_anon"          ON public.huroof_progress;
DROP POLICY IF EXISTS "deny_direct_authenticated" ON public.huroof_progress;
CREATE POLICY "deny_direct_anon"          ON public.huroof_progress AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.huroof_progress AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

NOTIFY pgrst, 'reload schema';
