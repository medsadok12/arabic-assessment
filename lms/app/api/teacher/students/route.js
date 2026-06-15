import { NextResponse }     from 'next/server';
import { createClient }    from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'teacher')
    return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });

  const admin = createAdminClient();

  const { data: sessions, error } = await admin
    .from('sessions')
    .select('student_name, student_email, session_date, status')
    .eq('teacher_id', user.id);

  if (error) {
    if (error.code === '42P01') return NextResponse.json({ students: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!sessions?.length) return NextResponse.json({ students: [] });

  // Build unique students
  const map = {};
  for (const s of sessions) {
    const key = s.student_email || s.student_name;
    if (!map[key]) map[key] = { name: s.student_name, email: s.student_email, sessions: 0, assessments: [] };
    if (s.status !== 'cancelled') map[key].sessions++;
  }

  // Fetch assessments for students who have an email
  const emails = Object.values(map).filter(s => s.email).map(s => s.email);
  if (emails.length > 0) {
    try {
      const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const emailToId = {};
      users?.forEach(u => { if (emails.includes(u.email)) emailToId[u.email] = u.id; });

      const ids = Object.values(emailToId);
      if (ids.length > 0) {
        const { data: asmts } = await admin
          .from('assessments')
          .select('user_id, level, score, completed_at')
          .in('user_id', ids)
          .order('completed_at', { ascending: false });

        for (const student of Object.values(map)) {
          if (student.email && emailToId[student.email]) {
            student.assessments = (asmts ?? [])
              .filter(a => a.user_id === emailToId[student.email])
              .slice(0, 3);
          }
        }
      }
    } catch (_) {}
  }

  return NextResponse.json({ students: Object.values(map) });
}
