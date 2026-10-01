-- ================================================================
-- family_linking — الربط بين التقييمات المجانية والطلاب المسجَّلين،
-- وربط الإخوة عائلياً عبر أكواد موجودة أصلاً في النظام
-- ================================================================
-- الفكرة المعتمدة: إعادة استخدام نظام الأكواد الإدارية الحالي بدل
--   اختراع كود جديد —
--   • assessment_codes (بوابة عبور التقييم المجاني الموجودة أصلاً)
--     يُصبح هو نفسه "الكود المرجعي" (PNR) بإضافة عمود ربط واحد فقط.
--   • students.family_code (حقل جديد فعلاً — تحقّقنا أن لا كود حالي
--     يصلح لهذا الدور؛ كود الطالب المدفوع أحادي الاستخدام وينتهي
--     للأبد بعد التسجيل، فلا يصلح كمعرّف عائلة دائم قابل للمشاركة).
--
-- ⚠️ اعتماد صريح (Dependency): هذا الملف يفترض أن جدول `students` من
--   lms/supabase/students_phase1.sql **نُفِّذ بنجاح مسبقاً** على نفس
--   القاعدة. إن لم يُشغَّل بعد، ستفشل عبارات REFERENCES students(id)
--   أدناه بخطأ "relation students does not exist". تحقّق أولاً:
--
--   SELECT 1 FROM information_schema.tables
--   WHERE table_schema='public' AND table_name='students';
--
--   إن لم يُرجع صفاً — شغّل students_phase1.sql أولاً، ثم عد لهذا الملف.
--
-- ⚠️ نفس تحذير الهجرة السابقة: عبارات CREATE POLICY لا تدعم
--   IF NOT EXISTS في PostgreSQL — لا تُعِد تشغيل هذا الملف من البداية
--   بعد أي فشل جزئي دون مراجعة Claude Code أولاً.
-- ================================================================

-- 1) ربط أكواد التقييم الموجودة أصلاً بصف التقييم الذي أنتجته فعلياً
--    (الفجوة المكتشفة: الكود كان بوابة عبور صرفة بلا أي أثر لاحق).
--    NULLABLE لأن الكود يُستهلَك أولاً (بوابة الدخول) والربط يحدث لاحقاً
--    عند نجاح حفظ نتيجة التقييم — لا قيمة افتراضية، إضافة بحتة صفر
--    تأثير رجعي على الصفوف الحالية.
ALTER TABLE assessment_codes
  ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS assessment_codes_assessment_id_idx ON assessment_codes (assessment_id);

-- 2) كود عائلي دائم لكل طالب مسجَّل — يُولَّد تطبيقياً عند إنشاء صف
--    الطالب (لا افتراضياً هنا)، يُعرَض من لوحة الطالب لمشاركته مع
--    الإخوة لاحقاً في أي وقت (بخلاف كود التسجيل المدفوع، هذا لا يُستهلَك
--    ولا ينتهي أبداً).
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS family_code TEXT UNIQUE;

-- 3) جدول الربط العائلي — يسجّل فقط روابط مؤكَّدة صراحة (عبر كود تقييم
--    أو كود عائلة أُدخِل فعلياً من طرف مستخدم)، لا أي استنتاج تلقائي.
--    العلاقة غير موجَّهة منطقياً (صف واحد يكفي للربط بين طرفين)؛ أي
--    استعلام يبحث عن روابط طالب معيّن يجب أن يفحص العمودين معاً
--    (student_id = X OR linked_student_id = X).
CREATE TABLE IF NOT EXISTS family_links (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  linked_student_id UUID         NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  link_source       TEXT         NOT NULL CHECK (link_source IN ('assessment_codes', 'family_code')),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT family_links_no_self_link CHECK (student_id <> linked_student_id),
  UNIQUE (student_id, linked_student_id)
);

CREATE INDEX IF NOT EXISTS family_links_student_idx         ON family_links (student_id);
CREATE INDEX IF NOT EXISTS family_links_linked_student_idx  ON family_links (linked_student_id);

-- RLS — بنفس نمط جدول students في المرحلة 1 (مبني صحيحاً من البداية،
-- بخلاف جداول الأكواد القديمة الثلاثة الموثَّقة كدين تقني في القسم 14
-- من CLAUDE.md — لا علاقة لهذا الجدول الجديد بتلك الثغرة).
ALTER TABLE family_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_direct_anon"          ON public.family_links;
DROP POLICY IF EXISTS "deny_direct_authenticated" ON public.family_links;
CREATE POLICY "deny_direct_anon"          ON public.family_links AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.family_links AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 4) إعادة تحميل كاش المخطط لطبقة PostgREST فوراً
NOTIFY pgrst, 'reload schema';

-- ================================================================
-- ملاحظات صريحة (لا تنفيذ الآن — خارج نطاق هذا الملف):
--
-- • عمود used_by في student_invitation_codes — كان مصمَّماً أصلاً
--   (REFERENCES auth.users(id)) لكن غير مُفعَّل في مساري تسجيل الطلاب.
--   أُصلح هذا في كود التطبيق (register/route.js وcomplete-google/route.js)
--   في نفس دفعة العمل هذه — لا حاجة لأي تعديل SQL إضافي هنا، العمود
--   موجود بالفعل في student_invitation_codes.sql الأصلي.
--
-- • الثغرات الثلاث الأخرى المكتشفة أثناء الفحص (سباق تزامن في
--   validate-student-code، عمود used_by_email غير موثَّق بالschema،
--   RLS غير مُفعَّل فعلياً على جداول الأكواد الثلاثة القديمة) — مؤجَّلة
--   عمداً لدورة عمل منفصلة، موثَّقة بالكامل في القسم 14 الجديد من
--   CLAUDE.md ("Technical Debt & Security Fixes"). لا تُصلَح ضمن هذا
--   الملف حتى لا يتشتت نطاق هذه الدفعة.
-- ================================================================
