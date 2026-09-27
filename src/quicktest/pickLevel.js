/**
 * يختار المستوى المطابق لعدد الإجابات الصحيحة، حسب نطاق [minCorrect,
 * maxCorrect] القابل للتعديل من لوحة الإدارة (لا حسب موضع الأسئلة —
 * الأسئلة نفسها قابلة للإضافة/الحذف/إعادة الترتيب، فأي منطق مبني على
 * "السؤال رقم 6 إلى 10" كان سينكسر مع أول تعديل). يعمل بلا فرق بين
 * levels من Supabase أو من blueprint.js الثابت — نفس الشكل تماماً.
 *
 * يتسامح مع الحواف: عدد يتجاوز كل النطاقات المُعرَّفة (مثال: أضاف الأستاذ
 * محمد أسئلة جديدة ونسي تحديث حدود "المبدعون") يُطابَق لأعلى مستوى، وعدد
 * أقل من كل النطاقات (لا يُفترَض أن يحدث بما أن minCorrect يبدأ من صفر
 * عادة) يُطابَق لأدنى مستوى — لا يُترَك القمع التسويقي بلا نتيجة أبداً.
 */
export function pickLevelByScore(score, levels) {
  if (!Array.isArray(levels) || levels.length === 0) return null;
  const sorted = [...levels].sort((a, b) => a.minCorrect - b.minCorrect);
  const match = sorted.find(l => score >= l.minCorrect && score <= l.maxCorrect);
  if (match) return match;
  return score > sorted[sorted.length - 1].maxCorrect
    ? sorted[sorted.length - 1]
    : sorted[0];
}
