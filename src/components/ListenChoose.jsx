import { useState, useRef, useEffect } from 'react';

export default function ListenChoose({ question, onAnswer }) {
  const [ttsState,   setTtsState]  = useState('idle'); // 'idle' | 'playing'
  const [playCount,  setPlayCount] = useState(0);
  const [selected,   setSelected]  = useState(null);

  const ttsTimeoutRef = useRef(null);
  const playCountRef  = useRef(0);

  useEffect(() => () => {
    clearTimeout(ttsTimeoutRef.current);
    window.speechSynthesis?.cancel();
  }, []);

  function playTTS() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    clearTimeout(ttsTimeoutRef.current);

    playCountRef.current = 1;
    setPlayCount(1);
    setTtsState('playing');

    const doSpeak = () => {
      const u    = new SpeechSynthesisUtterance(question.audioText || question.word);
      u.lang     = 'ar-SA';
      u.rate     = 1.0;
      u.pitch    = 1;
      u.volume   = 1;

      u.onend = () => {
        if (playCountRef.current < 3) {
          playCountRef.current += 1;
          setPlayCount(playCountRef.current);
          ttsTimeoutRef.current = setTimeout(doSpeak, 700);
        } else {
          setTtsState('idle');
          setPlayCount(0);
        }
      };
      u.onerror = () => { setTtsState('idle'); setPlayCount(0); };

      const voices  = synth.getVoices();
      const arVoice = voices.find(v => v.lang.startsWith('ar'));
      if (arVoice) u.voice = arVoice;
      synth.speak(u);
    };

    const voices = synth.getVoices();
    if (voices.length > 0) { doSpeak(); }
    else { synth.onvoiceschanged = doSpeak; }
  }

  function handleReset() {
    window.speechSynthesis?.cancel();
    clearTimeout(ttsTimeoutRef.current);
    setTtsState('idle');
    setPlayCount(0);
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

  const isPlaying = ttsState === 'playing';

  return (
    <div className="question-box lc-box">

      {/* ── التعليمة ── */}
      <div className="lr-instructions">
        <p className="lr-title">
          اسْتَمِعْ وَاخْتَرْ <span className="lr-sep">|</span> Listen and Choose
        </p>
      </div>

      {/* ── زر التشغيل ── */}
      <div className="lc-player">
        <button
          className={`lc-play-btn${isPlaying ? ' lc-playing' : ''}`}
          onClick={playTTS}
          disabled={isPlaying}
          aria-label="تشغيل الكلمة"
        >
          <span className="lc-play-icon">{isPlaying ? '🔊' : '▶'}</span>
        </button>
        <span className="lc-play-hint">
          {isPlaying
            ? `جاري التشغيل (${playCount}/3)...`
            : 'اضغط لسماع الكلمة ثلاث مرات'}
        </span>
      </div>

      {/* ── خيارات الإجابة — تقييم صامت بلا صح/خطأ ── */}
      <div className="lc-options">
        {(question.options || []).map((opt, idx) => (
          <button
            key={idx}
            className={`lc-option${selected === idx ? ' lc-selected' : ''}`}
            onClick={() => setSelected(idx)}
          >
            {opt}
          </button>
        ))}
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
