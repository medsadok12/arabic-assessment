import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ base_seed: null, equipped: {}, owned: [], points: 0 });

    const admin = createAdminClient();
    const [{ data: cfg }, { data: items }, { data: pts }] = await Promise.all([
      admin.from('hero_config').select('*').eq('user_id', user.id).maybeSingle(),
      admin.from('avatar_items').select('item_id').eq('user_id', user.id),
      admin.from('user_points').select('total').eq('user_id', user.id).maybeSingle(),
    ]);

    return NextResponse.json({
      base_seed:   cfg?.base_seed   ?? user.id,
      avatar_url:  cfg?.avatar_url  ?? null,
      preview_url: cfg?.preview_url ?? null,
      avatar_id:   cfg?.avatar_id   ?? null,
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
    return NextResponse.json({ base_seed: null, equipped: {}, owned: [], points: 0 });
  }
}

export async function PATCH(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const body  = await req.json();
    const admin = createAdminClient();
    const up    = { updated_at: new Date().toISOString() };

    if ('base_seed'   in body) up.base_seed           = body.base_seed;
    if ('avatar_url'  in body) up.avatar_url          = body.avatar_url;
    if ('preview_url' in body) up.preview_url         = body.preview_url;
    if ('avatar_id'   in body) up.avatar_id           = body.avatar_id;
    if ('hat'         in body) up.equipped_hat        = body.hat;
    if ('glasses'     in body) up.equipped_glasses    = body.glasses;
    if ('scarf'       in body) up.equipped_scarf      = body.scarf;
    if ('halo'        in body) up.equipped_halo       = body.halo;
    if ('companion'   in body) up.equipped_companion  = body.companion;
    if ('background'  in body) up.equipped_background = body.background;

    await admin.from('hero_config').upsert(
      { user_id: user.id, ...up },
      { onConflict: 'user_id' }
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
