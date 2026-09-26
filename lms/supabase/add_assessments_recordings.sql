-- إضافة عمود recordings (jsonb) إلى جدول assessments — يحمل روابط
-- التسجيلات الصوتية المرفوعة فعلياً إلى Vercel Blob من أسئلة النطق الثلاثة
-- (speaking/listen-speak/oral-assessment) في تطبيق التقييم. هجرة إضافية
-- بحتة، لا تلمس أي عمود أو صف موجود — آمنة للتشغيل على القاعدة الحيّة.
--
-- الشكل: [{ "questionId": "...", "skill": "...", "urls": ["https://...blob.vercel-storage.com/..."] }]

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS recordings jsonb;

NOTIFY pgrst, 'reload schema';
