import { createCachedReadClient } from '../lib/supabase-admin';
import { pickStoryPreview } from '../lib/story-preview';
import { pickGamePreviewWords } from '../lib/game-preview';
import { pickPreviewWheels } from '../lib/word-wheel';
import LandingPage from '../components/landing/LandingPage';

/* الصفحة الرئيسية — تجلب على الخادم محتوى «معاينة من داخل المنصة»: قصة مشارَكة
   (لها رابط مشاركة عام) بصفحتها الأولى وصوتها الحقيقي، وكلمات حقيقية من
   «صيّاد الحروف» بصورها وأصواتها المسجَّلة، وعجلات المرحلة الأولى من
   «عجلة الكلمات» بتعديلات المعلم. أي فشل في الجلب = بطاقات احتياطية بصمت.

   السرعة: الصفحة تُخدم جاهزة من ذاكرة Vercel المؤقتة (كما كانت الصفحة السابقة
   الثابتة) وتُجدَّد في الخلفية كل دقيقة، فيظهر أي تعديل خلال دقيقة على الأكثر.
   القراءات عبر createCachedReadClient (لا createAdminClient الذي يفرض no-store
   فيجعل الصفحة تُبنى لكل زائر). */
export const revalidate = 60;
const READ_REVALIDATE = 60;

async function loadStoryPreview() {
  try {
    const admin = createCachedReadClient(READ_REVALIDATE);
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
    const admin = createCachedReadClient(READ_REVALIDATE);
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
    const admin = createCachedReadClient(READ_REVALIDATE);
    const { data } = await admin
      .from('word_wheel_catalog')
      .select('level, wheel_index, center_letter, outer_letters, valid_words')
      .eq('level', 1);
    overrides = data || [];
  } catch { /* العجلات الافتراضية تكفي */ }
  return pickPreviewWheels(overrides);
}

export default async function HomePage() {
  const [storyPreview, gameWords, wheels] = await Promise.all([loadStoryPreview(), loadGameWords(), loadWheels()]);
  return <LandingPage storyPreview={storyPreview} gameWords={gameWords} wheels={wheels} />;
}
