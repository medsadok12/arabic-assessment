import { notFound }          from 'next/navigation';
import { createAdminClient } from '../../../lib/supabase-admin';
import Navbar      from '../../../components/Navbar';
import StoryReader from '../../library/stories/[slug]/StoryReader';

/* ════════════════════════════════════════════════════════════════
   قصة مشاركة بالرابط — عامة بلا تسجيل دخول (قراءة واستماع فقط)
   تُفتح فقط بالرمز العشوائي الذي ينشئه المشرف من bogga؛ إلغاؤه يوقف الرابط فوراً.
   لا نقاط، لا تسجيل قراءة، ولا وصول لبقية المكتبة.
════════════════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic';

const TOKEN_RE = /^[A-Za-z0-9_-]{10,64}$/;
const COLUMNS  = 'id, title, icon, level, length, content, accent, bg, border_color, page_audio';

async function loadStory(token) {
  if (!TOKEN_RE.test(token || '')) return null;
  try {
    const admin = createAdminClient();
    const { data } = await admin.from('stories').select(COLUMNS).eq('share_token', token).maybeSingle();
    return data || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const story = await loadStory(params.token);
  if (!story) return { title: 'أكاديمية عارم', robots: { index: false, follow: false } };
  const title = `${story.title} — قصة من أكاديمية عارم`;
  const image = (story.content || '').match(/<img[^>]+src="([^"]+)"/i)?.[1];
  return {
    title,
    description: 'اقرأ واستمع إلى قصة مصوّرة للأطفال من مكتبة أكاديمية عارم 📖🔊',
    robots: { index: false, follow: false },
    openGraph: { title, ...(image && /^https:\/\//.test(image) ? { images: [image] } : {}) },
  };
}

export default async function SharedStoryPage({ params }) {
  const story = await loadStory(params.token);
  if (!story) notFound();

  return (
    <>
      <Navbar />
      <main className="page-wrap">
        <StoryReader story={story} alreadyRead={false} isTeacher={false} isPublic />
      </main>
    </>
  );
}
