// تطبيع عربي متسامح للتحقق من اسم الطفل قبل الدخول لحسابه: يتجاهل التشكيل
// والتطويل والمسافات الزائدة، ويوحّد صور الهمزة/الألف (أ إ آ ٱ → ا)، وى→ي،
// وؤ→و، وئ→ي، وة→ه — حتى يقبل «احمد»/«أحمد» و«الاء»/«آلاء» على حدٍّ سواء،
// تسهيلاً على الأطفال الصغار. مصدر واحد يستخدمه مبدّل العائلة وبوابة الدخول.
export function normalizeArabic(s) {
  return (s || '')
    .replace(/[ً-ْٰـ]/g, '') // تشكيل + ألف خنجرية + تطويل
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// يقبل الاسم الكامل المُسجَّل أو الاسم الأول وحده (تسهيلاً على الطفل).
export function nameMatches(input, target) {
  const a = normalizeArabic(input);
  if (!a) return false;
  const b = normalizeArabic(target);
  if (!b) return false;
  return a === b || a === b.split(' ')[0];
}
