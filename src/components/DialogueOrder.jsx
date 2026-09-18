import { useState } from 'react';
import { shuffle } from '../data/questions.js';

const moveBtnStyle = {
  width: 32,
  height: 26,
  border: '1.5px solid #d0d7de',
  borderRadius: 6,
  background: '#fff',
  color: '#185FA5',
  fontSize: 13,
  cursor: 'pointer',
  fontWeight: 900,
};

/**
 * تدريب ترتيب الحوار: يعرض جملاً مبعثرة من حوار قصير بين شخصيتين، ويطلب من
 * الطالب إعادة ترتيبها بالتسلسل المنطقي الصحيح عبر أزرار التحريك للأعلى/
 * الأسفل — بديل أكثر ملاءمة للمس على الآيباد من السحب والإفلات (HTML5
 * Drag/Drop ضعيف الدعم على الأجهزة اللمسية بلا مكتبات إضافية).
 */
export default function DialogueOrder({ question, onAnswer }) {
  const correctOrder = question.lines.map((l) => l.id);
  const lineById = Object.fromEntries(question.lines.map((l) => [l.id, l]));

  const [order, setOrder] = useState(() => shuffle(question.lines).map((l) => l.id));
  const [showFeedback, setShowFeedback] = useState(false);

  function moveUp(idx) {
    if (idx === 0 || showFeedback) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveDown(idx) {
    if (idx === order.length - 1 || showFeedback) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
      return next;
    });
  }

  function handleConfirm() {
    const isCorrect = order.every((id, i) => id === correctOrder[i]);
    setShowFeedback(true);

    setTimeout(() => {
      onAnswer({
        questionId:  question.id,
        skill:       question.skill ?? 'reading',
        answer:      order,
        isCorrect,
        answerText:  order.map((id) => lineById[id].text).join(' ← '),
        correctText: correctOrder.map((id) => lineById[id].text).join(' ← '),
      });
    }, 900);
  }

  const isCorrectNow = order.every((id, i) => id === correctOrder[i]);

  return (
    <div className="question-box">
      <div className="question-number">ترتيب الحوار</div>
      <p className="question-text">{question.text}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '16px 0' }}>
        {order.map((id, idx) => {
          const line = lineById[id];
          return (
            <div
              key={id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: '#f5f7fa',
                border: '2px solid #d0d7de',
                borderRadius: 12,
                padding: '10px 14px',
                direction: 'rtl',
              }}
            >
              <span style={{ fontWeight: 900, color: '#185FA5', minWidth: 20 }}>{idx + 1}</span>
              <span style={{ flex: 1, fontFamily: 'Tajawal, sans-serif', fontSize: 15 }}>
                {line.speaker ? <strong>{line.speaker}: </strong> : null}
                {line.text}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button onClick={() => moveUp(idx)} disabled={idx === 0 || showFeedback} aria-label="نقل للأعلى" style={moveBtnStyle}>▲</button>
                <button onClick={() => moveDown(idx)} disabled={idx === order.length - 1 || showFeedback} aria-label="نقل للأسفل" style={moveBtnStyle}>▼</button>
              </div>
            </div>
          );
        })}
      </div>

      {showFeedback ? (
        <p style={{
          textAlign: 'center',
          fontWeight: 700,
          fontSize: 16,
          fontFamily: 'Tajawal, sans-serif',
          color: isCorrectNow ? '#2e7d32' : '#c62828',
        }}>
          {isCorrectNow ? '✅ ترتيب صحيح تماماً!' : '❌ ليس الترتيب الأنسب، حاول في المرة القادمة'}
        </p>
      ) : (
        <button className="btn-primary" onClick={handleConfirm}>تأكيد الترتيب ←</button>
      )}
    </div>
  );
}
