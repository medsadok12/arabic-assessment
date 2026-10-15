import { splitStoryPages, storyAudioPathFromUrl } from './story-audio';

/* ════════════════════════════════════════════════════════════════
   معاينة قصة حقيقية في الصفحة الرئيسية الجديدة (/landing-v2) — خادم فقط
   تُؤخذ الصفحة الأولى من قصة لها رابط مشاركة عام (share_token)، أي قصة سمح
   المشرف صراحةً بفتحها للجميع: نص الصفحة وصورتها وصوت قراءتها الحقيقي.
════════════════════════════════════════════════════════════════ */

const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };

function publicMediaBase() {
  return `${(process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')}/storage/v1/object/public/`;
}

/* نص الصفحة وصورتها من HTML المحرر: الأسطر تبقى أسطراً، والوسوم تُحذف.
   الصورة تُقبل فقط من تخزين مشروعنا العام. */
export function storyPagePreview(pageHtml) {
  const html = String(pageHtml || '');
  const src = /<img[^>]+src="([^"]+)"/i.exec(html)?.[1] || null;
  const base = publicMediaBase();
  const image = src && base.length > 30 && src.startsWith(base) ? src : null;
  const text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z#0-9]+;/gi, m => ENTITIES[m] ?? ' ')
    .split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
    .join('\n');
  return { text, image };
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
