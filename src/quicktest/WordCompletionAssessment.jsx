import { useState } from 'react';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * تدريب "إكمال الكلمة الناقصة" — كل الكلمات (شمس/طاولة/سيارة افتراضياً)
 * تظهر معاً في صفحة واحدة (طلب صريح من الأستاذ محمد بعد تجربة حيّة —
 * يلغي القرار الأولي بعرضها واحدة تلو الأخرى)، بنفس نمط
 * AlphabetGridAssessment.jsx/MatchingAssessment.jsx: كل العناصر مرئية
 * دفعة واحدة، اختيار أي كلمة قابل للتغيير بحرية، وزر "متابعة" واحد في
 * الأسفل يُفعَّل فقط بعد الإجابة على الجميع.
 *
 * كل عنصر يخزّن الحرف الناقص فقط (wordText + missingIndex +
 * distractorOptions) — الحرف الصحيح والخيارات المعروضة تُشتَق/تُخلط عند
 * العرض (مرة واحدة لكل كلمة)، لا تُخزَّن جاهزة (يمنع خطأ إدخال إداري
 * يُسقِط الحرف الصحيح).
 */
export default function WordCompletionAssessment({ items, title, subtitle, onComplete }) {
  const [optionsByItem] = useState(() =>
    Object.fromEntries(items.map(it => [it.id, shuffle([it.wordText[it.missingIndex], ...it.distractorOptions])]))
  );
  const [selections, setSelections] = useState({}); // { [itemId]: chosenLetter }

  const allAnswered = items.every(it => selections[it.id] !== undefined);

  function selectLetter(itemId, letter) {
    setSelections(prev => ({ ...prev, [itemId]: letter }));
  }

  function handleContinue() {
    const results = items.map(it => {
      const correctLetter = it.wordText[it.missingIndex];
      const chosenLetter  = selections[it.id];
      return { word: it.wordText, chosenLetter, correctLetter, isCorrect: chosenLetter === correctLetter };
    });
    onComplete({
      type:       'word-completion',
      questionId: 'word-completion',
      skillTag:   'تهجئة',
      items:      results,
    });
  }

  return (
    <div className="page-content">
      <h2 className="page-title" style={{ fontSize: '1.15rem', marginBottom: 8 }}>{title}</h2>
      <p className="page-subtitle" style={{ marginBottom: 20 }}>{subtitle}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 6 }}>
        {items.map(item => (
          <WordCard
            key={item.id}
            item={item}
            options={optionsByItem[item.id]}
            selected={selections[item.id] ?? null}
            onSelect={letter => selectLetter(item.id, letter)}
          />
        ))}
      </div>

      <button
        className="btn-primary"
        type="button"
        onClick={handleContinue}
        disabled={!allAnswered}
        style={{ marginTop: 18 }}
      >
        متابعة ←
      </button>
    </div>
  );
}

function WordCard({ item, options, selected, onSelect }) {
  const before = item.wordText.slice(0, item.missingIndex);
  const after  = item.wordText.slice(item.missingIndex + 1);

  return (
    <div style={{ border: '1.5px solid var(--border)', borderRadius: 14, padding: '14px 16px', background: '#FAF7F2' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 10, flexShrink: 0 }} />
        ) : (
          <span style={{ fontSize: '2.4rem', flexShrink: 0 }}>{item.emoji}</span>
        )}
        <span style={{ fontWeight: 800, fontSize: '1.3rem', color: 'var(--primary)', letterSpacing: 1 }}>
          {before} ... {after}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {options.map((letter, i) => {
          const isSelected = selected === letter;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(letter)}
              className="option"
              style={{
                flex: '1 1 70px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '12px 10px', fontSize: '1.15rem', fontWeight: 700,
                border: isSelected ? '2.5px solid var(--primary)' : '2px solid var(--border)',
                background: isSelected ? '#efe9f9' : '#fff',
                borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all .15s',
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
