import { createAdminClient } from '../../lib/supabase-admin';
import { pickStoryPreview } from '../../lib/story-preview';
import LandingV2 from './LandingV2';

/* نسخة معاينة للصفحة الرئيسية الجديدة — لا تُفهرَس ولا يرتبط بها الموقع.
   تجلب قصة مشارَكة (لها رابط مشاركة عام) لتُعرض صفحتها الأولى بصوتها الحقيقي. */

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'أكاديمية عارم — معاينة الصفحة الرئيسية الجديدة',
  robots: { index: false, follow: false },
};

async function loadStoryPreview() {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('stories')
      .select('title, content, page_audio, share_token, cover_image_url')
      .not('share_token', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(10);
    return pickStoryPreview(data);
  } catch {
    return null;
  }
}

export default async function LandingV2Page() {
  const storyPreview = await loadStoryPreview();
  return <LandingV2 storyPreview={storyPreview} />;
}
