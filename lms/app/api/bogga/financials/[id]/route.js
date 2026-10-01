import { createClient }     from '../../../../../lib/supabase-server';
import { createAdminClient } from '../../../../../lib/supabase-admin';
import { getRole } from '../../../../../lib/auth-role';

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = getRole(user) ?? '';
  return (role === 'super_admin' || role === 'admin') ? user : null;
}

// ── PATCH /api/bogga/financials/[id]  (update rate, hours, notes → recalc amount)
export async function PATCH(request, { params }) {
  const user = await requireAdmin();
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { body = {}; }

  const admin = createAdminClient();

  // Fetch current row to recalculate amount
  const { data: current } = await admin
    .from('invoices')
    .select('total_hours, rate_per_hour')
    .eq('id', params.id)
    .maybeSingle();

  if (!current) return Response.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });

  const totalHours   = body.total_hours   !== undefined ? Number(body.total_hours)   : current.total_hours;
  const ratePerHour  = body.rate_per_hour !== undefined ? Number(body.rate_per_hour) : current.rate_per_hour;
  const amount       = parseFloat((totalHours * ratePerHour).toFixed(2));

  const update = {
    total_hours:   totalHours,
    rate_per_hour: ratePerHour,
    amount,
    updated_at:    new Date().toISOString(),
  };
  if (body.notes      !== undefined) update.notes      = body.notes;
  if (body.user_email !== undefined) update.user_email = body.user_email;

  const { data, error } = await admin
    .from('invoices')
    .update(update)
    .eq('id', params.id)
    .select()
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ invoice: data });
}
