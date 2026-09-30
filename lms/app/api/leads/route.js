import { createAdminClient } from '../../../lib/supabase-admin';
import { getClientIP, ipRateCheck } from '../../../lib/ip-rate-check';
import { notify } from '../../../lib/notify';

export const dynamic = 'force-dynamic';

// نقطة استقبال عامة بالكامل — لا كود تقييم ولا جلسة مطلوبة (بخلاف
// save-assessment/validate-student-code اللذين يخدمان التدفق المدفوع
// المُدعى إليه). هذه تُستدعى من قمع "اختبار تحديد المستوى" التسويقي
// المفتوح للعموم (src/quicktest/) — راجع القسم الخاص بمشروع Lead
// Generation. ipRateCheck هنا هو الحارس الوحيد ضد إساءة الاستخدام بعد
// إزالة بوابة الكود.
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

    const { parentName, phone, email, childName, childAge, score, level, answers, source: rawSource } = await request.json();

    // مصادر عملاء محتملين مسموحة — quick_test هو الافتراضي التاريخي (يحافظ
    // على سلوك LeadGate.jsx القائم بلا أي تغيير)، وconsultation_survey مصدر
    // جديد (ConsultationSurvey.jsx، assessment.aarem.net/?survey=1) يعيد
    // استخدام نفس الجدول بقرار صريح بدل جدول منفصل.
    const ALLOWED_SOURCES = ['quick_test', 'consultation_survey'];
    const source = ALLOWED_SOURCES.includes(rawSource) ? rawSource : 'quick_test';

    if (!parentName?.trim() || !phone?.trim()) {
      return Response.json({ ok: false, error: 'بيانات ناقصة' }, { status: 400, headers: CORS });
    }
    // اسم الطفل إجباري لاختبار تحديد المستوى فقط — استبانة الاستشارة
    // التعليمية لا تجمع اسم الطفل إطلاقاً (راجع marketing_leads_nullable_child_name.sql).
    if (source === 'quick_test' && !childName?.trim()) {
      return Response.json({ ok: false, error: 'بيانات ناقصة' }, { status: 400, headers: CORS });
    }

    // تفاصيل الإجابات — لتغذية نافذة "تفاصيل الإجابات" في bogga. تُقبَل
    // كمصفوفة كائنات (اختبار تحديد المستوى) أو ككائن واحد (استبانة
    // الاستشارة، إجابات الخطوات الخمس). لا تُثِق بشكل المحتوى الداخلي، إذ
    // يأتي من متصفح الزائر مباشرة.
    const safeAnswers = Array.isArray(answers)
      ? answers.filter(a => a && typeof a === 'object').slice(0, 50)
      : (answers && typeof answers === 'object' ? answers : null);

    const supabase = createAdminClient();
    const { error } = await supabase.from('marketing_leads').insert({
      parent_name: parentName.trim(),
      phone:       phone.trim(),
      email:       email?.trim() || null,
      child_name:  childName?.trim() || null,
      child_age:   Number.isFinite(Number(childAge)) ? Number(childAge) : null,
      score:       Number.isFinite(Number(score)) ? Math.round(Number(score) * 10) / 10 : null,
      level:       level || null,
      answers:     safeAnswers,
      source,
    });

    if (error)
      return Response.json({ ok: false, error: error.message }, { status: 500, headers: CORS });

    const notifyTitle = source === 'consultation_survey'
      ? '📋 عميل محتمل جديد من استبانة الاستشارة التعليمية'
      : '🎯 عميل محتمل جديد من اختبار تحديد المستوى';
    const notifyBody = source === 'consultation_survey'
      ? `ولي الأمر: ${parentName.trim()}`
      : `ولي الأمر: ${parentName.trim()} — الطفل: ${childName.trim()}`;
    await notify('lead', notifyTitle, notifyBody, { phone: phone.trim() });

    return Response.json({ ok: true }, { headers: CORS });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500, headers: CORS });
  }
}
