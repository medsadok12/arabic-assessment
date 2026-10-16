import { createAdminClient } from '../../lib/supabase-admin';
import { pickStoryPreview } from '../../lib/story-preview';
import { pickGamePreviewWords } from '../../lib/game-preview';
import { pickPreviewWheels } from '../../lib/word-wheel';
import LandingV2 from './LandingV2';

/* نسخة معاينة للصفحة الرئيسية الجديدة — لا تُفهرَس ولا يرتبط بها الموقع.
   تجلب قصة مشارَكة (لها رابط مشاركة عام) لتُعرض صفحتها الأولى بصوتها الحقيقي،
   وكلمات حقيقية من «صيّاد الحروف» بصورها وأصواتها المسجَّلة، وعجلات المرحلة
   الأولى من «عجلة الكلمات» بتعديلات المعلم إن وُجدت. */

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

async function loadGameWords() {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('letter_catcher_words')
      .select('word, missing_letter, options, emoji, image_url, audio_url')
      .not('image_url', 'is', null)
      .order('audio_url', { ascending: true, nullsFirst: false })
      .limit(40);
    return pickGamePreviewWords(data);
  } catch {
    return null;
  }
}

async function loadWheels() {
  let overrides = [];
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('word_wheel_catalog')
      .select('level, wheel_index, center_letter, outer_letters, valid_words')
      .eq('level', 1);
    overrides = data || [];
  } catch { /* العجلات الافتراضية تكفي */ }
  return pickPreviewWheels(overrides);
}

export default async function LandingV2Page() {
  const [storyPreview, gameWords, wheels] = await Promise.all([loadStoryPreview(), loadGameWords(), loadWheels()]);
  return <LandingV2 storyPreview={storyPreview} gameWords={gameWords} wheels={wheels} />;
}
