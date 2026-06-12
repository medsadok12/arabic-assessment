import { NextResponse }      from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { notifyUser }        from '../../../../lib/notify';

export const dynamic = 'force-dynamic';

// Fahim bot — stable system UUID (not in auth.users, only used as sender identity)
const FAHIM_BOT_ID   = '00000000-0000-4000-8000-000000000001';
const FAHIM_NAME     = 'فهيم 🦉';
const FAHIM_ROLE     = 'system';
const FAHIM_AVATAR   = null;

// يُستدعى كل 5 دقائق — يُرسل تذكيراً عاجلاً للمعلم في صندوق الرسائل
export async function GET(req) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = req.headers.get('x-cron-secret');
  const vercelAuth = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const manualAuth = cronSecret === process.env.CRON_SECRET;
  if (process.env.CRON_SECRET && !vercelAuth && !manualAuth)
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const admin = createAdminClient();
  const now   = new Date();

  const from = new Date(now.getTime() + 2 * 60000).toISOString();
  const to   = new Date(now.getTime() + 8 * 60000).toISOString();

  const fromDate = from.slice(0, 10);
  const toDate   = to.slice(0, 10);
  const fromTime = from.slice(11, 16);
  const toTime   = to.slice(11, 16);

  const { data: sessions, error } = await admin
    .from('sessions')
    .select('id, teacher_id, teacher_name, student_name, subject, session_date, start_time, reminder_5min_sent')
    .eq('status', 'scheduled')
    .eq('reminder_5min_sent', false)
    .gte('session_date', fromDate)
    .lte('session_date', toDate)
    .gte('start_time', fromDate === toDate ? fromTime : '00:00')
    .lte('start_time', fromDate === toDate ? toTime   : '23:59');

  if (error) {
    if (error.code === '42703')
      return NextResponse.json({ note: 'reminder_5min_sent column missing — run SQL migration' });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sent = [];
  for (const s of sessions ?? []) {
    if (!s.teacher_id) continue;
    try {
      const sessionLabel = `${s.student_name}${s.subject ? ` — ${s.subject}` : ' — حصة عامة'}`;
      const dmContent    = `⚠️ مهمة عاجلة — تذكير من فهيم\n\nأهلاً يا أستاذ ${s.teacher_name}، لديك حصة مع ${sessionLabel} ستنطلق بعد 5 دقائق تماماً. يرجى الاستعداد ودخول البث فوراً 🚀`;
      const groupContent = `⚠️ @${s.teacher_name} لديك حصة مع ${sessionLabel} بعد 5 دقائق — استعد وادخل البث فوراً! 🚀`;

      // 1. جرس الإشعار (notification bell)
      await notifyUser(s.teacher_id, 'session',
        '⚡ تذكير من فهيم: لديك حصة بعد 5 دقائق!', sessionLabel);

      // 2. رسالة خاصة (DM) من فهيم إلى المعلم — تظهر في صندوق محادثاته
      const convKey = [FAHIM_BOT_ID, s.teacher_id].sort().join('_');
      await admin.from('dm_messages').insert({
        conv_key:     convKey,
        sender_id:    FAHIM_BOT_ID,
        sender_name:  FAHIM_NAME,
        sender_role:  FAHIM_ROLE,
        sender_avatar: FAHIM_AVATAR,
        content:      dmContent,
        is_task:      true,
        task_status:  'pending',
      });

      // 3. رسالة في المجموعة (فريق العمل) مع @mention للمعلم
      await admin.from('team_messages').insert({
        sender_id:    FAHIM_BOT_ID,
        sender_name:  FAHIM_NAME,
        sender_role:  FAHIM_ROLE,
        sender_avatar: FAHIM_AVATAR,
        content:      groupContent,
        is_task:      true,
        task_status:  'pending',
      });

      await admin.from('sessions').update({ reminder_5min_sent: true }).eq('id', s.id);
      sent.push(s.id);
    } catch (_) {}
  }

  return NextResponse.json({ sent: sent.length, ids: sent });
}
