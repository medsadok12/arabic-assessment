import { useState } from 'react';
import { ALPHABET_LETTERS, DEFAULT_ALPHABET_TITLE, DEFAULT_ALPHABET_SUBTITLE } from './blueprint.js';

const STATE = { DEFAULT: 0, KNOWN: 1, NEEDS_PRACTICE: 2 };

/**
 * السؤال الافتتاحي المخصص لتقييم "التعرف على الحروف الأبجدية" — أول خطوة
 * فعلية في الاختبار الترويجي (بعد نموذج بيانات الطفل، قبل الأسئلة الـ15
 * القادمة من لوحة الإدارة). الحروف/العنوان/النص الفرعي أصبحت قابلة للتعديل
 * من لوحة bogga (تبويب "إدارة الاختبار الترويجي" → قسم "🔤 تمرين الحروف")
 * وتُمرَّر كـprops من QuickTestApp.jsx — القيم الافتراضية هنا (من
 * blueprint.js) نسخة احتياطية فقط عند أي فشل في القراءة من قاعدة البيانات.
 * الحالة الثلاثية لكل بطاقة تبقى منطقاً ثابتاً في الكود (لا تُدار من CMS)
 * لأن شكلها مختلف جذرياً عن بنية MCQ القياسية في quicktest_questions.
 *
 * الحالة تُخزَّن بموضع الحرف (index) لا نصّه — لو أضاف الأستاذ محمد حرفاً
 * مكرَّراً من اللوحة (نظرياً ممكن، لا قيد فريد على العمود) لا تتصادم حالتا
 * الحرفين على نفس المفتاح كما كان سيحدث مع التخزين بالنص.
 *
 * قاعدة "صفر إحباط" مطبَّقة هنا بأقصى درجة، بطلب صريح من الأستاذ محمد: لا
 * علامة ❌ ولا اللون الأحمر إطلاقاً في أي حالة — "لم يعرفه الطفل" تُعرَض
 * كبطاقة باهتة (شفافية 50%) بلا أي أيقونة، لا كإشارة خطأ.
 */
export default function AlphabetGridAssessment({
  letters = ALPHABET_LETTERS,
  title = DEFAULT_ALPHABET_TITLE,
  subtitle = DEFAULT_ALPHABET_SUBTITLE,
  onComplete,
}) {
  const [states, setStates] = useState(() => letters.map(() => STATE.DEFAULT));

  const assignedCount = states.filter(s => s !== STATE.DEFAULT).length;
  const allAssigned = assignedCount === letters.length;

  function cycleLetter(idx) {
    setStates(prev => prev.map((s, i) => i === idx ? (s + 1) % 3 : s));
  }

  function buildResult(finalStates) {
    return {
      type: 'alphabet-grid',
      questionId: 'alphabet-grid',
      skillTag: 'التعرف على الحروف الأبجدية',
      masteredLetters: letters.filter((_, i) => finalStates[i] === STATE.KNOWN),
      needsReviewLetters: letters.filter((_, i) => finalStates[i] === STATE.NEEDS_PRACTICE),
    };
  }

  // زر الإكمال السريع: يُحدِّد أي حرف لم يُلمَس بعد كـ"يحتاج تدريباً" وينتقل
  // فوراً — اختصار عند توقف الطفل عن الاستجابة، لا يحتاج ضغطة تأكيد ثانية.
  function markRestAndContinue() {
    const finalStates = states.map(s => s === STATE.DEFAULT ? STATE.NEEDS_PRACTICE : s);
    onComplete(buildResult(finalStates));
  }

  function handleContinue() {
    onComplete(buildResult(states));
  }

  return (
    <div className="page-content">
      <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: 13, marginBottom: 6 }}>
        السؤال الافتتاحي
      </p>
      <h2 className="page-title" style={{ fontSize: '1.15rem', marginBottom: 8 }}>
        {title}
      </h2>
      <p className="page-subtitle" style={{ marginBottom: 18 }}>
        {subtitle}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(62px, 1fr))',
          gap: 10,
          marginBottom: 16,
        }}
      >
        {letters.map((letter, idx) => {
          const state = states[idx];
          const isKnown = state === STATE.KNOWN;
          const needsPractice = state === STATE.NEEDS_PRACTICE;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => cycleLetter(idx)}
              aria-label={`الحرف ${letter} — ${isKnown ? 'يعرفه الطفل' : needsPractice ? 'يحتاج تدريباً' : 'لم يُحدَّد بعد'}`}
              style={{
                position: 'relative',
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'clamp(1.6rem, 6vw, 2.2rem)',
                fontWeight: 800,
                fontFamily: "'Tajawal', sans-serif",
                borderRadius: 14,
                cursor: 'pointer',
                transition: 'background .15s, opacity .15s, border-color .15s',
                border: isKnown ? '2.5px solid #7fdfb0' : needsPractice ? '2px solid #e4e4e4' : '2px solid var(--border)',
                background: isKnown ? '#eafbf3' : needsPractice ? '#ececec' : '#fff',
                color: needsPractice ? '#9a9a9a' : 'var(--primary)',
                opacity: needsPractice ? 0.5 : 1,
              }}
            >
              {letter}
              {isKnown && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute', top: -6, insetInlineEnd: -6,
                    fontSize: '.95rem', background: '#fff', borderRadius: '50%', lineHeight: 1,
                  }}
                >
                  ✅
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: 13, marginBottom: 16 }}>
        تم تحديد {assignedCount} من {letters.length} حرفاً
      </p>

      <button className="btn-secondary" type="button" onClick={markRestAndContinue}>
        تحديد باقي الحروف كـ (يحتاج تدريباً) والمتابعة
      </button>

      <button className="btn-primary" type="button" onClick={handleContinue} disabled={!allAssigned}>
        متابعة إلى الأسئلة التالية ←
      </button>
    </div>
  );
}
