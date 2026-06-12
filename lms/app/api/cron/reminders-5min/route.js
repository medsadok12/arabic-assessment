import { NextResponse }      from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { notifyUser }        from '../../../../lib/notify';

export const dynamic = 'force-dynamic';

// Fahim bot — stable system UUID (not in auth.users, only used as sender identity)
const FAHIM_BOT_ID   = '00000000-0000-4000-8000-000000000001';
const FAHIM_NAME     = 'فهيم 🦉';
const FAHIM_ROLE     = 'system';
const FAHIM_AVATAR   = null;

// Sessions are stored in academy local time — compute "now" in that timezone,
// NOT in server UTC, otherwise reminders fire 1+ hour late
const ACADEMY_TZ = process.env.ACADEMY_TZ || 'Asia/Qatar';
function nowInAcademyTz() {
  // sv-SE locale gives "YYYY-MM-DD HH:mm:ss" — directly parseable
  const s = new Date().toLocaleString('sv-SE', { timeZone: ACADEMY_TZ });
  return new Date(s.replace(' ', 'T'));
}
function fmtLocal(d) {
  const p = n => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}`,
  };
}

// يُستدعى كل 5 دقائق — يُرسل تذكيراً عاجلاً للمعلم في صندوق الرسائل
export async function GET(req) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = req.headers.get('x-cron-secret');
  const vercelAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const manualAuth = cronSecret === process.env.CRON_SECRET;
  if (process.env.CRON_SECRET && !vercelAuth && !manualAuth)
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const admin = createAdminClient();
  const now   = nowInAcademyTz();

  const from = fmtLocal(new Date(now.getTime() + 2 * 60000));
  const to   = fmtLocal(new Date(now.getTime() + 8 * 60000));

  const { data: sessions, error } = await admin
    .from('sessions')
    .select('id, teacher_id, teacher_name, student_name, subject, session_date, start_time, reminder_5min_sent')
    .eq('status', 'scheduled')
    .eq('reminder_5min_sent', false)
    .gte('session_date', from.date)
    .lte('session_date', to.date)
    .gte('start_time', from.date === to.date ? from.time : '00:00')
    .lte('start_time', from.date === to.date ? to.time   : '23:59');

  if (error) {
    if (error.code === '42703')
      return NextResponse.json({ note: 'reminder_5min_sent column missing — run SQL migration' });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sent = [];
  const failures = [];
  for (const s of sessions ?? []) {
    if (!s.teacher_id) continue;
    try {
      const sessionLabel = `${s.student_name}${s.subject ? ` — ${s.subject}` : ' — حصة عامة'}`;
      const dmContent    = '⚠️ مهمة عاجلة: تذكير من فهيم. أهلاً بك يا أستاذ، لديك حصة مبرمجة ستنطلق بعد 5 دقائق تماماً. يرجى الاستعداد ودخول البث فوراً 🚀';
      const groupContent = `⚠️ @${s.teacher_name} لديك حصة مع ${sessionLabel} بعد 5 دقائق — استعد وادخل البث فوراً! 🚀`;

      // 1. جرس الإشعار (notification bell)
      await notifyUser(s.teacher_id, 'session',
        '⚡ تذكير من فهيم: لديك حصة بعد 5 دقائق!', sessionLabel);

      // 2. رسالة خاصة (DM) من فهيم إلى المعلم — تظهر في صندوق محادثاته
      const convKey = [FAHIM_BOT_ID, s.teacher_id].sort().join('_');
      const { error: dmErr } = await admin.from('dm_messages').insert({
        conv_key:     convKey,
        sender_id:    FAHIM_BOT_ID,
        sender_name:  FAHIM_NAME,
        sender_role:  FAHIM_ROLE,
        sender_avatar: FAHIM_AVATAR,
        content:      dmContent,
        is_task:      true,
        task_status:  'pending',
      });
      if (dmErr) failures.push({ id: s.id, table: 'dm_messages', error: dmErr.message });

      // 3. رسالة في المجموعة (فريق العمل) مع @mention للمعلم
      const { error: tmErr } = await admin.from('team_messages').insert({
        sender_id:    FAHIM_BOT_ID,
        sender_name:  FAHIM_NAME,
        sender_role:  FAHIM_ROLE,
        sender_avatar: FAHIM_AVATAR,
        content:      groupContent,
        is_task:      true,
        task_status:  'pending',
      });
      if (tmErr) failures.push({ id: s.id, table: 'team_messages', error: tmErr.message });

      await admin.from('sessions').update({ reminder_5min_sent: true }).eq('id', s.id);
      sent.push(s.id);
    } catch (e) {
      failures.push({ id: s.id, error: String(e?.message ?? e) });
    }
  }

  return NextResponse.json({ sent: sent.length, ids: sent, failures, window: { from, to } });
}
