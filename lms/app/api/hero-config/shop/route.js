import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { resolveActiveIdentity } from '../../../../lib/active-child';
import { parseBuyList, priceOf } from '../../../../lib/hero-catalog';

export const dynamic = 'force-dynamic';

/* شراء قطع الاستوديو دفعة واحدة: { items: ['head:crown', 'pet:faheem'] }
   السعر من الكتالوج على الخادم فقط، والخصم ذرّي داخل buy_hero_items
   (قفل الرصيد، تخطّي المملوك، سجل لكل قطعة) — لا خصم مزدوج ولا قطعة مجانية بالخطأ. */
export async function POST(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const keys = parseBuyList(body?.items);
    if (!keys) return NextResponse.json({ error: 'هذه القطعة غير موجودة في المتجر' }, { status: 400 });

    const admin = createAdminClient();
    const { effectiveUserId } = await resolveActiveIdentity(user, admin, req);
    const { data, error } = await admin.rpc('buy_hero_items', {
      p_user: effectiveUserId, p_items: keys, p_prices: keys.map(priceOf),
    });
    if (error) return NextResponse.json({ error: 'تعذّر إتمام الشراء، حاول مرة أخرى' }, { status: 500 });

    if (!data?.ok) {
      if (data?.reason === 'insufficient') {
        return NextResponse.json({
          error: `نجومك لا تكفي بعد — يَنْقُصُكَ ${data.needed - data.points} ⭐. كل درس تنهيه يمنحك نجوماً جديدة 💪`,
          points: data.points,
        }, { status: 400 });
      }
      return NextResponse.json({ error: 'تعذّر إتمام الشراء، حاول مرة أخرى' }, { status: 400 });
    }

    return NextResponse.json({ success: true, points: data.points, charged: data.charged, bought: data.bought ?? [] });
  } catch {
    return NextResponse.json({ error: 'تعذّر إتمام الشراء، حاول مرة أخرى' }, { status: 500 });
  }
}
