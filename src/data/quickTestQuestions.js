import { getLevelQuestions } from './questions.js';

// انتقاء يدوي من بنك الأسئلة الحقيقي (لا نسخ محتوى — هذا يضمن بقاءه
// متزامناً مع أي تعديل مستقبلي على questions.js، ويحافظ على `skill`
// الصحيح المُلصَق فعلياً بواسطة getLevelQuestions). كل الأسئلة المختارة
// من نوع اختيار من متعدد بسيط (options: [{text, correct}]) أو استماع+اختيار
// نصي (listening-comprehension) — بلا أي سؤال يتطلب تسجيلاً صوتياً أو
// صورة (photo-writing/speaking/oral-assessment) أو سحباً وإفلاتاً، حفاظاً
// على قمع تسويقي سريع (~5 دقائق) بلا أي احتكاك (إذن ميكروفون/كاميرا).
const QUICK_TEST_IDS = [
  'L1_GR1', 'L1_GR2',           // إحماء سهل (مستوى 1، نحو)
  'L2_1', 'L2_2',                // استماع + فهم (صوت فقط، بلا تسجيل)
  'V2_1', 'V2_2', 'V2_3',        // مفردات
  'R2_1', 'R2_2', 'R2_3',        // قراءة وفهم
  'G2_1', 'G2_2',                // نحو
];

export function getQuickTestQuestions() {
  const pool = [...getLevelQuestions(1), ...getLevelQuestions(2)];
  const byId = Object.fromEntries(pool.map(q => [q.id, q]));
  return QUICK_TEST_IDS.map(id => byId[id]).filter(Boolean);
}
