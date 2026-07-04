// يُستدعى قبل admin.auth.admin.deleteUser() لمسح جميع بيانات المستخدم من كل الجداول
// كل حذف مستقل — إذا فشل جدول لا يوقف البقية

export async function cleanupUserData(userId, userEmail, admin) {
  const safe = (p) => Promise.resolve(p).then(() => null).catch(() => null);

  // ── جداول مرتبطة بـ UUID ──────────────────────────────────────────────
  await Promise.all([
    safe(admin.from('flashcard_progress').delete().eq('user_id',       userId)),
    safe(admin.from('daily_logs').delete().eq('user_id',               userId)),
    safe(admin.from('user_points').delete().eq('user_id',              userId)),
    safe(admin.from('points_log').delete().eq('user_id',               userId)),
    safe(admin.from('puzzle_progress').delete().eq('user_id',          userId)),
    safe(admin.from('game_results').delete().eq('user_id',             userId)),
    safe(admin.from('story_reads').delete().eq('user_id',              userId)),
    safe(admin.from('hero_config').delete().eq('user_id',              userId)),
    safe(admin.from('avatar_items').delete().eq('user_id',             userId)),
    safe(admin.from('assessments').delete().eq('user_id',              userId)),
    safe(admin.from('student_group_assignments').delete().eq('user_id',userId)),
    safe(admin.from('attendance_logs').delete().eq('student_id',       userId)),
    safe(admin.from('notifications').delete().eq('recipient_id',       userId)),
  ]);

  // ── جداول مرتبطة بالبريد الإلكتروني ──────────────────────────────────
  if (userEmail) {
    await Promise.all([
      safe(admin.from('sessions').delete().eq('student_email',                userEmail)),
      safe(admin.from('teacher_students').delete().eq('student_email',        userEmail)),
      safe(admin.from('session_support_students').delete().eq('student_email',userEmail)),
    ]);
  }
}
