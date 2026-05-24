import { useState } from 'react';

const COLORS = ['#1b5e20', '#2e7d32', '#66bb6a'];
const ITEM_H  = 80;
const GAP     = 12;
const ROW     = ITEM_H + GAP;
const SVG_W   = 90;

export default function MatchingQuestion({ question, onAnswer }) {
  const [selected,    setSelected]    = useState(null);
  const [connections, setConnections] = useState({});
  const [checked,     setChecked]     = useState(false);

  const [shuffledNames] = useState(() => {
    const arr = [...question.pairs];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  function clickEmoji(id) {
    if (checked) return;
    setSelected(s => s === id ? null : id);
  }

  function clickName(nameId) {
    if (checked || !selected) return;
    setConnections(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (next[k] === nameId) delete next[k]; });
      next[selected] = nameId;
      return next;
    });
    setSelected(null);
  }

  const allDone = question.pairs.every(p => p.id in connections);

  function handleCheck() {
    const isCorrect = question.pairs.every(p => connections[p.id] === p.id);
    setChecked(true);
    setTimeout(() => onAnswer({
      questionId: question.id,
      skill:      question.skill,
      answer:     0,
      isCorrect,
    }), 1400);
  }

  const n    = question.pairs.length;
  const svgH = n * ITEM_H + (n - 1) * GAP;

  return (
    <div className="question-box">
      <div className="question-number">سؤال</div>
      <p className="question-text" style={{ textAlign: 'right' }}>{question.text}</p>

      <div className="matching-layout" style={{ margin: '20px auto', overflowX: 'auto' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start',
        direction: 'ltr', margin: '0 auto', width: 'fit-content', gap: 0,
      }}>

        {/* ── Names column (يسار) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
          {shuffledNames.map((pair) => {
            const srcId  = Object.keys(connections).find(k => connections[k] === pair.id);
            const srcIdx = srcId ? question.pairs.findIndex(p => p.id === srcId) : -1;
            const color  = srcIdx >= 0 ? COLORS[srcIdx] : null;
            const isConn = srcIdx >= 0;
            const isTgt  = !!selected;

            let borderColor = '#ddd';
            let bg          = '#fafafa';
            if (isConn)     { borderColor = color;    bg = color + '22'; }
            else if (isTgt) { borderColor = '#a5d6a7'; bg = '#f1f8e9';   }

            return (
              <div
                key={pair.id}
                onClick={() => clickName(pair.id)}
                style={{
                  width: 110, height: ITEM_H, borderRadius: 14,
                  border: `3px solid ${borderColor}`,
                  background: bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, fontWeight: 700, color: '#1a237e',
                  direction: 'rtl', cursor: selected ? 'pointer' : 'default',
                  transition: 'all 0.2s', userSelect: 'none', paddingInline: 8,
                }}
              >
                {pair.name}
              </div>
            );
          })}
        </div>

        {/* ── SVG أسهم (يمين ← يسار) ── */}
        <svg width={SVG_W} height={svgH} style={{ flexShrink: 0, overflow: 'visible' }}>
          <defs>
            {COLORS.map((color, i) => (
              <marker key={i} id={`arr-${i}`}
                markerWidth="8" markerHeight="8"
                refX="7" refY="3" orient="auto">
                <path d="M0,0 L0,6 L8,3 z" fill={color} />
              </marker>
            ))}
          </defs>

          {question.pairs.map((pair, emojiIdx) => {
            const nameId = connections[pair.id];
            if (!nameId) return null;
            const nameIdx = shuffledNames.findIndex(p => p.id === nameId);
            const color   = COLORS[emojiIdx];
            const y1 = emojiIdx * ROW + ITEM_H / 2;
            const y2 = nameIdx  * ROW + ITEM_H / 2;
            return (
              <line key={pair.id}
                x1={SVG_W - 4} y1={y1} x2={4} y2={y2}
                stroke={color} strokeWidth={2.5}
                markerEnd={`url(#arr-${emojiIdx})`}
              />
            );
          })}
        </svg>

        {/* ── Emoji column (يمين) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
          {question.pairs.map((pair, i) => {
            const isSel  = selected === pair.id;
            const conn   = connections[pair.id];
            const color  = conn !== undefined ? COLORS[i] : null;
            return (
              <div
                key={pair.id}
                onClick={() => clickEmoji(pair.id)}
                style={{
                  width: ITEM_H, height: ITEM_H, borderRadius: 14,
                  border: `3px solid ${isSel ? '#1a237e' : color ?? '#ddd'}`,
                  background: isSel ? '#e8eaf6' : color ? color + '22' : '#fafafa',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 44, cursor: 'pointer',
                  boxShadow: isSel ? '0 0 0 3px #a5d6a7' : 'none',
                  transition: 'all 0.2s', userSelect: 'none',
                }}
              >
                {pair.emoji}
              </div>
            );
          })}
        </div>
      </div>
      </div>

      {selected && !checked && (
        <p style={{ textAlign: 'center', color: '#666', fontSize: 13, margin: '4px 0 12px' }}>
          اضغط على الاسم المقابل للربط
        </p>
      )}

      {checked && (
        <p style={{
          textAlign: 'center', fontWeight: 700, fontSize: 16, margin: '8px 0',
          color: question.pairs.every(p => connections[p.id] === p.id) ? '#2e7d32' : '#c62828',
        }}>
          {question.pairs.every(p => connections[p.id] === p.id) ? '✅ إجابة صحيحة!' : '❌ بعض الإجابات غير صحيحة'}
        </p>
      )}

      <button
        className="btn-primary"
        onClick={handleCheck}
        disabled={!allDone || checked}
        style={{ opacity: allDone && !checked ? 1 : 0.4, marginTop: 8 }}
      >
        تحقق من الإجابة ✓
      </button>
    </div>
  );
}
