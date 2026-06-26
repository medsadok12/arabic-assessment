import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const { itemId, price } = await req.json();
    if (!itemId || !price || price <= 0) {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from('avatar_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'تملك هذه القطعة بالفعل' }, { status: 400 });
    }

    const { data: balRow } = await admin
      .from('user_points')
      .select('total')
      .eq('user_id', user.id)
      .maybeSingle();

    const balance = balRow?.total ?? 0;
    if (balance < price) {
      return NextResponse.json({ error: 'نقاط غير كافية', balance }, { status: 400 });
    }

    const newBalance = balance - price;
    await Promise.all([
      admin.from('user_points').upsert(
        { user_id: user.id, total: newBalance, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      ),
      admin.from('points_log').insert({
        user_id: user.id,
        delta: -price,
        reason: `avatar_buy_${itemId}`,
      }),
      admin.from('avatar_items').insert({
        user_id: user.id,
        item_id: itemId,
        equipped: false,
      }),
    ]);

    return NextResponse.json({ success: true, newBalance });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
