import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase-server';
import { createAdminClient } from '../../lib/supabase-admin';
import DashboardContent from '../../components/DashboardContent';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: assessments } = await supabase
    .from('assessments')
    .select('id, level, score, completed_at, student_name')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(50);

  const role      = user.user_metadata?.role ?? 'student';
  const isStudent = role === 'student';

  if (role === 'admin' || role === 'super_admin') redirect('/bogga');
  if (role === 'teacher') redirect('/teacher');
  if (role === 'supervisor') redirect('/supervisor');

  const today = new Date().toISOString().slice(0, 10);
  const admin = createAdminClient();
  const { data: sessionsRaw } = await admin
    .from('sessions')
    .select('id, teacher_name, session_date, start_time, duration_minutes, subject, room_name, meet_link')
    .ilike('student_email', user.email)
    .eq('status', 'scheduled')
    .gte('session_date', today)
    .order('session_date', { ascending: true })
    .order('start_time',   { ascending: true })
    .limit(5)
    .then(r => r.error?.code === '42P01' ? { data: [] } : r);

  const upcomingSessions = sessionsRaw ?? [];

  // Attendance stats
  const { data: pastRaw } = await admin
    .from('sessions')
    .select('id, attended')
    .ilike('student_email', user.email)
    .not('attended', 'is', null)
    .limit(100)
    .then(r => r.error ? { data: [] } : r);
  const attendanceRecords = pastRaw ?? [];
  const attendedCount     = attendanceRecords.filter(s => s.attended === true).length;
  const attendancePct     = attendanceRecords.length > 0 ? Math.round((attendedCount / attendanceRecords.length) * 100) : null;

  const displayName   = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '';
  const studentGender = user.user_metadata?.gender === 'female' ? 'female' : 'male';

  return (
    <DashboardContent
      user={user}
      assessments={assessments ?? []}
      role={role}
      isStudent={isStudent}
      upcomingSessions={upcomingSessions}
      displayName={displayName}
      studentGender={studentGender}
      attendancePct={attendancePct}
      attendedCount={attendedCount}
      attendanceTotal={attendanceRecords.length}
    />
  );
}
