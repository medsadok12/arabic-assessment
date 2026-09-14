import { useState } from 'react';

function doShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ITEMS = [
  { id: 'walad',   emoji: '👦' },
  { id: 'bint',    emoji: '👧' },
  { id: 'bab',     emoji: '🚪' },
  { id: 'sarir',   emoji: '🛏️' },
  { id: 'kursi',   emoji: '🪑' },
  { id: 'bayt',    emoji: '🏠' },
  { id: 'tawla',   emoji: '🍽️' },
  { id: 'tuffaha', emoji: '🍎' },
  { id: 'maa',     emoji: '💧' },
  { id: 'shams',   emoji: '☀️' },
  { id: 'kitab',   emoji: '📖' },
  { id: 'khubz',   emoji: '🍞' },
];

const RESPONSES = [
  { id: 'correct',   icon: '✅', label: 'نطق صحيح'        },
  { id: 'hesitated', icon: '⚠️', label: 'تردد في الإجابة' },
  { id: 'unknown',   icon: '❌', label: 'لم يتعرف عليها'  },
];

export default function OralAssessment({ question, onAnswer }) {
  const [items]   = useState(() => doShuffle(ITEMS));
  const [idx,      setIdx]     = useState(0);
  const [answers,  setAnswers] = useState([]);

  function handleResponse(responseId) {
    const updated = [...answers, { item: items[idx].id, response: responseId }];
    setAnswers(updated);

    if (idx + 1 < items.length) {
      setIdx(idx + 1);
    } else {
      const correctCount = updated.filter(a => a.response === 'correct').length;
      onAnswer({
        questionId: question.id,
        skill:      question.skill ?? 'speaking',
        answer:     updated,
        isCorrect:  correctCount / items.length >= 0.5,
        answerText:  `نطق صحيحاً ${correctCount} من ${items.length} كلمة`,
        correctText: `نطق ${items.length} كلمة بشكل صحيح`,
      });
    }
  }

  const item  = items[idx];
  const total = items.length;

  return (
    <div className="question-box oa-box">

      {/* ── رأس خاص بالولي ── */}
      <div className="oa-parent-header">
        <p className="oa-parent-title">أَسْمِعْنِي صَوْتَكَ</p>
        <div className="oa-progress">{idx + 1} / {total}</div>
      </div>

      {/* ── منطقة الصورة — ما يراه الطفل فقط ── */}
      <div className="oa-image-zone">
        <span className="oa-emoji" role="img" aria-hidden="true">{item.emoji}</span>
      </div>

      {/* ── لوحة تحكم الولي — مفصولة بصرياً ── */}
      <div className="oa-parent-controls">
        <p className="oa-controls-label">— للولي فقط: اضغط الزر المناسب بعد استجابة الطفل —</p>
        <div className="oa-buttons">
          {RESPONSES.map(r => (
            <button
              key={r.id}
              className={`oa-btn oa-btn-${r.id}`}
              onClick={() => handleResponse(r.id)}
            >
              <span className="oa-btn-icon">{r.icon}</span>
              <span className="oa-btn-label">{r.label}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
