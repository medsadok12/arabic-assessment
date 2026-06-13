import { NextResponse }     from 'next/server';
import { createClient }    from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { notify }           from '../../../../lib/notify';
import { sendSessionEmail, sendTeacherInviteEmail } from '../../../../lib/email';
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

  const { students, studentName, studentEmail, sessionDate, startTime, durationMinutes = 60, subject,
          supportStudents = [], invitedTeacher = null } = body;

  // Support both single student (legacy) and array of students (group)
  const studentList = (students?.length > 0)
    ? students
    : [{ name: studentName, email: studentEmail }];

  if (!studentList[0]?.name || !sessionDate || !startTime)
    return NextResponse.json({ error: 'يرجى تحديد طالب واحد على الأقل والتاريخ والوقت' }, { status: 400 });

  const admin       = createAdminClient();
  const isGroup     = studentList.length > 1;
  const teacherName = teacher.user_metadata?.full_name ?? teacher.email;
  const roomName    = `aarem-${teacher.id.slice(0, 8)}-${sessionDate}-${startTime.replace(':', '')}`;

  // Conflict check only for solo sessions (group sessions share the same room intentionally)
  if (!isGroup) {
    const { data: conflicts } = await admin
      .from('sessions')
      .select('id')
      .eq('teacher_id', teacher.id)
      .eq('session_date', sessionDate)
      .eq('start_time', startTime)
      .eq('status', 'scheduled');
    if (conflicts?.length > 0)
      return NextResponse.json({ error: 'لديك حصة أخرى في نفس اليوم والوقت — اختر وقتاً مختلفاً' }, { status: 409 });
  }

  // Create one Meet link shared by all students
  const meet = await createMeetSession({
    summary:       subject ? `حصة: ${subject}` : `حصة جماعية — ${teacherName}`,
    description:   `حصة من ${teacherName} عبر أكاديمية عارم`,
    attendeeEmail: studentList[0]?.email || null,
    sessionDate, startTime, durationMinutes,
  });

  const rows = studentList.map(s => ({
    teacher_id:       teacher.id,
    teacher_name:     teacherName,
    student_name:     s.name,
    student_email:    s.email || null,
    session_date:     sessionDate,
    start_time:       startTime,
    duration_minutes: durationMinutes,
    subject:          subject || null,
    room_name:        roomName,
    meet_link:        meet?.meetLink || null,
    meet_event_id:    meet?.eventId  || null,
  }));

  const { data, error } = await admin.from('sessions').insert(rows).select();

  if (error) {
    if (error.code === '42P01')
      return NextResponse.json({ error: 'جدول الحصص غير موجود — شغّل SQL التهيئة من /bogga' }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send notification email to each main student
  for (const s of studentList.filter(x => x.email)) {
    sendSessionEmail({ to: s.email, studentName: s.name, teacherName, sessionDate, startTime, durationMinutes, subject }).catch(() => {});
  }

  // Anchor session id (first created) for support students + colleague invite
  const anchorId = data[0]?.id;

  // Insert support students linked to anchor session
  if (anchorId && supportStudents.length > 0) {
    const rows = supportStudents
      .filter(s => s.name)
      .map(s => ({ session_id: anchorId, student_name: s.name, student_email: s.email || null }));
    await admin.from('session_support_students').insert(rows).then(() => null).catch(() => null);

    for (const s of supportStudents.filter(x => x.email)) {
      sendSessionEmail({ to: s.email, studentName: s.name, teacherName, sessionDate, startTime, durationMinutes, subject }).catch(() => {});
    }
  }

  // Invite colleague teacher — info comes directly from frontend, no getUserById needed
  if (anchorId && invitedTeacher?.id && invitedTeacher?.email) {
    admin.from('session_teacher_invites')
      .insert({
        session_id:    anchorId,
        teacher_id:    invitedTeacher.id,
        teacher_email: invitedTeacher.email,
        teacher_name:  invitedTeacher.name ?? invitedTeacher.email,
      })
      .then(() => {
        sendTeacherInviteEmail({
          to:              invitedTeacher.email,
          teacherName:     invitedTeacher.name ?? invitedTeacher.email,
          inviterName:     teacherName,
          sessionDate, startTime, durationMinutes, subject,
        }).catch(() => {});
      })
      .catch(() => {});
  }

  await notify('session', '📅 حصة جديدة مجدولة',
    `${teacherName} ← ${studentList.map(s => s.name).join('، ')}`,
    { sessionDate, startTime });

  // Return array of sessions (or single for backward compat)
  return NextResponse.json(isGroup ? { sessions: data } : { session: data[0] });
}

// PATCH — edit session
export async function PATCH(req) {
  const teacher = await getTeacher();
  if (!teacher) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 }); }

  const { id, studentName, studentEmail, sessionDate, startTime, durationMinutes, subject, notes, status, recording_url, attended, meet_link } = body;
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
  if (studentName)                 updates.student_name     = studentName;
  if (studentEmail !== undefined)  updates.student_email    = studentEmail || null;
  if (sessionDate)                 updates.session_date     = sessionDate;
  if (startTime)                   updates.start_time       = startTime;
  if (durationMinutes)             updates.duration_minutes = durationMinutes;
  if (subject !== undefined)       updates.subject          = subject || null;
  if (notes !== undefined)         updates.notes            = notes || null;
  if (status === 'completed' || status === 'active') updates.status = status;
  if (recording_url !== undefined) updates.recording_url    = recording_url || null;
  if (attended      !== undefined) updates.attended         = attended;
  if (meet_link     !== undefined) updates.meet_link        = meet_link || null;

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
