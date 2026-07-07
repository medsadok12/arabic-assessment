// ═══════════════════════════════════════════════════════════════════════════
// المصدر الوحيد لقراءة دور المستخدم — أمان الصلاحيات
// ───────────────────────────────────────────────────────────────────────────
// الدور يُقرأ من app_metadata أولاً (يكتبه service_role فقط → لا يستطيع المستخدم
// التلاعب به)، ويسقط على user_metadata أثناء نافذة الهجرة فقط — لضمان عدم كسر
// جلسات JWT القديمة قبل تجدّدها. بعد الإحكام (المرحلة 4) يُحذف السقوط الاحتياطي.
// ═══════════════════════════════════════════════════════════════════════════

export const ADMIN_ROLES = new Set(['admin', 'super_admin']);
export const STAFF_ROLES = new Set(['admin', 'super_admin', 'teacher', 'supervisor']);

/** الدور الفعلي للمستخدم — app_metadata (آمن) ثم user_metadata (احتياطي مؤقت). */
export function getRole(user) {
  return user?.app_metadata?.role ?? user?.user_metadata?.role ?? null;
}

/** مشرف أو مدير مطلق. */
export function isAdmin(user) {
  return ADMIN_ROLES.has(getRole(user));
}

/** مدير مطلق حصراً. */
export function isSuperAdmin(user) {
  return getRole(user) === 'super_admin';
}

/** أي عضو طاقم (مشرف/مدير/معلم/مشرف تربوي). */
export function isStaff(user) {
  return STAFF_ROLES.has(getRole(user));
}
