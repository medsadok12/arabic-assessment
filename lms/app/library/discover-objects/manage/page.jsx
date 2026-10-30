import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import Navbar from '../../../../components/Navbar';
import { createAdminClient } from '../../../../lib/supabase-admin';
import { discoverUser, loadDiscover } from '../../../../lib/discover-objects-server';
const Editor = dynamic(() => import('../Editor'));
export const revalidate = 0;
export default async function DiscoverObjectsManagePage() {
  const auth = await discoverUser(true);
  if (auth.error) redirect('/library');
  let content = null;
  try { content = await loadDiscover(createAdminClient()); } catch {}
  return <><Navbar user={auth.user} /><main className="page-wrap"><div className="container"><Editor initialContent={content} /></div></main></>;
}
