// ═══════════════════════════════════════════════════════════════════════════
// المصدر الوحيد لقراءة دور المستخدم — أمان الصلاحيات
// ───────────────────────────────────────────────────────────────────────────
// الدور يُقرأ من app_metadata حصراً — وهو حقل لا يكتبه إلا service_role، فلا
// يستطيع المستخدم التلاعب به عبر supabase.auth.updateUser. user_metadata لم يعد
// يُقرأ إطلاقاً (أُزيل السقوط الاحتياطي في المرحلة 4 بعد اكتمال هجرة كل الحسابات).
// ═══════════════════════════════════════════════════════════════════════════

export const ADMIN_ROLES = new Set(['admin', 'super_admin']);
export const STAFF_ROLES = new Set(['admin', 'super_admin', 'teacher', 'supervisor']);

/** الدور الفعلي للمستخدم — من app_metadata حصراً (المصدر الآمن غير القابل للتلاعب). */
export function getRole(user) {
  return user?.app_metadata?.role ?? null;
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
