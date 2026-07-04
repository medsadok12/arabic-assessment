import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { createClient } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

/* Server-side price authority — client-sent price is never trusted */
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

    const { itemId } = await req.json();
    if (!itemId) return NextResponse.json({ error: 'itemId مطلوب' }, { status: 400 });

    /* Look up server-side price — reject unknown items */
    const price = SHOP_PRICES[itemId];
    if (price === undefined) {
      return NextResponse.json({ error: 'عنصر غير موجود' }, { status: 404 });
    }

    const admin = createAdminClient();

    /* Already owned? */
    const { data: existing } = await admin
      .from('avatar_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'تملك هذه القطعة بالفعل' }, { status: 400 });
    }

    /* Check and deduct balance only when price > 0 */
    let newBalance = null;
    if (price > 0) {
      const { data: balRow } = await admin
        .from('user_points')
        .select('total')
        .eq('user_id', user.id)
        .maybeSingle();

      const balance = balRow?.total ?? 0;
      if (balance < price) {
        return NextResponse.json({ error: 'نقاط غير كافية', balance }, { status: 400 });
      }

      newBalance = balance - price;
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
      ]);
    }

    await admin.from('avatar_items').insert({
      user_id: user.id,
      item_id: itemId,
      equipped: false,
    });

    return NextResponse.json({ success: true, newBalance, price_charged: price });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
