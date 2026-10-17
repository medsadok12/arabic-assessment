import { splitStoryPages, storyAudioPathFromUrl } from './story-audio';

/* ════════════════════════════════════════════════════════════════
   معاينة قصة حقيقية في الصفحة الرئيسية (قسم «معاينة من داخل المنصة») — خادم فقط
   تُؤخذ الصفحة الأولى من قصة لها رابط مشاركة عام (share_token)، أي قصة سمح
   المشرف صراحةً بفتحها للجميع: نص الصفحة وصورتها وصوت قراءتها الحقيقي.
════════════════════════════════════════════════════════════════ */

const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };

export function publicMediaBase() {
  return `${(process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')}/storage/v1/object/public/`;
}

// علامتا بداية/نهاية الخط العريض أثناء التنظيف — لا تظهران في أي نص حقيقي
const EM_OPEN = '\u0001';
const EM_CLOSE = '\u0002';
const EM_MARKS = /[\u0001\u0002]/g;

/* نص الصفحة وصورتها من HTML المحرر: الأسطر تبقى أسطراً، والوسوم تُحذف.
   parts: نفس النص مقطّعاً، وem للمقاطع التي جعلها المعلم عريضة (<b>/<strong>)
   — كاسم البطل «فَهِيم» — فتُبرَز في بطاقة المعاينة كما أرادها.
   الصورة تُقبل فقط من تخزين مشروعنا العام. */
export function storyPagePreview(pageHtml) {
  const html = String(pageHtml || '');
  const src = /<img[^>]+src="([^"]+)"/i.exec(html)?.[1] || null;
  const base = publicMediaBase();
  const image = src && base.length > 30 && src.startsWith(base) ? src : null;
  const raw = html
    .replace(/<(b|strong)\b[^>]*>/gi, EM_OPEN)
    .replace(/<\/(b|strong)>/gi, EM_CLOSE)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z#0-9]+;/gi, m => ENTITIES[m] ?? ' ');
  // سطر بلا نص يُحذف، وعلامات العريض فيه تنتقل للسطر السابق (أو التالي إن كان
  // الأول) فلا يختل توازنها
  const lines = [];
  let carry = '';
  for (const line of raw.split('\n')) {
    const l = line.replace(/\s+/g, ' ').trim();
    if (!l.replace(EM_MARKS, '').trim()) {
      const marks = l.replace(/[^\u0001\u0002]/g, '');
      if (lines.length) lines[lines.length - 1] += marks;
      else carry += marks;
      continue;
    }
    lines.push(carry + l);
    carry = '';
  }
  const marked = lines.join('\n');
  return { text: marked.replace(EM_MARKS, ''), image, parts: emphasisParts(marked) };
}

/* «أ \u0001ب\u0002 ج» ← [{ t:'أ ', em:false }, { t:'ب', em:true }, { t:' ج', em:false }] */
function emphasisParts(marked) {
  const parts = [];
  let em = false;
  for (const chunk of marked.split(/([\u0001\u0002])/)) {
    if (chunk === EM_OPEN)  { em = true;  continue; }
    if (chunk === EM_CLOSE) { em = false; continue; }
    if (!chunk) continue;
    const last = parts[parts.length - 1];
    if (last && last.em === em) last.t += chunk;
    else parts.push({ t: chunk, em });
  }
  return parts;
}

/* يختار القصة التي اختارها المشرف للصفحة الرئيسية (featured_home) إن صلحت للعرض،
   وإلا أوّل قصة مشارَكة لصفحتها الأولى نص وصوت حقيقي — ويُرجع ما تحتاجه بطاقة
   المعاينة فقط، أو null فتظهر بطاقة بديلة بلا صوت */
export function pickStoryPreview(stories) {
  const ordered = [...(stories || [])].sort((a, b) => (b.featured_home === true) - (a.featured_home === true));
  for (const s of ordered) {
    const pages = splitStoryPages(s.content);
    if (!pages.length || !s.share_token) continue;
    const { text, image, parts } = storyPagePreview(pages[0]);
    const audio = Array.isArray(s.page_audio) ? s.page_audio[0] : null;
    if (!text || !audio || !storyAudioPathFromUrl(audio)) continue;
    const cover = typeof s.cover_image_url === 'string' && s.cover_image_url.startsWith(publicMediaBase())
      ? s.cover_image_url : null;
    return { title: s.title, text, parts, image: image || cover, audio, href: `/story/${s.share_token}` };
  }
  return null;
}

/* سبب عدم صلاحية قصة للصفحة الرئيسية (رسالة للمشرف) أو null — نفس شروط pickStoryPreview
   باستثناء رابط المشاركة الذي يُنشأ تلقائياً عند الاختيار */
export function homeFeatureProblem(story) {
  const pages = splitStoryPages(story?.content);
  if (!pages.length) return 'القصة بلا صفحات بعد';
  if (story.status !== 'published') return 'انشر القصة أولاً ثم اعرضها في الصفحة الرئيسية';
  if (!storyPagePreview(pages[0]).text) return 'الصفحة الأولى تحتاج نصاً يظهر في الصفحة الرئيسية';
  const audio = Array.isArray(story.page_audio) ? story.page_audio[0] : null;
  if (!audio || !storyAudioPathFromUrl(audio)) return 'أضف صوت قراءة للصفحة الأولى أولاً — الزائر يستمع إليه في الصفحة الرئيسية';
  return null;
}
