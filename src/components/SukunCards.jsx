import { useState } from 'react';

const SYLLABLES = [
  { id: 'ad',  text: 'أَدْ' },
  { id: 'bar', text: 'بَرْ' },
  { id: 'yas', text: 'يَسْ' },
  { id: 'man', text: 'مَنْ' },
  { id: 'qil', text: 'قِلْ' },
  { id: 'khudh', text: 'خُذْ' },
];

const TOTAL = SYLLABLES.length;

export default function SukunCards({ question, onAnswer }) {
  const [checked, setChecked] = useState(new Set());

  function toggle(id) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleReset() {
    setChecked(new Set());
  }

  function handleSubmit() {
    onAnswer({
      questionId: question.id,
      skill:      question.skill ?? 'reading',
      answer:     checked.size,
      isCorrect:  checked.size >= 4,
    });
  }

  return (
    <div className="question-box sk-box">

      {/* ── التعليمة ── */}
      <div className="lr-instructions">
        <p className="lr-title">
          قِرَاءَةُ المَقْطَعِ السَّاكِنِ <span className="lr-sep">|</span> Read the Sukun Syllable
        </p>
        <div className="sk-parent-note">
          <span className="sk-note-icon">👨‍👩‍👦</span>
          <p>
            <span className="sk-note-label">توجيه لولي الأمر: </span>
            يقرأ الطفل المقطع الساكن كدفعة صوتية واحدة، ثم انقر على علامة (✅) إذا كان النطق صحيحاً.
          </p>
        </div>
      </div>

      {/* ── شبكة البطاقات 3×2 ── */}
      <div className="sk-grid">
        {SYLLABLES.map(s => {
          const isDone = checked.has(s.id);
          return (
            <div key={s.id} className={`sk-card-wrap${isDone ? ' sk-done' : ''}`}>
              <div className="sk-card">
                <span className="sk-syllable">{s.text}</span>
              </div>
              <button
                className="sk-check-btn"
                onClick={() => toggle(s.id)}
                aria-pressed={isDone}
                title="انقر عند النطق الصحيح"
              >
                ✅
              </button>
            </div>
          );
        })}
      </div>

      {/* ── تذييل ── */}
      <div className="lr-footer">
        <div className="lr-counter">
          <span className="lr-counter-label">المقاطع الساكنة المكتملة:</span>
          <span className="lr-counter-val">{checked.size}</span>
          <span className="lr-counter-of">من {TOTAL}</span>
          {checked.size > 0 && (
            <span className="lr-counter-pct">({Math.round((checked.size / TOTAL) * 100)}%)</span>
          )}
        </div>
        <button className="lr-reset-btn" onClick={handleReset}>إعادة تعيين 🔄</button>
      </div>

      <button className="btn-primary" onClick={handleSubmit} style={{ marginTop: 14 }}>
        تأكيد وإكمال التدريب ✓
      </button>
    </div>
  );
}
