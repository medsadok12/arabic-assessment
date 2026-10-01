-- إضافة عمود answers (jsonb) إلى جدول assessments — تفصيل كامل لكل سؤال
-- (نص السؤال، إجابة الطالب، الإجابة الصحيحة، صواب/خطأ، وروابط أي تسجيل صوتي)
-- ليُعرَض في لوحة المعلم (bogga) كبديل تفاعلي كامل عن تقرير PDF. هجرة إضافية
-- بحتة، لا تلمس أي عمود أو صف موجود — آمنة للتشغيل على القاعدة الحيّة.
--
-- الشكل: [{
--   "questionId": "...", "skill": "...", "skillName": "...",
--   "questionText": "...", "studentAnswer": "...", "correctAnswer": "...",
--   "isCorrect": true, "audioUrls": ["https://...blob.vercel-storage.com/..."]
-- }]

ALTER TABLE assessments ADD COLUMN IF NOT EXISTS answers jsonb;

NOTIFY pgrst, 'reload schema';
