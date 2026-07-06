import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

const FREEZE_PRICE = 100;
const FREEZE_CAP   = 2;

// GET — current freeze balance + pricing
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ balance: 0, price: FREEZE_PRICE, cap: FREEZE_CAP });

  const admin = createAdminClient();
  const { data } = await admin
    .from('streak_freezes').select('balance').eq('user_id', user.id).maybeSingle();

  return NextResponse.json({ balance: data?.balance ?? 0, price: FREEZE_PRICE, cap: FREEZE_CAP });
}

// POST — buy one freeze (atomic, race-proof, handled entirely inside buy_streak_freeze)
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('buy_streak_freeze', {
    p_user: user.id, p_price: FREEZE_PRICE, p_cap: FREEZE_CAP,
  });

  if (error) return NextResponse.json({ error: 'تعذّر إتمام العملية، يرجى المحاولة مجدداً' }, { status: 500 });

  if (!data?.ok) {
    const msg = data?.reason === 'at_cap'
      ? 'لديك أقصى عددٍ من التجميدات بالفعل! 🧊'
      : `نقاطُك لا تكفي بعد — تحتاج ${FREEZE_PRICE} نقطة. العب أكثر واجمعها يا بطل! 💪`;
    return NextResponse.json({ ok: false, error: msg, balance: data?.balance }, { status: 400 });
  }

  return NextResponse.json({ ok: true, balance: data.balance, points: data.points });
}
