import { NextResponse }      from 'next/server';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

async function getTeacher() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'teacher') return null;
  return user;
}

export async function GET(req) {
  const teacher = await getTeacher();
  if (!teacher) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  const name  = searchParams.get('name');
  if (!email && !name) return NextResponse.json({ error: 'يجب تحديد الطالب' }, { status: 400 });

  const admin = createAdminClient();

  // Sessions (all, with notes + attendance)
  let sessionsQuery = admin
    .from('sessions')
    .select('id, session_date, start_time, subject, status, attended, notes')
    .eq('teacher_id', teacher.id)
    .order('session_date', { ascending: false })
    .limit(50);

  sessionsQuery = email
    ? sessionsQuery.eq('student_email', email.toLowerCase())
    : sessionsQuery.ilike('student_name', name);

  // Homework
  let hwQuery = admin
    .from('homework')
    .select('id, title, description, due_date, status, created_at')
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: false })
    .limit(50);

  hwQuery = email
    ? hwQuery.eq('student_email', email.toLowerCase())
    : hwQuery.ilike('student_name', name);

  const [{ data: sessions }, { data: homework }] = await Promise.all([
    sessionsQuery,
    hwQuery,
  ]);

  // Assessments — resolve via auth if email provided
  let assessments = [];
  if (email) {
    try {
      const { data: { user: found }, error: lookupErr } = await admin.auth.admin.getUserByEmail(email);
      if (!lookupErr && found) {
        const { data } = await admin
          .from('assessments')
          .select('level, score, completed_at')
          .eq('user_id', found.id)
          .order('completed_at', { ascending: false })
          .limit(20);
        assessments = data ?? [];
      }
    } catch (_) {}
  }

  return NextResponse.json({
    sessions:    sessions    ?? [],
    homework:    homework    ?? [],
    assessments: assessments ?? [],
  });
}
