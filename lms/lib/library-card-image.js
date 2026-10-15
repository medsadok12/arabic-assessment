import { mediaPublicUrl } from './story-audio';

/* ════════════════════════════════════════════════════════════════
   صور بطاقات المكتبة (library_card_meta.image_url) — خادم فقط
   المتصفح يرسل الصورة مصغَّرة كـdata URL صغير، وهنا تُرفع إلى Supabase
   Storage (media/library/cards/) ويُحفظ رابطها القصير فقط — لا base64 في
   قاعدة البيانات أبداً (القسم 9.1: صورة base64 واحدة كانت 351KB تُحمَّل مع
   صفحة المكتبة لكل طالب).
════════════════════════════════════════════════════════════════ */

export const CARD_IMAGE_PREFIX = 'library/cards/';
const MAX_BYTES = 3 * 1024 * 1024;
const TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif' };
const DATA_URL_RE = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=\s]+)$/;

export const isDataImage = (v) => typeof v === 'string' && v.startsWith('data:image/');

/* يرفع صورة data URL إلى مجلد prefix في bucket ‎media‎ ويُرجع رابطها العام، أو null
   إن تعذّر — مشترك بين بطاقات المكتبة وأغلفة القصص */
export async function moveImageToStorage(admin, prefix, key, dataUrl) {
  const m = DATA_URL_RE.exec(dataUrl || '');
  const ext = m && TYPES[m[1]];
  if (!ext) return null;
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length || buf.length > MAX_BYTES) return null;
  const safeKey = String(key).replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'img';
  const path = `${prefix}${safeKey}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const { error } = await admin.storage.from('media').upload(path, buf, { contentType: m[1], upsert: false });
  return error ? null : mediaPublicUrl(path);
}

/* يرفع صورة بطاقة مكتبة (data URL) ويُرجع رابطها العام، أو null إن تعذّر */
export function moveCardImageToStorage(admin, cardKey, dataUrl) {
  return moveImageToStorage(admin, CARD_IMAGE_PREFIX, cardKey || 'card', dataUrl);
}
