import { redirect } from 'next/navigation';
import { createClient }      from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';
import Navbar        from '../../../components/Navbar';
import StoryManager  from './StoryManager';

export const dynamic = 'force-dynamic';

export default async function TeacherStoriesPage() {
  let user;
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) redirect('/auth/login');
    user = data.user;
  } catch {
    redirect('/auth/login');
  }

  const role = user?.user_metadata?.role ?? '';
  if (!['super_admin', 'admin', 'teacher'].includes(role)) redirect('/library');

  const admin = createAdminClient();

  // Fetch all stories (teachers see everything)
  let initialStories = [];
  try {
    const { data } = await admin
      .from('stories')
      .select('*')
      .order('created_at', { ascending: false });
    initialStories = data || [];
  } catch {}

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap">
        <div className="container" style={{ maxWidth: 900 }}>
          <StoryManager initialStories={initialStories} />
        </div>
      </main>
    </>
  );
}
