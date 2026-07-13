import { useState } from 'react';

/* 6 حروف × 3 حركات = 18 صوتاً */
const CARDS = [
  { id: 'b', vowels: ['بَ', 'بُ', 'بِ'] },
  { id: 'j', vowels: ['جَ', 'جُ', 'جِ'] },
  { id: 'd', vowels: ['دَ', 'دُ', 'دِ'] },
  { id: 'r', vowels: ['رَ', 'رُ', 'رِ'] },
  { id: 's', vowels: ['سَ', 'سُ', 'سِ'] },
  { id: 'm', vowels: ['مَ', 'مُ', 'مِ'] },
];

const TOTAL = CARDS.length * 3; // 18

export default function VowelCards({ question, onAnswer }) {
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

  function toggleVowel(e, cardIdx, vowelIdx) {
    e.stopPropagation();
    const key = `${cardIdx}-${vowelIdx}`;
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
      answerText:  `أتقن ${correct.size} من ${TOTAL} صوتاً`,
      correctText: `إتقان ${TOTAL} صوتاً (النجاح من 14)`,
    });
  }

  const done = correct.size;

  return (
    <div className="question-box vc-box">
      <div className="lr-instructions">
        <p className="lr-title">اقْرَأِ الْحُرُوفَ بِالْحَرَكَاتِ <span className="lr-sep">|</span> Read with vowels</p>
        <p className="lr-hint">اضغط البطاقة لقلبها ← ثم اضغط على الدائرة عند النطق الصحيح</p>
      </div>

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
                {/* ── وجه أمامي: علامة ؟ فقط ── */}
                <div className="vc-face vc-front">
                  <span className="vc-q-mark">؟</span>
                </div>

                {/* ── وجه خلفي: 3 دوائر أفقية ── */}
                <div className="vc-face vc-back">
                  <div className="vc-circles">
                    {card.vowels.map((vowel, vi) => {
                      const key    = `${ci}-${vi}`;
                      const isDone = correct.has(key);
                      return (
                        <button
                          key={vi}
                          className={`vc-circle${isDone ? ' vc-done' : ''}`}
                          onClick={e => toggleVowel(e, ci, vi)}
                          aria-pressed={isDone}
                        >
                          <span className="vc-vowel-inner">{vowel}</span>
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

      <div className="lr-footer">
        <div className="lr-counter">
          <span className="lr-counter-label">الأصوات المكتملة:</span>
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
