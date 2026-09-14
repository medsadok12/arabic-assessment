import { createAdminClient } from './supabase-admin';

/** استخرج أول عنوان IP حقيقي من ترويسات Vercel */
export function getClientIP(request) {
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '0.0.0.0'
  );
}

/**
 * يتحقق من معدل الطلبات لعنوان IP محدد.
 * يُفشل بشكل مفتوح (يسمح بالطلب) عند أي خطأ في قاعدة البيانات.
 *
 * @param {string} ip       - عنوان IP الخام
 * @param {string} bucket   - اسم الدلو (مثل 'rl:register')
 * @param {number} perMinute - الحد الأقصى في الدقيقة
 * @param {number} perDay   - الحد الأقصى في اليوم
 * @returns {Promise<boolean>} true = مسموح، false = تجاوز الحد
 */
export async function ipRateCheck(ip, bucket, perMinute, perDay) {
  try {
    const admin = createAdminClient();
    const { data } = await admin.rpc('ip_rate_check', {
      p_ip:         ip,
      p_bucket:     bucket,
      p_per_minute: perMinute,
      p_per_day:    perDay,
    });
    return data !== false;
  } catch {
    return true; // fail open — لا نمنع طلباً بسبب خطأ في حد المعدل
  }
}
