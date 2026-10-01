-- تفويض صلاحيات فرعية محددة لمعلمين موثوقين (مثل إدارة أسئلة التقييم) دون
-- ترقيتهم لدور admin كامل. يوازي admin_permissions بنيوياً (teacher_id بدل
-- admin_id) لكنه جدول مستقل عمداً — الفرق الجوهري عن admin_permissions:
-- admin_permissions هي واجهة عرض فقط (تتحكم بالتبويبات الظاهرة لحساب admin
-- يملك أصلاً صلاحيات الخادم الكاملة)، بينما هذا الجدول يُستهلَك فعلياً في
-- حراسة الخادم (guard) لمسارات API محددة — منح صف هنا يمنح وصولاً خادمياً
-- حقيقياً، لا مجرد إظهار تبويب.

CREATE TABLE IF NOT EXISTS public.teacher_permissions (
  teacher_id  uuid NOT NULL,
  tab_key     text NOT NULL,
  granted_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (teacher_id, tab_key)
);

ALTER TABLE public.teacher_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all_anon_teacher_permissions ON public.teacher_permissions;
CREATE POLICY deny_all_anon_teacher_permissions ON public.teacher_permissions
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

NOTIFY pgrst, 'reload schema';
