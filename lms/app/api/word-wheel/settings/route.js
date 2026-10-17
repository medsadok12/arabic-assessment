import { createAdminClient } from '../../../../lib/supabase-admin';
import { json, requireWwStaff, loadGlobalConfig } from '../../../../lib/word-wheel-server';
import { WW_GAME_ID, normalizeGlobalConfig } from '../../../../lib/word-wheel';

export const dynamic = 'force-dynamic';

// GET — المظهر والإعدادات العامة للعبة (للوحة الإدارة)
export async function GET() {
  const { error: denied } = await requireWwStaff();
  if (denied) return denied;
  try {
    return json({ config: await loadGlobalConfig(createAdminClient()) });
  } catch (e) {
    return json({ error: e.message || 'تعذّر تحميل الإعدادات' }, 500);
  }
}

// PUT — حفظ المظهر العام (ألوان العجلة والخلفية والأزرار) وإعدادات المساعدة والمكافآت
export async function PUT(req) {
  const { user, error: denied } = await requireWwStaff();
  if (denied) return denied;
  try {
    const config = normalizeGlobalConfig(await req.json().catch(() => null));
    const { error } = await createAdminClient().from('game_settings').upsert(
      { game_id: WW_GAME_ID, settings: config, updated_at: new Date().toISOString(), updated_by: user.id },
      { onConflict: 'game_id' },
    );
    if (error) return json({ error: error.message }, 500);
    return json({ config });
  } catch (e) {
    return json({ error: e.message || 'تعذّر حفظ الإعدادات' }, 500);
  }
}
