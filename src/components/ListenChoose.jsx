import { useState, useRef, useEffect } from 'react';

const MAX_PLAYS = 3;

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

  /* خلط الربط بين الزر والكلمة مرة واحدة عند التحميل
     buttonOrder[i] = فهرس الكلمة التي يشغّلها الزر i
     الطفل لا يعرف أي زر يقابل أي كلمة                */
  const [buttonOrder] = useState(() => doShuffle(opts.map((_, i) => i)));

  const [playCounts, setPlayCounts] = useState(() => Array(n).fill(0));
  const [playing,    setPlaying]    = useState(null);
  const [selected,   setSelected]   = useState(null);

  const ttsRef = useRef(null);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
  }, []);

  function handlePlay(btnIdx) {
    if (playCounts[btnIdx] >= MAX_PLAYS) return;

    const synth = window.speechSynthesis;
    if (!synth) return;

    /* إيقاف أي صوت جارٍ */
    synth.cancel();
    if (ttsRef.current) ttsRef.current.onend = null;
    setPlaying(btnIdx);

    const wordIdx = buttonOrder[btnIdx];
    const u = new SpeechSynthesisUtterance(opts[wordIdx]);
    u.lang   = 'ar-SA';
    u.rate   = 0.88;
    u.pitch  = 1;
    u.volume = 1;

    u.onend   = () => setPlaying(null);
    u.onerror = () => setPlaying(null);

    ttsRef.current = u;
    setPlayCounts(prev => prev.map((c, i) => i === btnIdx ? c + 1 : c));

    const go = () => synth.speak(u);
    if (synth.getVoices().length > 0) { go(); }
    else { synth.onvoiceschanged = go; }
  }

  function handleReset() {
    window.speechSynthesis?.cancel();
    setPlaying(null);
    setPlayCounts(Array(n).fill(0));
    setSelected(null);
  }

  function handleConfirm() {
    onAnswer({
      questionId: question.id,
      skill:      question.skill ?? 'listening',
      answer:     selected,
      isCorrect:  selected === question.correct,
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
          اضغط أزرار الصوت للاستماع ← ثم اختر الكلمة التي تطابق ما سمعته
        </p>
      </div>

      {/* ── منطقة أزرار الصوت — مستقلة تماماً عن الكلمات ── */}
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

      {/* ── فاصل ── */}
      <div className="lc-divider" />

      {/* ── منطقة الاختيار — نصوص فقط بلا أي مؤشر ── */}
      <div className="lc-choice-zone">
        <p className="lc-zone-label lc-choice-lbl">اختر الكلمة التي سمعتها</p>
        <div className="lc-options">
          {opts.map((opt, idx) => (
            <button
              key={idx}
              className={`lc-option${selected === idx ? ' lc-selected' : ''}`}
              onClick={() => setSelected(idx)}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="lr-footer">
        <div />
        <button className="lr-reset-btn" onClick={handleReset}>إعادة تعيين 🔄</button>
      </div>

      <button
        className="btn-primary"
        onClick={handleConfirm}
        disabled={selected === null}
        style={{ marginTop: 14, opacity: selected === null ? 0.5 : 1 }}
      >
        تأكيد ←
      </button>
    </div>
  );
}
