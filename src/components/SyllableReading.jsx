import { useState } from 'react';

const RESPONSES = [
  { id: 'correct',   icon: '✅', label: 'نطق صحيح'         },
  { id: 'hesitated', icon: '⚠️', label: 'تردَّد'            },
  { id: 'wrong',     icon: '❌', label: 'لم ينطق بشكل صحيح' },
];

export default function SyllableReading({ question, onAnswer }) {
  const items = question.syllables;
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);

  function handleResponse(responseId) {
    const updated = [...answers, { syllable: items[idx], response: responseId }];
    setAnswers(updated);
    if (idx + 1 < items.length) {
      setIdx(i => i + 1);
    } else {
      const correctCount = updated.filter(a => a.response === 'correct').length;
      onAnswer({
        questionId: question.id,
        skill:      question.skill ?? 'reading',
        answer:     updated,
        isCorrect:  correctCount / items.length >= 0.5,
      });
    }
  }

  return (
    <div className="question-box oa-box">
      <div className="oa-parent-header">
        <p className="oa-parent-title">اقْرَأِ المَقَاطِعَ التَّالِيَة</p>
        <div className="oa-progress">{idx + 1} / {items.length}</div>
      </div>

      <div className="oa-image-zone" style={{ flexDirection: 'column', gap: 6 }}>
        <span style={{
          fontSize: 82,
          fontWeight: 900,
          color: '#185FA5',
          fontFamily: 'Tajawal, sans-serif',
          lineHeight: 1.2,
          letterSpacing: 6,
        }}>
          {items[idx]}
        </span>
        <span style={{ fontSize: 13, color: '#999', fontFamily: 'Tajawal, sans-serif' }}>
          المقطع {idx + 1}
        </span>
      </div>

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
