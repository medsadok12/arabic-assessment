'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import WheelSVG from '../../../../components/WordWheelSVG';
import { calcScore, cardFor, challengeHint } from '../../../../lib/word-wheel';
import { WordCard, WordVisual, goodMsg } from './_ui';

/* ════════════════════════════════════════════════════════════════
   «التحدي المفتوح» (المتقدم) — عجلة حروف وحرف أوسط إلزامي: كوّن أكبر عدد
   من كلمات قائمة العجلة قبل انتهاء الوقت (time = 0 → بلا مؤقت).
   كل كلمة تُكتشف: نطقها + بطاقتها (والوقت متوقف ما دامت مفتوحة).
════════════════════════════════════════════════════════════════ */

const RULES = [['3 حروف', '1 نقطة'], ['4 حروف', '2 نقطة'], ['5 حروف', '4 نقاط'], ['6 حروف', '8 نقاط'], ['7+ حروف', '12 نقطة'], ['كل الحروف', '×2 مضاعف']];

export default function ChallengeRound({ wheel, cards, voice, pointsPerWord, onAward, onExit, onFinish }) {
  const s = wheel.settings;
  const allLetters = [...wheel.letters, wheel.center];
  const [phase, setPhase]       = useState('intro');
  const [input, setInput]       = useState([]);
  const [found, setFound]       = useState([]);
  const [score, setScore]       = useState(0);
  const [timeLeft, setTimeLeft] = useState(wheel.time);
  const [msg, setMsg]           = useState(null);
  const [shake, setShake]       = useState(0);
  const [fly, setFly]           = useState(null);
  const [card, setCard]         = useState(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const finished = useRef(false);
  const latest = useRef({ found, score });
  latest.current = { found, score };

  const hintsLeft = s.hints_enabled ? Math.max(0, s.hints_limit - hintsUsed) : 0;

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const { found: f, score: sc } = latest.current;
    onFinish({ solved: f.length, total: wheel.words.length, score: sc, words: f.map(w => ({ word: w, status: 'solved' })) });
  }, [onFinish, wheel.words.length]);

  // المؤقت يتوقف ما دامت بطاقة الكلمة مفتوحة
  useEffect(() => {
    if (phase !== 'play' || !wheel.time || card) return;
    const t = setInterval(() => {
      setTimeLeft(x => {
        if (x <= 1) { clearInterval(t); setTimeout(finish, 0); return 0; }
        return x - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, wheel.time, card, finish]);

  const say = (text, tone = 'try') => setMsg({ text, tone });
  const nudge = (text) => { setShake(x => x + 1); say(text); };

  const submit = () => {
    if (phase !== 'play' || card) return;
    const word = input.join('');
    if (word.length < 3) return nudge('الكلمة قصيرة — كوّن 3 حروف على الأقل 💡');
    if (!word.includes(wheel.center)) return nudge(`تذكّر: الحرف «${wheel.center}» في كل كلمة ⭐`);
    if (found.includes(word)) return nudge('وجدتها من قبل! ابحث عن كلمة جديدة 🔎');
    if (!wheel.words.includes(word)) return nudge('كلمة جميلة! لكنها ليست في قائمة هذه العجلة — جرّب غيرها 💪');
    const info = cards[word] || cardFor(word);
    voice(info, { fallback: s.voice_fallback });
    const pts = calcScore(word, allLetters);
    const nextFound = [word, ...found];
    setScore(x => x + pts);
    setFound(nextFound);
    setInput([]);
    setFly(word);
    setTimeout(() => setFly(null), 900);
    say(`+${pts} — ${goodMsg()}`, 'good');
    onAward();
    const all = nextFound.length >= wheel.words.length;
    if (s.show_card) setCard({ card: info, last: all });
    else if (all) setTimeout(finish, 900);
  };

  const closeCard = () => {
    const last = card?.last;
    setCard(null);
    if (last) finish();
  };

  const onHint = () => {
    if (hintsLeft <= 0) return;
    const h = challengeHint(wheel.words, found);
    if (!h) return;
    setHintsUsed(x => x + 1);
    say(`💡 ابحث عن كلمة من ${h.length} حروف تبدأ بـ «${h.first}»`, 'hint');
  };

  // لوحة المفاتيح على الحاسوب: Enter تأكيد، Backspace حذف، Escape مسح
  useEffect(() => {
    const fn = (e) => {
      if (phase !== 'play' || card) return;
      if (e.key === 'Enter') submit();
      else if (e.key === 'Backspace') setInput(p => p.slice(0, -1));
      else if (e.key === 'Escape') setInput([]);
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  });

  if (phase === 'intro') {
    return (
      <div className="ww-wrap">
        <div className="ww-top">
          <button type="button" className="ww-back" onClick={onExit}>→ العجلات</button>
          <div className="ww-top-title">{wheel.name}</div>
        </div>
        <div className="ww-panel">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <span className="ww-msg hint" style={{ width: 'auto' }}>{wheel.time ? `⏱ ${wheel.time} ثانية` : '⏱ بلا وقت محدد'}</span>
            <span className="ww-msg good" style={{ width: 'auto' }}>🎯 {wheel.words.length} كلمة مخبّأة</span>
          </div>
          <div className="ww-wheel-box" style={{ maxWidth: 260 }}>
            <WheelSVG letters={wheel.letters} center={wheel.center} theme={wheel.theme} disabled />
          </div>
          <div className="ww-rules">
            {RULES.map(([a, b]) => <div key={a} className="ww-rule"><b>{a}</b><span>{b}</span></div>)}
          </div>
          <p className="ww-instr" style={{ fontWeight: 700, color: '#6B7280', fontSize: '.92rem', lineHeight: 1.8 }}>
            الحرف الأوسط <b style={{ color: 'var(--accent)' }}>إلزامي</b> في كل كلمة — الكلمة الأطول = نقاط أكثر!
          </p>
          <button type="button" className="ww-btn ww-btn-wide" onClick={() => setPhase('play')}>ابدأ التحدي ←</button>
        </div>
      </div>
    );
  }

  const pct = wheel.time ? (timeLeft / wheel.time) * 100 : 100;
  const barColor = timeLeft > 30 ? '#22C55E' : timeLeft > 10 ? '#FBBF24' : '#FB923C';

  return (
    <div className="ww-wrap">
      <div className="ww-top">
        <button type="button" className="ww-back" onClick={onExit}>→ العجلات</button>
        <div className="ww-top-title">{wheel.name}</div>
        <span className="ww-pill">✨ {score}</span>
        {wheel.time > 0 && <span className="ww-pill" aria-live="polite">{timeLeft}ث</span>}
      </div>
      {wheel.time > 0 && <div className="ww-timer"><span style={{ width: `${pct}%`, background: barColor }} /></div>}

      <div className="ww-panel">
        <div className="ww-wheel-box">
          {fly && <div className="ww-fly">{fly}</div>}
          <WheelSVG letters={wheel.letters} center={wheel.center} selectedLetters={input}
            onLetterClick={(l) => !card && setInput(p => [...p, l])} theme={wheel.theme} />
        </div>
        <div key={shake} className={`ww-input${input.length ? '' : ' empty'}${shake ? ' ww-shake' : ''}`} aria-live="polite">
          {input.length ? input.join('') : 'المس الحروف لتكوين كلمة…'}
        </div>
        {msg && <div className={`ww-msg ${msg.tone}`} role="status">{msg.text}</div>}
        <div className="ww-controls">
          <button type="button" className="ww-btn-soft" onClick={() => setInput(p => p.slice(0, -1))} disabled={!input.length}>⌫ حذف</button>
          <button type="button" className="ww-btn" style={{ flex: '2 1 160px' }} onClick={submit} disabled={!input.length}>تأكيد ✓</button>
          <button type="button" className="ww-btn-soft" onClick={() => setInput([])} disabled={!input.length}>مسح ✕</button>
        </div>
        <div className="ww-controls">
          {s.hints_enabled && s.hints_limit > 0 && (
            <button type="button" className="ww-btn-soft ww-btn-hint" onClick={onHint} disabled={hintsLeft <= 0}>💡 تلميح ({hintsLeft})</button>
          )}
          {!wheel.time && <button type="button" className="ww-btn-soft" onClick={finish}>✅ أنهيت</button>}
        </div>
      </div>

      <div className="ww-panel" style={{ alignItems: 'stretch' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, color: '#374151' }}>
          <span>الكلمات المكتشفة</span>
          <span style={{ color: 'var(--accent)' }}>{found.length}/{wheel.words.length}</span>
        </div>
        {found.length === 0
          ? <p style={{ margin: 0, textAlign: 'center', color: '#9CA3AF', fontWeight: 700 }}>ابدأ بتكوين أول كلمة! 🚀</p>
          : (
            <div className="ww-found">
              {found.map(w => {
                const info = cards[w] || cardFor(w);
                return (
                  <button key={w} type="button" className="ww-chip"
                    onClick={() => { voice(info, { fallback: s.voice_fallback }); setCard({ card: info, last: false, replay: true }); }}>
                    <WordVisual card={info} size="sm" />{info.vocalized}
                  </button>
                );
              })}
            </div>
          )}
      </div>

      {card && (
        <WordCard
          card={card.card}
          points={card.replay ? 0 : pointsPerWord}
          autoSeconds={card.last ? 0 : s.card_seconds}
          onReplay={() => voice(card.card, { fallback: s.voice_fallback })}
          onClose={closeCard}
        />
      )}
    </div>
  );
}
