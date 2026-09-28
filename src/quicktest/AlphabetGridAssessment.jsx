import { useState } from 'react';

const LETTERS = ['ا','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'];

const STATE = { DEFAULT: 0, KNOWN: 1, NEEDS_PRACTICE: 2 };

/**
 * السؤال الافتتاحي المخصص لتقييم "التعرف على الحروف الأبجدية" — أول خطوة
 * فعلية في الاختبار الترويجي (بعد نموذج بيانات الطفل، قبل الأسئلة الـ15
 * القادمة من لوحة الإدارة/blueprint.js). مكوّن ثابت في الكود (لا يُدار من
 * bogga) بقرار مقصود: شكله (شبكة 28 حرفاً بحالة ثلاثية لكل بطاقة) مختلف
 * جذرياً عن بنية MCQ القياسية في quicktest_questions، فلا فائدة من تعميمه
 * على نظام إدارة الأسئلة الحالي.
 *
 * قاعدة "صفر إحباط" مطبَّقة هنا بأقصى درجة، بطلب صريح من الأستاذ محمد: لا
 * علامة ❌ ولا اللون الأحمر إطلاقاً في أي حالة — "لم يعرفه الطفل" تُعرَض
 * كبطاقة باهتة (شفافية 50%) بلا أي أيقونة، لا كإشارة خطأ.
 */
export default function AlphabetGridAssessment({ onComplete }) {
  const [states, setStates] = useState(() => Object.fromEntries(LETTERS.map(l => [l, STATE.DEFAULT])));

  const assignedCount = Object.values(states).filter(s => s !== STATE.DEFAULT).length;
  const allAssigned = assignedCount === LETTERS.length;

  function cycleLetter(letter) {
    setStates(prev => ({ ...prev, [letter]: (prev[letter] + 1) % 3 }));
  }

  function buildResult(finalStates) {
    return {
      type: 'alphabet-grid',
      questionId: 'alphabet-grid',
      skillTag: 'التعرف على الحروف الأبجدية',
      masteredLetters: LETTERS.filter(l => finalStates[l] === STATE.KNOWN),
      needsReviewLetters: LETTERS.filter(l => finalStates[l] === STATE.NEEDS_PRACTICE),
    };
  }

  // زر الإكمال السريع: يُحدِّد أي حرف لم يُلمَس بعد كـ"يحتاج تدريباً" وينتقل
  // فوراً — اختصار عند توقف الطفل عن الاستجابة، لا يحتاج ضغطة تأكيد ثانية.
  function markRestAndContinue() {
    const finalStates = { ...states };
    for (const letter of LETTERS) {
      if (finalStates[letter] === STATE.DEFAULT) finalStates[letter] = STATE.NEEDS_PRACTICE;
    }
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
        🔤 هل يعرف طفلك هذه الحروف؟
      </h2>
      <p className="page-subtitle" style={{ marginBottom: 18 }}>
        اطلب من طفلك قراءة كل حرف بصوت عالٍ، ثم اضغط على الحرف حسب إجابته. اضغط مرة أخرى لتغيير التقييم، ومرة ثالثة للعودة للوضع الافتراضي.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(62px, 1fr))',
          gap: 10,
          marginBottom: 16,
        }}
      >
        {LETTERS.map(letter => {
          const state = states[letter];
          const isKnown = state === STATE.KNOWN;
          const needsPractice = state === STATE.NEEDS_PRACTICE;
          return (
            <button
              key={letter}
              type="button"
              onClick={() => cycleLetter(letter)}
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
        تم تحديد {assignedCount} من {LETTERS.length} حرفاً
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
