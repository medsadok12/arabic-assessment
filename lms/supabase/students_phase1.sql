-- ================================================================
-- students — جدول ملفات الطلاب الفرعية تحت حساب ولي أمر واحد
-- المرحلة 1 من إعادة هيكلة "حساب العائلة" (family account)
-- ================================================================
-- الهدف: فصل "هوية الدخول" (auth.users — بريد وكلمة مرور واحدة لكل
--   عائلة) عن "هوية الطالب المستفيد" (قد يكون هناك أكثر من طالب واحد
--   تحت نفس بريد ولي الأمر، كحالة الأستاذ الهاشمي وطفليه).
--
-- نطاق هذه المرحلة: Schema فقط — لا تعديل على واجهة المستخدم، لا تعديل
--   على منطق الفوترة. إضافية بحتة (additive-only): لا حذف، لا تعديل
--   على بيانات قائمة، لا كسر لأي مسار API حالي (كل الأعمدة الجديدة
--   NULLABLE بلا قيمة افتراضية).
--
-- ⚠️ قبل تشغيل هذا الملف: نفّذ استعلام التحقق التالي بمفرده أولاً،
--   وتأكد أنه لا يُرجع أي صف (احتمال وجود جدول students قديم بمخطط
--   مختلف مذكور صراحة في القسم 4 من CLAUDE.md ولم يُتحقَّق سابقاً):
--
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'students';
--
--   إن أرجع أي صف — توقف ولا تُشغّل الباقي، أبلغ Claude Code فوراً.
--
-- ⚠️ هذا الملف غير قابل لإعادة التشغيل الآمنة إذا فشل التنفيذ في
--   منتصفه (عبارات CREATE POLICY لا تدعم IF NOT EXISTS في PostgreSQL).
--   إن ظهر أي خطأ أثناء التنفيذ، أبلغ Claude Code بنص الخطأ كاملاً
--   قبل إعادة المحاولة — لا تُعِد تشغيل الملف من البداية بمفردك.
-- ================================================================

-- 1) الجدول الجديد
CREATE TABLE IF NOT EXISTS students (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      TEXT         NOT NULL,
  age            INT,
  grade          INT,
  avatar_url     TEXT,
  is_active      BOOLEAN      NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS students_parent_idx ON students (parent_user_id);

-- 2) RLS — بنفس نمط lms/supabase/rls_deny_all_50_tables.sql تماماً
--    (خدمة الخادم فقط عبر service_role الذي يتجاوز RLS بالكامل — لا
--    وصول مباشر من العميل). DROP قبل CREATE يضمن قابلية إعادة التشغيل
--    التي تفتقدها rls_deny_all_50_tables.sql نفسها (دين تقني منفصل هناك).
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_direct_anon"          ON public.students;
DROP POLICY IF EXISTS "deny_direct_authenticated" ON public.students;
CREATE POLICY "deny_direct_anon"          ON public.students AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.students AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 3) أعمدة مرجعية جديدة (Foreign Keys) في الجداول المعنية — كلها
--    NULLABLE بلا قيمة افتراضية، إضافة بحتة صفر تأثير رجعي.
--    ON DELETE SET NULL: لو حُذف ملف طالب فرعي مستقبلاً (نادر، عادة
--    is_active=false بدل حذف فعلي)، تبقى سجلات الحصص/التقييمات
--    التاريخية محفوظة (لا تُحذف تلقائياً) بدل فشل الحذف بخطأ FK.
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL;
ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL;
ALTER TABLE session_support_students
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sessions_student_id_idx                 ON sessions (student_id);
CREATE INDEX IF NOT EXISTS assessments_student_id_idx              ON assessments (student_id);
CREATE INDEX IF NOT EXISTS session_support_students_student_id_idx ON session_support_students (student_id);

