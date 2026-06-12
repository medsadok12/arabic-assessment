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
  const { data: sessions, error: sessErr } = await admin
    .from('sessions')
    .select('id,teacher_id,teacher_name,student_name,student_email,session_date,start_time,duration_minutes,subject')
    .eq('status', 'completed')
    .gte('session_date', dateFrom)
    .lte('session_date', dateEnd);

  if (sessErr) return Response.json({ error: sessErr.message }, { status: 500 });

  // ── No real sessions → fall back to mock data for UI testing ───────────────
  if (!sessions || sessions.length === 0) {
    const mockRows = type === 'teacher_payout'
      ? [
          {
            user_id: null, user_name: 'أستاذ أحمد العمري',
            user_email: 'ahmed.omari@demo.test', type,
            billing_period: period, sessions_count: 6,
            total_hours: 12, rate_per_hour: 80, amount: 960, status: 'draft',
            items: [
              { date: `${period}-03`, start_time: '09:00', subject: 'قواعد اللغة', student: 'نورة المطيري', teacher: 'أستاذ أحمد العمري', minutes: 60 },
              { date: `${period}-05`, start_time: '10:00', subject: 'قواعد اللغة', student: 'فهد العتيبي',   teacher: 'أستاذ أحمد العمري', minutes: 60 },
              { date: `${period}-10`, start_time: '09:00', subject: 'الإملاء',     student: 'نورة المطيري', teacher: 'أستاذ أحمد العمري', minutes: 90 },
              { date: `${period}-12`, start_time: '11:00', subject: 'الإملاء',     student: 'ريم الدوسري',  teacher: 'أستاذ أحمد العمري', minutes: 90 },
              { date: `${period}-17`, start_time: '09:00', subject: 'المحادثة',    student: 'فهد العتيبي',  teacher: 'أستاذ أحمد العمري', minutes: 60 },
              { date: `${period}-20`, start_time: '10:30', subject: 'المحادثة',    student: 'نورة المطيري', teacher: 'أستاذ أحمد العمري', minutes: 60 },
            ],
            updated_at: new Date().toISOString(),
          },
          {
            user_id: null, user_name: 'أستاذة سارة الخالدي',
            user_email: 'sara.khalidi@demo.test', type,
            billing_period: period, sessions_count: 8,
            total_hours: 10, rate_per_hour: 75, amount: 750, status: 'draft',
            items: [
              { date: `${period}-02`, start_time: '08:00', subject: 'الأدب العربي', student: 'ريم الدوسري',  teacher: 'أستاذة سارة الخالدي', minutes: 60 },
              { date: `${period}-04`, start_time: '08:00', subject: 'الأدب العربي', student: 'نورة المطيري', teacher: 'أستاذة سارة الخالدي', minutes: 60 },
              { date: `${period}-06`, start_time: '09:00', subject: 'الخط العربي',  student: 'فهد العتيبي',  teacher: 'أستاذة سارة الخالدي', minutes: 60 },
              { date: `${period}-09`, start_time: '08:00', subject: 'الأدب العربي', student: 'ريم الدوسري',  teacher: 'أستاذة سارة الخالدي', minutes: 60 },
              { date: `${period}-11`, start_time: '08:00', subject: 'الخط العربي',  student: 'نورة المطيري', teacher: 'أستاذة سارة الخالدي', minutes: 90 },
              { date: `${period}-14`, start_time: '09:00', subject: 'الأدب العربي', student: 'فهد العتيبي',  teacher: 'أستاذة سارة الخالدي', minutes: 60 },
              { date: `${period}-16`, start_time: '08:00', subject: 'الخط العربي',  student: 'ريم الدوسري',  teacher: 'أستاذة سارة الخالدي', minutes: 60 },
              { date: `${period}-19`, start_time: '09:00', subject: 'الأدب العربي', student: 'نورة المطيري', teacher: 'أستاذة سارة الخالدي', minutes: 30 },
            ],
            updated_at: new Date().toISOString(),
          },
          {
            user_id: null, user_name: 'أستاذ محمود السالم',
            user_email: 'mahmoud.salem@demo.test', type,
            billing_period: period, sessions_count: 5,
            total_hours: 8, rate_per_hour: 70, amount: 560, status: 'draft',
            items: [
              { date: `${period}-01`, start_time: '12:00', subject: 'التعبير الكتابي', student: 'فهد العتيبي',  teacher: 'أستاذ محمود السالم', minutes: 90 },
              { date: `${period}-07`, start_time: '12:00', subject: 'النحو والصرف',    student: 'ريم الدوسري',  teacher: 'أستاذ محمود السالم', minutes: 90 },
              { date: `${period}-13`, start_time: '13:00', subject: 'التعبير الكتابي', student: 'نورة المطيري', teacher: 'أستاذ محمود السالم', minutes: 90 },
              { date: `${period}-18`, start_time: '12:00', subject: 'النحو والصرف',    student: 'فهد العتيبي',  teacher: 'أستاذ محمود السالم', minutes: 60 },
              { date: `${period}-22`, start_time: '13:00', subject: 'التعبير الكتابي', student: 'ريم الدوسري',  teacher: 'أستاذ محمود السالم', minutes: 60 },
            ],
            updated_at: new Date().toISOString(),
          },
        ]
      : [
          {
            user_id: null, user_name: 'نورة المطيري',
            user_email: 'noura.mutairi@demo.test', type,
            billing_period: period, sessions_count: 6,
            total_hours: 7.5, rate_per_hour: 50, amount: 375, status: 'draft',
            items: [
              { date: `${period}-03`, subject: 'قواعد اللغة', teacher: 'أستاذ أحمد العمري',   student: 'نورة المطيري', minutes: 60 },
              { date: `${period}-04`, subject: 'الأدب العربي', teacher: 'أستاذة سارة الخالدي', student: 'نورة المطيري', minutes: 60 },
              { date: `${period}-10`, subject: 'الإملاء',      teacher: 'أستاذ أحمد العمري',   student: 'نورة المطيري', minutes: 90 },
              { date: `${period}-11`, subject: 'الخط العربي',  teacher: 'أستاذة سارة الخالدي', student: 'نورة المطيري', minutes: 90 },
              { date: `${period}-13`, subject: 'التعبير الكتابي', teacher: 'أستاذ محمود السالم', student: 'نورة المطيري', minutes: 90 },
              { date: `${period}-20`, subject: 'المحادثة',     teacher: 'أستاذ أحمد العمري',   student: 'نورة المطيري', minutes: 60 },
            ],
            updated_at: new Date().toISOString(),
          },
          {
            user_id: null, user_name: 'فهد العتيبي',
            user_email: 'fahad.otaibi@demo.test', type,
            billing_period: period, sessions_count: 5,
            total_hours: 5.5, rate_per_hour: 50, amount: 275, status: 'draft',
            items: [
              { date: `${period}-05`, subject: 'قواعد اللغة',      teacher: 'أستاذ أحمد العمري',   student: 'فهد العتيبي', minutes: 60 },
              { date: `${period}-06`, subject: 'الخط العربي',       teacher: 'أستاذة سارة الخالدي', student: 'فهد العتيبي', minutes: 60 },
              { date: `${period}-14`, subject: 'الأدب العربي',      teacher: 'أستاذة سارة الخالدي', student: 'فهد العتيبي', minutes: 60 },
              { date: `${period}-17`, subject: 'المحادثة',          teacher: 'أستاذ أحمد العمري',   student: 'فهد العتيبي', minutes: 60 },
              { date: `${period}-18`, subject: 'النحو والصرف',      teacher: 'أستاذ محمود السالم',  student: 'فهد العتيبي', minutes: 90 },
            ],
            updated_at: new Date().toISOString(),
          },
          {
            user_id: null, user_name: 'ريم الدوسري',
            user_email: 'reem.dossari@demo.test', type,
            billing_period: period, sessions_count: 7,
            total_hours: 8.5, rate_per_hour: 50, amount: 425, status: 'draft',
            items: [
              { date: `${period}-02`, subject: 'الأدب العربي',      teacher: 'أستاذة سارة الخالدي', student: 'ريم الدوسري', minutes: 60 },
              { date: `${period}-07`, subject: 'النحو والصرف',      teacher: 'أستاذ محمود السالم',  student: 'ريم الدوسري', minutes: 90 },
              { date: `${period}-09`, subject: 'الأدب العربي',      teacher: 'أستاذة سارة الخالدي', student: 'ريم الدوسري', minutes: 60 },
              { date: `${period}-12`, subject: 'الإملاء',           teacher: 'أستاذ أحمد العمري',   student: 'ريم الدوسري', minutes: 90 },
              { date: `${period}-16`, subject: 'الخط العربي',       teacher: 'أستاذة سارة الخالدي', student: 'ريم الدوسري', minutes: 60 },
              { date: `${period}-22`, subject: 'التعبير الكتابي',   teacher: 'أستاذ محمود السالم',  student: 'ريم الدوسري', minutes: 60 },
              { date: `${period}-24`, subject: 'قواعد اللغة',       teacher: 'أستاذ أحمد العمري',   student: 'ريم الدوسري', minutes: 90 },
            ],
            updated_at: new Date().toISOString(),
          },
        ];

    const { data: upserted, error: upsertErr } = await admin
      .from('invoices')
      .upsert(mockRows, { onConflict: 'user_email,type,billing_period', ignoreDuplicates: false })
      .select('id');

    if (upsertErr) return Response.json({ error: upsertErr.message }, { status: 500 });
    return Response.json({ created: upserted?.length ?? 0, mock: true });
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
    // 1. Fetch all auth users once — needed for name-based fallback
    let allUsers = [];
    try {
      const { data: { users } = {} } = await admin.auth.admin.listUsers({ perPage: 1000 });
      allUsers = users ?? [];
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
  const now = new Date().toISOString();

  for (const g of Object.values(groups)) {
    const hours = parseFloat((g.totalMinutes / 60).toFixed(2));
    const ex    = existingMap[g.user_email];
    if (ex) {
      // Invoice already exists — preserve admin-set rate/amount/status/items
      // Only refresh sessions_count and total_hours if no rate has been set yet
      if (Number(ex.rate_per_hour) === 0) {
        toUpdate.push({ id: ex.id, total_hours: hours, sessions_count: g.sessions_count, items: g.items, updated_at: now });
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
        updated_at:     now,
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
