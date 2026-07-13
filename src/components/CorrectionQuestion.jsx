import { useState } from 'react';

function normalizeAr(str) {
  return str.trim()
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

export default function CorrectionQuestion({ question, onAnswer }) {
  const [value,   setValue]   = useState('');
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);

  function handleCheck() {
    const isCorrect = normalizeAr(value) === normalizeAr(question.correctAnswer);
    setChecked(true);
    setCorrect(isCorrect);
    setTimeout(() => onAnswer({
      questionId: question.id, skill: question.skill, answer: value, isCorrect,
      answerText:  value,
      correctText: question.correctAnswer,
    }), 1400);
  }

  return (
    <div className="question-box">
      <div className="question-number">تدريب تصحيح الأخطاء</div>
      <p className="question-text">{question.text}</p>

      <div className="cq-wrong-box">
        <span className="cq-wrong-label">الجملة الخاطئة:</span>
        <p className="cq-wrong-sentence">{question.wrongSentence}</p>
      </div>

      {question.hint && (
        <p className="cq-hint">💡 تلميح: {question.hint}</p>
      )}

      <textarea
        className="cq-input"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="اكتب الجملة الصحيحة هنا..."
        rows={2}
        disabled={checked}
        dir="rtl"
      />

      {checked && (
        <div className={`wo-result ${correct ? 'wo-correct' : 'wo-wrong'}`}>
          {correct ? '✅ إجابة صحيحة!' : `❌ الإجابة الصحيحة: ${question.correctAnswer}`}
        </div>
      )}

      {!checked && (
        <button
          className="btn-primary"
          onClick={handleCheck}
          disabled={!value.trim()}
          style={{ opacity: !value.trim() ? 0.5 : 1, marginTop: 10 }}
        >
          تحقق من الإجابة ✓
        </button>
      )}
    </div>
  );
}
