import { redirect, notFound } from 'next/navigation';
import { createClient }      from '../../../../lib/supabase-server';
import { createAdminClient } from '../../../../lib/supabase-admin';
import Navbar     from '../../../../components/Navbar';
import StoryReader from './StoryReader';

export const dynamic = 'force-dynamic';

export default async function StoryPage({ params }) {
  // Decode slug in case it arrives percent-encoded
  const slug = decodeURIComponent(params.slug || '');

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

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    notFound();
  }

  // Fetch story — try by slug first, then by id if slug looks like a UUID
  let story = null;
  try {
    const { data, error } = await admin
      .from('stories')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (!error) story = data;

    // Fallback: if slug is a UUID try fetching by id
    if (!story) {
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRe.test(slug)) {
        const { data: d2 } = await admin.from('stories').select('*').eq('id', slug).maybeSingle();
        story = d2 || null;
      }
    }
  } catch {
    notFound();
  }

  if (!story) notFound();

  const role = user?.user_metadata?.role ?? '';
  const isTeacher = ['super_admin', 'admin', 'teacher'].includes(role);

  // Students can only see published stories
  if (!isTeacher && story.status !== 'published') notFound();

  // Check if already read
  let alreadyRead = false;
  try {
    if (!isTeacher) {
      const { data: readRow } = await admin
        .from('story_reads')
        .select('id')
        .eq('user_id', user.id)
        .eq('story_id', story.id)
        .maybeSingle();
      alreadyRead = !!readRow;
    }
  } catch {}

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap">
        <StoryReader story={story} alreadyRead={alreadyRead} isTeacher={isTeacher} />
      </main>
    </>
  );
}
