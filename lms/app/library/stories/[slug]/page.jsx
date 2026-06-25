import { redirect, notFound } from 'next/navigation';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import Navbar     from '../../../../components/Navbar';
import StoryReader from './StoryReader';

export const dynamic = 'force-dynamic';

export default async function StoryPage({ params }) {
  const { slug } = params;

  // Auth
  let user;
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) redirect('/auth/login');
    user = data.user;
  } catch {
    redirect('/auth/login');
  }

  const admin = createAdminClient();

  // Fetch story by slug
  const { data: story, error: storyErr } = await admin
    .from('stories')
    .select('*')
    .eq('slug', slug)
    .single();

  if (storyErr || !story) notFound();

  const role = user?.user_metadata?.role ?? '';
  const isTeacher = ['super_admin', 'admin', 'teacher'].includes(role);

  // Students can only see published stories
  if (!isTeacher && story.status !== 'published') notFound();

  // Check if already read
  let alreadyRead = false;
  if (!isTeacher) {
    const { data: readRow } = await admin
      .from('story_reads')
      .select('id')
      .eq('user_id', user.id)
      .eq('story_id', story.id)
      .maybeSingle();
    alreadyRead = !!readRow;
  }

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap">
        <StoryReader story={story} alreadyRead={alreadyRead} isTeacher={isTeacher} />
      </main>
    </>
  );
}
