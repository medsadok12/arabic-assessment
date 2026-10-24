// أداة تحقق معدل الطلبات المشتركة لمسارات api/ في المشروع الجذر — نسخة
// مطابقة سلوكياً لـ lms/lib/ip-rate-check.js، لكن عبر REST مباشرة بدل
// @supabase/supabase-js (غير مثبَّتة هنا، والمشروعان منفصلان في الاستضافة
// فلا يصح استيراد lib/ الخاصة بـlms مباشرة). البادئة "_" تمنع Vercel من
// معاملة هذا الملف كمسار API مستقل.

export function getClientIP(req) {
  const xff = req.headers['x-forwarded-for'];
  return req.headers['x-real-ip'] || (xff ? xff.split(',')[0].trim() : '0.0.0.0');
}

/**
 * يتحقق من معدل الطلبات لعنوان IP محدد عبر دالة ip_rate_check في Supabase.
 * يُفشل بشكل مفتوح (يسمح بالطلب) عند أي خطأ — لا نمنع طالباً حقيقياً بسبب
 * عطل في خدمة التحقق نفسها.
 *
 * @returns {Promise<boolean>} true = مسموح، false = تجاوز الحد
 */
export async function ipRateCheck(ip, bucket, perMinute, perDay) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return true;
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/ip_rate_check`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey:         process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization:  `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        p_ip:         ip,
        p_bucket:     bucket,
        p_per_minute: perMinute,
        p_per_day:    perDay,
      }),
    });
    if (!res.ok) return true; // fail open
    const data = await res.json();
    return data !== false;
  } catch {
    return true; // fail open
  }
}
