import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { resolveActiveIdentity } from '../../../lib/active-child';
import { normalizeLook, unpaidItems, isValidPreview } from '../../../lib/hero-catalog';

export const dynamic = 'force-dynamic';

const EMPTY = { look: null, preview_url: null, equipped: {}, owned: [], points: 0 };

export async function GET(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json(EMPTY);

    const admin = createAdminClient();
    const { effectiveUserId } = await resolveActiveIdentity(user, admin, req);
    const [{ data: cfg }, { data: items }, { data: pts }] = await Promise.all([
      admin.from('hero_config').select('*').eq('user_id', effectiveUserId).maybeSingle(),
      admin.from('avatar_items').select('item_id').eq('user_id', effectiveUserId),
      admin.from('user_points').select('total').eq('user_id', effectiveUserId).maybeSingle(),
    ]);

    return NextResponse.json({
      // بطل الاستوديو ثلاثي الأبعاد — null حتى يحفظ الطالب بطله أول مرة
      look:        cfg?.look ? normalizeLook(cfg.look) : null,
      preview_url: cfg?.look ? cfg?.preview_url ?? null : null,
      base_seed:   cfg?.base_seed ?? effectiveUserId,
      // زينة الأفاتار ثنائي الأبعاد القديم (AvatarWithAccessory) — للقراءة فقط
      equipped: {
        hat:        cfg?.equipped_hat        ?? null,
        glasses:    cfg?.equipped_glasses    ?? null,
        scarf:      cfg?.equipped_scarf      ?? null,
        halo:       cfg?.equipped_halo       ?? null,
        companion:  cfg?.equipped_companion  ?? null,
        background: cfg?.equipped_background ?? null,
      },
      owned:  (items ?? []).map(r => r.item_id),
      points: pts?.total ?? 0,
    });
  } catch {
    return NextResponse.json(EMPTY);
  }
}

/* حفظ البطل: { look, preview_url? } — لا يُحفظ بطل يلبس قطعة لم تُشترَ */
export async function PATCH(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body?.look || typeof body.look !== 'object') {
      return NextResponse.json({ error: 'بيانات البطل ناقصة' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { effectiveUserId } = await resolveActiveIdentity(user, admin, req);
    const look = normalizeLook(body.look);

    const { data: items } = await admin.from('avatar_items').select('item_id').eq('user_id', effectiveUserId);
    const unpaid = unpaidItems(look, (items ?? []).map(r => r.item_id));
    if (unpaid.length) {
      return NextResponse.json({ error: 'اشترِ القطع الجديدة أولاً ثم احفظ بطلك 🛒', unpaid: unpaid.map(x => x.key) }, { status: 400 });
    }

    const row = {
      user_id: effectiveUserId,
      look,
      avatar_id: 'studio3d',
      avatar_url: null,
      updated_at: new Date().toISOString(),
    };
    if (isValidPreview(body.preview_url)) row.preview_url = body.preview_url;

    const { error } = await admin.from('hero_config').upsert(row, { onConflict: 'user_id' });
    if (error) return NextResponse.json({ error: 'تعذّر حفظ البطل، حاول مرة أخرى' }, { status: 500 });
    return NextResponse.json({ success: true, look });
  } catch {
    return NextResponse.json({ error: 'تعذّر حفظ البطل، حاول مرة أخرى' }, { status: 500 });
  }
}
