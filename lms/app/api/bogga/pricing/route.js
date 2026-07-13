import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { getRole } from '../../../../lib/auth-role';

async function requireSuperAdmin() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const role = getRole(user);
  if (role !== 'super_admin' && role !== 'admin') return null;
  return user;
}

export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('pricing_plans')
    .select('*')
    .order('plan_type')
    .order('sort_order', { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ plans: data ?? [] });
}

export async function POST(req) {
  const user = await requireSuperAdmin();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body  = await req.json();
  const admin = createAdminClient();

  // Try with new JSONB columns first; fall back to old flat columns if missing
  const payload = buildPayload(body);
  let { data, error } = await admin
    .from('pricing_plans')
    .insert([payload])
    .select()
    .single();

  if (error?.message?.includes("prices") || error?.message?.includes("checkout_urls")) {
    const fallback = buildLegacyPayload(body);
    ({ data, error } = await admin.from('pricing_plans').insert([fallback]).select().single());
  }

  if (error) return Response.json({ error: error.message, hint: 'Run SQL migration to add prices/checkout_urls columns' }, { status: 500 });
  return Response.json({ plan: data });
}

export async function PATCH(req) {
  const user = await requireSuperAdmin();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, ...rest } = await req.json();
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  const admin   = createAdminClient();
  const payload = buildPayload(rest);
  let { data, error } = await admin
    .from('pricing_plans')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  // If prices/checkout_urls columns don't exist yet, fall back to old columns
  if (error?.message?.includes("prices") || error?.message?.includes("checkout_urls")) {
    const fallback = buildLegacyPayload(rest);
    ({ data, error } = await admin.from('pricing_plans').update(fallback).eq('id', id).select().single());
    if (!error) {
      return Response.json({
        plan: data,
        warning: 'عمودا prices و checkout_urls غير موجودَين بعد — يُرجى تشغيل SQL التالي في Supabase:\nALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS prices JSONB NOT NULL DEFAULT \'{}\', ADD COLUMN IF NOT EXISTS checkout_urls JSONB NOT NULL DEFAULT \'{}\'; NOTIFY pgrst, \'reload schema\';',
      });
    }
  }

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ plan: data });
}

export async function DELETE(req) {
  const user = await requireSuperAdmin();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from('pricing_plans').delete().eq('id', id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

/** Payload with new JSONB columns — strips zero/empty entries before storing */
function buildPayload(b) {
  // Only store currencies where at least one of monthly/yearly is a positive number
  const rawPrices = (b.prices && typeof b.prices === 'object') ? b.prices : {};
  const prices = {};
  for (const [code, entry] of Object.entries(rawPrices)) {
    const m = Number(entry?.monthly) || 0;
    const y = Number(entry?.yearly)  || 0;
    if (m > 0 || y > 0) prices[code] = { monthly: m, yearly: y };
  }

  // Only store checkout URLs that are non-empty strings
  const rawUrls = (b.checkout_urls && typeof b.checkout_urls === 'object') ? b.checkout_urls : {};
  const checkout_urls = {};
  for (const [code, url] of Object.entries(rawUrls)) {
    const u = String(url || '').trim();
    if (u) checkout_urls[code] = u;
  }

  return {
    plan_name_ar:   String(b.plan_name_ar  ?? ''),
    plan_name_en:   String(b.plan_name_en  ?? ''),
    prices,
    checkout_urls,
    features_list:  Array.isArray(b.features_list) ? b.features_list : [],
    plan_type:      ['lessons','content_only','family','school'].includes(b.plan_type) ? b.plan_type : 'lessons',
    is_popular:     Boolean(b.is_popular),
    accent_color:   String(b.accent_color  ?? '#185FA5'),
    sort_order:     Number(b.sort_order    ?? 0),
    is_active:      b.is_active !== undefined ? Boolean(b.is_active) : true,
  };
}

/** Legacy payload for tables without prices/checkout_urls columns yet */
function buildLegacyPayload(b) {
  const pricesMap = (b.prices && typeof b.prices === 'object') ? b.prices : {};
  const gbpEntry  = pricesMap['GBP'] || {};
  return {
    plan_name_ar:  String(b.plan_name_ar  ?? ''),
    plan_name_en:  String(b.plan_name_en  ?? ''),
    price_monthly: Number(gbpEntry.monthly ?? b.price_monthly ?? 0),
    price_yearly:  Number(gbpEntry.yearly  ?? b.price_yearly  ?? 0),
    checkout_url:  (b.checkout_urls?.GBP) || b.checkout_url || null,
    features_list: Array.isArray(b.features_list) ? b.features_list : [],
    plan_type:     ['lessons','content_only','family','school'].includes(b.plan_type) ? b.plan_type : 'lessons',
    is_popular:    Boolean(b.is_popular),
    accent_color:  String(b.accent_color  ?? '#185FA5'),
    sort_order:    Number(b.sort_order    ?? 0),
    is_active:     b.is_active !== undefined ? Boolean(b.is_active) : true,
  };
}
