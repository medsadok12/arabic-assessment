import { NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { createClient } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ owned: [], equipped: null });

    const admin = createAdminClient();
    const { data: rows } = await admin
      .from('avatar_items')
      .select('item_id, equipped')
      .eq('user_id', user.id);

    const owned    = (rows ?? []).map(r => r.item_id);
    const equipped = rows?.find(r => r.equipped)?.item_id ?? null;
    return NextResponse.json({ owned, equipped });
  } catch {
    return NextResponse.json({ owned: [], equipped: null });
  }
}

// PATCH { itemId: string | null } — equip or unequip
export async function PATCH(req) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'غير مسجل' }, { status: 401 });

    const { itemId } = await req.json();
    const admin = createAdminClient();

    await admin.from('avatar_items')
      .update({ equipped: false })
      .eq('user_id', user.id);

    if (itemId) {
      await admin.from('avatar_items')
        .update({ equipped: true })
        .eq('user_id', user.id)
        .eq('item_id', itemId);
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
