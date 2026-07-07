import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase-server';
import { createAdminClient } from '../../lib/supabase-admin';
import SupervisorContent from '../../components/SupervisorContent';
import { getRole } from '../../lib/auth-role';

export default async function SupervisorPage() {
  let user;
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) redirect('/auth/login');
    user = data.user;
  } catch {
    redirect('/auth/login');
  }

  const role = getRole(user) ?? '';
  if (role !== 'supervisor') {
    redirect(
      role === 'admin' || role === 'super_admin' ? '/bogga'
      : role === 'teacher'                        ? '/teacher'
      : '/dashboard'
    );
  }

  const admin = createAdminClient();

  const { data: assessments } = await admin
    .from('assessments')
    .select('id, level, score, completed_at, student_name, user_id')
    .order('completed_at', { ascending: false })
    .limit(200)
    .then(r => r.error?.code === '42P01' ? { data: [] } : r);

  const displayName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '';

  return (
    <SupervisorContent
      user={user}
      assessments={assessments ?? []}
      displayName={displayName}
    />
  );
}
