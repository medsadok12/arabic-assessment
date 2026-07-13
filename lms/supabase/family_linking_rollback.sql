-- ================================================================
-- ROLLBACK — يُلغي بالكامل هجرة lms/supabase/family_linking.sql
-- ================================================================
-- استخدمه فقط للتراجع الكامل عن ربط الأكواد/العائلات وإعادة القاعدة
--   إلى حالتها قبل تشغيل family_linking.sql تماماً.
--
-- ⚠️ لا تُشغّله إن كانت أعمدة assessment_id/family_code أو جدول
--   family_links قد بدأت تُملأ ببيانات فعلية حقيقية يعتمد عليها
--   المستخدمون (سيؤدي هذا لفقدان تلك الروابط نهائياً — DROP لا رجعة
--   فيه). في المرحلة الحالية (لم يُشغَّل بعد على القاعدة الحيّة) كل
--   شيء لا يزال فارغاً، فالتراجع هنا آمن 100%.
--
-- الترتيب: عكس الهجرة تماماً.
-- ================================================================

-- 1) حذف جدول family_links وسياساته
DROP POLICY IF EXISTS "deny_direct_anon"          ON public.family_links;
DROP POLICY IF EXISTS "deny_direct_authenticated" ON public.family_links;
DROP TABLE IF EXISTS family_links;

-- 2) حذف عمود family_code من students
ALTER TABLE students DROP COLUMN IF EXISTS family_code;

-- 3) حذف عمود assessment_id من assessment_codes (والفهرس المرتبط تلقائياً)
ALTER TABLE assessment_codes DROP COLUMN IF EXISTS assessment_id;

-- 4) إعادة تحميل كاش المخطط لطبقة PostgREST
NOTIFY pgrst, 'reload schema';

-- ================================================================
-- ملاحظة: هذا الملف لا يعكس إصلاح عمود used_by في register/route.js
--   وcomplete-google/route.js — ذاك تغيير كود تطبيقي (JS)، لا SQL،
--   ويُتراجَع عنه عبر git revert للـcommit المعني إن لزم، لا عبر هذا
--   الملف. عمود used_by نفسه لم يتغيّر schema-wise (كان موجوداً أصلاً
--   في student_invitation_codes.sql قبل هذه الدفعة بالكامل).
-- ================================================================
