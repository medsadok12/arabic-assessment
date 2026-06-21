import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const { item_id, price = 0 } = await req.json();
    if (!item_id) return NextResponse.json({ error: 'item_id مطلوب' }, { status: 400 });

    const admin = createAdminClient();

    /* Already owned? */
    const { data: existing } = await admin
      .from('avatar_items')
      .select('item_id')
      .eq('user_id', user.id)
      .eq('item_id', item_id)
      .maybeSingle();
    if (existing) return NextResponse.json({ error: 'العنصر مملوك بالفعل' }, { status: 409 });

    /* Deduct points if item has a price */
    if (price > 0) {
      const { data: pts } = await admin
        .from('user_points')
        .select('total')
        .eq('user_id', user.id)
        .maybeSingle();
      const current = pts?.total ?? 0;
      if (current < price) {
        return NextResponse.json({ error: `نقاط غير كافية (رصيدك ${current}، السعر ${price})` }, { status: 400 });
      }
      await admin
        .from('user_points')
        .upsert({ user_id: user.id, total: current - price }, { onConflict: 'user_id' });
    }

    /* Add to owned items */
    await admin.from('avatar_items').insert({ user_id: user.id, item_id });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
