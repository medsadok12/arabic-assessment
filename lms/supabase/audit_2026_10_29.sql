-- ════════════════════════════════════════════════════════════════
-- المراجعة الشاملة 2026-10-29 — إصلاحات قاعدة البيانات (من مستشاري Supabase للأمان والأداء)
-- إضافية وغير مُتلِفة؛ التراجع في audit_2026_10_29_rollback.sql
-- ════════════════════════════════════════════════════════════════

-- 1) أمان: دالة حد الطلبات ip_rate_check كانت قابلة للاستدعاء من أي زائر عبر /rest/v1/rpc
--    (SECURITY DEFINER) — يستطيع أي أحد بالمفتاح العام ملء عدّاد عنوان IP لشخص آخر فيحجبه
--    عن التسجيل. الخادم يستدعيها بـservice_role فقط (lib/ip-rate-check.js)
revoke execute on function public.ip_rate_check(text, text, integer, integer) from public, anon, authenticated;
grant  execute on function public.ip_rate_check(text, text, integer, integer) to service_role;

-- 2) أمان: مسار بحث ثابت للدالة (يمنع تمرير جداول مزيّفة عبر search_path)
alter function public.add_random_suffix_to_code() set search_path = public;

-- 3) أداء: فهرس مكرر تماماً على flashcard_progress (user_id, next_review) — يُبقى idx_fp_user_review
drop index if exists public.fp_user_review_idx;

-- 4) أداء: auth.uid() تُحسب مرة واحدة للاستعلام بدل كل صف
drop policy if exists read_own_or_global on public.notifications;
create policy read_own_or_global on public.notifications
  for select using ((recipient_id is null) or (recipient_id = (select auth.uid())));

-- 5) أداء: فهارس للمفاتيح الأجنبية المستعملة في الاستعلامات اليومية
create index if not exists scene_responses_student_id_idx        on public.scene_responses (student_id);
create index if not exists story_reads_story_id_idx              on public.story_reads (story_id);
create index if not exists puzzle_progress_puzzle_id_idx         on public.puzzle_progress (puzzle_id);
create index if not exists student_group_assignments_group_id_idx on public.student_group_assignments (group_id);
create index if not exists teacher_space_comments_post_id_idx    on public.teacher_space_comments (post_id);
create index if not exists interviews_application_id_idx         on public.interviews (application_id);
