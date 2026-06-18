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

  const [{ data: sessionsRaw }, { data: supportLinks }] = await Promise.all([
    admin
      .from('sessions')
      .select('id, teacher_name, session_date, start_time, duration_minutes, subject, meet_link, status, attended')
      .ilike('student_email', user.email)
      .in('status', ['scheduled', 'active'])
      .gte('session_date', today)
      .order('session_date', { ascending: true })
      .order('start_time',   { ascending: true })
      .limit(5)
      .then(r => r.error?.code === '42P01' ? { data: [] } : r),
    admin
      .from('session_support_students')
      .select('session_id')
      .ilike('student_email', user.email)
      .then(r => r.error ? { data: [] } : r),
  ]);

  // Fetch support-student sessions separately and merge
  let supportSessions = [];
  const supportIds = (supportLinks ?? []).map(r => r.session_id).filter(Boolean);
  if (supportIds.length > 0) {
    const { data: supRaw } = await admin
      .from('sessions')
      .select('id, teacher_name, session_date, start_time, duration_minutes, subject, meet_link, status, attended')
      .in('id', supportIds)
      .in('status', ['scheduled', 'active'])
      .gte('session_date', today);
    // attended على الحصة يخص الطالب الأساسي — لا نمرره للطالب الإضافي
    supportSessions = (supRaw ?? []).map(s => ({ ...s, is_support: true, attended: null }));
  }

  const mainIds  = new Set((sessionsRaw ?? []).map(s => s.id));
  const nowMs    = Date.now();
  const merged   = [
    ...(sessionsRaw ?? []),
    ...supportSessions.filter(s => !mainIds.has(s.id)),
  ]
  .sort((a, b) => a.session_date.localeCompare(b.session_date) || a.start_time.localeCompare(b.start_time))
  .filter(s => {
    // حذف الحصص التي انتهت وقتها (تاريخ البدء + المدة < الآن)
    const startMs = new Date(`${s.session_date}T${s.start_time}`).getTime();
    const endMs   = startMs + (s.duration_minutes ?? 60) * 60000;
    return nowMs < endMs;
  })
  .slice(0, 5);

  const upcomingSessions = merged;

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

  // Past sessions with teacher notes
  const { data: notedRaw } = await admin
    .from('sessions')
    .select('id, teacher_name, session_date, subject, notes')
    .ilike('student_email', user.email)
    .not('notes', 'is', null)
    .neq('notes', '')
    .order('session_date', { ascending: false })
    .limit(10)
    .then(r => r.error ? { data: [] } : r);
  const sessionNotes = notedRaw ?? [];

  // Homework
  const { data: hwRaw } = await admin
    .from('homework')
    .select('id, teacher_name, title, description, due_date, status, created_at')
    .ilike('student_email', user.email)
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(20)
    .then(r => r.error ? { data: [] } : r);
  const homework = hwRaw ?? [];

  const displayName   = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '';
  const studentGender = user.user_metadata?.gender === 'female' ? 'female' : 'male';

  /* ── Streak ── */
  const { data: logsRaw } = await admin
    .from('daily_logs')
    .select('log_date')
    .eq('user_id', user.id)
    .order('log_date', { ascending: false })
    .limit(365)
    .then(r => r.error?.code === '42P01' ? { data: [] } : r);

  const logDates  = (logsRaw || []).map(r => r.log_date);
  const dateSet   = new Set(logDates);
  const todayStr  = new Date().toISOString().slice(0, 10);

  function calcStreak(dates) {
    if (!dates.length) return 0;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (dates[0] !== todayStr && dates[0] !== yesterday) return 0;
    let streak = 0, expected = dates[0];
    for (const d of dates) {
      if (d === expected) {
        streak++;
        const dt = new Date(expected); dt.setDate(dt.getDate() - 1);
        expected = dt.toISOString().slice(0, 10);
      } else break;
    }
    return streak;
  }

  const AR_DAYS = ['ح','ن','ث','ر','خ','ج','س'];
  const streakCount  = calcStreak(logDates);
  const loggedToday  = dateSet.has(todayStr);
  const last7Days    = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().slice(0, 10);
    return { date: ds, active: dateSet.has(ds), day: AR_DAYS[d.getDay()] };
  });

  return (
    <DashboardContent
      user={user}
      assessments={assessments ?? []}
      isStudent={isStudent}
      upcomingSessions={upcomingSessions}
      displayName={displayName}
      studentGender={studentGender}
      attendancePct={attendancePct}
      attendedCount={attendedCount}
      attendanceTotal={attendanceRecords.length}
      homework={homework}
      sessionNotes={sessionNotes}
      streakCount={streakCount}
      loggedToday={loggedToday}
      last7Days={last7Days}
    />
  );
}
