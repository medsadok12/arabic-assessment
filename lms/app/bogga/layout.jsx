import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase-server';

export default async function BruteLayout({ children }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const role = user.user_metadata?.role;
  if (role !== 'admin' && role !== 'super_admin') redirect('/dashboard');

  return <>{children}</>;
}