-- 4) attendance_logs — حالة خاصة:
--    العمود الموجود attendance_logs.student_id يخزّن اليوم auth.users.id
--    لصاحب الجلسة (مؤكَّد حرفياً: lms/app/api/student/attendance/route.js
--    السطر 86 يكتب `student_id: user.id`). إضافة REFERENCES عليه مباشرة
--    ستكسر كل تسجيل حضور فور تشغيل هذا الملف. لذلك يُضاف عمود منفصل
--    بالكامل بدل التعارض مع الدلالة القديمة:
ALTER TABLE attendance_logs
  ADD COLUMN IF NOT EXISTS student_profile_id UUID REFERENCES students(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS attendance_logs_student_profile_idx ON attendance_logs (student_profile_id);

-- توثيق الفارق الدلالي داخل قاعدة البيانات نفسها — يمنع أي قارئ مستقبلي
-- (مطوّر أو حتى أداة AI أخرى تفحص information_schema) من افتراض أن
-- العمودين بنفس الاسم "student_id" يحملان نفس المعنى عبر الجداول.
COMMENT ON COLUMN attendance_logs.student_id IS
  'DEPRECATED SEMANTIC: يخزّن auth.users.id (هوية الدخول)، وليس students.id. استخدم student_profile_id للربط بملف الطالب الفرعي الجديد.';
COMMENT ON COLUMN attendance_logs.student_profile_id IS
  'FK صحيح إلى students.id — الربط الصحيح بملف الطالب الفرعي (المرحلة 1، راجع lms/supabase/students_phase1.sql).';

-- 5) إعادة تحميل كاش المخطط لطبقة PostgREST فوراً — بنفس نمط كل ملفات
--    ALTER TABLE ADD COLUMN المشابهة في المشروع (invoices_v2.sql,
--    lesson_logs.sql, life_scenes.sql, notifications_v2.sql,
--    parent_messages.sql, teacher_space.sql). بدونه قد تُرجع مسارات
--    API خطأ "column not found in schema cache" عند أول استخدام.
NOTIFY pgrst, 'reload schema';

-- ================================================================
-- ملاحظات صريحة (لا تنفيذ الآن — خارج نطاق المرحلة 1 المعتمدة):
--
-- • student_group_assignments.user_id هو PRIMARY KEY REFERENCES
--   auth.users(id) — افتراض 1-إلى-1 صريح بين حساب الدخول والمجموعة،
--   سيحتاج إعادة تصميم في مرحلة لاحقة (بعد تفعيل مبدّل الملفات
--   الشخصية)، إذ سيصبح غير كافٍ تمييز طفلين تحت نفس حساب الدخول.
--
-- • teacher_students.student_email نص حر بلا أي ربط بـ auth.users
--   أصلاً — مرشّح لإضافة student_id لاحقاً، غير عاجل.
--
-- • اكتُشف أثناء المراجعة (خارج نطاق هذه الهجرة تماماً، يستحق تدقيقاً
--   منفصلاً): عدة ملفات SQL أصلية لجداول "الجداول الستة الحساسة"
--   وعدد من الخمسين جدولاً في rls_deny_all_50_tables.sql تحتوي على
--   `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` صريحة (مثال:
--   invoices.sql, parent_messages.sql, interviews.sql,
--   assessment_codes.sql, student_groups.sql وغيرها) ولا يوجد أي ملف
--   لاحق يعيد تفعيل RLS عليها صراحة (`ENABLE ROW LEVEL SECURITY`).
--   سياسات DENY ALL على جدول لا يملك RLS مُفعَّلاً أصلاً = بلا أي أثر
--   حماية فعلي (PostgreSQL يتجاهل كل السياسات، RESTRICTIVE أو
--   PERMISSIVE، إن كان RLS معطلاً على مستوى الجدول). هذا لا يمسّ جدول
--   students الجديد (يحمل ENABLE ROW LEVEL SECURITY صراحة أعلاه)، لكنه
--   يستحق تحققاً حياً منفصلاً عبر:
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';
--   ثم إبلاغ الأستاذ محمد إن ظهر rowsecurity=false على أي من الجداول
--   الحساسة المذكورة في القسم 11 من CLAUDE.md.
-- ================================================================
