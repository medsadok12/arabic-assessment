import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase-server';
import { createAdminClient } from '../../../lib/supabase-admin';
import { getRole, isSuspended, isStaff } from '../../../lib/auth-role';
import { storyAudioPathFromUrl } from '../../../lib/story-audio';
import Navbar from '../../../components/Navbar';
import StoriesPreview from './StoriesPreview';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'حكاياتي — معاينة التصميم | أكاديمية عارم', robots: { index: false, follow: false } };

// A separate, read-only design preview. The existing library and reader are untouched.
export default async function StoriesPreviewPage() {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user || !getRole(user) || isSuspended(user)) redirect('/auth/login');
  let stories = [], loadError = false;
  try {
    const { data, error } = await createAdminClient().from('stories')
      .select('id, slug, title, icon, cover_image_url, level, length, page_audio')
      .eq('status', 'published').order('created_at', { ascending: true });
    if (error) throw error;
    stories = (data || []).map(({ page_audio, ...story }) => ({ ...story, hasAudio: Array.isArray(page_audio) && page_audio.some(url => !!storyAudioPathFromUrl(url)) }));
  } catch { loadError = true; }
  return <><Navbar user={user} /><StoriesPreview stories={stories} loadError={loadError} ownerId={user.id} isEditor={isStaff(user)} /></>;
}
