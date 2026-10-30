-- التراجع عن audit_2026_10_29.sql
grant execute on function public.ip_rate_check(text, text, integer, integer) to anon, authenticated;
alter function public.add_random_suffix_to_code() reset search_path;
create index if not exists fp_user_review_idx on public.flashcard_progress using btree (user_id, next_review);
drop policy if exists read_own_or_global on public.notifications;
create policy read_own_or_global on public.notifications
  for select using ((recipient_id is null) or (recipient_id = auth.uid()));
drop index if exists public.scene_responses_student_id_idx;
drop index if exists public.story_reads_story_id_idx;
drop index if exists public.puzzle_progress_puzzle_id_idx;
drop index if exists public.student_group_assignments_group_id_idx;
drop index if exists public.teacher_space_comments_post_id_idx;
drop index if exists public.interviews_application_id_idx;
