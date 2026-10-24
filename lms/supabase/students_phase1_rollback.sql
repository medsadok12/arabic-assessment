-- ================================================================
-- ROLLBACK — يُلغي بالكامل هجرة lms/supabase/students_phase1.sql
-- ================================================================
-- استخدمه فقط إن احتجت التراجع الكامل عن المرحلة 1 (جدول students
--   وكل الأعمدة/الفهارس/السياسات المرتبطة به) وإعادة القاعدة إلى
--   حالتها قبل تشغيل students_phase1.sql تماماً.
--
-- ⚠️ مهم جداً — لا تُشغّل هذا الملف إن كانت أعمدة student_id/
--   student_profile_id قد بدأت تُملأ فعلياً ببيانات حقيقية (بعد أي
--   مرحلة لاحقة تربط الحصص/التقييمات بملفات طلاب فرعية). تشغيله في
--   تلك الحالة سيحذف تلك الروابط نهائياً (DROP COLUMN لا رجعة عنه).
--   في المرحلة 1 وحدها، كل هذه الأعمدة NULL دائماً — فالتراجع هنا آمن
--   100% ولا يفقد أي بيانات حقيقية.
--
-- الترتيب: عكس الهجرة تماماً — الأعمدة المعتمِدة (sessions,
--   assessments, session_support_students, attendance_logs) أولاً،
--   ثم جدول students نفسه أخيراً (لأن الأعمدة تحمل REFERENCES إليه).
-- ================================================================

-- 1) حذف التعليقات التوضيحية على attendance_logs (قبل حذف الأعمدة)
COMMENT ON COLUMN attendance_logs.student_id IS NULL;

-- 2) حذف عمود attendance_logs.student_profile_id (والفهرس المرتبط تلقائياً معه)
ALTER TABLE attendance_logs DROP COLUMN IF EXISTS student_profile_id;

-- 3) حذف أعمدة student_id من الجداول الثلاثة (الفهارس تُحذف تلقائياً مع العمود)
ALTER TABLE session_support_students DROP COLUMN IF EXISTS student_id;
ALTER TABLE assessments              DROP COLUMN IF EXISTS student_id;
ALTER TABLE sessions                 DROP COLUMN IF EXISTS student_id;

-- 4) حذف سياسات RLS وجدول students نفسه
DROP POLICY IF EXISTS "deny_direct_anon"          ON public.students;
DROP POLICY IF EXISTS "deny_direct_authenticated" ON public.students;
DROP TABLE IF EXISTS students;

-- 5) إعادة تحميل كاش المخطط لطبقة PostgREST — بنفس نمط ملف الهجرة نفسه
NOTIFY pgrst, 'reload schema';
