import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

async function requireSuperAdmin() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const role = user.user_metadata?.role;
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

  const body = await req.json();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('pricing_plans')
    .insert([sanitize(body)])
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ plan: data });
}

export async function PATCH(req) {
  const user = await requireSuperAdmin();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, ...rest } = await req.json();
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('pricing_plans')
    .update({ ...sanitize(rest), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

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

function sanitize(b) {
  return {
    plan_name_ar:   String(b.plan_name_ar  ?? ''),
    plan_name_en:   String(b.plan_name_en  ?? ''),
    prices:         (b.prices && typeof b.prices === 'object') ? b.prices : {},
    checkout_urls:  (b.checkout_urls && typeof b.checkout_urls === 'object') ? b.checkout_urls : {},
    features_list:  Array.isArray(b.features_list) ? b.features_list : [],
    plan_type:      ['lessons','content_only','family','school'].includes(b.plan_type) ? b.plan_type : 'lessons',
    is_popular:     Boolean(b.is_popular),
    accent_color:   String(b.accent_color  ?? '#185FA5'),
    sort_order:     Number(b.sort_order    ?? 0),
    is_active:      b.is_active !== undefined ? Boolean(b.is_active) : true,
  };
}
