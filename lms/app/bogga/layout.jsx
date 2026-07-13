import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase-server';
import { getRole } from '../../lib/auth-role';

export default async function BruteLayout({ children }) {
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) redirect('/auth/login');

    const role = getRole(user);
    if (role !== 'admin' && role !== 'super_admin') redirect('/dashboard');

    return <>{children}</>;
  } catch {
    redirect('/auth/login');
  }
}
