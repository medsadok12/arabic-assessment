import { useState } from 'react';

const CARDS = [
  { id: 'a', label: 'أ', vowels: ['أَ', 'أُ', 'أِ'] },
  { id: 'b', label: 'ب', vowels: ['بَ', 'بُ', 'بِ'] },
  { id: 'j', label: 'ج', vowels: ['جَ', 'جُ', 'جِ'] },
  { id: 'd', label: 'د', vowels: ['دَ', 'دُ', 'دِ'] },
  { id: 'r', label: 'ر', vowels: ['رَ', 'رُ', 'رِ'] },
  { id: 's', label: 'س', vowels: ['سَ', 'سُ', 'سِ'] },
  { id: 'f', label: 'ف', vowels: ['فَ', 'فُ', 'فِ'] },
  { id: 'm', label: 'م', vowels: ['مَ', 'مُ', 'مِ'] },
];

const TOTAL = CARDS.length * 3; // 24

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
      isCorrect:  correct.size >= 18,
    });
  }

  const done = correct.size;

  return (
    <div className="question-box vc-box">
      <div className="lr-instructions">
        <p className="lr-ar">اقْرَأِ الْحُرُوفَ بِالْحَرَكَاتِ</p>
        <p className="lr-en">Read the letters with vowels</p>
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
                aria-label={`بطاقة حرف ${card.label}`}
              >
                {/* ── الوجه الأمامي ── */}
                <div className="vc-face vc-front">
                  <span className="vc-q-mark">؟</span>
                  <span className="vc-front-label">{card.label}</span>
                </div>

                {/* ── الوجه الخلفي ── */}
                <div className="vc-face vc-back">
                  <span className="vc-back-title">{card.label}</span>
                  <div className="vc-circles">
                    {card.vowels.map((v, vi) => {
                      const key   = `${ci}-${vi}`;
                      const isDone = correct.has(key);
                      return (
                        <button
                          key={vi}
                          className={`vc-circle${isDone ? ' vc-done' : ''}`}
                          onClick={e => toggleVowel(e, ci, vi)}
                          aria-pressed={isDone}
                          aria-label={v}
                        >
                          {v}
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
