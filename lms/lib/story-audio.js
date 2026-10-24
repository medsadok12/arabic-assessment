/* ════════════════════════════════════════════════════════════════
   صوت قراءة القصة — صوت مستقل لكل صفحة
   ثوابت ومساعدات مشتركة بين الخادم والعميل.
   الملفات تُرفع مباشرة من المتصفح إلى Supabase Storage عبر رابط موقَّع
   (لتجاوز حد Vercel ‎4.5MB لجسم الطلب)، وتُخزَّن روابطها العامة في
   stories.page_audio — مصفوفة بفهرس الصفحة: page_audio[i] = صوت الصفحة i
   أو null (هجرة lms/supabase/stories_page_audio.sql).
════════════════════════════════════════════════════════════════ */

export const STORY_AUDIO_BUCKET = 'media';
export const STORY_AUDIO_PREFIX = 'stories/audio/';
export const STORY_AUDIO_MAX_MB = 25;
export const STORY_MAX_PAGES    = 300;

export const STORY_PAGE_SEPARATOR = '<!-- PAGE -->';

/* تقسيم محتوى القصة إلى صفحات — المرجع الوحيد لفهرسة الصفحات.
   القارئ ولوحة الصوت ومحرر الصفحات والخادم كلها تستخدمه، فيبقى
   page_audio[i] مطابقاً للصفحة i نفسها في كل مكان. */
export function splitStoryPages(content) {
  return String(content || '').split(STORY_PAGE_SEPARATOR).map(p => p.trim()).filter(Boolean);
}

/* مصفوفة أصوات بطول عدد الصفحات بالضبط: null لكل صفحة بلا صوت */
export function normalizePageAudio(list, pageCount) {
  const src = Array.isArray(list) ? list : [];
  return Array.from({ length: Math.max(0, pageCount) }, (_, i) =>
    (typeof src[i] === 'string' && src[i]) ? src[i] : null);
}

/* يضع صوت صفحة واحدة في أصوات القصة المحفوظة — للحفظ الفوري لحظة اكتمال الرفع
   من المحرر الكامل. page = فهرس الصفحة في المحتوى المحفوظ على الخادم.
   يُرجع مصفوفة بطول عدد الصفحات، أو null إن كانت الصفحة خارج القصة. */
export function setPageAudioAt(list, pageCount, page, url) {
  if (!Number.isInteger(page) || page < 0 || page >= pageCount) return null;
  const next = normalizePageAudio(list, pageCount);
  next[page] = (typeof url === 'string' && url) ? url : null;
  return next;
}

/* الأنواع المقبولة ← الامتداد المحفوظ */
export const STORY_AUDIO_TYPES = {
  'audio/mpeg':  'mp3',
  'audio/mp3':   'mp3',
  'audio/mp4':   'm4a',
  'audio/x-m4a': 'm4a',
  'audio/m4a':   'm4a',
  'audio/aac':   'aac',
  'audio/webm':  'webm',
  'audio/ogg':   'ogg',
  'audio/wav':   'wav',
  'audio/x-wav': 'wav',
  'audio/wave':  'wav',
};

const EXT_TO_TYPE = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac',
  webm: 'audio/webm', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg',
  wav: 'audio/wav',
};

/* يوحّد نوع الملف: يحذف المعاملات (audio/webm;codecs=opus ← audio/webm)
   ويستنتجه من الامتداد إن كان فارغاً (بعض المتصفحات لا تعطي نوعاً لملفات m4a).
   يُرجع null إن لم يكن صوتاً مقبولاً. */
export function normalizeStoryAudioType(type, fileName = '') {
  const base = String(type || '').split(';')[0].trim().toLowerCase();
  if (STORY_AUDIO_TYPES[base]) return base;
  const ext = String(fileName).split('.').pop()?.toLowerCase();
  return EXT_TO_TYPE[ext] || null;
}

function publicBase() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  return `${url}/storage/v1/object/public/${STORY_AUDIO_BUCKET}/`;
}

/* رابط عام لملف في bucket ‎media‎ (القصص، الحروف الهجائية، بطاقات المكتبة…) */
export function mediaPublicUrl(path) {
  return publicBase() + path;
}

/* يستخرج مسار التخزين من رابط عام في bucket ‎media‎ — ويرفض أي رابط
   خارج المجلد المحدَّد (prefix) أو يحاول الخروج منه بـ«..» */
export function mediaPathFromUrl(url, prefix) {
  if (typeof url !== 'string') return null;
  const base = publicBase();
  if (!url.startsWith(base)) return null;
  const path = url.slice(base.length).split('?')[0];
  if (!path.startsWith(prefix) || path.includes('..')) return null;
  return path;
}

export function storyAudioPublicUrl(path) {
  return mediaPublicUrl(path);
}

/* تحقق من مصفوفة أصوات صفحات واردة من العميل — رسالة خطأ أو null */
export function pageAudioError(list) {
  if (!Array.isArray(list) || list.length > STORY_MAX_PAGES) return 'بيانات أصوات الصفحات غير صالحة';
  if (list.some(u => u && !storyAudioPathFromUrl(u))) return 'رابط صوت غير صالح';
  return null;
}

/* يستخرج مسار التخزين من رابط عام — ويرفض أي رابط خارج مجلد صوت القصص */
export function storyAudioPathFromUrl(url) {
  return mediaPathFromUrl(url, STORY_AUDIO_PREFIX);
}
