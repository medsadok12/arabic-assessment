import { NextResponse }       from 'next/server';
import { createClient }       from '../../../../lib/supabase-server';
import { createAdminClient }  from '../../../../lib/supabase-admin';
import { sendSessionEmail }   from '../../../../lib/email';
import { createMeetSession }  from '../../../../lib/google-meet';

export const dynamic = 'force-dynamic';

async function checkAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = user.user_metadata?.role;
  if (role !== 'admin' && role !== 'super_admin') return null;
  return user;
}

// GET /api/bogga/sessions — all sessions
export async function GET() {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('sessions')
    .select('id, teacher_id, teacher_name, student_name, student_email, session_date, start_time, duration_minutes, subject, status, meet_link, room_name, notes, recording_url, reminder_sent, attended, created_at')
    .order('session_date', { ascending: false })
    .order('start_time',   { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data ?? [] });
}

// POST /api/bogga/sessions — create a session (admin-scheduled)
export async function POST(req) {
  const adminUser = await checkAdmin();
  if (!adminUser) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 }); }

  const { teacherName, teacherEmail, teacherId, studentName, studentEmail, sessionDate, startTime, durationMinutes = 60, subject } = body;

  if (!teacherName || !studentName || !sessionDate || !startTime)
    return NextResponse.json({ error: 'المعلم واسم الطالب والتاريخ والوقت مطلوبة' }, { status: 400 });

  const admin    = createAdminClient();
  const roomName = `aarem-adm-${(teacherId ?? adminUser.id).slice(0, 6)}-${sessionDate}-${startTime.replace(':', '')}`;

  // Create Meet link (best-effort)
  const meet = await createMeetSession({
    summary:       subject ? `حصة: ${subject}` : `حصة — ${teacherName}`,
    description:   `مجدولة من الإدارة`,
    attendeeEmail: studentEmail || null,
    sessionDate, startTime, durationMinutes,
  }).catch(() => null);

  const { data, error } = await admin.from('sessions').insert({
    teacher_id:       teacherId ?? null,
    teacher_name:     teacherName,
    student_name:     studentName,
    student_email:    studentEmail || null,
    session_date:     sessionDate,
    start_time:       startTime,
    duration_minutes: durationMinutes,
    subject:          subject || null,
    room_name:        roomName,
    meet_link:        meet?.meetLink  ?? null,
    meet_event_id:    meet?.eventId   ?? null,
    status:           'scheduled',
  }).select().single();

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ error: 'جدول الحصص غير موجود — شغّل SQL من تبويب الإعداد' }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify student
  if (studentEmail) {
    sendSessionEmail({ to: studentEmail, studentName, teacherName, sessionDate, startTime, durationMinutes, subject }).catch(() => {});
  }

  return NextResponse.json({ session: data });
}

// PATCH /api/bogga/sessions — update status / notes / recording_url
export async function PATCH(req) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const body = await req.json();
  const { id, status, notes, recording_url, attended } = body;
  if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });

  const updates = {};
  if (status        !== undefined) updates.status        = status;
  if (notes         !== undefined) updates.notes         = notes;
  if (recording_url !== undefined) updates.recording_url = recording_url;
  if (attended      !== undefined) updates.attended      = attended;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('sessions').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}

// DELETE /api/bogga/sessions — cancel session
export async function DELETE(req) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from('sessions').update({ status: 'cancelled' }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}


async function checkAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const role = user.user_metadata?.role;
  if (role !== 'admin' && role !== 'super_admin') return null;
  return user;
}

// GET /api/bogga/sessions — all sessions
export async function GET() {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('sessions')
    .select('id, teacher_id, teacher_name, student_name, student_email, session_date, start_time, duration_minutes, subject, status, meet_link, room_name, notes, recording_url, reminder_sent, attended, created_at')
    .order('session_date', { ascending: false })
    .order('start_time',   { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data ?? [] });
}

// PATCH /api/bogga/sessions — update status / notes / recording_url
export async function PATCH(req) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const body = await req.json();
  const { id, status, notes, recording_url, attended } = body;
  if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });

  const updates = {};
  if (status        !== undefined) updates.status        = status;
  if (notes         !== undefined) updates.notes         = notes;
  if (recording_url !== undefined) updates.recording_url = recording_url;
  if (attended      !== undefined) updates.attended      = attended;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('sessions').update(updates).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}

// DELETE /api/bogga/sessions — cancel session
export async function DELETE(req) {
  const user = await checkAdmin();
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from('sessions').update({ status: 'cancelled' }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
