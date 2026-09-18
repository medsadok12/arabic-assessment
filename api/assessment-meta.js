// نقطة نهاية عامة تُعرِّف "حقائق" التقييم الحيّة (عدد الأسئلة، نقطة التحقق)
// برمجياً من questions.js — بدل تكرارها كأرقام ثابتة في أماكن أخرى (مثل نص
// المساعد الذكي "فهيم" على الموقع الرئيسي، lms/). أي تعديل مستقبلي على بنك
// الأسئلة ينعكس هنا تلقائياً بلا أي تدخل يدوي.
import { getLevelQuestions, CHECKPOINT_QUESTION } from '../src/data/questions.js';

export default function handler(req, res) {
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' });

  const perLevel = [1, 2, 3].map((level) => ({
    level,
    questions: getLevelQuestions(level).length,
  }));
  const totalQuestions = perLevel.reduce((sum, l) => sum + l.questions, 0);

  // ثابتة نسبياً (تتغيّر فقط عبر نشر كود جديد) — كاش قصير يكفي لتقليل الحمل
  // بلا خطر عرض بيانات قديمة لفترة طويلة إن تغيّر بنك الأسئلة.
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).json({
    totalQuestions,
    checkpointQuestion: CHECKPOINT_QUESTION,
    perLevel,
  });
}
