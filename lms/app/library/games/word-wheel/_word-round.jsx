'use client';
import { useState } from 'react';
import WheelSVG from '../../../../components/WordWheelSVG';
import { cardFor, missingIndex, shuffled } from '../../../../lib/word-wheel';
import { WordCard, WordVisual, goodMsg, tryMsg } from './_ui';

/* ════════════════════════════════════════════════════════════════
   جولة كلمة بكلمة — النمطان «اكتشف الكلمة من الصورة» (المبتدئ)
   و«أكمل الكلمة الناقصة» (المتوسط) بأسلوبيه: حرف مخفي، أو تلميح نصي.
   الطفل يلمس حروف العجلة؛ كل حرف صحيح يملأ خانته فوراً (instant_check)،
   والخطأ رسالة مشجّعة واهتزاز لطيف. بعد max_attempts أخطاء تُكشف الكلمة بلطف.
   عند اكتمال الكلمة: نطقها (داخل اللمسة نفسها) + احتفال + بطاقة التعلّم.
════════════════════════════════════════════════════════════════ */

function setup(word, style) {
  if (style === 'missing') {
    const hidden = missingIndex(word);
    return { hidden, filled: [...word].map((ch, i) => (i === hidden ? null : ch)) };
  }
  return { hidden: -1, filled: Array(word.length).fill(null) };
}

