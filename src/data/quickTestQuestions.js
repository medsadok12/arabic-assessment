import { getLevelQuestions } from './questions.js';

/**
 * يحوّل قائمة IDs (معرَّفة في src/quicktest/tracks.js لكل مسار عمري) إلى
 * كائنات الأسئلة الفعلية من بنك الأسئلة الحقيقي — لا نسخ محتوى، هذا يضمن
 * بقاءه متزامناً مع أي تعديل مستقبلي على questions.js، ويحافظ على `skill`
 * الصحيح المُلصَق فعلياً بواسطة getLevelQuestions. أي id غير موجود يُستبعَد
 * بصمت (filter(Boolean)) — تحقّق العدد النهائي بعد أي تعديل على tracks.js.
 */
export function resolveQuestionsByIds(ids) {
  const pool = [...getLevelQuestions(1), ...getLevelQuestions(2)];
  const byId = Object.fromEntries(pool.map(q => [q.id, q]));
  return ids.map(id => byId[id]).filter(Boolean);
}
