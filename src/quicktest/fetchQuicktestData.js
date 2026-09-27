// جسر القراءة الديناميكية لأسئلة/مستويات القمع التسويقي — بنفس نمط
// src/data/fetchQuestions.js حرفياً. يُستدعى مرة واحدة لكل جلسة متصفح
// (مخزَّن في متغيّر الوحدة)، عبر /api/quicktest-questions الذي يقرأ من
// Supabase بـservice_role (القراءة المباشرة من العميل ممنوعة بـRLS).
//
// فشل آمن مزدوج الطبقة: (1) الخادم نفسه يُرجع source:'fallback' إن تعذّر
// عليه الوصول لـSupabase أو كانت الجداول فارغة، (2) هذا الملف يلتقط أيضاً
// أي فشل شبكة/مهلة/رد غير متوقع. في الحالتين يستخدم المستدعي (QuickTestApp)
// المحتوى الثابت في blueprint.js — لا يتعطل القمع التسويقي أمام أي زائر.

const FETCH_TIMEOUT_MS = 6000;

let cachedPromise = null;

async function fetchFresh() {
  try {
    const res = await fetch('/api/quicktest-questions', { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`استجابة غير متوقعة: ${res.status}`);
    const data = await res.json();
    if (data?.source === 'database' && Array.isArray(data.questions) && data.questions.length > 0 && Array.isArray(data.levels) && data.levels.length > 0) {
      return data;
    }
    return { source: 'fallback' };
  } catch (err) {
    console.error('[fetchQuicktestData] تعذّر الجلب من قاعدة البيانات، سيُستخدَم المحتوى الثابت:', err.message);
    return { source: 'fallback' };
  }
}

/** يُرجع { source: 'database'|'fallback', questions?, levels?, whatsappTemplate? } — مخزَّن لبقية الجلسة بعد أول استدعاء. */
export function getQuicktestData() {
  if (!cachedPromise) cachedPromise = fetchFresh();
  return cachedPromise;
}
