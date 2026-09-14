import { useState } from 'react';

function doShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SyllableOrder({ question, onAnswer }) {
  const syllables = question.syllables || [];
  const n         = syllables.length;

  /* خلط المقاطع مرة واحدة عند بدء التدريب */
  const [initPool] = useState(() => doShuffle(syllables.map((_, i) => i)));
  const [slots,    setSlots]    = useState(() => Array(n).fill(null));
  const [pool,     setPool]     = useState([...initPool]);
  const [selected, setSelected] = useState(null); // فهرس المقطع المختار من البركة

  /* نقر مقطع في البركة: اختيار أو إلغاء */
  function handlePoolClick(sylIdx) {
    setSelected(prev => prev === sylIdx ? null : sylIdx);
  }

  /* نقر صندوق:
     - إذا فارغ + مقطع مختار  → ضع المقطع
     - إذا ممتلئ              → أعد المقطع للبركة */
  function handleSlotClick(slotIdx) {
    const current = slots[slotIdx];
    if (current !== null) {
      setSlots(prev => prev.map((s, i) => i === slotIdx ? null : s));
      setPool(prev => [...prev, current]);
      return;
    }
    if (selected === null) return;
    setSlots(prev => prev.map((s, i) => i === slotIdx ? selected : s));
    setPool(prev => prev.filter(i => i !== selected));
    setSelected(null);
  }

  function handleReset() {
    setSlots(Array(n).fill(null));
    setPool([...initPool]);
    setSelected(null);
  }

  function handleSubmit() {
    const arranged = slots.map(i => (i !== null ? syllables[i] : ''));
    onAnswer({
      questionId: question.id,
      skill:      question.skill ?? 'reading',
      answer:     arranged.join(''),
      isCorrect:  slots.every((sylIdx, slotIdx) => sylIdx === slotIdx),
      answerText:  arranged.join(''),
      correctText: question.word || syllables.join(''),
    });
  }

  const allPlaced = slots.every(s => s !== null);

  return (
    <div className="question-box so-box">

      {/* ── التعليمة ── */}
      <div className="lr-instructions">
        <p className="lr-title">
          رَتِّبْ مَقَاطِعَ الكَلِمَةِ <span className="lr-sep">|</span> Arrange Word Syllables
        </p>
      </div>

      {/* ── الكلمة المرجعية ── */}
      <div className="so-reference">
        <span className="so-ref-label">الكلمة:</span>
        <span className="so-ref-word">{question.word}</span>
      </div>

      {/* ── الصناديق الفارغة — تتبع اتجاه الكتابة العربية RTL ── */}
      <p className="lr-hint" style={{ textAlign: 'center', marginBottom: 16 }}>
        اختر مقطعاً من الأسفل ← ثم اضغط على الصندوق المناسب
      </p>
      <div className="so-slots">
        {slots.map((sylIdx, slotIdx) => (
          <button
            key={slotIdx}
            className={[
              'so-slot',
              sylIdx !== null        ? 'so-filled'     : '',
              selected !== null && sylIdx === null ? 'so-slot-ready' : '',
            ].join(' ')}
            onClick={() => handleSlotClick(slotIdx)}
            aria-label={`صندوق ${slotIdx + 1}`}
          >
            {sylIdx !== null
              ? <span className="so-slot-text">{syllables[sylIdx]}</span>
              : <span className="so-slot-empty">{slotIdx + 1}</span>
            }
          </button>
        ))}
      </div>

      {/* ── بركة المقاطع المتاحة ── */}
      <div className="so-pool">
        {pool.map(idx => (
          <button
            key={idx}
            className={`so-syl${selected === idx ? ' so-sel' : ''}`}
            onClick={() => handlePoolClick(idx)}
            aria-pressed={selected === idx}
          >
            <span className="so-syl-text">{syllables[idx]}</span>
          </button>
        ))}
      </div>

      <div className="lr-footer">
        <div />
        <button className="lr-reset-btn" onClick={handleReset}>إعادة تعيين 🔄</button>
      </div>

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={!allPlaced}
        style={{ marginTop: 14, opacity: allPlaced ? 1 : 0.5 }}
      >
        تأكيد ←
      </button>
    </div>
  );
}
