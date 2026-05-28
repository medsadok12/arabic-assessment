import { useState } from 'react';

function doShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const WORDS = [
  { id: 'bab',   emoji: '🚪', label: 'بَابٌ',  letters: ['بَـ', 'ا', 'بٌ']     },
  { id: 'bint',  emoji: '👧', label: 'بِنْتٌ', letters: ['بِـ', 'نْـ', 'تٌ']  },
  { id: 'walad', emoji: '👦', label: 'وَلَدٌ', letters: ['وَ', 'لَـ', 'دٌ']    },
];

export default function WordConstruct({ question, onAnswer }) {
  /* pool[wordId] = مصفوفة فهارس الحروف المتبقية في البنك */
  const [pools, setPools] = useState(() => {
    const init = {};
    WORDS.forEach(w => { init[w.id] = doShuffle(w.letters.map((_, i) => i)); });
    return init;
  });
  /* slots[wordId][slotIdx] = فهرس الحرف الموضوع (null = فارغ) */
  const [slots, setSlots] = useState(() => {
    const init = {};
    WORDS.forEach(w => { init[w.id] = Array(w.letters.length).fill(null); });
    return init;
  });

  const [selected, setSelected] = useState(null); // { wordId, letterIdx }
  const [dragging, setDragging] = useState(null);  // { wordId, letterIdx }

  function placeInSlot(wordId, slotIdx, letterIdx) {
    setSlots(prev => ({
      ...prev,
      [wordId]: prev[wordId].map((v, i) => i === slotIdx ? letterIdx : v),
    }));
    setPools(prev => ({
      ...prev,
      [wordId]: prev[wordId].filter(i => i !== letterIdx),
    }));
    setSelected(null);
  }

  function returnToPool(wordId, slotIdx) {
    const letterIdx = slots[wordId][slotIdx];
    if (letterIdx === null) return;
    setSlots(prev => ({
      ...prev,
      [wordId]: prev[wordId].map((v, i) => i === slotIdx ? null : v),
    }));
    setPools(prev => ({
      ...prev,
      [wordId]: [...prev[wordId], letterIdx],
    }));
  }

  function handleLetterClick(wordId, letterIdx) {
    setSelected(prev =>
      prev?.wordId === wordId && prev?.letterIdx === letterIdx
        ? null
        : { wordId, letterIdx }
    );
  }

  function handleSlotClick(wordId, slotIdx) {
    if (slots[wordId][slotIdx] !== null) {
      returnToPool(wordId, slotIdx);
    } else if (selected?.wordId === wordId) {
      placeInSlot(wordId, slotIdx, selected.letterIdx);
    }
  }

  /* السحب والإفلات — داخل نفس الكلمة فقط */
  function onDragStart(e, wordId, letterIdx) {
    setDragging({ wordId, letterIdx });
    setSelected(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ wordId, letterIdx }));
  }
  function onDragEnd() { setDragging(null); }
  function onSlotDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
  function onSlotDrop(e, wordId, slotIdx) {
    e.preventDefault();
    if (slots[wordId][slotIdx] !== null) return;
    try {
      const { wordId: src, letterIdx } = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (src === wordId) placeInSlot(wordId, slotIdx, letterIdx);
    } catch (_) {}
    setDragging(null);
  }

  function handleReset() {
    setPools(() => {
      const init = {};
      WORDS.forEach(w => { init[w.id] = doShuffle(w.letters.map((_, i) => i)); });
      return init;
    });
    setSlots(() => {
      const init = {};
      WORDS.forEach(w => { init[w.id] = Array(w.letters.length).fill(null); });
      return init;
    });
    setSelected(null);
    setDragging(null);
  }

  function handleConfirm() {
    /* isCorrect صامت للسجل: هل ترتيب كل كلمة مطابق للترتيب الأصلي؟ */
    const isCorrect = WORDS.every(w => slots[w.id].every((idx, pos) => idx === pos));
    const answer = {};
    WORDS.forEach(w => {
      answer[w.id] = slots[w.id].map(idx => (idx !== null ? w.letters[idx] : null));
    });
    onAnswer({
      questionId: question.id,
      skill:      question.skill ?? 'reading',
      answer,
      isCorrect,
    });
  }

  const allFilled   = WORDS.every(w => slots[w.id].every(v => v !== null));
  const totalSlots  = WORDS.reduce((s, w) => s + w.letters.length, 0);
  const filledCount = WORDS.reduce((s, w) => s + (w.letters.length - pools[w.id].length), 0);

  return (
    <div className="question-box wc-box">

      {/* ── التعليمة ── */}
      <div className="lr-instructions">
        <p className="lr-title">
          رَكِّبِ الكَلِمَةَ <span className="lr-sep">|</span> Construct the Word
        </p>
        <p className="lr-hint">
          اختر حرفاً من البنك ← ثم اضغط الفراغ المناسب، أو اسحب الحرف إليه مباشرةً
        </p>
      </div>

      {/* ── بطاقات الكلمات ── */}
      <div className="wc-words">
        {WORDS.map(w => {
          const pool      = pools[w.id];
          const wordSlots = slots[w.id];

          return (
            <div key={w.id} className="wc-card">

              {/* بنك الحروف — أعلى البطاقة */}
              <div className="wc-pool">
                {pool.map(idx => (
                    <button
                      key={idx}
                      className={[
                        'wc-letter',
                        selected?.wordId === w.id && selected?.letterIdx === idx ? 'wc-sel'  : '',
                        dragging?.wordId === w.id && dragging?.letterIdx === idx ? 'wc-drag' : '',
                      ].join(' ')}
                      onClick={() => handleLetterClick(w.id, idx)}
                      draggable
                      onDragStart={e => onDragStart(e, w.id, idx)}
                      onDragEnd={onDragEnd}
                    >
                      <span className="wc-letter-text">{w.letters[idx]}</span>
                    </button>
                ))}
              </div>

              <div className="wc-divider" />

              {/* صورة الكلمة + الفراغات — أسفل البطاقة */}
              <div className="wc-target">
                <span className="wc-emoji" role="img" aria-label={w.label}>{w.emoji}</span>
                {/* RTL flex: أول slot (فهرس 0) يظهر على اليمين = بداية الكلمة */}
                <div className="wc-slots">
                  {wordSlots.map((letterIdx, slotIdx) => {
                    const hasSel = !!selected && selected.wordId === w.id && letterIdx === null;
                    return (
                      <button
                        key={slotIdx}
                        className={[
                          'wc-slot',
                          letterIdx !== null ? 'wc-slot-filled' : '',
                          hasSel             ? 'wc-slot-ready'  : '',
                        ].join(' ')}
                        onClick={() => handleSlotClick(w.id, slotIdx)}
                        onDragOver={onSlotDragOver}
                        onDrop={e => onSlotDrop(e, w.id, slotIdx)}
                        aria-label={`فراغ ${slotIdx + 1} — ${w.label}`}
                      >
                        {letterIdx !== null
                          ? <span className="wc-slot-text">{w.letters[letterIdx]}</span>
                          : <span className="wc-slot-empty">{slotIdx + 1}</span>
                        }
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* ── تذييل ── */}
      <div className="lr-footer">
        <div className="lr-counter">
          <span className="lr-counter-label">الحروف الموضوعة:</span>
          <span className="lr-counter-val">{filledCount}</span>
          <span className="lr-counter-of">من {totalSlots}</span>
        </div>
        <button className="lr-reset-btn" onClick={handleReset}>إعادة تعيين 🔄</button>
      </div>

      <button
        className="btn-primary"
        onClick={handleConfirm}
        disabled={!allFilled}
        style={{ marginTop: 14, opacity: allFilled ? 1 : 0.5 }}
      >
        تأكيد ←
      </button>
    </div>
  );
}
