import { NextResponse }      from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { notifyUser }        from '../../../../lib/notify';

export const dynamic = 'force-dynamic';

// يُستدعى كل 5 دقائق — يُرسل إشعاراً عاجلاً في صندوق المعلم عند اقتراب حصته
export async function GET(req) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET && process.env.CRON_SECRET)
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const admin = createAdminClient();
  const now   = new Date();

  // نافذة: الحصص التي تبدأ خلال 2 → 8 دقائق من الآن
  // (نافذة 6 دقائق تضمن التقاط أي حصة حتى لو تأخر الـ cron قليلاً)
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
    // عمود غير موجود → لم يُشغَّل SQL بعد
    if (error.code === '42703')
      return NextResponse.json({ note: 'reminder_5min_sent column missing — run SQL migration' });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sent = [];
  for (const s of sessions ?? []) {
    if (!s.teacher_id) continue;
    try {
      await notifyUser(
        s.teacher_id,
        'session',
        '⚡ تذكير من فهيم: لديك حصة بعد 5 دقائق!',
        `${s.student_name}${s.subject ? ` — ${s.subject}` : ' — حصة عامة'}`,
      );
      await admin.from('sessions').update({ reminder_5min_sent: true }).eq('id', s.id);
      sent.push(s.id);
    } catch (_) {}
  }

  return NextResponse.json({ sent: sent.length, ids: sent });
}
