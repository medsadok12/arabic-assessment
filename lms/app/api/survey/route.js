import { createAdminClient } from '../../../lib/supabase-admin';
import { getClientIP, ipRateCheck } from '../../../lib/ip-rate-check';
import { notify } from '../../../lib/notify';

export const dynamic = 'force-dynamic';

// نقطة استقبال استبانة "الاستشارة التعليمية" (/survey) — تُستدعى حصراً من
// صفحة في نفس التطبيق (www.aarem.net)، لا من أصل خارجي كما كان الحال سابقاً
// (الاستبانة كانت على assessment.aarem.net/?survey=1، موقع Vite منفصل
// يحتاج سرّ ويبهوك مشترك كما في /api/leads). بما أن الاستبانة انتقلت لتعيش
// هنا، لا داعٍ لذلك السرّ — ipRateCheck هو الحارس الفعلي (نفس bucket
// rl:leads-create المستخدَم في /api/leads، سقف IP موحّد لكل مسارات إنشاء
// عميل محتمل معاً).
export async function POST(request) {
  try {
    const ip = getClientIP(request);
    if (!await ipRateCheck(ip, 'rl:leads-create', 5, 30)) {
      return Response.json(
        { ok: false, error: 'عدد المحاولات تجاوز الحد المسموح. يرجى الانتظار قليلاً.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const { parentName, phone, childName, answers } = await request.json();

    if (!parentName?.trim() || !phone?.trim()) {
      return Response.json({ ok: false, error: 'بيانات ناقصة' }, { status: 400 });
    }

    // كائن واحد لكل إجابات خطوات الاستبانة الخمس — لا مصفوفة أسئلة
    // كاختبار تحديد المستوى، لاختلاف طبيعة البيانات.
    const safeAnswers = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : null;

    const supabase = createAdminClient();
    const { error } = await supabase.from('marketing_leads').insert({
      parent_name: parentName.trim(),
      phone:       phone.trim(),
      child_name:  childName?.trim() || null,
      answers:     safeAnswers,
      source:      'consultation_survey',
    });

    if (error)
      return Response.json({ ok: false, error: error.message }, { status: 500 });

    await notify(
      'lead',
      '📋 عميل محتمل جديد من استبانة الاستشارة التعليمية',
      `ولي الأمر: ${parentName.trim()}`,
      { phone: phone.trim() }
    );

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
