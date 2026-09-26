import { useState } from 'react';

function normalizeAr(str) {
  return str.trim()
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

export default function FillQuestion({ question, onAnswer }) {
  const [value,   setValue]   = useState('');
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);

  const parts = question.sentence.split('_____');

  function handleCheck() {
    const isCorrect = question.answers.some(a => normalizeAr(a) === normalizeAr(value));
    setChecked(true);
    setCorrect(isCorrect);
    setTimeout(() => onAnswer({
      questionId: question.id, skill: question.skill, answer: value, isCorrect,
      answerText:  value,
      correctText: question.answers[0],
    }), 1400);
  }

  return (
    <div className="question-box">
      <div className="question-number">تدريب إكمال الجملة</div>
      <p className="question-text">{question.text}</p>

      <div className="fq-sentence" dir="rtl">
        <span>{parts[0]}</span>
        <input
          type="text"
          className="fq-blank"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && value.trim() && !checked && handleCheck()}
          placeholder="..."
          disabled={checked}
          dir="rtl"
        />
        {parts[1] && <span>{parts[1]}</span>}
      </div>

      {checked && (
        <div className={`wo-result ${correct ? 'wo-correct' : 'wo-wrong'}`}>
          {correct ? '✅ إجابة صحيحة!' : `❌ الإجابة الصحيحة: ${question.answers[0]}`}
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
