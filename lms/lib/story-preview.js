import { splitStoryPages, storyAudioPathFromUrl } from './story-audio';
import { storyPageText } from './story-speech';

/* ════════════════════════════════════════════════════════════════
   معاينة قصة حقيقية في الصفحة الرئيسية (قسم «معاينة من داخل المنصة») — خادم فقط
   تُؤخذ الصفحة الأولى من قصة لها رابط مشاركة عام (share_token)، أي قصة سمح
   المشرف صراحةً بفتحها للجميع: نص الصفحة وصورتها وصوت قراءتها الحقيقي.
════════════════════════════════════════════════════════════════ */

export function publicMediaBase() {
  return `${(process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')}/storage/v1/object/public/`;
}

/* نص الصفحة وصورتها من HTML المحرر: الأسطر تبقى أسطراً، والوسوم تُحذف.
   الصورة تُقبل فقط من تخزين مشروعنا العام. */
export function storyPagePreview(pageHtml) {
  const html = String(pageHtml || '');
  const src = /<img[^>]+src="([^"]+)"/i.exec(html)?.[1] || null;
  const base = publicMediaBase();
  const image = src && base.length > 30 && src.startsWith(base) ? src : null;
  return { text: storyPageText(html), image };
}

/* يختار من القصص المشارَكة أوّل قصة لصفحتها الأولى نص وصوت حقيقي، ويُرجع
   ما تحتاجه بطاقة المعاينة فقط — أو null فتظهر بطاقة بديلة بلا صوت */
export function pickStoryPreview(stories) {
  for (const s of stories || []) {
    const pages = splitStoryPages(s.content);
    if (!pages.length || !s.share_token) continue;
    const { text, image } = storyPagePreview(pages[0]);
    const audio = Array.isArray(s.page_audio) ? s.page_audio[0] : null;
    if (!text || !audio || !storyAudioPathFromUrl(audio)) continue;
    const cover = typeof s.cover_image_url === 'string' && s.cover_image_url.startsWith(publicMediaBase())
      ? s.cover_image_url : null;
    return { title: s.title, text, image: image || cover, audio, href: `/story/${s.share_token}` };
  }
  return null;
}
