import { createClient }     from '../../../../lib/supabase-server';
import { createAdminClient, fetchAllUsers } from '../../../../lib/supabase-admin';
import { getRole } from '../../../../lib/auth-role';

// ── auth helper ─────────────────────────────────────────────────────────────
async function requireAdmin(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = getRole(user) ?? '';
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

  // ── Qatar timezone (UTC+3, no DST) for period boundary calculation ──────────
  function qatarNow() {
    return new Date(Date.now() + 3 * 60 * 60 * 1000);
  }
  const defaultPeriod = (() => {
    const q = qatarNow();
    return `${q.getUTCFullYear()}-${String(q.getUTCMonth() + 1).padStart(2, '0')}`;
  })();

  const period = body.period || defaultPeriod;
  const type   = body.type   || 'teacher_payout';

  const admin = createAdminClient();

  // ── Date range using Qatar midnight boundaries ──────────────────────────────
  const [pYear, pMonth] = period.split('-').map(Number);
  // Convert Qatar midnight → UTC for TIMESTAMPTZ comparisons (if ever needed)
  // For DATE columns, simple YYYY-MM-DD strings suffice
  const dateFrom = `${period}-01`;
  const lastDay = new Date(pYear, pMonth, 0).getDate(); // day 0 of next month = last day of this month
  const dateEnd  = `${period}-${String(lastDay).padStart(2, '0')}`;
  const { data: rawSessions, error: sessErr } = await admin
    .from('sessions')
    .select('id,teacher_id,teacher_name,student_name,student_email,session_date,start_time,duration_minutes,subject,status')
    .in('status', ['completed', 'active'])
    .gte('session_date', dateFrom)
    .lte('session_date', dateEnd);

  // حصة مستحقة: مكتملة رسمياً، أو active تجاوزت 45 دقيقة من وقت البداية
  const now = new Date();
  const sessions = (rawSessions ?? []).filter(s => {
    if (s.status === 'completed') return true;
    const startDT     = new Date(`${s.session_date}T${s.start_time}`);
    const elapsedMins = (now - startDT) / 60000;
    return elapsedMins >= 45;
  });

  if (sessErr) return Response.json({ error: sessErr.message }, { status: 500 });

  if (!sessions || sessions.length === 0) {
    return Response.json({ created: 0 });
  }

  // Group sessions
  const groups = {};
  for (const s of sessions) {
    const key = type === 'teacher_payout'
      ? `${s.teacher_id ?? s.teacher_name}__${s.teacher_name}__${s.teacher_email ?? ''}`
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
    // 1. Fetch all auth users once — needed for name-based fallback
    let allUsers = [];
    try {
      allUsers = await fetchAllUsers(admin);
    } catch (_) {}

    // Build name → email map from user metadata
    const nameToEmail = {};
    for (const u of allUsers) {
      const name = u.user_metadata?.full_name ?? u.user_metadata?.name ?? '';
      if (name) nameToEmail[name] = u.email;
    }

    await Promise.all(
      Object.values(groups).map(async g => {
        // Priority 1: getUserById when teacher_id is present
        if (g.user_id) {
          try {
            const { data: { user } = {} } = await admin.auth.admin.getUserById(g.user_id);
            if (user?.email) { g.user_email = user.email; return; }
          } catch (_) {}
        }
        // Priority 2: match by teacher display name
        if (nameToEmail[g.user_name]) {
          g.user_email = nameToEmail[g.user_name];
        }
      })
    );
  }

  // ── Historical snapshot protection ─────────────────────────────────────────
  // Fetch already-existing invoices for this period to avoid overwriting admin edits
  const { data: existing } = await admin
    .from('invoices')
    .select('id, user_email, rate_per_hour, amount, status, items')
    .eq('billing_period', period)
    .eq('type', type);
  const existingMap = {};
  (existing ?? []).forEach(e => { existingMap[e.user_email] = e; });

  const toInsert = [];
  const toUpdate = [];
  const nowISO = new Date().toISOString();

  for (const g of Object.values(groups)) {
    if (type === 'teacher_payout' && g.user_email.endsWith('@teacher')) {
      console.warn(`[financials] Skipping teacher "${g.user_name}" — no valid email resolved. Fix their account data manually.`);
      continue;
    }
    const hours = parseFloat((g.totalMinutes / 60).toFixed(2));
    const ex    = existingMap[g.user_email];
    if (ex) {
      // Invoice already exists — preserve admin-set rate/amount/status/items
      // Only refresh sessions_count and total_hours if no rate has been set yet
      if (Number(ex.rate_per_hour) === 0) {
        toUpdate.push({ id: ex.id, total_hours: hours, sessions_count: g.sessions_count, items: g.items, updated_at: nowISO });
      }
      // If rate > 0: admin has edited → treat as locked snapshot, skip
    } else {
      toInsert.push({
        user_id:        g.user_id,
        user_name:      g.user_name,
        user_email:     g.user_email,
        type,
        billing_period: period,
        total_hours:    hours,
        sessions_count: g.sessions_count,
        rate_per_hour:  0,
        amount:         0,
        status:         'draft',
        items:          g.items,
        updated_at:     nowISO,
      });
    }
  }

  let created = 0;
  if (toInsert.length > 0) {
    const { data: ins, error: insErr } = await admin.from('invoices').insert(toInsert).select('id');
    if (insErr) return Response.json({ error: insErr.message }, { status: 500 });
    created = ins?.length ?? 0;
  }
  for (const upd of toUpdate) {
    const { id, ...fields } = upd;
    await admin.from('invoices').update(fields).eq('id', id);
  }

  return Response.json({ created, refreshed: toUpdate.length });
}
