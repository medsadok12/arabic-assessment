import { createAdminClient } from '../../../lib/supabase-admin';
import { DISCOVER_ID, validateDiscover } from '../../../lib/discover-objects';
import { addDiscoverScenePack } from '../../../lib/discover-objects-scenes';
import { discoverJson as json, discoverUser, loadDiscover } from '../../../lib/discover-objects-server';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await discoverUser();
  if (auth.error) return auth.error;
  try { return json({ ...await loadDiscover(createAdminClient()), staff: auth.staff }); }
  catch { return json({ error: 'فهيم يجهّز الحديقة. جرّب فتحها مرة أخرى.' }, 503); }
}
export async function PUT(req) {
  const auth = await discoverUser(true);
  if (auth.error) return auth.error;
  let body;
  try { if (Number(req.headers.get('content-length')) > 300000) return json({ error: 'المحتوى كبير' }, 413); body = await req.json(); }
  catch { return json({ error: 'بيانات غير صالحة' }, 400); }
  const checked = validateDiscover(body?.config);
  if (checked.error) return json({ error: checked.error }, 400);
  checked.config = addDiscoverScenePack(checked.config);
  if (body.version !== null && typeof body.version !== 'string') return json({ error: 'أعد تحميل المحتوى قبل الحفظ' }, 400);
  try {
    const admin = createAdminClient();
    const updated_at = new Date(Math.max(Date.now(), (Date.parse(body.version) || 0) + 1)).toISOString();
    const row = { game_id: DISCOVER_ID, settings: checked.config, updated_at, updated_by: auth.user.id };
    // حفظ مشروط: لا يمحو تعديل معلم آخر فتح اللوحة في الوقت نفسه.
    const result = body.version === null
      ? await admin.from('game_settings').insert(row).select('updated_at').single()
      : await admin.from('game_settings').update(row).eq('game_id', DISCOVER_ID).eq('updated_at', body.version).select('updated_at').maybeSingle();
    if (result.error?.code === '23505' || (!result.error && !result.data)) return json({ error: 'عدّل زميل آخر هذا التدريب. احتفظ بنسختك ثم أعد تحميل المحتوى قبل الحفظ.' }, 409);
    if (result.error) throw result.error;
    return json({ config: checked.config, version: result.data.updated_at });
  } catch { return json({ error: 'تعذّر الحفظ. لم تُستبدل إعدادات التدريب، أعد المحاولة.' }, 500); }
}
