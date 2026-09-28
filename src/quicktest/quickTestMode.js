// بوابة الدخول للقمع التسويقي المفتوح للعموم — رابط بسيط بلا كود تقييم
// ولا جلسة (assessment.aarem.net/?quick=1)، بنفس نمط ?admin_preview=true
// الموجود أصلاً في utils/adminPreview.js. راجع القسم الخاص بمشروع Lead
// Generation — القرار الصريح كان فتح هذا المسار للعموم بالكامل، بخلاف
// مسار التقييم الحقيقي في App.jsx الذي يبقى محمياً بكود assessment_codes.

export function isQuickTestMode() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('quick') === '1';
}

/**
 * وضع معاينة المشرف لهذا الاختبار — رابط ?quick=1&admin_preview=1 يفتحه
 * زر "🚀 جرّب الاختبار فعلياً" في لوحة bogga (تبويب إدارة الاختبار
 * الترويجي). يتخطى شاشة بيانات البداية وبوابة التواصل مع ولي الأمر
 * (QuickTestApp.jsx)، ولا يُرسِل أي بيانات لـ/api/leads إطلاقاً — تجربة
 * تجريبية بحتة لمراجعة محتوى الأسئلة الحيّ فوراً، بنفس روح
 * utils/adminPreview.js في التقييم الحقيقي.
 */
export function isQuickTestAdminPreview() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('admin_preview') === '1';
}

export const QUICK_TEST_PREVIEW_STUDENT = { name: 'معاينة الإدارة', age: 8 };
