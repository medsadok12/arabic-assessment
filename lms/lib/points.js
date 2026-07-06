import { createAdminClient } from './supabase-admin';

export async function awardPoints(userId, amount, reason) {
  const admin = createAdminClient();

  // The points_log_unique_event_idx partial UNIQUE index on (user_id, reason)
  // (reasons that contain ':' — daily_login:DATE, homework_done:ID, session_attend:ID …)
  // guarantees each unique event is logged at most once. Insert directly and treat a
  // duplicate-key violation (23505) as an already-awarded event: skip silently, never crash.
  // A plain insert is used deliberately — onConflict inference cannot target a partial index.
  const { error: insertErr } = await admin
    .from('points_log')
    .insert({ user_id: userId, delta: amount, reason });

  if (insertErr) {
    if (insertErr.code === '23505') return { ok: true, skipped: true }; // already awarded
    return { ok: false, error: insertErr.message };
  }

  // Only a genuinely new event reaches here → apply the balance change exactly once.
  const { data: row } = await admin
    .from('user_points')
    .select('total')
    .eq('user_id', userId)
    .maybeSingle();

  if (row) {
    // Optimistic lock — UPDATE only if total unchanged since we read it
    const { data: updated } = await admin
      .from('user_points')
      .update({ total: row.total + amount, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('total', row.total)
      .select('total')
      .maybeSingle();
    if (!updated) return { ok: false, conflict: true };
  } else {
    await admin.from('user_points').insert({ user_id: userId, total: amount, updated_at: new Date().toISOString() });
  }

  return { ok: true, skipped: false, awarded: amount };
}
