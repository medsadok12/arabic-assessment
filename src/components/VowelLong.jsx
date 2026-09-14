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

const TOTAL = BASE.length;

function doShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function VowelLong({ question, onAnswer }) {
  const [syllables] = useState(() => doShuffle(BASE));

  /* placement: { sylId → balloonId } — خريطة تصنيف الطالب كاملة */
  const [placement, setPlacement] = useState({});
  const [selected,  setSelected]  = useState(null);
  const [bouncing,  setBouncing]  = useState(null); // تأكيد بصري محايد عند الإيداع
  const [dragging,  setDragging]  = useState(null);
  const [dragOver,  setDragOver]  = useState(null);

  /* قبول مطلق: أي مقطع → أي سلة */
  function placeIn(sylId, balloonId) {
    if (!BASE.find(s => s.id === sylId)) return;
    setPlacement(prev => ({ ...prev, [sylId]: balloonId }));
    setSelected(null);
    setBouncing(balloonId);
    setTimeout(() => setBouncing(null), 600);
  }

  function handleSylClick(id) {
    if (placement[id]) return;
    setSelected(prev => prev === id ? null : id);
  }

  function handleBalloonClick(balloonId) {
    if (!selected) return;
    placeIn(selected, balloonId);
  }

  function onDragStart(e, id) {
    setDragging(id);
    setSelected(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }
  function onDragEnd()  { setDragging(null); setDragOver(null); }
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
    if (id) placeIn(id, balloonId);
  }

  function handleReset() {
    setPlacement({});
    setSelected(null);
    setDragging(null);
    setDragOver(null);
  }

  /* إرسال خريطة التصنيف كاملة — isCorrect محسوب صامتاً للسجل */
  function handleSubmit() {
    const isCorrect     = BASE.every(s => placement[s.id] === s.medd);
    const correctPlaced = BASE.filter(s => placement[s.id] === s.medd).length;
    onAnswer({
      questionId: question.id,
      skill:      question.skill ?? 'reading',
      answer:     placement,
      isCorrect,
      answerText:  `صنّف ${correctPlaced} من ${BASE.length} مقاطع بشكل صحيح`,
      correctText: `تصنيف ${BASE.length} مقاطع المدّ كلها`,
    });
  }

  const placedCount = Object.keys(placement).length;
  const unplaced    = syllables.filter(s => !placement[s.id]);

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
          const inside     = syllables.filter(s => placement[s.id] === b.id);
          const isBouncing = bouncing === b.id;
          const isDragOver = dragOver === b.id && !!dragging;
          return (
            <div key={b.id} className="vl-balloon-wrap">
              <div
                className={[
                  'vl-balloon-body',
                  isBouncing ? 'vl-bounce'    : '',
                  isDragOver ? 'vl-drag-over' : '',
                ].join(' ')}
                style={{ '--bc': b.color, '--bb': b.bg }}
                onClick={() => handleBalloonClick(b.id)}
                onDragOver={e => onDragOver(e, b.id)}
                onDragLeave={onDragLeave}
                onDrop={e => onDrop(e, b.id)}
                role="button"
                aria-label={b.name}
              >
                <div className="vl-b-top">
                  <span className="vl-b-symbol">{b.symbol}</span>
                </div>
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
              <div className="vl-knot"  style={{ borderTopColor: b.color }} />
              <div className="vl-string" style={{ background: b.color }} />
            </div>
          );
        })}
      </div>

      {/* ── بركة المقاطع ── */}
      <div className="vl-pool">
        {unplaced.length === 0
          ? <p className="vl-pool-done">✅ جميع المقاطع تم تصنيفها</p>
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
          <span className="lr-counter-label">المقاطع المصنَّفة:</span>
          <span className="lr-counter-val">{placedCount}</span>
          <span className="lr-counter-of">من {TOTAL}</span>
          {placedCount > 0 && (
            <span className="lr-counter-pct">({Math.round((placedCount / TOTAL) * 100)}%)</span>
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
