import { useState } from 'react';

const BALLOONS = [
  { id: 'alef', symbol: 'ـا', color: '#c0396a', bg: '#fce4ec', name: 'مدّ الألف' },
  { id: 'waw',  symbol: 'ـو', color: '#e06520', bg: '#fff3e0', name: 'مدّ الواو' },
  { id: 'ya',   symbol: 'ـي', color: '#1565c0', bg: '#e3f2fd', name: 'مدّ الياء' },
];

const BASE = [
  { id: 'ba',  text: 'بَا', medd: 'alef' },
  { id: 'buw', text: 'بُو', medd: 'waw'  },
  { id: 'biy', text: 'بِي', medd: 'ya'   },
  { id: 'ja',  text: 'جَا', medd: 'alef' },
  { id: 'juw', text: 'جُو', medd: 'waw'  },
  { id: 'jiy', text: 'جِي', medd: 'ya'   },
  { id: 'da',  text: 'دَا', medd: 'alef' },
  { id: 'duw', text: 'دُو', medd: 'waw'  },
  { id: 'diy', text: 'دِي', medd: 'ya'   },
  { id: 'ra',  text: 'رَا', medd: 'alef' },
  { id: 'ruw', text: 'رُو', medd: 'waw'  },
  { id: 'riy', text: 'رِي', medd: 'ya'   },
  { id: 'sa',  text: 'سَا', medd: 'alef' },
  { id: 'suw', text: 'سُو', medd: 'waw'  },
  { id: 'siy', text: 'سِي', medd: 'ya'   },
  { id: 'ma',  text: 'مَا', medd: 'alef' },
  { id: 'muw', text: 'مُو', medd: 'waw'  },
  { id: 'miy', text: 'مِي', medd: 'ya'   },
];

const TOTAL = BASE.length; // 18

function doShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function VowelLong({ question, onAnswer }) {
  const [syllables]  = useState(() => doShuffle(BASE));
  const [placed,     setPlaced]    = useState(new Set());
  const [selected,   setSelected]  = useState(null);
  const [bouncing,   setBouncing]  = useState(null);
  const [rejecting,  setRejecting] = useState(null);
  const [dragging,   setDragging]  = useState(null);
  const [dragOver,   setDragOver]  = useState(null);

  function attemptPlace(sylId, balloonId) {
    const syl = BASE.find(s => s.id === sylId);
    if (!syl || placed.has(sylId)) return;
    if (syl.medd === balloonId) {
      setPlaced(prev => new Set([...prev, sylId]));
      setSelected(null);
      setBouncing(balloonId);
      setTimeout(() => setBouncing(null), 750);
    } else {
      setSelected(null);
      setRejecting(balloonId);
      setTimeout(() => setRejecting(null), 520);
    }
  }

  function handleSylClick(id) {
    if (placed.has(id)) return;
    setSelected(prev => prev === id ? null : id);
  }

  function handleBalloonClick(balloonId) {
    if (!selected) return;
    attemptPlace(selected, balloonId);
  }

  function onDragStart(e, id) {
    setDragging(id);
    setSelected(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }
  function onDragEnd() { setDragging(null); setDragOver(null); }
  function onDragOver(e, balloonId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(balloonId);
  }
  function onDragLeave() { setDragOver(null); }
  function onDrop(e, balloonId) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    setDragging(null); setDragOver(null);
    if (id) attemptPlace(id, balloonId);
  }

  function handleReset() {
    setPlaced(new Set());
    setSelected(null);
    setDragging(null);
    setDragOver(null);
  }

  function handleSubmit() {
    onAnswer({
      questionId: question.id,
      skill:      question.skill ?? 'reading',
      answer:     placed.size,
      isCorrect:  placed.size >= 15,
    });
  }

  const unplaced = syllables.filter(s => !placed.has(s.id));

  return (
    <div className="question-box vl-box">

      {/* ── التعليمة ── */}
      <div className="lr-instructions">
        <p className="lr-title">اقْرَأْ ثُمَّ صَنِّفْ <span className="lr-sep">|</span> Read and Sort</p>
        <p className="lr-hint">اضغط مقطعاً لاختياره ← ثم اضغط المنطاد المناسب، أو اسحبه مباشرةً</p>
      </div>

      {/* ── المناطيد الثلاثة ── */}
      <div className="vl-balloons">
        {BALLOONS.map(b => {
          const inside      = syllables.filter(s => placed.has(s.id) && s.medd === b.id);
          const isBouncing  = bouncing  === b.id;
          const isRejecting = rejecting === b.id;
          const isDragOver  = dragOver  === b.id && !!dragging;
          return (
            <div key={b.id} className="vl-balloon-wrap">
              <div
                className={[
                  'vl-balloon-body',
                  isBouncing  ? 'vl-bounce' : '',
                  isRejecting ? 'vl-shake'  : '',
                  isDragOver  ? 'vl-drag-over' : '',
                ].join(' ')}
                style={{ '--bc': b.color, '--bb': b.bg }}
                onClick={() => handleBalloonClick(b.id)}
                onDragOver={e => onDragOver(e, b.id)}
                onDragLeave={onDragLeave}
                onDrop={e => onDrop(e, b.id)}
                role="button"
                aria-label={b.name}
              >
                {/* رمز الحرف — في حاوية منفصلة مع ارتفاع ثابت */}
                <div className="vl-b-top">
                  <span className="vl-b-symbol">{b.symbol}</span>
                </div>

                {/* شبكة المقاطع المودَعة — تحت الرمز مباشرة */}
                {inside.length > 0 && (
                  <div className="vl-b-inside">
                    {inside.map(s => (
                      <span key={s.id} className="vl-chip" style={{ '--bc': b.color }}>
                        <span className="vl-chip-text">{s.text}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* عقدة + خيط */}
              <div className="vl-knot" style={{ borderTopColor: b.color }} />
              <div className="vl-string" style={{ background: b.color }} />
            </div>
          );
        })}
      </div>

      {/* ── بركة المقاطع ── */}
      <div className="vl-pool">
        {unplaced.length === 0
          ? <p className="vl-pool-done">🎉 أحسنت! جميع المقاطع في مكانها</p>
          : unplaced.map(s => (
            <button
              key={s.id}
              className={[
                'vl-syl',
                selected === s.id ? 'vl-sel'  : '',
                dragging === s.id ? 'vl-drag' : '',
              ].join(' ')}
              onClick={() => handleSylClick(s.id)}
              draggable
              onDragStart={e => onDragStart(e, s.id)}
              onDragEnd={onDragEnd}
            >
              <span className="vl-syl-text">{s.text}</span>
            </button>
          ))
        }
      </div>

      {/* ── تذييل ── */}
      <div className="lr-footer">
        <div className="lr-counter">
          <span className="lr-counter-label">الأصوات الطويلة المكتملة:</span>
          <span className="lr-counter-val">{placed.size}</span>
          <span className="lr-counter-of">من {TOTAL}</span>
          {placed.size > 0 && (
            <span className="lr-counter-pct">({Math.round((placed.size / TOTAL) * 100)}%)</span>
          )}
        </div>
        <button className="lr-reset-btn" onClick={handleReset}>إعادة تعيين 🔄</button>
      </div>

      <button className="btn-primary" onClick={handleSubmit} style={{ marginTop: 14 }}>
        تأكيد وإكمال التدريب ✓
      </button>
    </div>
  );
}
