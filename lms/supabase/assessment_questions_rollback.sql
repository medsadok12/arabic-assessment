-- يعكس assessment_questions.sql بالكامل بالترتيب المعاكس. آمن للتشغيل ما لم
-- تُعتمَد بيانات جديدة أُضيفت عبر لوحة bogga بعد الهجرة (عندها سيُفقد ذلك
-- المحتوى) — راجع الأستاذ محمد قبل التشغيل إن كانت اللوحة قيد الاستخدام فعلاً.

DROP TABLE IF EXISTS public.assessment_questions;
DROP TABLE IF EXISTS public.assessment_skills;

NOTIFY pgrst, 'reload schema';
