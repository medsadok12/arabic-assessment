import { redirect } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { createAdminClient } from '../../../lib/supabase-admin';
import { discoverUser, loadDiscover } from '../../../lib/discover-objects-server';
import Game from './Game';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'أكتشف الأشياء — أكاديمية عارم' };
export default async function DiscoverObjectsPage() {
  const auth = await discoverUser();
  if (auth.error) redirect('/auth/login');
  let content = null;
  try { content = await loadDiscover(createAdminClient()); } catch {}
  return <><Navbar user={auth.user} /><main className="page-wrap"><div className="container"><Game initialContent={content} staff={auth.staff} /></div></main></>;
}
