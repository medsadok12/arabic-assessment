// نقطة نهاية تجلب بنك أسئلة التقييم ديناميكياً من Supabase (assessment_questions
// + assessment_skills) — القراءة تتم هنا حصراً عبر service_role من الخادم،
// لأن الجدول محمي بـRLS DENY ALL كاملاً لـanon/authenticated (لا قراءة مباشرة
// بمفتاح anon تكشف بنك الإجابات، راجع lms/supabase/assessment_questions.sql).
//
// فشل آمن: أي خطأ (مهلة، انقطاع، رد غير متوقع) يُرجع { source:'fallback' }
// فوراً — العميل (src/data/fetchQuestions.js) يستخدم عندها بنك الأسئلة
// الثابت المرفق أصلاً في حزمة التطبيق (src/data/questions.js) كنسخة احتياطية،
// فلا يتعطل التقييم أمام أي طالب مهما حدث لقاعدة البيانات.

const TIMEOUT_MS = 5000;

async function fetchJson(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${process.env.SUPABASE_URL}${path}`, {
      headers: {
        apikey:        process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Supabase REST ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function toQuestionObject(row) {
  const q = { id: row.id, skill: row.skill, ...(row.payload || {}) };
  if (row.type && row.type !== 'mcq') q.type = row.type;
  return q;
}

export default async function handler(req, res) {
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase env vars not configured');
    }

    const [questionRows, skillRows] = await Promise.all([
      fetchJson('/rest/v1/assessment_questions?enabled=eq.true&select=id,level,skill,type,order_index,shuffle_within_level,payload&order=level.asc,order_index.asc'),
      fetchJson('/rest/v1/assessment_skills?select=id,name,weight&order=sort_order.asc'),
    ]);

    if (!Array.isArray(questionRows) || !Array.isArray(skillRows)) {
      throw new Error('Unexpected Supabase response shape');
    }

    const levels = { 1: { fixed: [], shuffled: [] }, 2: { fixed: [], shuffled: [] }, 3: { fixed: [], shuffled: [] } };
    for (const row of questionRows) {
      const bucket = levels[row.level];
      if (!bucket) continue;
      const q = toQuestionObject(row);
      (row.shuffle_within_level ? bucket.shuffled : bucket.fixed).push(q);
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ source: 'database', levels, skills: skillRows });
  } catch (e) {
    console.error('[api/questions] فشل الجلب من Supabase — سيعتمد العميل على النسخة الثابتة:', e.message);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ source: 'fallback' });
  }
}
