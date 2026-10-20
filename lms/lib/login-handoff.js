import { createHmac, timingSafeEqual } from 'node:crypto';

/* ════════════════════════════════════════════════════════════════
   «تذكرة العبور» بعد التسجيل — الدخول التلقائي فور تأكيد البريد (2026-10-20)
   طلب الأستاذ محمد: يؤكّد الطالب بريده من تطبيق البريد، ثم يعود لصفحة «تحقق من
   بريدك» فيدخل وحده بلا كتابة كلمة المرور من جديد.
   مسار التسجيل (وحده — الذي كتب فيه صاحب الحساب كلمة مروره) يُصدر تذكرة موقَّعة
   للحساب الجديد تُحفظ في تبويب المتصفح نفسه (sessionStorage)؛ وصفحة التحقق
   تعرضها على /api/auth/handoff حتى يتأكّد البريد فتُفتح الجلسة في هذا المتصفح.
   لا كلمة مرور تُخزَّن. التذكرة: معرّف الحساب + وقت الإصدار، موقَّعة HMAC، صالحة
   ساعة، ولا تفتح إلا حساب طالب تأكّد بريده بعد إصدارها. لا تُصدر أبداً من «إعادة
   الإرسال» (أي أحد يطلبها ببريد غيره).
════════════════════════════════════════════════════════════════ */

export const HANDOFF_TTL_MS = 60 * 60 * 1000;

const b64 = (buf) => Buffer.from(buf).toString('base64url');

// مفتاح التوقيع مشتق من مفتاح الخادم السري — لا متغير بيئة جديد
function keyFrom(secret) {
  return createHmac('sha256', secret).update('aarem-login-handoff-v1').digest();
}
const serverSecret = () => process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function issueHandoff(userId, { now = Date.now(), secret = serverSecret() } = {}) {
  if (!secret || !userId) return null;
  const payload = b64(JSON.stringify({ u: userId, t: now }));
  const sig = b64(createHmac('sha256', keyFrom(secret)).update(payload).digest());
  return `${payload}.${sig}`;
}

/* { userId, issuedAt } لتذكرة سليمة غير منتهية — وإلا null */
export function readHandoff(token, { now = Date.now(), secret = serverSecret() } = {}) {
  if (!secret || typeof token !== 'string' || token.length > 600) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', keyFrom(secret)).update(payload).digest();
  let given;
  try { given = Buffer.from(sig, 'base64url'); } catch { return null; }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  let data;
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { return null; }
  if (typeof data?.u !== 'string' || typeof data?.t !== 'number') return null;
  if (now - data.t > HANDOFF_TTL_MS || data.t - now > 60_000) return null;
  return { userId: data.u, issuedAt: data.t };
}

/* هل تفتح هذه التذكرة جلسة هذا الحساب الآن؟ 'open' | 'wait' | 'deny' */
export function handoffDecision(account, issuedAt) {
  if (!account || account.app_metadata?.role !== 'student') return 'deny';
  if (!account.email_confirmed_at) return 'wait';
  // التأكيد حدث بعد إصدار التذكرة (هامش دقيقة لفروق الساعات)
  return Date.parse(account.email_confirmed_at) >= issuedAt - 60_000 ? 'open' : 'deny';
}
