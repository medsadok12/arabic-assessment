import { NextResponse }    from 'next/server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { sendSessionEmail }  from '../../../../lib/email';

export const dynamic = 'force-dynamic';

// يُستدعى كل 30 دقيقة — يُرسل تذكيراً للطلاب الذين حصتهم خلال 25-35 دقيقة
export async function GET(req) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET && process.env.CRON_SECRET)
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const admin = createAdminClient();
  const now   = new Date();

  // نافذة: بعد 25 دقيقة → 35 دقيقة من الآن
  const from = new Date(now.getTime() + 25 * 60000).toISOString();
  const to   = new Date(now.getTime() + 35 * 60000).toISOString();

  const fromDate = from.slice(0, 10);
  const toDate   = to.slice(0, 10);
  const fromTime = from.slice(11, 16);
  const toTime   = to.slice(11, 16);

  // نجلب الحصص التي تبدأ في هذه النافذة ولم يُرسل تذكيرها
  const { data: sessions, error } = await admin
    .from('sessions')
    .select('id, student_email, student_name, teacher_name, session_date, start_time, duration_minutes, subject, meet_link, room_name, reminder_sent')
    .eq('status', 'scheduled')
    .eq('reminder_sent', false)
    .gte('session_date', fromDate)
    .lte('session_date', toDate)
    .gte('start_time', fromDate === fromTime ? fromTime : '00:00')
    .lte('start_time', toDate === toTime ? toTime : '23:59');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sent = [];
  for (const s of sessions ?? []) {
    if (!s.student_email) continue;
    try {
      await sendSessionEmail({
        to:              s.student_email,
        studentName:     s.student_name,
        teacherName:     s.teacher_name,
        sessionDate:     s.session_date,
        startTime:       s.start_time,
        durationMinutes: s.duration_minutes,
        subject:         s.subject,
      });
      await admin.from('sessions').update({ reminder_sent: true }).eq('id', s.id);
      sent.push(s.id);
    } catch (_) {}
  }

  return NextResponse.json({ sent: sent.length, ids: sent });
}
