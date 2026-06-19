import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase-server';

export default async function BruteLayout({ children }) {
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) redirect('/auth/login');

    const role = user.user_metadata?.role;
    if (role !== 'admin' && role !== 'super_admin') redirect('/dashboard');

    return <>{children}</>;
  } catch {
    redirect('/auth/login');
  }
}
