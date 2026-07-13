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

    /* Check and deduct balance only when price > 0.
       Optimistic-lock pattern: read current total, then UPDATE WHERE total = <read value>.
       If a concurrent request already changed the balance, the WHERE clause matches 0 rows
       and we return 409 — preventing double-spend without a database-level stored procedure. */
    let newBalance = null;
    if (price > 0) {
      const { data: balRow } = await admin
        .from('user_points')
        .select('total')
        .eq('user_id', user.id)
        .maybeSingle();

      const balance = balRow?.total ?? 0;
      if (balance < price)
        return NextResponse.json({ error: 'نقاط غير كافية', balance }, { status: 400 });

      const { data: deducted } = await admin
        .from('user_points')
        .update({ total: balance - price, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('total', balance)   // optimistic lock — matches only if balance unchanged
        .select('total')
        .maybeSingle();

      if (!deducted)
        return NextResponse.json({ error: 'تعارض في العملية، يرجى المحاولة مجدداً' }, { status: 409 });

      newBalance = deducted.total;

      await admin.from('points_log').insert({
        user_id: user.id,
        delta:   -price,
        reason:  `avatar_buy_${itemId}`,
      });
    }

    /* upsert with ignoreDuplicates prevents duplicate row on concurrent requests */
    await admin
      .from('avatar_items')
      .upsert(
        { user_id: user.id, item_id: itemId, equipped: false },
        { onConflict: 'user_id,item_id', ignoreDuplicates: true }
      );

    return NextResponse.json({ success: true, newBalance, price_charged: price });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
