/* ════════════════════════════════════════════════════════════════
   صوت قراءة القصة — ثوابت ومساعدات مشتركة بين الخادم والعميل
   الملفات تُرفع مباشرة من المتصفح إلى Supabase Storage عبر رابط موقَّع
   (لتجاوز حد Vercel ‎4.5MB لجسم الطلب)، ويُخزَّن الرابط العام في
   stories.audio_url (هجرة lms/supabase/add_stories_audio_url.sql).
════════════════════════════════════════════════════════════════ */

export const STORY_AUDIO_BUCKET = 'media';
export const STORY_AUDIO_PREFIX = 'stories/audio/';
export const STORY_AUDIO_MAX_MB = 25;

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

export function storyAudioPublicUrl(path) {
  return publicBase() + path;
}

/* يستخرج مسار التخزين من رابط عام — ويرفض أي رابط خارج مجلد صوت القصص */
export function storyAudioPathFromUrl(url) {
  if (typeof url !== 'string') return null;
  const base = publicBase();
  if (!url.startsWith(base)) return null;
  const path = url.slice(base.length).split('?')[0];
  if (!path.startsWith(STORY_AUDIO_PREFIX) || path.includes('..')) return null;
  return path;
}
