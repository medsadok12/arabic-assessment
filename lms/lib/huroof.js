/* ════════════════════════════════════════════════════════════════
   الحروف الهجائية (/library/huroof) — المحتوى الافتراضي + تعديلات الإدارة
   DEFAULT_LETTERS نسخة احتياطية ثابتة؛ ما يعدّله المعلم/المدير يُحفظ في جدول
   huroof_letters (صف لكل حرف مُعدَّل، lms/supabase/huroof_letters.sql)
   ويُدمج فوقها عند العرض — فإن تعذّر الجلب يرى الطفل المحتوى الافتراضي بصمت.
   الصور والأصوات في Supabase Storage تحت media/huroof/ (لا base64 أبداً).
════════════════════════════════════════════════════════════════ */
import { mediaPathFromUrl } from './story-audio';

export const HUROOF_BUCKET       = 'media';
export const HUROOF_PREFIX       = 'huroof/';
export const HUROOF_IMAGE_MAX_MB = 5;   // قبل التصغير في المتصفح
export const HUROOF_AUDIO_MAX_MB = 10;

export const HUROOF_TEXT_FIELDS  = ['name', 'word', 'emoji', 'sentence'];
export const HUROOF_MEDIA_FIELDS = ['image_url', 'letter_audio_url', 'sentence_audio_url'];
export const HUROOF_TEXT_LIMITS  = { name: 40, word: 60, emoji: 16, sentence: 300 };

/* أنواع الرفع ← بادئة اسم الملف */
export const HUROOF_UPLOAD_KINDS = { image: 'img', letter_audio: 'letter', sentence_audio: 'sentence' };

export const HUROOF_IMAGE_TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

export const DEFAULT_LETTERS = [
  { l: 'أ',  name: 'أَلِفْ',  word: 'أَسَدٌ',     emoji: '🦁', sentence: 'الأَسَدُ مَلِكُ الغَابَةْ' },
  { l: 'ب',  name: 'بَاءْ',   word: 'بَيْتٌ',     emoji: '🏠', sentence: 'البَيْتُ دَافِئٌ وَجَمِيلْ' },
  { l: 'ت',  name: 'تَاءْ',   word: 'تُفَّاحَةٌ', emoji: '🍎', sentence: 'التُّفَّاحَةُ حَمْرَاءُ وَحُلْوَةْ' },
  { l: 'ث',  name: 'ثَاءْ',   word: 'ثَعْلَبٌ',   emoji: '🦊', sentence: 'الثَّعْلَبُ حَيَوَانٌ ذَكِيٌّ وَسَرِيعْ' },
  { l: 'ج',  name: 'جِيمْ',   word: 'جَمَلٌ',     emoji: '🐫', sentence: 'الجَمَلُ سَفِينَةُ الصَّحْرَاءْ' },
  { l: 'ح',  name: 'حَاءْ',   word: 'حِصَانٌ',    emoji: '🐴', sentence: 'الحِصَانُ يَرْكُضُ بِسُرْعَةْ' },
  { l: 'خ',  name: 'خَاءْ',   word: 'خُبْزٌ',     emoji: '🍞', sentence: 'الخُبْزُ طَعَامٌ لَذِيذٌ وَمُفِيدْ' },
  { l: 'د',  name: 'دَالْ',   word: 'دَجَاجَةٌ',  emoji: '🐔', sentence: 'الدَّجَاجَةُ تَبِيضُ كُلَّ يَوْمْ' },
  { l: 'ذ',  name: 'ذَالْ',   word: 'ذِئْبٌ',     emoji: '🐺', sentence: 'الذِّئْبُ يَعِيشُ فِي الغَابَةِ البَعِيدَةْ' },
  { l: 'ر',  name: 'رَاءْ',   word: 'رُمَّانٌ',   emoji: '🌺', sentence: 'الرُّمَّانُ فَاكِهَةٌ حُلْوَةٌ وَمُفِيدَةْ' },
  { l: 'ز',  name: 'زَايْ',   word: 'زَرَافَةٌ',  emoji: '🦒', sentence: 'الزَّرَافَةُ أَطْوَلُ الحَيَوَانَاتِ عُنُقًاْ' },
  { l: 'س',  name: 'سِينْ',   word: 'سَمَكَةٌ',   emoji: '🐟', sentence: 'السَّمَكَةُ تَسْبَحُ فِي المَاءْ' },
  { l: 'ش',  name: 'شِينْ',   word: 'شَمْسٌ',     emoji: '☀️', sentence: 'الشَّمْسُ تُضِيءُ النَّهَارَ الجَمِيلْ' },
  { l: 'ص',  name: 'صَادْ',   word: 'صَقْرٌ',     emoji: '🦅', sentence: 'الصَّقْرُ يَطِيرُ عَالِيًا فِي السَّمَاءْ' },
  { l: 'ض',  name: 'ضَادْ',   word: 'ضِفْدَعٌ',   emoji: '🐸', sentence: 'الضِّفْدَعُ يَقْفِزُ بَيْنَ الأَشْجَارْ' },
  { l: 'ط',  name: 'طَاءْ',   word: 'طَائِرٌ',    emoji: '🐦', sentence: 'الطَّائِرُ يُغَنِّي فَوْقَ الشَّجَرَةْ' },
  { l: 'ظ',  name: 'ظَاءْ',   word: 'ظَبْيٌ',     emoji: '🦌', sentence: 'الظَّبْيُ يَرْعَى فِي السَّهْلِ الأَخْضَرْ' },
  { l: 'ع',  name: 'عَيْنْ',  word: 'عِنَبٌ',     emoji: '🍇', sentence: 'العِنَبُ فَاكِهَةٌ لَذِيذَةٌ وَغَنِيَّةْ' },
  { l: 'غ',  name: 'غَيْنْ',  word: 'غَزَالٌ',    emoji: '🦌', sentence: 'الغَزَالُ يَرْكُضُ بِخِفَّةٍ وَرَشَاقَةْ' },
  { l: 'ف',  name: 'فَاءْ',   word: 'فَرَسٌ',     emoji: '🐎', sentence: 'الفَرَسُ حَيَوَانٌ أَصِيلٌ وَجَمِيلْ' },
  { l: 'ق',  name: 'قَافْ',   word: 'قِطَّةٌ',    emoji: '🐱', sentence: 'القِطَّةُ تَلْعَبُ وَتَقْفِزُ بِمَرَحْ' },
  { l: 'ك',  name: 'كَافْ',   word: 'كِتَابٌ',    emoji: '📚', sentence: 'الكِتَابُ خَيْرُ صَدِيقٍ وَرَفِيقْ' },
  { l: 'ل',  name: 'لَامْ',   word: 'لَيْمُونٌ',  emoji: '🍋', sentence: 'اللَّيْمُونُ حَامِضٌ وَمُفِيدٌ لِلصِّحَّةْ' },
  { l: 'م',  name: 'مِيمْ',   word: 'مَوْزَةٌ',   emoji: '🍌', sentence: 'المَوْزَةُ صَفْرَاءُ وَطَعْمُهَا حُلْوْ' },
  { l: 'ن',  name: 'نُونْ',   word: 'نَمِرٌ',     emoji: '🐯', sentence: 'النَّمِرُ حَيَوَانٌ سَرِيعٌ وَشَجَاعْ' },
  { l: 'هـ', name: 'هَاءْ',   word: 'هِلَالٌ',    emoji: '🌙', sentence: 'الهِلَالُ يُضِيءُ اللَّيْلَ الهَادِئَ الجَمِيلْ' },
  { l: 'و',  name: 'وَاوْ',   word: 'وَرْدَةٌ',   emoji: '🌹', sentence: 'الوَرْدَةُ جَمِيلَةٌ وَعَطِرَةٌ وَرَقِيقَةْ' },
  { l: 'ي',  name: 'يَاءْ',   word: 'يَمَامَةٌ',  emoji: '🕊️', sentence: 'اليَمَامَةُ تُغَنِّي بِصَوْتٍ عَذْبٍ جَمِيلْ' },
];

