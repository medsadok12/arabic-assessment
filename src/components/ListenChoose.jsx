import { useState, useRef, useEffect } from 'react';

const MAX_PLAYS = 3;

export default function ListenChoose({ question, onAnswer }) {
  const opts = question.options || [];

  /* عدد مرات التشغيل لكل خيار — مستقل تماماً */
  const [playCounts, setPlayCounts] = useState(() => opts.map(() => 0));
  const [playing,    setPlaying]    = useState(null); // فهرس الخيار الذي يُشغَّل حالياً
  const [selected,   setSelected]   = useState(null); // فهرس الخيار الذي اختاره الطفل

  const ttsRef = useRef(null); // مرجع الـ utterance الحالي

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
  }, []);

  function playWord(idx) {
    if (playCounts[idx] >= MAX_PLAYS) return;

    const synth = window.speechSynthesis;
    if (!synth) return;

    /* إيقاف أي صوت جارٍ */
    synth.cancel();
    if (ttsRef.current) ttsRef.current.onend = null;

    setPlaying(idx);

    const u    = new SpeechSynthesisUtterance(opts[idx]);
    u.lang     = 'ar-SA';
    u.rate     = 1.0;
    u.pitch    = 1;
    u.volume   = 1;

    u.onend   = () => setPlaying(null);
    u.onerror = () => setPlaying(null);

    const voices  = synth.getVoices();
    const arVoice = voices.find(v => v.lang.startsWith('ar'));
    if (arVoice) u.voice = arVoice;

    ttsRef.current = u;

    /* تحديث العداد فور الضغط */
    setPlayCounts(prev => prev.map((c, i) => i === idx ? c + 1 : c));

    const go = () => synth.speak(u);
    if (synth.getVoices().length > 0) { go(); }
    else { synth.onvoiceschanged = go; }
  }

  function handleReset() {
    window.speechSynthesis?.cancel();
    setPlaying(null);
    setPlayCounts(opts.map(() => 0));
    setSelected(null);
  }

  function handleSubmit() {
    if (selected === null) return;
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
          اضغط ▶ بجانب أي كلمة لسماعها (حتى 3 مرات) ← ثم اضغط على الكلمة التي تطابق ما سمعته
        </p>
      </div>

      {/* ── بطاقات الخيارات ── */}
      <div className="lc-options">
        {opts.map((opt, idx) => {
          const count     = playCounts[idx];
          const isMaxed   = count >= MAX_PLAYS;
          const isPlaying = playing === idx;
          const isSelected = selected === idx;

          return (
            <div
              key={idx}
              className={`lc-option-card${isSelected ? ' lc-selected' : ''}`}
              onClick={() => setSelected(idx)}
              role="button"
              aria-pressed={isSelected}
            >
              {/* نص الكلمة */}
              <span className="lc-word-text">{opt}</span>

              {/* زر التشغيل المستقل */}
              <button
                className={[
                  'lc-word-play',
                  isPlaying ? 'lc-word-playing' : '',
                ].join(' ')}
                onClick={e => { e.stopPropagation(); playWord(idx); }}
                disabled={isMaxed || isPlaying}
                aria-label={`استمع لـ ${opt}`}
              >
                <span className="lc-word-play-icon">
                  {isPlaying ? '🔊' : isMaxed ? '✓' : '▶'}
                </span>
                {!isMaxed && count > 0 && (
                  <span className="lc-word-count">{count}/{MAX_PLAYS}</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="lr-footer">
        <div />
        <button className="lr-reset-btn" onClick={handleReset}>إعادة تعيين 🔄</button>
      </div>

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={selected === null}
        style={{ marginTop: 14, opacity: selected === null ? 0.5 : 1 }}
      >
        تأكيد ←
      </button>
    </div>
  );
}
