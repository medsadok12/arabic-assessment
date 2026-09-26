// جسر القراءة الديناميكية لبنك أسئلة التقييم — يُستدعى مرة واحدة فعلياً لكل
// جلسة متصفح (نتيجته تُخزَّن هنا في متغيّر الوحدة، لا تُعاد قراءتها عند كل
// انتقال مستوى) عبر /api/questions، والذي يقرأ من Supabase عبر service_role
// (القراءة المباشرة من العميل ممنوعة بـRLS، راجع lms/supabase/assessment_questions.sql).
//
// فشل آمن مزدوج الطبقة: (1) الخادم نفسه يُرجع source:'fallback' إن تعذّر
// عليه الوصول لـSupabase، (2) هذا الملف يلتقط أيضاً أي فشل شبكة/مهلة/رد غير
// متوقع من الطلب نفسه. في الحالتين تُستخدم الأسئلة الثابتة المرفقة أصلاً في
// حزمة التطبيق (questionsBank في هذا الملف) — لا يتعطل التقييم أمام أي طالب.
//
// اتساق الجلسة: إن فشل أول طلب (أو نجح)، تبقى بقية المستويات في نفس الجلسة
// على نفس المصدر (لا تبديل مصدر منتصف التقييم) — تفادياً لخلط أسئلة قاعدة
// البيانات بأسئلة الملف الثابت في تقييم واحد.

const FETCH_TIMEOUT_MS = 6000;

let cachedPromise = null;

async function fetchFresh() {
  try {
    const res = await fetch('/api/questions', { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`استجابة غير متوقعة: ${res.status}`);
    const data = await res.json();
    if (data?.source === 'database' && data.levels && Array.isArray(data.skills)) {
      return data;
    }
    return { source: 'fallback' };
  } catch (err) {
    console.error('[fetchQuestions] تعذّر الجلب من قاعدة البيانات، سيُستخدَم البنك الثابت:', err.message);
    return { source: 'fallback' };
  }
}

/** يُرجع { source: 'database'|'fallback', levels?, skills? } — مخزَّن لبقية الجلسة بعد أول استدعاء. */
export function getQuestionData() {
  if (!cachedPromise) cachedPromise = fetchFresh();
  return cachedPromise;
}
