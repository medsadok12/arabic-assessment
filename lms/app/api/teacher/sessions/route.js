import { NextResponse }     from 'next/server';
import { createClient }    from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { notify }           from '../../../../lib/notify';
import { sendSessionEmail } from '../../../../lib/email';

export const dynamic = 'force-dynamic';

async function getTeacher() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'teacher') return null;
  return user;
}

// GET — teacher's sessions
export async function GET() {
  const teacher = await getTeacher();
  if (!teacher) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('sessions')
    .select('*')
    .eq('teacher_id', teacher.id)
    .order('session_date', { ascending: true })
    .order('start_time',   { ascending: true });

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ sessions: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sessions: data ?? [] });
}

// POST — create session
export async function POST(req) {
  const teacher = await getTeacher();
  if (!teacher) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 }); }

  const { studentName, studentEmail, sessionDate, startTime, durationMinutes = 60, subject } = body;
  if (!studentName || !sessionDate || !startTime)
    return NextResponse.json({ error: 'يرجى ملء جميع الحقول المطلوبة' }, { status: 400 });

  const teacherName = teacher.user_metadata?.full_name ?? teacher.email;
  const roomName    = `aarem-${teacher.id.slice(0, 8)}-${sessionDate}-${startTime.replace(':', '')}`;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('sessions')
    .insert({
      teacher_id: teacher.id, teacher_name: teacherName,
      student_name: studentName, student_email: studentEmail || null,
      session_date: sessionDate, start_time: startTime,
      duration_minutes: durationMinutes,
      subject: subject || null, room_name: roomName,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '42P01')
      return NextResponse.json({ error: 'جدول الحصص غير موجود. يرجى تشغيل SQL التهيئة من /bogga' }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send email to student (best-effort)
  if (studentEmail) {
    const joinUrl = `https://meet.jit.si/${roomName}`;
    sendSessionEmail({ to: studentEmail, studentName, teacherName, sessionDate, startTime, durationMinutes, subject, joinUrl }).catch(() => {});
  }

  await notify('session', '📅 حصة جديدة مجدولة', `${teacherName} ← ${studentName}`, { sessionDate, startTime });

  return NextResponse.json({ session: data });
}

// DELETE — cancel session
export async function DELETE(req) {
  const teacher = await getTeacher();
  if (!teacher) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 }); }

  const admin = createAdminClient();
  const { error } = await admin
    .from('sessions')
    .update({ status: 'cancelled' })
    .eq('id', body.id)
    .eq('teacher_id', teacher.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
