// يُستدعى قبل admin.auth.admin.deleteUser() لمسح جميع بيانات المستخدم من كل الجداول
// كل حذف مستقل — إذا فشل جدول لا يوقف البقية

// «مشهدٌ وحكاية»: مسارات تسجيلات الطفل وصوره في الدلو الخاص student-work —
// تُجمع قبل حذف صفوفها لأن الملفات لا تُحذف مع الصف تلقائياً
async function sceneMediaPaths(userId, admin) {
  try {
    const { data } = await admin.from('scene_responses').select('audio_path, photo_path').eq('student_id', userId);
    return (data || []).flatMap(r => [r.audio_path, r.photo_path]).filter(Boolean);
  } catch {
    return [];
  }
}

export async function cleanupUserData(userId, userEmail, admin) {
  const safe = (p) => Promise.resolve(p).then(() => null).catch(() => null);

  const sceneFiles = await sceneMediaPaths(userId, admin);
  if (sceneFiles.length) {
    try { await safe(admin.storage.from('student-work').remove(sceneFiles)); } catch {}
  }

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
    safe(admin.from('scene_responses').delete().eq('student_id',       userId)),
    // حساب طفل عائلي (api/family/add-child): students.id مطابق عمداً لهذا
    // الـuserId نفسه — حذفه هنا يُسقط تلقائياً (ON DELETE CASCADE) أي صف
    // family_links مرتبط به، ويُصفّر (ON DELETE SET NULL) أي student_id في
    // sessions/assessments/session_support_students يشير إليه، بلا أي أثر
    // جانبي على الحساب الجذر (parent_user_id) نفسه.
    safe(admin.from('students').delete().eq('id',                      userId)),
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
