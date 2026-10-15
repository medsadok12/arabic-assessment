-- ════════════════════════════════════════════════════════════════
-- صوت قراءة القصة — عمود audio_url في جدول stories
-- هجرة إضافية بحتة (عمود NULLABLE جديد)، لا تمسّ أي بيانات قائمة.
-- الملف الصوتي نفسه يُرفع مباشرة من لوحة الإدارة إلى Supabase Storage
-- (bucket `media`، مسار `stories/audio/...`) عبر رابط رفع موقَّع من
-- /api/stories/audio-upload-url، ويُخزَّن هنا رابطه العام فقط.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS audio_url text;

COMMENT ON COLUMN public.stories.audio_url IS
  'رابط عام لتسجيل قراءة القصة في Supabase Storage (media/stories/audio/...) — NULL = لا يوجد صوت';

NOTIFY pgrst, 'reload schema';
