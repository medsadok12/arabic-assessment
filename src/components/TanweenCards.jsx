import { useState } from 'react';

/* 6 حروف × 3 أنواع تنوين = 18 صوتاً
   ترتيب الدوائر: تنوين فتح | تنوين ضم | تنوين كسر (من اليمين لليسار) */
const CARDS = [
  { id: 'b', tanween: ['بً', 'بٌ', 'بٍ'] },
  { id: 't', tanween: ['تً', 'تٌ', 'تٍ'] },
  { id: 'r', tanween: ['رً', 'رٌ', 'رٍ'] },
  { id: 's', tanween: ['سً', 'سٌ', 'سٍ'] },
  { id: 'm', tanween: ['مً', 'مٌ', 'مٍ'] },
  { id: 'n', tanween: ['نً', 'نٌ', 'نٍ'] },
];

const TOTAL = CARDS.length * 3; // 18

export default function TanweenCards({ question, onAnswer }) {
  const [flipped,  setFlipped]  = useState(new Set());
  const [correct,  setCorrect]  = useState(new Set());

  function toggleCard(cardIdx) {
    setFlipped(prev => {
      const next = new Set(prev);
      if (next.has(cardIdx)) next.delete(cardIdx);
      else next.add(cardIdx);
      return next;
    });
  }

  function toggleSound(e, cardIdx, soundIdx) {
    e.stopPropagation();
    const key = `${cardIdx}-${soundIdx}`;
    setCorrect(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleReset() {
    setFlipped(new Set());
    setCorrect(new Set());
  }

  function handleSubmit() {
    onAnswer({
      questionId: question.id,
      skill:      question.skill ?? 'reading',
      answer:     correct.size,
      isCorrect:  correct.size >= 14,
    });
  }

  const done = correct.size;

  return (
    <div className="question-box vc-box">

      {/* ── التعليمة ── */}
      <div className="lr-instructions">
        <p className="lr-title">
          أَصْوَاتُ التَّنْوِينِ <span className="lr-sep">|</span> Nunation Sounds
        </p>
        <div className="sk-parent-note">
          <span className="sk-note-icon">👨‍👩‍👦</span>
          <p>
            <span className="sk-note-label">توجيه لولي الأمر: </span>
            التنوين هو صوت النون الساكنة في آخر الحرف. انقر على البطاقة واطلب من الطفل نطق التنوين بأنواعه الثلاثة كتمهيد لقراءة الكلمات كاملة، ثم اعتمد الإجابة الصحيحة.
          </p>
        </div>
      </div>

      {/* ── البطاقات — نفس نظام التدريب الثاني تماماً ── */}
      <div className="vc-grid">
        {CARDS.map((card, ci) => {
          const isFlipped = flipped.has(ci);
          return (
            <div key={card.id} className="vc-wrapper">
              <div
                className={`vc-card${isFlipped ? ' vc-flipped' : ''}`}
                onClick={() => toggleCard(ci)}
                role="button"
                aria-pressed={isFlipped}
              >
                {/* وجه أمامي: علامة ؟ */}
                <div className="vc-face vc-front">
                  <span className="vc-q-mark">؟</span>
                </div>

                {/* وجه خلفي: 3 دوائر (فتح | ضم | كسر) */}
                <div className="vc-face vc-back">
                  <div className="vc-circles">
                    {card.tanween.map((tw, ti) => {
                      const key    = `${ci}-${ti}`;
                      const isDone = correct.has(key);
                      return (
                        <button
                          key={ti}
                          className={`vc-circle${isDone ? ' vc-done' : ''}`}
                          onClick={e => toggleSound(e, ci, ti)}
                          aria-pressed={isDone}
                        >
                          <span className="vc-vowel-inner">{tw}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── تذييل ── */}
      <div className="lr-footer">
        <div className="lr-counter">
          <span className="lr-counter-label">أصوات التنوين الصحيحة:</span>
          <span className="lr-counter-val">{done}</span>
          <span className="lr-counter-of">من {TOTAL}</span>
          {done > 0 && (
            <span className="lr-counter-pct">({Math.round((done / TOTAL) * 100)}%)</span>
          )}
        </div>
        <button className="lr-reset-btn" onClick={handleReset}>
          إعادة تعيين 🔄
        </button>
      </div>

      <button className="btn-primary" onClick={handleSubmit} style={{ marginTop: 14 }}>
        تأكيد وإكمال التدريب ✓
      </button>
    </div>
  );
}
