import { createClient }      from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { getRole } from '../../../../../lib/auth-role';

async function requireSuperAdmin() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const role = getRole(user);
  if (role !== 'super_admin' && role !== 'admin') return null;
  return user;
}

/** Number of currencies with actual prices configured in JSONB */
function priceScore(prices) {
  if (!prices || typeof prices !== 'object' || Array.isArray(prices)) return 0;
  return Object.values(prices).filter(v => Number(v?.monthly) > 0 || Number(v?.yearly) > 0).length;
}

/** GET — diagnostic: counts duplicates and empty-price rows */
export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('pricing_plans')
    .select('id, plan_name_ar, plan_name_en, plan_type, prices, price_monthly, is_active, created_at')
    .order('created_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const rows = data || [];

  // Group by (plan_name_ar + plan_type)
  const groups = {};
  for (const row of rows) {
    const key = `${row.plan_name_ar}||${row.plan_type}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  const duplicateGroups = Object.values(groups).filter(g => g.length > 1);

  // IDs that would be deleted (keep best, delete rest)
  const toDelete = [];
  for (const group of duplicateGroups) {
    const sorted = [...group].sort((a, b) => {
      const sa = priceScore(a.prices), sb = priceScore(b.prices);
      if (sb !== sa) return sb - sa; // higher score first
      return new Date(b.created_at) - new Date(a.created_at); // newer first
    });
    toDelete.push(...sorted.slice(1).map(r => r.id));
  }

  return Response.json({
    total: rows.length,
    duplicateGroupCount: duplicateGroups.length,
    toDeleteCount: toDelete.length,
    toDeleteIds: toDelete,
    rows: rows.map(r => ({
      id: r.id,
      plan_name_ar: r.plan_name_ar,
      plan_type: r.plan_type,
      is_active: r.is_active,
      priceScore: priceScore(r.prices),
      price_monthly_old: Number(r.price_monthly) || 0,
      created_at: r.created_at,
    })),
  });
}

/** POST — delete duplicate rows, keeping the one with the richest JSONB prices */
export async function POST() {
  const user = await requireSuperAdmin();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('pricing_plans')
    .select('id, plan_name_ar, plan_type, prices, price_monthly, created_at')
    .order('created_at', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const rows = data || [];

  const groups = {};
  for (const row of rows) {
    const key = `${row.plan_name_ar}||${row.plan_type}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  const toDelete = [];
  for (const group of Object.values(groups)) {
    if (group.length <= 1) continue;
    const sorted = [...group].sort((a, b) => {
      const sa = priceScore(a.prices), sb = priceScore(b.prices);
      if (sb !== sa) return sb - sa;
      return new Date(b.created_at) - new Date(a.created_at);
    });
    toDelete.push(...sorted.slice(1).map(r => r.id));
  }

  if (toDelete.length === 0) {
    return Response.json({ deleted: 0, message: 'لا توجد صفوف مكررة' });
  }

  const { error: delErr } = await admin
    .from('pricing_plans')
    .delete()
    .in('id', toDelete);

  if (delErr) return Response.json({ error: delErr.message }, { status: 500 });

  return Response.json({ deleted: toDelete.length });
}
