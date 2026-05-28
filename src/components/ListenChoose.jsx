import { useState, useRef, useEffect } from 'react';

const MAX_PLAYS = 3;

/* لون كل رتبة: خلفية + حدود + شارة */
const RANK_STYLES = [
  { bg: '#ede9ff', border: '#5c4dd0', badge: '#5c4dd0' }, // 1 — بنفسجي
  { bg: '#fff8e1', border: '#c07d12', badge: '#c07d12' }, // 2 — ذهبي
  { bg: '#e8f5e9', border: '#388e3c', badge: '#388e3c' }, // 3 — أخضر
];

function doShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ListenChoose({ question, onAnswer }) {
  const opts = question.options || [];
  const n    = opts.length;

  /* buttonOrder[i] = فهرس الكلمة التي يشغّلها الزر i — مخفي عن الطفل */
  const [buttonOrder] = useState(() => doShuffle(opts.map((_, i) => i)));

  const [playCounts, setPlayCounts] = useState(() => Array(n).fill(0));
  const [playing,    setPlaying]    = useState(null);
  const [rankOrder,  setRankOrder]  = useState([]); // فهارس الكلمات بترتيب الاختيار

  const ttsRef = useRef(null);

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  function handlePlay(btnIdx) {
    if (playCounts[btnIdx] >= MAX_PLAYS) return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    if (ttsRef.current) ttsRef.current.onend = null;
    setPlaying(btnIdx);
    const wordIdx = buttonOrder[btnIdx];
    const u = new SpeechSynthesisUtterance(opts[wordIdx]);
    u.lang = 'ar-SA'; u.rate = 0.88; u.pitch = 1; u.volume = 1;
    u.onend = () => setPlaying(null);
    u.onerror = () => setPlaying(null);
    ttsRef.current = u;
    setPlayCounts(prev => prev.map((c, i) => i === btnIdx ? c + 1 : c));
    const go = () => synth.speak(u);
    if (synth.getVoices().length > 0) { go(); } else { synth.onvoiceschanged = go; }
  }

  /* ضغطة على كلمة: إضافة إن لم تكن مختارة، إلغاء إن كانت */
  function handleWordClick(idx) {
    setRankOrder(prev => {
      const pos = prev.indexOf(idx);
      return pos === -1 ? [...prev, idx] : prev.filter(i => i !== idx);
    });
  }

  function handleReset() {
    window.speechSynthesis?.cancel();
    setPlaying(null);
    setPlayCounts(Array(n).fill(0));
    setRankOrder([]);
  }

  function handleConfirm() {
    onAnswer({
      questionId: question.id,
      skill:      question.skill ?? 'listening',
      answer:     rankOrder,
      isCorrect:  rankOrder[0] === question.correct,
    });
  }

  return (
    <div className="question-box lc-box">

      {/* ── التعليمة ── */}
      <div className="lr-instructions">
        <p className="lr-title">
          اسْتَمِعْ وَاخْتَرْ <span className="lr-sep">|</span> Listen and Choose
        </p>
        <p className="lr-hint">
          اسْتَمِعْ للأصوات ← اضغط الكلمات بالترتيب — اضغط مرة ثانية لإلغاء الاختيار
        </p>
      </div>

      {/* ── أزرار الصوت ── */}
      <div className="lc-audio-zone">
        <p className="lc-zone-label">أزرار الاستماع</p>
        <div className="lc-audio-btns">
          {Array.from({ length: n }, (_, i) => {
            const isPlaying = playing === i;
            const isMaxed   = playCounts[i] >= MAX_PLAYS;
            return (
              <button
                key={i}
                className={[
                  'lc-play-btn',
                  isPlaying ? 'lc-playing' : '',
                  isMaxed   ? 'lc-maxed'  : '',
                ].join(' ')}
                onClick={() => handlePlay(i)}
                disabled={isPlaying}
                aria-label={`زر صوت ${i + 1}`}
              >
                <span className="lc-play-icon">{isPlaying ? '🔊' : '▶'}</span>
                <span className="lc-play-num">{i + 1}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="lc-divider" />

      {/* ── منطقة الاختيار التسلسلي ── */}
      <div className="lc-choice-zone">
        <p className="lc-zone-label lc-choice-lbl">اختر الكلمات بالترتيب</p>
        <div className="lc-options">
          {opts.map((opt, idx) => {
            const rank  = rankOrder.indexOf(idx);
            const num   = rank === -1 ? null : rank + 1;
            const col   = rank === -1 ? null : RANK_STYLES[rank] ?? RANK_STYLES[RANK_STYLES.length - 1];
            return (
              <button
                key={idx}
                className="lc-option lc-seq-opt"
                style={col ? { background: col.bg, borderColor: col.border } : {}}
                onClick={() => handleWordClick(idx)}
              >
                {num !== null && (
                  <span className="lc-rank-badge" style={{ background: col.badge }}>
                    {num}
                  </span>
                )}
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      <div className="lr-footer">
        <div />
        <button className="lr-reset-btn" onClick={handleReset}>إعادة تعيين 🔄</button>
      </div>

      <button
        className="btn-primary"
        onClick={handleConfirm}
        disabled={rankOrder.length === 0}
        style={{ marginTop: 14, opacity: rankOrder.length === 0 ? 0.5 : 1 }}
      >
        تأكيد ←
      </button>
    </div>
  );
}
