/* ════════════════════════════════════════════════════════════════
   رابط تأكيد البريد (/auth/confirm) — يُرسل عند التسجيل وعند «إعادة الإرسال».
   uid (معرّف الحساب) يجعل الرابط يعرف بعد استعماله أن الحساب تأكّد فعلاً:
   رابط فُتح مرتين (التطبيق المثبَّت + المتصفح، أو معاينة تطبيق البريد) كان
   يُظهر «فشل» في المرة الثانية رغم نجاح الأولى (2026-10-20) — الآن يوجّه للدخول
   والبريد مكتوب مسبقاً.
════════════════════════════════════════════════════════════════ */

import { getRole } from './auth-role';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

export function buildConfirmUrl(origin, { hashedToken, type, userId }) {
  const q = new URLSearchParams({ token_hash: hashedToken, type });
  if (isUuid(userId)) q.set('uid', userId);
  return `${origin}/auth/confirm?${q.toString()}`;
}

/* لوحة كل دور بعد تأكيد البريد أو الدخول التلقائي */
export function dashboardPathFor(user) {
  const role = getRole(user);
  if (role === 'super_admin' || role === 'admin') return '/bogga';
  if (role === 'teacher')    return '/teacher';
  if (role === 'supervisor') return '/supervisor';
  return '/dashboard';
}

/* الصفحة التي يذهب إليها رابط لم يعد صالحاً (مستعمَل أو منتهٍ)، حسب حالة الحساب:
   مؤكَّد ← الدخول بالبريد مكتوباً؛ غير مؤكَّد ← طلب رابط جديد؛ مجهول ← الدخول برسالة واضحة */
export function staleLinkRedirect(origin, account) {
  if (account?.email && account.email_confirmed_at) {
    return `${origin}/auth/login?confirmed=1&email=${encodeURIComponent(account.email)}`;
  }
  if (account?.email) {
    return `${origin}/auth/verify-email?email=${encodeURIComponent(account.email)}&reason=expired`;
  }
  return `${origin}/auth/login?error=confirmation_failed`;
}
