import { useState } from 'react';

const SELECT_DELAY_MS = 450;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * تدريب "إكمال الكلمة الناقصة" — يعرض عدة كلمات (شمس/طاولة/سيارة
 * افتراضياً) واحدة تلو الأخرى، بنفس أسلوب QuickQuestion.jsx بالضبط (صفر
 * مؤشر صح/خطأ مرئي، انتقال فوري بعد اختيار قصير) — طلب صريح من الأستاذ
 * محمد بالحفاظ على "تناسق" شكل هذا السؤال مع بقية الأسئلة الـ15 (كان
 * سؤالاً مفرداً ضمنها قبل توسيعه لتدريب مستقل).
 *
 * كل عنصر يخزّن الحرف الناقص فقط (wordText + missingIndex +
 * distractorOptions) — الحرف الصحيح والخيارات المعروضة تُشتَق/تُخلط عند
 * العرض، لا تُخزَّن جاهزة (يمنع خطأ إدخال إداري يُسقِط الحرف الصحيح).
 */
export default function WordCompletionAssessment({ items, title, subtitle, onComplete }) {
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);

  function handleItemAnswer(detail) {
    const updated = [...results, detail];
    if (idx + 1 < items.length) {
      setResults(updated);
      setIdx(i => i + 1);
      return;
    }
    onComplete({
      type:       'word-completion',
      questionId: 'word-completion',
      skillTag:   'تهجئة',
      items:      updated,
    });
  }

  return (
    <div className="page-content">
      <p style={{ textAlign: 'center', color: 'var(--text-light)', fontSize: 13, marginBottom: 6 }}>
        الكلمة {idx + 1} / {items.length}
      </p>
      <h2 className="page-title" style={{ fontSize: '1.15rem', marginBottom: 8 }}>{title}</h2>
      <p className="page-subtitle" style={{ marginBottom: 20 }}>{subtitle}</p>

      <WordItem key={items[idx].id} item={items[idx]} onAnswer={handleItemAnswer} />
    </div>
  );
}

function WordItem({ item, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [options] = useState(() => shuffle([item.wordText[item.missingIndex], ...item.distractorOptions]));

  const correctLetter = item.wordText[item.missingIndex];
  const before = item.wordText.slice(0, item.missingIndex);
  const after  = item.wordText.slice(item.missingIndex + 1);

  function handleSelect(letter) {
    if (selected !== null) return;
    setSelected(letter);
    setTimeout(() => onAnswer({
      word:         item.wordText,
      chosenLetter: letter,
      correctLetter,
      isCorrect:    letter === correctLetter,
    }), SELECT_DELAY_MS);
  }

  return (
    <div>
      {item.imageUrl ? (
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <img src={item.imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 12 }} />
        </div>
      ) : (
        <div style={{ textAlign: 'center', fontSize: '3.4rem', marginBottom: 10 }}>
          {item.emoji}
        </div>
      )}

      <p className="question-text" style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.4rem', marginBottom: 22, letterSpacing: 1 }}>
        {before} ... {after}
      </p>

      <div className="options-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {options.map((letter, i) => {
          const isSelected = selected === letter;
          return (
            <button
              key={i}
              onClick={() => handleSelect(letter)}
              disabled={selected !== null}
              className="option"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '16px 18px', fontSize: '1.3rem', fontWeight: 700,
                border: isSelected ? '2.5px solid var(--primary)' : '2px solid var(--border)',
                background: isSelected ? '#efe9f9' : '#fff',
                borderRadius: 'var(--radius)', cursor: selected !== null ? 'default' : 'pointer',
                transition: 'all .15s',
              }}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}
