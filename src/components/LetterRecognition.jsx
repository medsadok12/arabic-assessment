import { useState } from 'react';

const LETTERS = [
  'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ',
  'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص',
  'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق',
  'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي',
];

export default function LetterRecognition({ question, onAnswer }) {
  const [correct, setCorrect] = useState(new Set());

  function toggle(letter) {
    setCorrect(prev => {
      const next = new Set(prev);
      if (next.has(letter)) next.delete(letter);
      else next.add(letter);
      return next;
    });
  }

  function handleReset() {
    setCorrect(new Set());
  }

  function handleSubmit() {
    onAnswer({
      questionId: question.id,
      skill:      question.skill ?? 'reading',
      answer:     correct.size,
      isCorrect:  correct.size >= 20,
      meta:       { correctLetters: correct.size, total: LETTERS.length },
    });
  }

  const pct = Math.round((correct.size / LETTERS.length) * 100);

  return (
    <div className="question-box lr-box">
      <div className="lr-instructions">
        <p className="lr-ar">اقْرَأِ الْحُرُوفَ</p>
        <p className="lr-en">Read the letters</p>
        <p className="lr-hint">اضغط على الحرف إذا قرأه الطالب بشكل صحيح ✓</p>
      </div>

      <div className="lr-grid-box">
        {LETTERS.map(letter => (
          <button
            key={letter}
            className={`lr-circle${correct.has(letter) ? ' lr-done' : ''}`}
            onClick={() => toggle(letter)}
            aria-pressed={correct.has(letter)}
          >
            {letter}
          </button>
        ))}
      </div>

      <div className="lr-footer">
        <div className="lr-counter">
          <span className="lr-counter-label">الحروف المكتملة:</span>
          <span className="lr-counter-val">{correct.size}</span>
          <span className="lr-counter-of">من {LETTERS.length}</span>
          {correct.size > 0 && (
            <span className="lr-counter-pct">({pct}%)</span>
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
