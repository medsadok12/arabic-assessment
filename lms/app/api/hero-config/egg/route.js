import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { resolveActiveIdentity } from '../../../../lib/active-child';
import { normalizeLook, DEFAULT_LOOK } from '../../../../lib/hero-catalog';
import { loadHeroData, heroSummary } from '../../../../lib/hero-progress';

export const dynamic = 'force-dynamic';

/* البيضة الغامضة: { action: 'start' } تضعها في العش (يبدأ عدّ نجوم التعلّم)،
   و{ action: 'hatch' } تفقسها إن اكتمل التقدّم — فيُمنح «التنين الصغير» ويصير رفيق البطل. */
export async function POST(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });
    const body = await req.json().catch(() => null);
    const action = body?.action;
    if (action !== 'start' && action !== 'hatch') return NextResponse.json({ error: 'طلب غير معروف' }, { status: 400 });

    const admin = createAdminClient();
    const { effectiveUserId } = await resolveActiveIdentity(user, admin, req);
    const data = await loadHeroData(admin, effectiveUserId);
    const summary = heroSummary(data);
    const look = normalizeLook(data.cfg?.look ?? DEFAULT_LOOK);

    if (summary.egg.hatched) return NextResponse.json({ error: 'فَقَسَتْ بَيْضَتُكَ مِنْ قَبْلُ — تِنِّينُكَ مَعَكَ 🐉' }, { status: 409 });

    if (action === 'start') {
      const now = new Date().toISOString();
      const { error } = await admin.from('hero_config').upsert({
        user_id: effectiveUserId, look: { ...look, pet: 'egg' }, avatar_id: 'studio3d', avatar_url: null,
        egg_started_at: data.cfg?.egg_started_at ?? now, updated_at: now,
      }, { onConflict: 'user_id' });
      if (error) return NextResponse.json({ error: 'تعذّر وضع البيضة، حاول مرة أخرى' }, { status: 500 });
      return NextResponse.json({ success: true, egg: { ...summary.egg, started: true } });
    }

    if (!summary.egg.started) return NextResponse.json({ error: 'ضَعِ الْبَيْضَةَ فِي الْعُشِّ أَوَّلًا 🥚' }, { status: 400 });
    if (summary.egg.progress < summary.egg.goal) {
      return NextResponse.json({ error: `بَقِيَ ${summary.egg.goal - summary.egg.progress} ⭐ مِنَ التَّعَلُّمِ وَتَفْقِسُ 🥚`, egg: summary.egg }, { status: 400 });
    }
    const { error: gErr } = await admin.from('avatar_items')
      .upsert({ user_id: effectiveUserId, item_id: 'pet:dragon', equipped: false }, { onConflict: 'user_id,item_id', ignoreDuplicates: true });
    if (gErr) return NextResponse.json({ error: 'تعذّر الفقس، حاول مرة أخرى' }, { status: 500 });
    const newLook = { ...look, pet: 'dragon' };
    await admin.from('hero_config').upsert({
      user_id: effectiveUserId, look: newLook, avatar_id: 'studio3d', avatar_url: null, egg_started_at: null, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    return NextResponse.json({ success: true, hatched: 'pet:dragon', look: newLook });
  } catch {
    return NextResponse.json({ error: 'تعذّر إتمام الطلب، حاول مرة أخرى' }, { status: 500 });
  }
}
