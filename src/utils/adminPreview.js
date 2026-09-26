// وضع محاكاة المشرف (Admin Preview) — يفتحه المشرف من زر "🚀 تجربة التقييم"
// في لوحة bogga (صفحة إدارة التقييمات) عبر رابط ?admin_preview=true&level=N،
// لتجربة تعديلات الـCMS فوراً بلا المرور بشاشة بيانات الطالب أو كود التقييم،
// وبلا كتابة أي نتيجة حقيقية في قاعدة البيانات (راجع App.jsx وResults.jsx).

export function getAdminPreviewLevel() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get('admin_preview') !== 'true') return null;
  const level = Number(params.get('level'));
  return [1, 2, 3].includes(level) ? level : 1;
}

export const ADMIN_PREVIEW_STUDENT_INFO = {
  name:  'معاينة الإدارة',
  age:   8,
  email: 'admin-preview@aarem.net',
  type:  'native',
};
