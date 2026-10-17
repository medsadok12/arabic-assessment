import { createAdminClient } from '../../../../../lib/supabase-admin';
import {
  json, requireWwStaff, isMissingSchema, schemaResponse, WHEEL_COLUMNS, canEditWheel, canDeleteWheel,
} from '../../../../../lib/word-wheel-server';
import { sanitizeWheelInput } from '../../../../../lib/word-wheel';

export const dynamic = 'force-dynamic';

async function loadRow(admin, id) {
  return admin.from('word_wheel_configs').select('id, created_by').eq('id', id).maybeSingle();
}

// PUT — تعديل عجلة (كاملة أو جزئياً: إظهار/إخفاء، ترتيب…)
export async function PUT(req, { params }) {
  const { user, error: denied } = await requireWwStaff();
  if (denied) return denied;
  try {
    const admin = createAdminClient();
    const { data: current, error: curErr } = await loadRow(admin, params.id);
    if (curErr) return json({ error: curErr.message }, 500);
    if (!current) return json({ error: 'العجلة غير موجودة' }, 404);
    if (!canEditWheel(user, current)) return json({ error: 'هذه العجلة أنشأها معلم آخر — يعدّلها هو أو المشرف' }, 403);

    const { data, error: invalid } = sanitizeWheelInput(await req.json().catch(() => null), { partial: true });
    if (invalid) return json({ error: invalid }, 400);
    const { data: row, error } = await admin
      .from('word_wheel_configs')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select(WHEEL_COLUMNS)
      .single();
    if (error) return isMissingSchema(error) ? schemaResponse() : json({ error: error.message }, 500);
    return json({ config: { ...row, can_edit: true, can_delete: canDeleteWheel(user, row) } });
  } catch (e) {
    return json({ error: e.message || 'تعذّر حفظ العجلة' }, 500);
  }
}

// DELETE — حذف عجلة نهائياً (للإخفاء المؤقت: is_active = false من PUT)
export async function DELETE(req, { params }) {
  const { user, error: denied } = await requireWwStaff();
  if (denied) return denied;
  try {
    const admin = createAdminClient();
    const { data: current, error: curErr } = await loadRow(admin, params.id);
    if (curErr) return json({ error: curErr.message }, 500);
    if (!current) return json({ error: 'العجلة غير موجودة' }, 404);
    if (!canDeleteWheel(user, current)) return json({ error: 'حذف هذه العجلة للمشرف أو لمن أنشأها — يمكنك إخفاؤها بدلاً من ذلك' }, 403);
    const { error } = await admin.from('word_wheel_configs').delete().eq('id', params.id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  } catch (e) {
    return json({ error: e.message || 'تعذّر حذف العجلة' }, 500);
  }
}
