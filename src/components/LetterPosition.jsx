import { useState } from 'react';

const FORMS = [
  { id: 'initial', text: 'بَـ',  label: 'في البداية' },
  { id: 'medial',  text: 'ـبْـ', label: 'في الوسط'   },
  { id: 'final',   text: 'ـبٌ',  label: 'في النهاية' },
];

/* before/after النص حول الفراغ — RTL flex: أول عنصر يظهر على اليمين */
const WORDS = [
  { id: 'start', emoji: '🏠', before: '',      after: 'يْتٌ', correct: 'initial', label: 'بَيْتٌ' },
  { id: 'mid',   emoji: '🪢', before: 'حَـ',   after: 'ـلٌ',  correct: 'medial',  label: 'حَبْلٌ' },
  { id: 'end',   emoji: '📚', before: 'كُتُـ', after: '',      correct: 'final',   label: 'كُتُبٌ' },
];

export default function LetterPosition({ question, onAnswer }) {
  const [slots,    setSlots]    = useState({ start: null, mid: null, end: null });
  const [selected, setSelected] = useState(null); // formId من البنك
  const [dragging, setDragging] = useState(null);

  function fillSlot(wordId, formId) {
    setSlots(prev => ({ ...prev, [wordId]: formId }));
    setSelected(null);
  }

  function clearSlot(wordId) {
    setSlots(prev => ({ ...prev, [wordId]: null }));
  }

  function handleLetterClick(formId) {
    setSelected(prev => prev === formId ? null : formId);
  }

  function handleSlotClick(wordId) {
    if (slots[wordId]) { clearSlot(wordId); }
    else if (selected)  { fillSlot(wordId, selected); }
  }

  function onDragStart(e, formId) {
    setDragging(formId);
    setSelected(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', formId);
  }
  function onDragEnd()  { setDragging(null); }
  function onSlotDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
  function onSlotDrop(e, wordId) {
    e.preventDefault();
    const formId = e.dataTransfer.getData('text/plain');
    if (formId) fillSlot(wordId, formId);
    setDragging(null);
  }

  function handleReset() {
    setSlots({ start: null, mid: null, end: null });
    setSelected(null);
    setDragging(null);
  }

  function handleConfirm() {
    const isCorrect = WORDS.every(w => slots[w.id] === w.correct);
    onAnswer({
      questionId: question.id,
      skill:      question.skill ?? 'reading',
      answer:     slots,
      isCorrect,
    });
  }

  const filled    = Object.values(slots).filter(Boolean).length;
  const allFilled = filled === WORDS.length;

  return (
    <div className="question-box wb-box">

      {/* ── التعليمة ── */}
      <div className="lr-instructions">
        <p className="lr-title">
          أَيْنَ مَكَانُ الحَرْفِ؟ <span className="lr-sep">|</span> Where Does the Letter Go?
        </p>
        <p className="lr-hint">
          اختر شكل حرف الباء من البنك ← ثم اضغط الفراغ، أو اسحبه إليه مباشرةً
        </p>
      </div>

      {/* ── بنك الحروف ── */}
      <div className="wb-bank">
        <p className="wb-bank-label">بنك الحروف — اختر شكل حرف الباء</p>
        <div className="wb-bank-letters">
          {FORMS.map(f => (
            <button
              key={f.id}
              className={[
                'wb-letter-tile',
                selected === f.id  ? 'wb-tile-sel'  : '',
                dragging === f.id  ? 'wb-tile-drag' : '',
              ].join(' ')}
              onClick={() => handleLetterClick(f.id)}
              draggable
              onDragStart={e => onDragStart(e, f.id)}
              onDragEnd={onDragEnd}
            >
              <span className="wb-tile-text">{f.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── بطاقات الكلمات ── */}
      <div className="wb-words">
        {WORDS.map(w => {
          const placedId = slots[w.id];
          const form     = placedId ? FORMS.find(f => f.id === placedId) : null;
          const isReady  = !!selected && !placedId;
          return (
            <div key={w.id} className="wb-card">
              <span className="wb-card-emoji" role="img" aria-label={w.label}>{w.emoji}</span>
              {/* هيكل الكلمة — RTL: أول عنصر يظهر على اليمين */}
              <div className="wb-word-structure">
                {w.before && <span className="wb-part">{w.before}</span>}
                <button
                  className={[
                    'wb-slot',
                    form    ? 'wb-slot-filled' : '',
                    isReady ? 'wb-slot-ready'  : '',
                  ].join(' ')}
                  onClick={() => handleSlotClick(w.id)}
                  onDragOver={onSlotDragOver}
                  onDrop={e => onSlotDrop(e, w.id)}
                  aria-label={`فراغ كلمة ${w.label}`}
                >
                  {form
                    ? <span className="wb-slot-text">{form.text}</span>
                    : <span className="wb-slot-empty">___</span>
                  }
                </button>
                {w.after && <span className="wb-part">{w.after}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── تذييل ── */}
      <div className="lr-footer">
        <div className="lr-counter">
          <span className="lr-counter-label">الفراغات المملوءة:</span>
          <span className="lr-counter-val">{filled}</span>
          <span className="lr-counter-of">من {WORDS.length}</span>
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
