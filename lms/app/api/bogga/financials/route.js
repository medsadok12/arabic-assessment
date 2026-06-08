import { createClient }     from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

// ── auth helper ─────────────────────────────────────────────────────────────
async function requireAdmin(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = user.user_metadata?.role ?? '';
  if (role !== 'super_admin' && role !== 'admin') return null;
  return user;
}

// ── GET /api/bogga/financials?period=YYYY-MM&type=teacher_payout|student_bill
export async function GET(request) {
  const user = await requireAdmin(request);
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || new Date().toISOString().slice(0, 7);
  const type   = searchParams.get('type')   || 'teacher_payout';

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('invoices')
    .select('*')
    .eq('billing_period', period)
    .eq('type', type)
    .order('user_name');

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ invoices: data ?? [] });
}

// ── POST /api/bogga/financials  (generate invoices from completed sessions)
export async function POST(request) {
  const user = await requireAdmin(request);
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { body = {}; }
  const period = body.period || new Date().toISOString().slice(0, 7);
  const type   = body.type   || 'teacher_payout';

  const admin = createAdminClient();

  // Fetch completed sessions for this month
  const dateFrom = `${period}-01`;
  const dateEnd  = `${period}-31`;
  const { data: sessions, error: sessErr } = await admin
    .from('sessions')
    .select('id,teacher_id,teacher_name,student_name,student_email,session_date,start_time,duration_minutes,subject')
    .eq('status', 'completed')
    .gte('session_date', dateFrom)
    .lte('session_date', dateEnd);

  if (sessErr) return Response.json({ error: sessErr.message }, { status: 500 });

  if (!sessions || sessions.length === 0) {
    return Response.json({ created: 0, message: 'لا توجد حصص مكتملة في هذه الفترة' });
  }

  // Group sessions
  const groups = {};
  for (const s of sessions) {
    const key = type === 'teacher_payout'
      ? `${s.teacher_id ?? s.teacher_name}__${s.teacher_name}__${s.teacher_name}`
      : `${s.student_email}__${s.student_name}__${s.student_email}`;

    if (!groups[key]) {
      groups[key] = {
        user_id:    type === 'teacher_payout' ? (s.teacher_id ?? null) : null,
        user_name:  type === 'teacher_payout' ? s.teacher_name : s.student_name,
        user_email: type === 'teacher_payout' ? (s.teacher_name + '@teacher') : (s.student_email ?? ''),
        items: [],
        totalMinutes: 0,
        sessions_count: 0,
      };
    }
    const g = groups[key];
    g.totalMinutes   += (s.duration_minutes ?? 60);
    g.sessions_count += 1;
    g.items.push({
      session_id: s.id,
      date:       s.session_date,
      start_time: s.start_time,
      subject:    s.subject,
      student:    s.student_name,
      teacher:    s.teacher_name,
      minutes:    s.duration_minutes ?? 60,
    });
  }

  // Fetch teacher emails for teacher payouts
  if (type === 'teacher_payout') {
    const teacherIds = [...new Set(
      Object.values(groups)
        .filter(g => g.user_id)
        .map(g => g.user_id)
    )];
    if (teacherIds.length > 0) {
      const { data: { users } = {} } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const emailMap = {};
      (users ?? []).forEach(u => { emailMap[u.id] = u.email; });
      Object.values(groups).forEach(g => {
        if (g.user_id && emailMap[g.user_id]) g.user_email = emailMap[g.user_id];
      });
    }
  }

  // Upsert invoices
  const rows = Object.values(groups).map(g => ({
    user_id:        g.user_id,
    user_name:      g.user_name,
    user_email:     g.user_email,
    type,
    billing_period: period,
    total_hours:    parseFloat((g.totalMinutes / 60).toFixed(2)),
    sessions_count: g.sessions_count,
    rate_per_hour:  0,
    amount:         0,
    status:         'draft',
    items:          g.items,
    updated_at:     new Date().toISOString(),
  }));

  const { data: upserted, error: upsertErr } = await admin
    .from('invoices')
    .upsert(rows, { onConflict: 'user_email,type,billing_period', ignoreDuplicates: false })
    .select('id');

  if (upsertErr) return Response.json({ error: upsertErr.message }, { status: 500 });

  return Response.json({ created: upserted?.length ?? 0 });
}
