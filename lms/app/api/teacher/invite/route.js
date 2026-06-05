import { NextResponse }    from 'next/server';
import { createClient }   from '../../../../lib/supabase-server';
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

  try {
    await sendSessionEmail({
      to: studentEmail, studentName: studentName || 'الطالب', teacherName,
      sessionDate, startTime, durationMinutes, subject,
      joinUrl: meetLink || `https://meet.jit.si/${roomName}`,
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
