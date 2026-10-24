-- ════════════════════════════════════════════════════════════════
-- رابط مشاركة عام لقصة — stories.share_token
-- يُنشئه المشرف من تبويب القصص في bogga (زر «🔗 رابط مشاركة») فتُفتح القصة
-- على /story/<token> للقراءة والاستماع فقط بلا تسجيل دخول (لا نقاط، لا تتبّع).
-- إلغاء الرابط = NULL. الرمز عشوائي (16 حرفاً) فلا يمكن تخمين قصص أخرى.
-- هجرة إضافية بحتة، آمنة لإعادة التشغيل — نُفِّذت على القاعدة الحيّة 2026-10-15.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS share_token text;

CREATE UNIQUE INDEX IF NOT EXISTS stories_share_token_key
  ON public.stories (share_token) WHERE share_token IS NOT NULL;

COMMENT ON COLUMN public.stories.share_token IS
  'رمز رابط المشاركة العام (/story/<token>) — قراءة فقط بلا تسجيل دخول. NULL = غير مشاركة';

NOTIFY pgrst, 'reload schema';
