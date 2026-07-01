import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { sendSessionEmail }  from '../../../../lib/email';

export const dynamic = 'force-dynamic';

async function getTeacher() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'teacher') return null;
  return user;
}

// GET — support students for a given session
// ?session_id=UUID
export async function GET(req) {
  const teacher = await getTeacher();
  if (!teacher) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const session_id = searchParams.get('session_id');
  if (!session_id) return NextResponse.json({ students: [] });

  const admin = createAdminClient();
  const { data } = await admin
    .from('session_support_students')
    .select('*')
    .eq('session_id', session_id);

  return NextResponse.json({ students: data ?? [] });
}

// POST — add a support student to a session
export async function POST(req) {
  const teacher = await getTeacher();
  if (!teacher) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const { session_id, student_name, student_email } = await req.json();
  if (!session_id || !student_name)
    return NextResponse.json({ error: 'session_id واسم الطالب مطلوبان' }, { status: 400 });

  const admin = createAdminClient();

  // Verify session belongs to this teacher
  const { data: session } = await admin
    .from('sessions')
    .select('id, teacher_name, session_date, start_time, duration_minutes, subject')
    .eq('id', session_id)
    .eq('teacher_id', teacher.id)
    .single();
  if (!session) return NextResponse.json({ error: 'الحصة غير موجودة' }, { status: 404 });

  const { data, error } = await admin
    .from('session_support_students')
    .insert({ session_id, student_name, student_email: student_email || null })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'الطالب مضاف مسبقاً' }, { status: 409 });
    if (error.code === '42P01') return NextResponse.json({ error: 'جدول طلاب الدعم غير موجود — شغّل SQL' }, { status: 503 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify the support student via email
  if (student_email) {
    sendSessionEmail({
      to:              student_email,
      studentName:     student_name,
      teacherName:     session.teacher_name,
      sessionDate:     session.session_date,
      startTime:       session.start_time,
      durationMinutes: session.duration_minutes,
      subject:         session.subject,
    }).catch(() => {});
  }

  return NextResponse.json({ student: data });
}

// DELETE — remove a support student by row id
export async function DELETE(req) {
  const teacher = await getTeacher();
  if (!teacher) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id مطلوب' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from('session_support_students')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
