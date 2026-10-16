/* ════════════════════════════════════════════════════════════════
   عجلة الكلمات — العجلات الافتراضية ودوال التحقق من الكلمة.
   مصدر واحد للعبة (library/games/word-wheel) ومسار /api/word-wheel
   ومعاينتها في الصفحة الرئيسية (قسم «معاينة من داخل المنصة»).
   تعديلات المعلم/المدير تُحفظ في جدول word_wheel_catalog فوق هذه القيم.
════════════════════════════════════════════════════════════════ */

export const DEFAULT_CATALOG = [
  { level:1, wheel_index:0, center:'م', letters:['ك','ت','ب','ر','س','ن','ل','د'], time:120, valid_words:['تمر','سمك','نمر','رمل','سلم','مدرس','مكتب','مسكن'] },
  { level:1, wheel_index:1, center:'ل', letters:['ع','ب','م','ك','ت','ر','ف','ن'], time:120, valid_words:['لعب','ملك','علم','نمل','رمل','لبن','ملعب','تعلم'] },
  { level:1, wheel_index:2, center:'ر', letters:['د','م','س','ب','ن','ك','ت','ل'], time:120, valid_words:['نسر','برد','كرم','درس','رمل','سكر','ركب','مدرس','منبر'] },
  { level:1, wheel_index:3, center:'ن', letters:['م','ل','ر','س','ب','ع','ت','ف'], time:120, valid_words:['نمر','نسر','نبت','لبن','سمن','فرن','نبل','منبر','تمرن'] },
  { level:1, wheel_index:4, center:'س', letters:['م','ر','ل','ن','ت','ب','ع','ك'], time:120, valid_words:['سمك','نسر','سلم','مسكن','ملبس','سبع','سكن','كنس','تسمع'] },
  { level:2, wheel_index:0, center:'ع', letters:['ل','م','ب','ر','ق','ش','ف','ت'], time:90,  valid_words:['لعب','علم','عمل','فعل','شعر','عقل','ملعب','مربع','تعلم'] },
  { level:2, wheel_index:1, center:'ق', letters:['ر','ل','م','ب','س','ن','ت','ع'], time:90,  valid_words:['قمر','قلب','عقل','نقل','بقل','سبق','قرن'] },
  { level:2, wheel_index:2, center:'ف', letters:['ر','م','ع','ل','ت','ن','ك','ب'], time:90,  valid_words:['فرن','فكر','فلك','ملف','كتف','فعل','فرع','تفكر','تفرع'] },
  { level:2, wheel_index:3, center:'ح', letters:['م','ب','ر','ل','س','ن','ت','ك'], time:90,  valid_words:['بحر','محل','ملح','لحم','سبح','حبل','حمل','مسبح','حلب'] },
  { level:2, wheel_index:4, center:'ش', letters:['ر','م','س','ع','ق','ل','ب','ن'], time:90,  valid_words:['شمس','شبل','شعر','نشر','بشر','شمع','شعب','شرق','قشر','مشرق','منشر'] },
  { level:3, wheel_index:0, center:'خ', letters:['ر','م','ب','ل','ع','ش','ق','ت'], time:75,  valid_words:['خبر','بخل','خلق','خشب','خلع','بخر','مخبر','تخلق'] },
  { level:3, wheel_index:1, center:'ذ', letters:['ر','م','ك','ب','ل','ع','ت','ن'], time:75,  valid_words:['ذكر','بذل','نبذ','مذكر','تذكر','منذر'] },
  { level:3, wheel_index:2, center:'غ', letters:['ر','م','ب','ل','ع','ش','ف','ن'], time:75,  valid_words:['غنم','نغم','بلغ','فرغ','شغل','غمر','مغرب','شغف','مشغل'] },
  { level:3, wheel_index:3, center:'ض', letters:['ر','م','ب','ل','ع','ك','ن','ت'], time:75,  valid_words:['ضرب','عرض','ضمن','بعض','تضمن','ضلع','مضرب'] },
  { level:3, wheel_index:4, center:'ط', letters:['ر','م','ب','ل','ع','ك','ن','ي'], time:75,  valid_words:['طبل','طيب','طير','بطل','طلب','طلع','مطلع','طمر'] },
  { level:4, wheel_index:0, center:'ظ', letters:['ر','م','ب','ل','ع','ك','ن','ف'], time:60,  valid_words:['ظفر','ظلم','عظم','نظر','ظرف','لفظ','منظر'] },
  { level:4, wheel_index:1, center:'ث', letters:['ر','م','ب','ل','ع','ك','ف','ن'], time:60,  valid_words:['ثعلب','ثمر','ثمن','لبث','بعث'] },
  { level:4, wheel_index:2, center:'ج', letters:['ر','م','ب','ل','ع','ك','ف','ن'], time:60,  valid_words:['جمل','جبل','نجم','فجر','برج','عجل','رجل','منجل'] },
  { level:4, wheel_index:3, center:'ص', letters:['ر','م','ب','ل','ع','ك','ف','ن'], time:60,  valid_words:['صبر','نصر','صفر','صلب','صنف','نصل','فصل','عصر','مصنع','منصب'] },
  { level:4, wheel_index:4, center:'ز', letters:['ر','م','ب','ل','ع','ك','ف','ن'], time:60,  valid_words:['رمز','كنز','زمن','نزل','فرز','برز','ركز','منزل','مركز'] },
];

