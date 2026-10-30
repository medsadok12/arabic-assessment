-- التراجع عن admin_permissions_initplan_2026_10_29.sql
drop policy if exists admins_read_own_permissions on public.admin_permissions;
create policy admins_read_own_permissions on public.admin_permissions
  for select using (auth.uid() = admin_id);
