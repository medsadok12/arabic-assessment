-- ================================================================
-- RLS DENY ALL — 50 جدولاً (جلسة 2026-07-08)
-- ================================================================
-- الهدف: حجب الوصول المباشر من العميل (anon / authenticated)
--   لكل الجداول التي لم تكن تملك سياسة حجب صريحة.
--
-- الضمانة: service_role (المستخدَم في كل مسارات API عبر
--   createAdminClient()) يتجاوز RLS بالكامل ← السيرفرات لا تتأثر.
--
-- الجدول المستثنى عمداً: notifications
--   السبب: NotificationBell.jsx يستخدم اشتراك postgres_changes
--   real-time من جانب العميل، ويعتمد على سياسة read_own_or_global
--   الموجودة. حجبه يكسر الإشعارات الفورية.
--
-- الجداول الستة الحساسة (assessments, dm_messages, interviews,
--   invoices, parent_messages, recruitment_applications) مؤمَّنة
--   بمهاجرة منفصلة سابقة (C2a — جلسة 2026-07-07).
-- ================================================================

-- 1. admin_online_status
CREATE POLICY "deny_direct_anon"          ON public.admin_online_status AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.admin_online_status AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 2. admin_sessions
CREATE POLICY "deny_direct_anon"          ON public.admin_sessions AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.admin_sessions AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 3. ai_rate_limits
CREATE POLICY "deny_direct_anon"          ON public.ai_rate_limits AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.ai_rate_limits AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 4. assessment_codes
CREATE POLICY "deny_direct_anon"          ON public.assessment_codes AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.assessment_codes AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 5. attendance_logs
CREATE POLICY "deny_direct_anon"          ON public.attendance_logs AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.attendance_logs AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 6. avatar_items
CREATE POLICY "deny_direct_anon"          ON public.avatar_items AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.avatar_items AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 7. challenge_rooms
CREATE POLICY "deny_direct_anon"          ON public.challenge_rooms AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.challenge_rooms AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 8. daily_logs
CREATE POLICY "deny_direct_anon"          ON public.daily_logs AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.daily_logs AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 9. faheem_visitor_qa
CREATE POLICY "deny_direct_anon"          ON public.faheem_visitor_qa AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.faheem_visitor_qa AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 10. flashcard_progress
CREATE POLICY "deny_direct_anon"          ON public.flashcard_progress AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.flashcard_progress AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 11. game_results
CREATE POLICY "deny_direct_anon"          ON public.game_results AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.game_results AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 12. hero_config
CREATE POLICY "deny_direct_anon"          ON public.hero_config AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.hero_config AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 13. homework
CREATE POLICY "deny_direct_anon"          ON public.homework AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.homework AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 14. ip_rate_limits
CREATE POLICY "deny_direct_anon"          ON public.ip_rate_limits AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.ip_rate_limits AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 15. lc_category_meta
CREATE POLICY "deny_direct_anon"          ON public.lc_category_meta AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.lc_category_meta AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 16. lesson_feedback
CREATE POLICY "deny_direct_anon"          ON public.lesson_feedback AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.lesson_feedback AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 17. lesson_logs
CREATE POLICY "deny_direct_anon"          ON public.lesson_logs AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.lesson_logs AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 18. lexicon_words
CREATE POLICY "deny_direct_anon"          ON public.lexicon_words AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.lexicon_words AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 19. library_card_meta
CREATE POLICY "deny_direct_anon"          ON public.library_card_meta AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.library_card_meta AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 20. life_scenes
CREATE POLICY "deny_direct_anon"          ON public.life_scenes AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.life_scenes AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 21. points_log
CREATE POLICY "deny_direct_anon"          ON public.points_log AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.points_log AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 22. pricing_plans
CREATE POLICY "deny_direct_anon"          ON public.pricing_plans AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.pricing_plans AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 23. puzzle_progress
CREATE POLICY "deny_direct_anon"          ON public.puzzle_progress AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.puzzle_progress AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 24. puzzles
CREATE POLICY "deny_direct_anon"          ON public.puzzles AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.puzzles AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 25. session_support_students
CREATE POLICY "deny_direct_anon"          ON public.session_support_students AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.session_support_students AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 26. session_teacher_invites
CREATE POLICY "deny_direct_anon"          ON public.session_teacher_invites AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.session_teacher_invites AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 27. sessions
CREATE POLICY "deny_direct_anon"          ON public.sessions AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.sessions AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 28. stories
CREATE POLICY "deny_direct_anon"          ON public.stories AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.stories AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 29. story_pages
CREATE POLICY "deny_direct_anon"          ON public.story_pages AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.story_pages AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 30. story_reads
CREATE POLICY "deny_direct_anon"          ON public.story_reads AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.story_reads AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 31. streak_freezes
CREATE POLICY "deny_direct_anon"          ON public.streak_freezes AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.streak_freezes AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 32. student_group_assignments
CREATE POLICY "deny_direct_anon"          ON public.student_group_assignments AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.student_group_assignments AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 33. student_groups
CREATE POLICY "deny_direct_anon"          ON public.student_groups AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.student_groups AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 34. student_invitation_codes
CREATE POLICY "deny_direct_anon"          ON public.student_invitation_codes AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.student_invitation_codes AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 35. syllable_games
CREATE POLICY "deny_direct_anon"          ON public.syllable_games AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.syllable_games AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 36. teacher_invitation_codes
CREATE POLICY "deny_direct_anon"          ON public.teacher_invitation_codes AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.teacher_invitation_codes AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 37. teacher_space_comments
CREATE POLICY "deny_direct_anon"          ON public.teacher_space_comments AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.teacher_space_comments AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 38. teacher_space_posts
CREATE POLICY "deny_direct_anon"          ON public.teacher_space_posts AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.teacher_space_posts AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 39. teacher_students
CREATE POLICY "deny_direct_anon"          ON public.teacher_students AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.teacher_students AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 40. team_members
CREATE POLICY "deny_direct_anon"          ON public.team_members AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.team_members AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 41. team_messages
CREATE POLICY "deny_direct_anon"          ON public.team_messages AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.team_messages AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 42. user_points
CREATE POLICY "deny_direct_anon"          ON public.user_points AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.user_points AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 43. vowel_balloon_games
CREATE POLICY "deny_direct_anon"          ON public.vowel_balloon_games AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.vowel_balloon_games AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 44. vowel_balloons
CREATE POLICY "deny_direct_anon"          ON public.vowel_balloons AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.vowel_balloons AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 45. word_image_matches
CREATE POLICY "deny_direct_anon"          ON public.word_image_matches AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.word_image_matches AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 46. word_scramble_words
CREATE POLICY "deny_direct_anon"          ON public.word_scramble_words AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.word_scramble_words AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 47. word_wheel_catalog
CREATE POLICY "deny_direct_anon"          ON public.word_wheel_catalog AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.word_wheel_catalog AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 48. word_wheel_configs
CREATE POLICY "deny_direct_anon"          ON public.word_wheel_configs AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.word_wheel_configs AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 49. letter_catcher_words
-- (كانت تملك letter_catcher_words_public_read — PERMISSIVE — لكن كل الوصول
--  يمر عبر service_role في api/games/letter-catcher/route.js)
CREATE POLICY "deny_direct_anon"          ON public.letter_catcher_words AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.letter_catcher_words AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 50. admin_permissions
-- (كانت تملك admins_read_own_permissions — PERMISSIVE — لكن كل الوصول
--  يمر عبر service_role في api/bogga/permissions/route.js)
CREATE POLICY "deny_direct_anon"          ON public.admin_permissions AS RESTRICTIVE FOR ALL TO anon          USING (false) WITH CHECK (false);
CREATE POLICY "deny_direct_authenticated" ON public.admin_permissions AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
