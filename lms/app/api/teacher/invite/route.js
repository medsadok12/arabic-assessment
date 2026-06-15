import { NextResponse }    from 'next/server';
import { createClient }   from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { sendSessionEmail } from '../../../../lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'teacher')
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 }); }

  const { studentName, studentEmail, teacherName, sessionDate, startTime, durationMinutes, subject, roomName, meetLink } = body;
  if (!studentEmail || (!roomName && !meetLink))
    return NextResponse.json({ error: 'البريد ورابط الحصة مطلوبان' }, { status: 400 });

  const admin = createAdminClient();

  // أنشئ سجل حصة للطالب المدعو إن لم يكن موجوداً بالفعل
  const { data: existing } = await admin
    .from('sessions')
    .select('id')
    .eq('teacher_id', user.id)
    .eq('student_email', studentEmail)
    .eq('session_date', sessionDate)
    .eq('start_time', startTime)
    .eq('status', 'scheduled')
    .maybeSingle();

  if (!existing) {
    await admin.from('sessions').insert({
      teacher_id:       user.id,
      teacher_name:     teacherName || (user.user_metadata?.full_name ?? user.email),
      student_name:     studentName || 'الطالب',
      student_email:    studentEmail,
      session_date:     sessionDate,
      start_time:       startTime,
      duration_minutes: durationMinutes || 60,
      subject:          subject || null,
      room_name:        roomName || null,
      meet_link:        meetLink || null,
    });
  }

  try {
    await sendSessionEmail({
      to: studentEmail, studentName: studentName || 'الطالب', teacherName,
      sessionDate, startTime, durationMinutes, subject,
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
