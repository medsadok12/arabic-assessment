import { mediaPathFromUrl } from './story-audio';
import { isDataImage, moveImageToStorage } from './library-card-image';

/* ════════════════════════════════════════════════════════════════
   صورة غلاف القصة (stories.cover_image_url) — خادم فقط
   المحرر يصغّر الصورة في المتصفح ويرسلها data URL صغيراً، وهنا تُرفع إلى
   Supabase Storage (media/stories/covers/) ويُحفظ رابطها القصير فقط —
   لا base64 في قاعدة البيانات (القسم 9.1). تظهر على بطاقة القصة في المكتبة
   مع العنوان، وفي معاينة رابط المشاركة.
════════════════════════════════════════════════════════════════ */

export const STORY_COVER_PREFIX = 'stories/covers/';

/* مسار التخزين لغلاف من مجلد الأغلفة عندنا فقط، وإلا null */
export function storyCoverPathFromUrl(url) {
  return mediaPathFromUrl(url, STORY_COVER_PREFIX);
}

/* يحوّل قيمة الغلاف الواردة من المحرر إلى قيمة تُحفظ:
   undefined → لا تغيير، null/'' → إزالة، data URL → يُرفع ويُعاد رابطه،
   رابط غلاف عندنا → كما هو. أي شيء آخر يُرفض.
   يُرجع { value } أو { error } برسالة ودّية. */
export async function resolveStoryCover(admin, value, key) {
  if (value === undefined) return { value: undefined };
  if (value === null || value === '') return { value: null };
  if (isDataImage(value)) {
    const url = await moveImageToStorage(admin, STORY_COVER_PREFIX, key, value);
    return url ? { value: url } : { error: 'تعذّر حفظ صورة الغلاف — جرّب صورة أخرى بصيغة JPG أو PNG' };
  }
  if (storyCoverPathFromUrl(value)) return { value };
  return { error: 'رابط صورة الغلاف غير صالح' };
}

/* حذف غلاف لم يعد مستخدماً من التخزين — أفضل جهد، لا يُفشل العملية الأصلية */
export async function removeStoryCover(admin, url) {
  const path = storyCoverPathFromUrl(url);
  if (!path) return;
  try { await admin.storage.from('media').remove([path]); } catch {}
}
