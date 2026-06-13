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

  // Sessions are stored in academy local time — compute "now" in that timezone
  const TZ  = process.env.ACADEMY_TZ || 'Asia/Qatar';
  const now = new Date(new Date().toLocaleString('sv-SE', { timeZone: TZ }).replace(' ', 'T'));
  const p   = n => String(n).padStart(2, '0');
  const fmt = d => ({
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}`,
  });

  // نافذة: بعد 25 دقيقة → 35 دقيقة من الآن
  const from = fmt(new Date(now.getTime() + 25 * 60000));
  const to   = fmt(new Date(now.getTime() + 35 * 60000));

  // نجلب الحصص التي تبدأ في هذه النافذة ولم يُرسل تذكيرها
  const { data: sessions, error } = await admin
    .from('sessions')
    .select('id, student_email, student_name, teacher_name, session_date, start_time, duration_minutes, subject, meet_link, reminder_sent')
    .eq('status', 'scheduled')
    .eq('reminder_sent', false)
    .gte('session_date', from.date)
    .lte('session_date', to.date)
    .gte('start_time', from.date === to.date ? from.time : '00:00')
    .lte('start_time', from.date === to.date ? to.time   : '23:59');

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
        reminderType:    '30min',
      });
      await admin.from('sessions').update({ reminder_sent: true }).eq('id', s.id);
      sent.push(s.id);
    } catch (err) {
      console.error(`[cron/reminders] failed for session ${s.id}:`, err?.message ?? err);
    }
  }

  return NextResponse.json({ sent: sent.length, ids: sent });
}
