import { useState } from 'react';

function normalizeAr(str) {
  return str.trim()
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ');
}

export default function WordOrderQuestion({ question, onAnswer }) {
  const [pool,    setPool]    = useState(() => question.words.map((w, i) => ({ w, id: i })));
  const [placed,  setPlaced]  = useState([]);
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);

  function pick(item) {
    setPool(p => p.filter(x => x.id !== item.id));
    setPlaced(p => [...p, item]);
  }

  function remove(item) {
    setPlaced(p => p.filter(x => x.id !== item.id));
    setPool(p => [...p, item]);
  }

  function handleCheck() {
    const submitted = placed.map(x => normalizeAr(x.w)).join(' ');
    const expected  = question.answer.map(normalizeAr).join(' ');
    const isCorrect = submitted === expected;
    setChecked(true);
    setCorrect(isCorrect);
    setTimeout(() => onAnswer({ questionId: question.id, skill: question.skill, answer: submitted, isCorrect }), 1400);
  }

  return (
    <div className="question-box">
      <div className="question-number">تدريب ترتيب الكلمات</div>
      <p className="question-text">{question.text}</p>

      <div className="wo-answer-area">
        {placed.length === 0
          ? <span className="wo-placeholder">اضغط على الكلمات أدناه لترتيبها هنا</span>
          : placed.map(item => (
              <button
                key={item.id}
                className="wo-chip wo-chip-placed"
                onClick={() => !checked && remove(item)}
              >{item.w}</button>
            ))
        }
      </div>

      <div className="wo-pool">
        {pool.map(item => (
          <button
            key={item.id}
            className="wo-chip wo-chip-pool"
            onClick={() => !checked && pick(item)}
          >{item.w}</button>
        ))}
      </div>

      {checked && (
        <div className={`wo-result ${correct ? 'wo-correct' : 'wo-wrong'}`}>
          {correct ? '✅ ممتاز! الترتيب صحيح' : `❌ الترتيب الصحيح: ${question.answer.join(' ')}`}
        </div>
      )}

      {!checked && placed.length === question.words.length && (
        <button className="btn-primary" onClick={handleCheck} style={{ marginTop: 12 }}>
          تحقق من الإجابة ✓
        </button>
      )}
    </div>
  );
}
