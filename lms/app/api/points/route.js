import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { createClient } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ points: 0 });
    const admin = createAdminClient();
    const { data } = await admin.from('user_points').select('total').eq('user_id', user.id).single();
    return NextResponse.json({ points: data?.total ?? 0 });
  } catch {
    return NextResponse.json({ points: 0 });
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
