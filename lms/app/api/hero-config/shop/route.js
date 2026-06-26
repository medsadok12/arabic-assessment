import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

/* Server-side price authority — client-sent price is ignored */
const SHOP_PRICES = {
  robot:      0,
  astronaut:  1000,
  fox:        1000,
  duck:       1000,
  parrot:     1000,
  flamingo:   1000,
  explorer:   1000,
  cyborg:     1000,
  knight:     1000,
  ninja:      1000,
  wizard:     1000,
  scientist:  1000,
};

export async function POST(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const { item_id } = await req.json();
    if (!item_id) return NextResponse.json({ error: 'item_id مطلوب' }, { status: 400 });

    /* Use server-side price — never trust client */
    const price = SHOP_PRICES[item_id];
    if (price === undefined) return NextResponse.json({ error: 'عنصر غير موجود' }, { status: 404 });

    const admin = createAdminClient();

    /* Already owned? */
    const { data: existing } = await admin
      .from('avatar_items')
      .select('item_id')
      .eq('user_id', user.id)
      .eq('item_id', item_id)
      .maybeSingle();
    if (existing) return NextResponse.json({ error: 'العنصر مملوك بالفعل' }, { status: 409 });

    /* Deduct points */
    if (price > 0) {
      const { data: pts } = await admin
        .from('user_points')
        .select('total')
        .eq('user_id', user.id)
        .maybeSingle();
      const current = pts?.total ?? 0;
      if (current < price) {
        return NextResponse.json({ error: `نقاط غير كافية — رصيدك ${current}، السعر ${price}` }, { status: 400 });
      }
      await admin
        .from('user_points')
        .upsert({ user_id: user.id, total: current - price }, { onConflict: 'user_id' });
    }

    /* Add to owned items */
    await admin.from('avatar_items').insert({ user_id: user.id, item_id });

    return NextResponse.json({ success: true, price_charged: price });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
