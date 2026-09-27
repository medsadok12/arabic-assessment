// بوابة الدخول للقمع التسويقي المفتوح للعموم — رابط بسيط بلا كود تقييم
// ولا جلسة (assessment.aarem.net/?quick=1)، بنفس نمط ?admin_preview=true
// الموجود أصلاً في utils/adminPreview.js. راجع القسم الخاص بمشروع Lead
// Generation — القرار الصريح كان فتح هذا المسار للعموم بالكامل، بخلاف
// مسار التقييم الحقيقي في App.jsx الذي يبقى محمياً بكود assessment_codes.

export function isQuickTestMode() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('quick') === '1';
}
