// جلب "حقائق" التقييم الحيّة (عدد الأسئلة، نقطة التحقق) من مشروع
// arabic-assessment المنفصل (Vercel project مستقل تماماً، القسم 7.1 من
// CLAUDE.md) — بدل تكرار أرقام ثابتة في نص المساعد الذكي "فهيم" هنا، تصبح
// عرضة للتقادم بصمت كلما تغيّر بنك الأسئلة في التطبيق الآخر.
//
// يُستخدَم من مسارين: api/assessment-meta (بروكسي بنفس الأصل لمكوّنات
// العميل كـSmartFAQ) وapi/visitor-faq (حقن مباشر في الـsystem prompt).

const ASSESSMENT_META_URL = 'https://assessment.aarem.net/api/assessment-meta';

// قيمة احتياطية معقولة فقط إن تعذّر الوصول للمصدر الحيّ (مشروع آخر قد يكون
// معطَّلاً مؤقتاً) — لا تُعرض للمستخدم كحقيقة مؤكدة، بل تمنع كسر الاستجابة.
const FALLBACK_META = { totalQuestions: null, checkpointQuestion: null, perLevel: [] };

export async function getAssessmentMeta() {
  try {
    const res = await fetch(ASSESSMENT_META_URL, {
      // كاش Next.js الخاص بـfetch — لا علاقة له بـforce-dynamic في المسارات
      // المستهلِكة (ذلك يمنع كاش الصفحة/المسار نفسه، لا كاش نداء fetch هذا
      // تحديداً) — أول طلب بعد كل ساعة يصل فعلياً، والباقي من الكاش فوراً.
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return FALLBACK_META;
    const data = await res.json();
    if (typeof data?.totalQuestions !== 'number') return FALLBACK_META;
    return data;
  } catch {
    return FALLBACK_META;
  }
}
