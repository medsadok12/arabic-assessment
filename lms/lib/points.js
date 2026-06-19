import { createAdminClient } from './supabase-admin';

export async function awardPoints(userId, amount, reason) {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('points_log')
    .select('id')
    .eq('user_id', userId)
    .eq('reason', reason)
    .maybeSingle();
  if (existing) return { ok: true, skipped: true };

  await admin.from('points_log').insert({ user_id: userId, delta: amount, reason });

  const { data: row } = await admin
    .from('user_points')
    .select('total')
    .eq('user_id', userId)
    .maybeSingle();

  if (row) {
    await admin.from('user_points').update({ total: row.total + amount }).eq('user_id', userId);
  } else {
    await admin.from('user_points').insert({ user_id: userId, total: amount });
  }

  return { ok: true, skipped: false, awarded: amount };
}
