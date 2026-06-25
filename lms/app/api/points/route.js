import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { createClient } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ points: 0, earned: 0 });
    const admin = createAdminClient();
    const [{ data: balRow }, { data: logRows }] = await Promise.all([
      admin.from('user_points').select('total').eq('user_id', user.id).maybeSingle(),
      admin.from('points_log').select('delta').eq('user_id', user.id).gt('delta', 0),
    ]);
    const points = balRow?.total ?? 0;
    const earned = (logRows ?? []).reduce((s, r) => s + (r.delta || 0), 0);
    return NextResponse.json({ points, earned });
  } catch {
    return NextResponse.json({ points: 0, earned: 0 });
  }
}

export async function POST(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const { amount, reason } = await req.json();
    if (!amount || amount <= 0 || amount > 10000) return NextResponse.json({ error: 'قيمة غير صالحة' }, { status: 400 });

    const admin = createAdminClient();

    // Idempotency: if a specific reason was already awarded, skip
    if (reason) {
      const { data: dup } = await admin.from('points_log').select('id').eq('user_id', user.id).eq('reason', reason).maybeSingle();
      if (dup) {
        const { data: balRow } = await admin.from('user_points').select('total').eq('user_id', user.id).maybeSingle();
        return NextResponse.json({ skipped: true, points: balRow?.total ?? 0 });
      }
    }

    const { data: current } = await admin.from('user_points').select('total').eq('user_id', user.id).single();
    const newTotal = (current?.total ?? 0) + Math.round(amount);

    await Promise.all([
      admin.from('user_points').upsert({ user_id: user.id, total: newTotal, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }),
      admin.from('points_log').insert({ user_id: user.id, delta: Math.round(amount), reason: reason || 'game_reward' }),
    ]);

    return NextResponse.json({ success: true, points: newTotal });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