const STRIP_RE  = /[ً-ْٰـ]/g;
const ARABIC_RE = /^[ء-ي]+$/;

export function stripWheel(w) { return String(w || '').replace(STRIP_RE, ''); }
export function isArabicWord(w) { return ARABIC_RE.test(w); }
export function letterCounts(w) { const c = {}; for (const ch of w) c[ch] = (c[ch] || 0) + 1; return c; }
export function canFormFrom(word, counts) {
  const m = letterCounts(word);
  for (const [ch, n] of Object.entries(m)) if ((counts[ch] || 0) < n) return false;
  return true;
}
export function calcScore(word, allLetters) {
  const len = word.length;
  const base = len >= 7 ? 12 : len === 6 ? 8 : len === 5 ? 4 : len === 4 ? 2 : 1;
  const unique = [...new Set(allLetters)];
  return unique.every(ch => word.includes(ch)) ? base * 2 : base;
}

/* تعديل المعلم فوق العجلة الافتراضية — نفس قواعد مسار /api/word-wheel
   (ما يراه الطالب فعلاً): القيمة الفارغة لا تمحو الافتراضية */
export function mergeWheel(wheel, ov) {
  if (!ov) return wheel;
  return {
    ...wheel,
    valid_words: ov.valid_words?.length ? ov.valid_words : wheel.valid_words,
    time:        ov.time_seconds || wheel.time,
    center:      ov.center_letter || wheel.center,
    letters:     ov.outer_letters?.length ? ov.outer_letters : wheel.letters,
  };
}

/* ── معاينة الصفحة الرئيسية ────────────────────────────────────── */
export const WHEEL_PREVIEW_TARGET = 3;   // كلمات يكتشفها الزائر لينهي الجولة

/* عجلة صالحة للمعاينة: حرف أوسط واحد، 4–10 حروف حوله، وكلمات تُكوَّن
   فعلاً من حروف العجلة وتحوي الحرف الأوسط — أو null */
export function toPreviewWheel(wheel) {
  const center = stripWheel(wheel?.center).trim();
  const letters = (Array.isArray(wheel?.letters) ? wheel.letters : []).map(l => stripWheel(l).trim());
  if (center.length !== 1 || letters.length < 4 || letters.length > 10 || letters.some(l => l.length !== 1)) return null;
  const counts = letterCounts([...letters, center].join(''));
  const words = [...new Set((Array.isArray(wheel.valid_words) ? wheel.valid_words : [])
    .map(w => stripWheel(w).trim())
    .filter(w => w.length >= 3 && isArabicWord(w) && w.includes(center) && canFormFrom(w, counts)))];
  if (words.length < WHEEL_PREVIEW_TARGET) return null;
  return { center, letters, words };
}

/* عجلات المرحلة الأولى (المبتدئ) بترتيب عشوائي — تبدأ المعاينة بالأولى
   وينتقل «العب مرة أخرى» للتالية */
export function pickPreviewWheels(overrideRows, rand = Math.random) {
  const overrides = {};
  (overrideRows || []).forEach(r => { overrides[`${r.level}_${r.wheel_index}`] = r; });
  const wheels = DEFAULT_CATALOG
    .filter(w => w.level === 1)
    .map(w => toPreviewWheel(mergeWheel(w, overrides[`1_${w.wheel_index}`])))
    .filter(Boolean);
  for (let i = wheels.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [wheels[i], wheels[j]] = [wheels[j], wheels[i]];
  }
  return wheels;
}