export default function WordRound({ wheel, cards, voice, pointsPerWord, onAward, onExit, onFinish }) {
  const s = wheel.settings;
  const style = wheel.mode === 'picture' ? 'picture' : s.complete_style; // picture | missing | hint
  const [order] = useState(() => (s.shuffle_words ? shuffled(wheel.words) : wheel.words));
  const [idx, setIdx] = useState(0);
  const [{ hidden, filled }, setWord] = useState(() => setup(order[0], style));
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [status, setStatus] = useState('play'); // play | solved | revealed
  const [results, setResults] = useState([]);
  const [card, setCard] = useState(null);       // { card, kind }
  const [msg, setMsg] = useState(null);
  const [shake, setShake] = useState(0);
  const [glow, setGlow] = useState(null);

  const target = order[idx];
  const info = cards[target] || cardFor(target);
  const hintsLeft = s.hints_enabled ? Math.max(0, s.hints_limit - hintsUsed) : 0;
  const n = target.length;

  const nextWord = (res) => {
    setCard(null);
    if (idx + 1 >= order.length) {
      const solved = res.filter(r => r.status === 'solved').length;
      onFinish({ solved, total: order.length, words: res });
      return;
    }
    const k = idx + 1;
    setIdx(k);
    setWord(setup(order[k], style));
    setMistakes(0); setHintsUsed(0); setStatus('play'); setMsg(null); setGlow(null);
  };

  // اكتمال الكلمة — داخل معالج اللمسة: النطق يبدأ فوراً (شرط سفاري)
  const complete = (kind) => {
    setWord(w => ({ ...w, filled: [...target] }));
    setStatus(kind);
    setGlow(null);
    voice(info, { fallback: s.voice_fallback });
    if (kind === 'solved') { onAward(); setMsg({ tone: 'good', text: goodMsg() }); }
    else setMsg({ tone: 'calm', text: `لا بأس! هذه هي الكلمة: «${info.vocalized}» — سنتعلّمها معاً 🌱` });
    const res = [...results, { word: target, status: kind }];
    setResults(res);
    if (s.show_card) setTimeout(() => setCard({ card: info, kind }), kind === 'solved' ? 700 : 1300);
    else setTimeout(() => nextWord(res), 1500);
  };

  const wrong = () => {
    const m = mistakes + 1;
    setMistakes(m);
    setShake(x => x + 1);
    if (s.max_attempts > 0 && m >= s.max_attempts) { complete('revealed'); return; }
    const left = s.max_attempts > 0 ? s.max_attempts - m : null;
    setMsg({ tone: 'try', text: left === 1 ? `${tryMsg()} — بقيت محاولة واحدة` : tryMsg() });
  };

  const onLetter = (letter) => {
    if (status !== 'play' || card) return;
    if (style === 'missing') {
      if (letter === target[hidden]) complete('solved');
      else wrong();
      return;
    }
    const pos = filled.indexOf(null);
    if (pos < 0) return;
    if (s.instant_check) {
      if (letter !== target[pos]) { wrong(); return; }
      const next = [...filled]; next[pos] = letter;
      setWord(w => ({ ...w, filled: next }));
      setMsg(null);
      if (!next.includes(null)) complete('solved');
      return;
    }
    const next = [...filled]; next[pos] = letter;
    setWord(w => ({ ...w, filled: next }));
    if (next.includes(null)) return;
    if (next.join('') === target) { complete('solved'); return; }
    wrong();
    setTimeout(() => setWord(w => ({ ...w, filled: Array(n).fill(null) })), 450);
  };

  const onUndo = () => {
    if (status !== 'play') return;
    const last = filled.map(Boolean).lastIndexOf(true);
    if (last < 0) return;
    const next = [...filled]; next[last] = null;
    setWord(w => ({ ...w, filled: next }));
  };

  const onHint = () => {
    if (status !== 'play' || hintsLeft <= 0) return;
    setHintsUsed(h => h + 1);
    if (style === 'missing') {
      setGlow(target[hidden]);
      setMsg({ tone: 'hint', text: '💡 الحرف الناقص يتوهّج في العجلة — المسه!' });
      return;
    }
    // أول خانة فارغة أو خاطئة تُملأ بحرفها الصحيح
    const pos = [...target].findIndex((ch, i) => filled[i] !== ch);
    const next = [...target].map((ch, i) => (i <= pos ? ch : null));
    setWord(w => ({ ...w, filled: next }));
    setMsg({ tone: 'hint', text: `💡 الحرف رقم ${pos + 1} هو «${target[pos]}»` });
    if (!next.includes(null)) complete('solved');
  };

  // التلميح النصي: تلميح المعلم (مع عدد الحروف إن لم يذكره)، وإلا الشرح، وإلا عدد الحروف
  const count = `من ${n} حروف`;
  const hintText = info.hint ? (/[0-9٠-٩]/.test(info.hint) ? info.hint : `${info.hint} — ${count}`)
    : info.definition ? `${info.definition} — ${count}` : `كلمة ${count} ${info.emoji || ''}`;
  const showPicture = style === 'picture' && (info.image_url || info.emoji);
  const nextPos = filled.indexOf(null);
  const done = status !== 'play';

  return (
    <div className="ww-wrap">
      <div className="ww-top">
        <button type="button" className="ww-back" onClick={onExit}>→ العجلات</button>
        <div className="ww-top-title">{wheel.name}</div>
        <span className="ww-pill">{idx + 1}/{order.length}</span>
      </div>
      <div className="ww-dots" aria-hidden="true">
        {order.map((w, i) => (
          <span key={w} className={`ww-dot${i === idx ? ' cur' : ''}${results[i]?.status === 'solved' ? ' ok' : ''}${results[i]?.status === 'revealed' ? ' rev' : ''}`} />
        ))}
      </div>

      <div className="ww-panel">
        {showPicture && <WordVisual card={info} size="lg" />}
        {style === 'picture' && !showPicture && <div className="ww-hint-bubble">💡 {hintText}</div>}
        {style === 'picture' && <p className="ww-instr">ما اسم هذه الصورة؟ ركّب حروفها من العجلة 👇</p>}
        {style === 'hint' && <div className="ww-hint-bubble">💡 {hintText}</div>}
        {style === 'missing' && <p className="ww-instr">أيّ حرف ينقص الكلمة؟ المسه في العجلة 👇</p>}

        <div key={shake} className={`ww-tiles${done && status === 'solved' ? ' solved' : ''}${shake ? ' ww-shake' : ''}`}
          style={{ '--n': n }} aria-label="خانات الكلمة">
          {[...target].map((ch, i) => {
            const val = filled[i];
            const cls = status === 'revealed' && (style === 'missing' ? i === hidden : true) ? ' revealed'
              : style === 'missing' && i === hidden && !done ? ' missing'
              : val ? ' filled'
              : i === nextPos && !done ? ' next' : '';
            return <span key={i} className={`ww-tile${cls}`}>{val || (style === 'missing' && i === hidden ? '؟' : '')}</span>;
          })}
        </div>

        {msg && <div className={`ww-msg ${msg.tone}`} role="status">{msg.text}</div>}

        <div className="ww-wheel-box">
          <WheelSVG
            letters={wheel.letters} center={wheel.center}
            selectedLetters={style === 'missing' ? [] : filled.filter(Boolean)}
            onLetterClick={onLetter} theme={wheel.theme} centerLabel={null} highlight={glow} disabled={done}
          />
        </div>

        <div className="ww-controls">
          {!s.instant_check && style !== 'missing' && (
            <button type="button" className="ww-btn-soft" onClick={onUndo} disabled={done || !filled.some(Boolean)}>⌫ تراجع</button>
          )}
          {s.hints_enabled && s.hints_limit > 0 && (
            <button type="button" className="ww-btn-soft ww-btn-hint" onClick={onHint} disabled={done || hintsLeft <= 0}>
              💡 تلميح ({hintsLeft})
            </button>
          )}
        </div>
      </div>

      {card && (
        <WordCard
          card={card.card}
          revealed={card.kind === 'revealed'}
          points={card.kind === 'solved' ? pointsPerWord : 0}
          autoSeconds={s.card_seconds}
          onReplay={() => voice(card.card, { fallback: s.voice_fallback })}
          onClose={() => nextWord(results)}
        />
      )}
    </div>
  );
}
