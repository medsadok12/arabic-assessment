import { createAdminClient } from '../../../../lib/supabase-admin';
import {
  json, requireWwStaff, isMissingSchema, schemaResponse, WHEEL_COLUMNS, canEditWheel, canDeleteWheel,
} from '../../../../lib/word-wheel-server';
import { sanitizeWheelInput, sortWheels } from '../../../../lib/word-wheel';

export const dynamic = 'force-dynamic';

// GET — كل العجلات للوحة الإدارة (الظاهرة والمخفية) مع صلاحية كل عجلة للمستخدم
export async function GET() {
  const { user, error: denied } = await requireWwStaff();
  if (denied) return denied;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('word_wheel_configs').select(WHEEL_COLUMNS);
    if (error) return isMissingSchema(error) ? schemaResponse() : json({ error: error.message }, 500);
    const configs = sortWheels(data || []).map(r => ({ ...r, can_edit: canEditWheel(user, r), can_delete: canDeleteWheel(user, r) }));
    return json({ configs });
  } catch (e) {
    return json({ error: e.message || 'تعذّر تحميل العجلات' }, 500);
  }
}

// POST — عجلة جديدة بأي نمط
export async function POST(req) {
  const { user, error: denied } = await requireWwStaff();
  if (denied) return denied;
  try {
    const { data, error: invalid } = sanitizeWheelInput(await req.json().catch(() => null));
    if (invalid) return json({ error: invalid }, 400);
    const admin = createAdminClient();
    const { data: row, error } = await admin
      .from('word_wheel_configs')
      .insert({
        time_seconds: 90, level: 1, sort_order: 0, is_active: true,
        ...data, created_by: user.id, updated_at: new Date().toISOString(),
      })
      .select(WHEEL_COLUMNS)
      .single();
    if (error) return isMissingSchema(error) ? schemaResponse() : json({ error: error.message }, 500);
    return json({ config: { ...row, can_edit: true, can_delete: true } });
  } catch (e) {
    return json({ error: e.message || 'تعذّر حفظ العجلة' }, 500);
  }
}
