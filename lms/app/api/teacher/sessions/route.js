import { NextResponse }     from 'next/server';
import { createClient }    from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { notify }           from '../../../../lib/notify';
import { sendSessionEmail } from '../../../../lib/email';
import { createMeetSession, deleteMeetEvent } from '../../../../lib/google-meet';

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

  const admin = createAdminClient();

  // Conflict detection
  const { data: conflicts } = await admin
    .from('sessions')
    .select('id')
    .eq('teacher_id', teacher.id)
    .eq('session_date', sessionDate)
    .eq('start_time', startTime)
    .eq('status', 'scheduled');

  if (conflicts?.length > 0)
    return NextResponse.json({ error: 'لديك حصة أخرى في نفس اليوم والوقت — اختر وقتاً مختلفاً' }, { status: 409 });

  const teacherName = teacher.user_metadata?.full_name ?? teacher.email;
  const roomName    = `aarem-${teacher.id.slice(0, 8)}-${sessionDate}-${startTime.replace(':', '')}`;

  // محاولة إنشاء رابط Google Meet (مع تسجيل تلقائي) — يرجع null عند غياب الإعداد
  const meet = await createMeetSession({
    summary:       subject ? `حصة: ${subject} — ${studentName}` : `حصة — ${studentName}`,
    description:   `حصة من ${teacherName} للطالب ${studentName} عبر أكاديمية عارم`,
    attendeeEmail: studentEmail || null,
    sessionDate, startTime, durationMinutes,
  });

  const { data, error } = await admin
    .from('sessions')
    .insert({
      teacher_id: teacher.id, teacher_name: teacherName,
      student_name: studentName, student_email: studentEmail || null,
      session_date: sessionDate, start_time: startTime,
      duration_minutes: durationMinutes,
      subject: subject || null, room_name: roomName,
      meet_link:     meet?.meetLink || null,
      meet_event_id: meet?.eventId  || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '42P01')
      return NextResponse.json({ error: 'جدول الحصص غير موجود — شغّل SQL التهيئة من /bogga' }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (studentEmail) {
    const joinUrl = meet?.meetLink || `https://meet.jit.si/${roomName}`;
    sendSessionEmail({ to: studentEmail, studentName, teacherName, sessionDate, startTime, durationMinutes, subject, joinUrl }).catch(() => {});
  }

  await notify('session', '📅 حصة جديدة مجدولة', `${teacherName} ← ${studentName}`, { sessionDate, startTime });

  return NextResponse.json({ session: data });
}

// PATCH — edit session
export async function PATCH(req) {
  const teacher = await getTeacher();
  if (!teacher) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 }); }

  const { id, studentName, studentEmail, sessionDate, startTime, durationMinutes, subject, notes } = body;
  if (!id) return NextResponse.json({ error: 'معرّف الحصة مطلوب' }, { status: 400 });

  const admin = createAdminClient();

  // Conflict detection (exclude current session)
  if (sessionDate && startTime) {
    const { data: conflicts } = await admin
      .from('sessions')
      .select('id')
      .eq('teacher_id', teacher.id)
      .eq('session_date', sessionDate)
      .eq('start_time', startTime)
      .eq('status', 'scheduled')
      .neq('id', id);

    if (conflicts?.length > 0)
      return NextResponse.json({ error: 'لديك حصة أخرى في نفس اليوم والوقت — اختر وقتاً مختلفاً' }, { status: 409 });
  }

  const updates = {};
  if (studentName)            updates.student_name     = studentName;
  if (studentEmail !== undefined) updates.student_email = studentEmail || null;
  if (sessionDate)            updates.session_date     = sessionDate;
  if (startTime)              updates.start_time       = startTime;
  if (durationMinutes)        updates.duration_minutes = durationMinutes;
  if (subject !== undefined)  updates.subject          = subject || null;
  if (notes  !== undefined)  updates.notes            = notes  || null;

  const { data, error } = await admin
    .from('sessions')
    .update(updates)
    .eq('id', id)
    .eq('teacher_id', teacher.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}

// DELETE — cancel session
export async function DELETE(req) {
  const teacher = await getTeacher();
  if (!teacher) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 }); }

  const admin = createAdminClient();

  // اجلب الحدث لحذفه من تقويم Google (best-effort)
  const { data: existing } = await admin
    .from('sessions')
    .select('meet_event_id')
    .eq('id', body.id)
    .eq('teacher_id', teacher.id)
    .single();

  const { error } = await admin
    .from('sessions')
    .update({ status: 'cancelled' })
    .eq('id', body.id)
    .eq('teacher_id', teacher.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (existing?.meet_event_id) deleteMeetEvent(existing.meet_event_id).catch(() => {});

  return NextResponse.json({ success: true });
}
