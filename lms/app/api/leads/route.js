import { createAdminClient } from '../../../lib/supabase-admin';
import { getClientIP, ipRateCheck } from '../../../lib/ip-rate-check';
import { notify } from '../../../lib/notify';

export const dynamic = 'force-dynamic';

// نقطة استقبال عامة بالكامل — لا كود تقييم ولا جلسة مطلوبة (بخلاف
// save-assessment/validate-student-code اللذين يخدمان التدفق المدفوع
// المُدعى إليه). هذه تُستدعى من قمع "اختبار تحديد المستوى" التسويقي
// المفتوح للعموم (src/quicktest/، assessment.aarem.net/?quick=1) — راجع
// القسم الخاص بمشروع Lead Generation. ipRateCheck هنا هو الحارس الوحيد
// ضد إساءة الاستخدام بعد إزالة بوابة الكود.
//
// ملاحظة: استبانة "الاستشارة التعليمية" (source='consultation_survey')
// كانت تُرسِل لهذا المسار سابقاً من assessment.aarem.net/?survey=1 (موقع
// Vite منفصل، فاحتاجت سرّ ويبهوك مشترك للاتصال عبر الأصل). انتقلت الاستبانة
// الآن لتعيش على www.aarem.net/survey (نفس تطبيق الـLMS) وترسل مباشرة
// لمسارها الداخلي الخاص lms/app/api/survey/route.js بلا حاجة لسرّ — فهذا
// المسار أصبح حصرياً لـquick_test فقط من جديد. صفوف consultation_survey
// القديمة تبقى في marketing_leads وتُعرَض كما هي في bogga (LeadsTab.jsx).
const CORS = {
  'Access-Control-Allow-Origin':  'https://assessment.aarem.net',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-webhook-secret',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request) {
  try {
    const secret = process.env.ASSESSMENT_WEBHOOK_SECRET;
    if (!secret || request.headers.get('x-webhook-secret') !== secret) {
      return Response.json({ ok: false }, { status: 401, headers: CORS });
    }

    const ip = getClientIP(request);
    if (!await ipRateCheck(ip, 'rl:leads-create', 5, 30)) {
      return Response.json(
        { ok: false, error: 'عدد المحاولات تجاوز الحد المسموح. يرجى الانتظار قليلاً.' },
        { status: 429, headers: { ...CORS, 'Retry-After': '60' } }
      );
    }

    const { parentName, phone, email, childName, childAge, score, level, answers } = await request.json();

    if (!parentName?.trim() || !phone?.trim() || !childName?.trim()) {
      return Response.json({ ok: false, error: 'بيانات ناقصة' }, { status: 400, headers: CORS });
    }

    // تفاصيل الإجابات — لتغذية نافذة "تفاصيل الإجابات" في bogga. لا تُثِق
    // بشكل المحتوى الداخلي، إذ يأتي من متصفح الزائر مباشرة.
    const safeAnswers = Array.isArray(answers)
      ? answers.filter(a => a && typeof a === 'object').slice(0, 50)
      : null;

    const supabase = createAdminClient();
    const { error } = await supabase.from('marketing_leads').insert({
      parent_name: parentName.trim(),
      phone:       phone.trim(),
      email:       email?.trim() || null,
      child_name:  childName.trim(),
      child_age:   Number.isFinite(Number(childAge)) ? Number(childAge) : null,
      score:       Number.isFinite(Number(score)) ? Math.round(Number(score) * 10) / 10 : null,
      level:       level || null,
      answers:     safeAnswers,
      source:      'quick_test',
    });

    if (error)
      return Response.json({ ok: false, error: error.message }, { status: 500, headers: CORS });

    await notify(
      'lead',
      '🎯 عميل محتمل جديد من اختبار تحديد المستوى',
      `ولي الأمر: ${parentName.trim()} — الطفل: ${childName.trim()}`,
      { phone: phone.trim() }
    );

    return Response.json({ ok: true }, { headers: CORS });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500, headers: CORS });
  }
}
