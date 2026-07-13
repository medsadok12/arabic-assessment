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

    /* Claim ownership FIRST, atomically. The composite unique (user_id,item_id) means a
       concurrent duplicate purchase raises 23505 → already owned, so we never double-charge. */
    const { error: claimErr } = await admin
      .from('avatar_items')
      .insert({ user_id: user.id, item_id, equipped: false });
    if (claimErr) {
      if (claimErr.code === '23505') return NextResponse.json({ error: 'العنصر مملوك بالفعل' }, { status: 409 });
      return NextResponse.json({ error: claimErr.message }, { status: 500 });
    }

    /* Deduct points with an optimistic lock. On any failure, roll back the claim so the
       child is never charged for an item they didn't get, and never gets an item for free. */
    let newBalance = null;
    if (price > 0) {
      const { data: balRow } = await admin
        .from('user_points').select('total').eq('user_id', user.id).maybeSingle();
      const balance = balRow?.total ?? 0;

      if (balance < price) {
        await admin.from('avatar_items').delete().eq('user_id', user.id).eq('item_id', item_id);
        return NextResponse.json({ error: `نقاط غير كافية — رصيدك ${balance}، السعر ${price}` }, { status: 400 });
      }

      const { data: deducted } = await admin
        .from('user_points')
        .update({ total: balance - price, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('total', balance)   // optimistic lock — matches only if balance unchanged since read
        .select('total')
        .maybeSingle();

      if (!deducted) {
        await admin.from('avatar_items').delete().eq('user_id', user.id).eq('item_id', item_id);
        return NextResponse.json({ error: 'تعارض في العملية، يرجى المحاولة مجدداً' }, { status: 409 });
      }
      newBalance = deducted.total;

      await admin.from('points_log').insert({ user_id: user.id, delta: -price, reason: `avatar_buy_${item_id}` });
    }

    return NextResponse.json({ success: true, price_charged: price, newBalance });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
