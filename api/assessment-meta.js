// نقطة نهاية عامة تُعرِّف "حقائق" التقييم الحيّة (عدد الأسئلة، نقطة التحقق)
// — تحاول أولاً العدّ الفعلي من Supabase (assessment_questions، enabled=true
// فقط) ليعكس تعديلات لوحة bogga فوراً، وتعود عند أي فشل لعدّ بنك الأسئلة
// الثابت في questions.js كنسخة احتياطية (نفس نمط api/questions.js تماماً).
import { getLevelQuestions, CHECKPOINT_QUESTION } from '../src/data/questions.js';

const TIMEOUT_MS = 4000;

async function countFromDatabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/assessment_questions?enabled=eq.true&select=level`,
      {
        headers: {
          apikey:        process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        signal: controller.signal,
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!Array.isArray(rows)) return null;
    return [1, 2, 3].map((level) => ({
      level,
      questions: rows.filter((r) => r.level === level).length,
    }));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function countFromStaticBank() {
  return [1, 2, 3].map((level) => ({ level, questions: getLevelQuestions(level).length }));
}

export default async function handler(req, res) {
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' });

  const perLevel = (await countFromDatabase()) ?? countFromStaticBank();
  const totalQuestions = perLevel.reduce((sum, l) => sum + l.questions, 0);

  // قصيرة عمداً (خلافاً للماضي): العدّ قد يتغيّر الآن من لوحة bogga في أي لحظة.
  res.setHeader('Cache-Control', 'public, max-age=60');
  return res.status(200).json({
    totalQuestions,
    checkpointQuestion: CHECKPOINT_QUESTION,
    perLevel,
  });
}
