-- ════════════════════════════════════════════════════════════════
-- أداء: سياسة admins_read_own_permissions كانت تحسب auth.uid() لكل صف (مستشار Supabase auth_rls_initplan)
-- نفس المعنى والأدوار تماماً — (select auth.uid()) تُحسب مرة واحدة للاستعلام. بموافقة الأستاذ محمد 2026-10-29
-- ملاحظة: سياستا deny_direct_anon/deny_direct_authenticated (RESTRICTIVE) تبقيان، فالقراءة الفعلية من الخادم فقط
-- التراجع: admin_permissions_initplan_2026_10_29_rollback.sql
-- ════════════════════════════════════════════════════════════════
drop policy if exists admins_read_own_permissions on public.admin_permissions;
create policy admins_read_own_permissions on public.admin_permissions
  for select using ((select auth.uid()) = admin_id);