export const HUROOF_COUNT = DEFAULT_LETTERS.length;

const cleanText = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

/* الحروف الـ28 بعد دمج تعديلات الإدارة: النص المعدَّل يحل محل الافتراضي،
   والصورة/الأصوات null حين لا توجد. صف بفهرس خارج 0..27 يُتجاهل. */
export function mergeLetters(rows) {
  const byIdx = new Map();
  (Array.isArray(rows) ? rows : []).forEach(r => {
    if (Number.isInteger(r?.idx) && r.idx >= 0 && r.idx < HUROOF_COUNT) byIdx.set(r.idx, r);
  });
  return DEFAULT_LETTERS.map((d, idx) => {
    const r = byIdx.get(idx) || {};
    const out = { ...d, idx, customized: byIdx.has(idx) };
    HUROOF_TEXT_FIELDS.forEach(f => { out[f] = cleanText(r[f]) ?? d[f]; });
    HUROOF_MEDIA_FIELDS.forEach(f => { out[f] = (typeof r[f] === 'string' && r[f]) ? r[f] : null; });
    return out;
  });
}

/* مسار التخزين من رابط عام — ويرفض أي رابط خارج مجلد الحروف */
export function huroofMediaPathFromUrl(url) {
  return mediaPathFromUrl(url, HUROOF_PREFIX);
}

/* يتحقق من تعديل وارد من العميل ويحوّله لصف قاعدة بيانات:
   { fields } أو { error }. الحقول الغائبة لا تُعاد (تحديث جزئي)،
   والنص المطابق للافتراضي أو الفارغ يُحفظ null (يبقى افتراضياً). */
export function sanitizeHuroofPatch(idx, body) {
  if (!body || typeof body !== 'object') return { error: 'بيانات غير صالحة' };
  const def = DEFAULT_LETTERS[idx];
  const fields = {};
  for (const f of HUROOF_TEXT_FIELDS) {
    if (!(f in body)) continue;
    const v = body[f];
    if (v !== null && typeof v !== 'string') return { error: 'بيانات غير صالحة' };
    const t = cleanText(v);
    if (t && t.length > HUROOF_TEXT_LIMITS[f]) return { error: `النص أطول من المسموح (${HUROOF_TEXT_LIMITS[f]} حرفاً)` };
    fields[f] = t && t !== def[f] ? t : null;
  }
  for (const f of HUROOF_MEDIA_FIELDS) {
    if (!(f in body)) continue;
    const v = body[f];
    if (v === null || v === '') { fields[f] = null; continue; }
    if (!huroofMediaPathFromUrl(v)) return { error: 'رابط ملف غير صالح' };
    fields[f] = v;
  }
  return { fields };
}
