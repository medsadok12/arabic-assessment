import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient }    from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';
import Navbar from '../../../components/Navbar';
import ProgressCharts from '../../../components/ProgressCharts';

export default async function ProgressPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: assessments }, { data: sessionsRaw }] = await Promise.all([
    supabase
      .from('assessments')
      .select('id, level, score, completed_at')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: true }),
    admin
      .from('sessions')
      .select('id, teacher_name, session_date, start_time, subject, status, notes, rating')
      .eq('student_email', user.email)
      .or(`status.in.(completed,cancelled),and(status.eq.scheduled,session_date.lt.${today})`)
      .order('session_date', { ascending: false })
      .limit(20)
      .then(r => r.error?.code === '42P01' ? { data: [] } : r),
  ]);

  const displayName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'طالب';

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
            <Link href="/dashboard" className="btn btn-outline btn-sm">← لوحتي</Link>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)' }}>
              📈 تقرير التقدم — {displayName}
            </h1>
          </div>
          <ProgressCharts
            assessments={assessments ?? []}
            pastSessions={sessionsRaw ?? []}
          />
        </div>
      </main>
    </>
  );
}
