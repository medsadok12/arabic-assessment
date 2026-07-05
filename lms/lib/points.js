import { createAdminClient } from './supabase-admin';

export async function awardPoints(userId, amount, reason) {
  const admin = createAdminClient();

  // upsert with ignoreDuplicates prevents double-insert under concurrent calls
  const { data: inserted } = await admin
    .from('points_log')
    .upsert({ user_id: userId, delta: amount, reason }, { onConflict: 'user_id,reason', ignoreDuplicates: true })
    .select('id')
    .maybeSingle();

  if (!inserted) return { ok: true, skipped: true };

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
