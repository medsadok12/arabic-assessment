import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase-server';
import { createAdminClient } from '../../lib/supabase-admin';
import DashboardContent from '../../components/DashboardContent';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let user;
  const supabase = createClient();
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) redirect('/auth/login');
    user = data.user;
  } catch {
    redirect('/auth/login');
  }

  const role      = user.user_metadata?.role ?? 'student';
  const isStudent = role === 'student';

  if (role === 'admin' || role === 'super_admin') redirect('/bogga');
  if (role === 'teacher') redirect('/teacher');
  if (role === 'supervisor') redirect('/supervisor');

  const today = new Date().toISOString().slice(0, 10);
  const admin = createAdminClient();
  const email = (user.email ?? '').toLowerCase();

  // جولة شبكة واحدة — 9 استعلامات مستقلة تعمل بالتوازي
  const [
    { data: sessionsRaw },
    { data: supportLinks },
    { data: assessments },
    { data: fcProgress },
    { data: pastRaw },
    { data: notedRaw },
    { data: hwRaw },
    { data: logsRaw },
    { data: heroConfigRow },
  ] = await Promise.all([
    admin
      .from('sessions')
      .select('id, teacher_name, session_date, start_time, duration_minutes, subject, meet_link, status, attended')
      .eq('student_email', email)
      .in('status', ['scheduled', 'active'])
      .gte('session_date', today)
      .order('session_date', { ascending: true })
      .order('start_time',   { ascending: true })
      .limit(5)
      .then(r => r.error?.code === '42P01' ? { data: [] } : r),
    admin
      .from('session_support_students')
      .select('session_id')
      .eq('student_email', email)
      .then(r => r.error ? { data: [] } : r),
    supabase
      .from('assessments')
      .select('id, level, score, completed_at, student_name')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(50)
      .then(r => r.error ? { data: [] } : r),
    admin
      .from('flashcard_progress')
      .select('level')
      .eq('user_id', user.id)
      .then(r => r.error ? { data: [] } : r),
    admin
      .from('sessions')
      .select('id, session_date, attended')
      .eq('student_email', email)
      .neq('status', 'cancelled')
      .lte('session_date', today)
      .limit(100)
      .then(r => r.error ? { data: [] } : r),
    admin
      .from('sessions')
      .select('id, teacher_name, session_date, subject, notes')
      .eq('student_email', email)
      .not('notes', 'is', null)
      .neq('notes', '')
      .order('session_date', { ascending: false })
      .limit(10)
      .then(r => r.error ? { data: [] } : r),
    admin
      .from('homework')
      .select('id, teacher_name, title, description, due_date, status, created_at')
      .eq('student_email', email)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(20)
      .then(r => r.error ? { data: [] } : r),
    admin
      .from('daily_logs')
      .select('log_date')
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })
      .limit(365)
      .then(r => r.error?.code === '42P01' ? { data: [] } : r),
    admin
      .from('hero_config')
      .select('avatar_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(r => r.error ? { data: null } : r),
  ]);

  // supportSessions تعتمد على supportLinks — تبقى بعد Promise.all
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

  const masteredCount = (fcProgress ?? []).filter(p => p.level >= 5).length;
  const studiedCount  = (fcProgress ?? []).length;

  const attendanceRecords = pastRaw ?? [];
  const attendedCount     = attendanceRecords.filter(s => s.attended === true).length;
  const attendancePct     = attendanceRecords.length > 0 ? Math.round((attendedCount / attendanceRecords.length) * 100) : null;

  const sessionNotes = notedRaw ?? [];
  const homework     = hwRaw ?? [];

  const mainIds = new Set((sessionsRaw ?? []).map(s => s.id));
  const nowMs   = Date.now();
  const merged  = [
    ...(sessionsRaw ?? []),
    ...supportSessions.filter(s => !mainIds.has(s.id)),
  ]
  .sort((a, b) => a.session_date.localeCompare(b.session_date) || a.start_time.localeCompare(b.start_time))
  .filter(s => {
    const startMs = new Date(`${s.session_date}T${s.start_time}`).getTime();
    const endMs   = startMs + (s.duration_minutes ?? 60) * 60000;
    return nowMs < endMs;
  })
  .slice(0, 5);

  const upcomingSessions = merged;

  /* ── Streak ── */
  const logDates = (logsRaw || []).map(r => r.log_date);
  const dateSet  = new Set(logDates);
  const todayStr = new Date().toISOString().slice(0, 10);

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

  const streakCount = calcStreak(logDates);
  const loggedToday = dateSet.has(todayStr);
  const last7Days   = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    return {
      date:     ds,
      active:   i === 0 && dateSet.has(ds),
      day:      d.getDate(),
      isToday:  i === 0,
      isFuture: i > 0,
    };
  });

  const displayName   = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '';
  const studentGender = user.user_metadata?.gender === 'female' ? 'female' : 'male';
  const hasHero       = isStudent ? !!(heroConfigRow?.avatar_id) : true;

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
      masteredCount={masteredCount}
      studiedCount={studiedCount}
      hasHero={hasHero}
    />
  );
}
