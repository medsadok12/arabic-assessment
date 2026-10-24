-- ════════════════════════════════════════════════════════════════
-- صوت قراءة القصص — صوت مستقل لكل صفحة: stories.page_audio
-- page_audio[i] = الرابط العام لصوت الصفحة i (بنفس فهرسة تقسيم المحتوى
-- على <!-- PAGE -->)، أو null لصفحة بلا صوت. الملفات نفسها في Supabase
-- Storage (bucket `media`، مسار `stories/audio/...`).
-- هجرة إضافية بحتة، آمنة لإعادة التشغيل — نُفِّذت على القاعدة الحيّة 2026-10-15.
--
-- ملاحظة: تحلّ محل عمود stories.audio_url (صوت واحد للقصة كاملة) الذي
-- أُضيف واستُبدل في نفس اليوم قبل أي استخدام. العمود القديم فارغ تماماً
-- ولا يقرؤه أي كود؛ محاولة حذفه عبر Supabase MCP تعلّقت (مهلة 60 ثانية
-- دون أي قفل ظاهر)، فتُرك مؤقتاً. لحذفه لاحقاً من لوحة Supabase:
--   ALTER TABLE public.stories DROP COLUMN IF EXISTS audio_url;
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS page_audio jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.stories.page_audio IS
  'روابط صوت قراءة كل صفحة بفهرس الصفحة (media/stories/audio/...) — null = صفحة بلا صوت';

NOTIFY pgrst, 'reload schema';
