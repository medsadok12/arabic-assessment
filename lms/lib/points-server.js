/* ════════════════════════════════════════════════════════════════
   منح النقاط على الخادم — منطق واحد لمسار /api/points ولأي مسار يمنح نقاطاً
   بنفسه (مثل «مشهدٌ وحكاية» عند الإرسال وعند تقييم المعلم).
   dedup: لا يُمنح السبب نفسه مرتين لنفس الطالب (points_log.reason).
   القفل التفاؤلي: يُحدَّث الرصيد فقط إن لم يتغيّر منذ قراءته.
════════════════════════════════════════════════════════════════ */

/* ← { success, points } | { skipped, points } | { conflict: true } */
export async function awardPoints(admin, userId, reason, amount, { dedup = false } = {}) {
  if (dedup) {
    const { data: dup } = await admin
      .from('points_log').select('id').eq('user_id', userId).eq('reason', reason).maybeSingle();
    if (dup) {
      const { data: balRow } = await admin.from('user_points').select('total').eq('user_id', userId).maybeSingle();
      return { skipped: true, points: balRow?.total ?? 0 };
    }
  }

  const { data: current } = await admin.from('user_points').select('total').eq('user_id', userId).maybeSingle();
  const prevTotal = current?.total ?? 0;
  const newTotal  = prevTotal + amount;

  if (current) {
    // Optimistic lock — UPDATE only if total hasn't changed since we read it
    const { data: updated } = await admin
      .from('user_points')
      .update({ total: newTotal, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('total', prevTotal)
      .select('total')
      .maybeSingle();
    if (!updated) return { conflict: true };
  } else {
    await admin.from('user_points').insert({ user_id: userId, total: newTotal, updated_at: new Date().toISOString() });
  }

  await admin.from('points_log').insert({ user_id: userId, delta: amount, reason });
  return { success: true, points: newTotal };
}
