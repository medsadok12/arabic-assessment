'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

const STRIP_RE = /[ً-ْٰـ]/g;
const ARABIC_RE = /^[ء-ي]+$/;
const GAME_DURATION = 90;

function strip(word) {
  return word.replace(STRIP_RE, '');
}

function isArabic(word) {
  return ARABIC_RE.test(word);
}

function letterCounts(word) {
  const counts = {};
  for (const ch of word) counts[ch] = (counts[ch] || 0) + 1;
  return counts;
}

function canFormFrom(word, wheelCounts) {
  const wc = letterCounts(word);
  for (const [ch, n] of Object.entries(wc)) {
    if ((wheelCounts[ch] || 0) < n) return false;
  }
  return true;
}

function calcScore(word, allLetters) {
  const len = word.length;
  let base = len >= 7 ? 12 : len === 6 ? 8 : len === 5 ? 4 : len === 4 ? 2 : 1;
  const usesAll = [...new Set(word)].every(ch => allLetters.includes(ch)) &&
    allLetters.every(ch => word.includes(ch));
  return usesAll ? base * 2 : base;
}

function speak(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ar-SA'; u.rate = 0.82;
  function go() {
    const voices = window.speechSynthesis.getVoices();
    const ar = voices.find(v => v.lang.startsWith('ar'));
    if (ar) u.voice = ar;
    window.speechSynthesis.speak(u);
  }
  if (window.speechSynthesis.getVoices().length > 0) go();
  else { window.speechSynthesis.addEventListener('voiceschanged', go, { once: true }); setTimeout(go, 500); }
}

function WheelSVG({ letters, center, selectedLetters, onLetterClick }) {
  const cx = 160, cy = 160, outerR = 105, circleR = 28, centerR = 46;
  const n = letters.length;

  return (
    <svg viewBox="0 0 320 320" width="100%" style={{ maxWidth: 320, userSelect: 'none' }}>
      <defs>
        <radialGradient id="ww-gold" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#D97706" />
        </radialGradient>
        <radialGradient id="ww-center" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FEF3C7" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
        <filter id="ww-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.18" />
        </filter>
      </defs>

      {letters.map((_, i) => {
        const angle = i * (2 * Math.PI / n) - Math.PI / 2;
        const ox = cx + outerR * Math.cos(angle);
        const oy = cy + outerR * Math.sin(angle);
        return (
          <line key={`line-${i}`}
            x1={cx} y1={cy} x2={ox} y2={oy}
            stroke="#FDE68A" strokeWidth="1.5" opacity="0.6"
          />
        );
      })}

      {letters.map((letter, i) => {
        const angle = i * (2 * Math.PI / n) - Math.PI / 2;
        const ox = cx + outerR * Math.cos(angle);
        const oy = cy + outerR * Math.sin(angle);
        const isSelected = selectedLetters.includes(letter) &&
          selectedLetters.lastIndexOf(letter) >= 0;
        const countInSelected = selectedLetters.filter(l => l === letter).length;
        const countInWheel = letters.filter(l => l === letter).length;
        const isUsedUp = countInSelected >= countInWheel;

        return (
          <g key={`outer-${i}`} onClick={() => !isUsedUp && onLetterClick(letter, 'outer', i)}
            style={{ cursor: isUsedUp ? 'not-allowed' : 'pointer' }}>
            <circle cx={ox} cy={oy} r={circleR + 4} fill="transparent" />
            <circle cx={ox} cy={oy} r={circleR}
              fill={isUsedUp ? '#E5E7EB' : 'url(#ww-gold)'}
              stroke={isUsedUp ? '#D1D5DB' : '#F59E0B'}
              strokeWidth="2"
              filter="url(#ww-shadow)"
              style={{ transition: 'all 0.15s' }}
            />
            <text x={ox} y={oy + 1} textAnchor="middle" dominantBaseline="middle"
              fontSize="18" fontWeight="800"
              fill={isUsedUp ? '#9CA3AF' : '#92400E'}
              fontFamily="'Cairo','Tajawal',sans-serif"
              style={{ pointerEvents: 'none' }}>
              {letter}
            </text>
          </g>
        );
      })}

      <g onClick={() => onLetterClick(center, 'center', -1)} style={{ cursor: 'pointer' }}>
        <circle cx={cx} cy={cy} r={centerR + 6} fill="transparent" />
        <circle cx={cx} cy={cy} r={centerR}
          fill="url(#ww-center)"
          stroke="#D97706"
          strokeWidth="3"
          filter="url(#ww-shadow)"
        />
        <text x={cx} y={cy + 2} textAnchor="middle" dominantBaseline="middle"
          fontSize="26" fontWeight="900"
          fill="#78350F"
          fontFamily="'Cairo','Tajawal',sans-serif"
          style={{ pointerEvents: 'none' }}>
          {center}
        </text>
        <text x={cx} y={cy + centerR - 10} textAnchor="middle" dominantBaseline="middle"
          fontSize="8" fontWeight="700"
          fill="#B45309" opacity="0.75"
          fontFamily="'Cairo','Tajawal',sans-serif"
          style={{ pointerEvents: 'none' }}>
          إلزامي
        </text>
      </g>
    </svg>
  );
}

export default function WordWheelGame() {
  const [phase, setPhase] = useState('loading');
  const [letters, setLetters] = useState([]);
  const [center, setCenter] = useState('');
  const [validWords, setValidWords] = useState([]);
  const [validCount, setValidCount] = useState(0);

  const [selected, setSelected] = useState([]);
  const [inputText, setInputText] = useState('');
  const [foundWords, setFoundWords] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [feedback, setFeedback] = useState(null);
  const [shaking, setShaking] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [flyWord, setFlyWord] = useState(null);

  const timerRef = useRef(null);
  const feedbackRef = useRef(null);
  const inputRef = useRef(null);

  const fetchWheel = useCallback(async () => {
    setPhase('loading');
    try {
      const res = await fetch('/api/word-wheel');
      const json = await res.json();
      setLetters(json.letters || []);
      setCenter(json.center || '');
      setValidWords(json.valid_words || []);
      setValidCount(json.valid_count || 0);
      setPhase('start');
    } catch {
      setPhase('error');
    }
  }, []);

  useEffect(() => { fetchWheel(); }, [fetchWheel]);

  const startGame = useCallback(() => {
    setSelected([]);
    setInputText('');
    setFoundWords([]);
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setFeedback(null);
    setShaking(false);
    setFlashing(false);
    setFlyWord(null);
    setPhase('playing');
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setPhase('finished');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const allLetters = [...letters, center];

  const handleLetterClick = useCallback((letter, type) => {
    if (phase !== 'playing') return;
    setSelected(prev => [...prev, letter]);
    setInputText(prev => prev + letter);
  }, [phase]);

  const handleBackspace = useCallback(() => {
    if (selected.length === 0) return;
    setSelected(prev => prev.slice(0, -1));
    setInputText(prev => prev.slice(0, -1));
  }, [selected]);

  const handleClear = useCallback(() => {
    setSelected([]);
    setInputText('');
  }, []);

  const showFeedback = useCallback((msg, type) => {
    clearTimeout(feedbackRef.current);
    setFeedback({ msg, type });
    feedbackRef.current = setTimeout(() => setFeedback(null), 1800);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (phase !== 'playing') return;
    const word = strip(inputText.trim());

    if (word.length < 3) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      showFeedback('الكلمة قصيرة جداً — 3 حروف على الأقل', 'error');
      return;
    }

    if (!isArabic(word)) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      showFeedback('حروف غير صالحة', 'error');
      return;
    }

    if (!word.includes(center)) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      showFeedback(`يجب أن تحتوي الكلمة على الحرف الأوسط "${center}"`, 'error');
      return;
    }

    const wheelCounts = letterCounts(allLetters.join(''));
    if (!canFormFrom(word, wheelCounts)) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      showFeedback('الكلمة تحتوي على حروف خارج العجلة', 'error');
      return;
    }

    if (foundWords.includes(word)) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      showFeedback('وجدت هذه الكلمة من قبل!', 'warn');
      return;
    }

    const inLexicon = validWords.includes(word);

    const pts = calcScore(word, allLetters);
    setScore(s => s + pts);
    setFoundWords(prev => [word, ...prev]);
    setFlyWord(word);
    setFlashing(true);
    setTimeout(() => { setFlashing(false); setFlyWord(null); }, 900);
    speak(word);
    showFeedback(inLexicon ? `+${pts} نقطة — 🌟 من قاموسك!` : `+${pts} نقطة — ممتاز!`, 'success');
    setSelected([]);
    setInputText('');
  }, [phase, inputText, center, allLetters, foundWords, validWords, showFeedback]);

  useEffect(() => {
    const handleKey = (e) => {
      if (phase !== 'playing') return;
      if (e.key === 'Enter') { handleSubmit(); return; }
      if (e.key === 'Backspace') { handleBackspace(); return; }
      if (e.key === 'Escape') { handleClear(); return; }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, handleSubmit, handleBackspace, handleClear]);

  const timerPct = (timeLeft / GAME_DURATION) * 100;
  const timerColor = timeLeft > 30 ? '#10B981' : timeLeft > 10 ? '#F59E0B' : '#EF4444';

  const bestWord = foundWords.length > 0
    ? foundWords.reduce((best, w) => calcScore(w, allLetters) >= calcScore(best, allLetters) ? w : best, foundWords[0])
    : null;

  if (phase === 'loading') {
    return (
      <div style={S.page}>
        <style>{`
          @keyframes ww-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes ww-pulse { 0%,100%{opacity:.4;transform:scale(.8)} 50%{opacity:1;transform:scale(1.1)} }
        `}</style>
        <div style={S.centerCard}>
          <div style={{ fontSize: '4rem', animation: 'ww-spin 2.5s linear infinite', display: 'inline-block' }}>🎡</div>
          <h2 style={S.mainTitle}>عجلة الكلمات</h2>
          <p style={{ color: '#D97706', fontWeight: 700, margin: 0 }}>جارٍ تجهيز العجلة…</p>
          <div style={{ display: 'flex', gap: 10 }}>
            {[0, 200, 400].map(d => (
              <div key={d} style={{ width: 12, height: 12, borderRadius: '50%', background: '#F59E0B', animation: `ww-pulse 1.2s ${d}ms ease-in-out infinite` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div style={S.page}>
        <div style={S.centerCard}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h2 style={S.mainTitle}>تعذّر التحميل</h2>
          <button style={S.btnGold} onClick={fetchWheel}>حاول مجدداً</button>
          <Link href="/library" style={S.backLink}>← العودة للمكتبة</Link>
        </div>
      </div>
    );
  }

  if (phase === 'start') {
    return (
      <div style={S.page}>
        <style>{`
          @keyframes ww-floatin { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
          @keyframes ww-wheelSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        `}</style>
        <div style={{ ...S.centerCard, animation: 'ww-floatin 0.5s ease-out' }}>
          <div style={{ fontSize: '4.5rem', animation: 'ww-wheelSpin 8s linear infinite', display: 'inline-block' }}>🎡</div>
          <h1 style={S.mainTitle}>عجلة الكلمات</h1>
          <p style={{ color: '#6B7280', lineHeight: 1.9, fontSize: '.95rem', margin: 0, textAlign: 'center' }}>
            كوّن كلمات من حروف العجلة<br />
            الحرف الأوسط <strong style={{ color: '#D97706' }}>إلزامي</strong> في كل كلمة<br />
            الكلمة الأطول = نقاط أكثر!
          </p>

          <div style={S.rulesGrid}>
            {[
              ['3 حروف', '1 نقطة'],
              ['4 حروف', '2 نقطة'],
              ['5 حروف', '4 نقاط'],
              ['6 حروف', '8 نقاط'],
              ['7+ حروف', '12 نقطة'],
              ['كل الحروف', '×2 مضاعف'],
            ].map(([label, pts]) => (
              <div key={label} style={S.ruleBox}>
                <span style={{ fontWeight: 800, color: '#92400E' }}>{label}</span>
                <span style={{ color: '#D97706', fontWeight: 700, fontSize: '.85rem' }}>{pts}</span>
              </div>
            ))}
          </div>

          <div style={{ color: '#6B7280', fontSize: '.88rem', display: 'flex', gap: 16, alignItems: 'center' }}>
            <span>⏱ 90 ثانية</span>
            <span>•</span>
            <span>📖 {validCount} كلمة ممكنة</span>
          </div>

          <button style={S.btnGold} onClick={startGame}>🎡 ابدأ اللعبة</button>
          <Link href="/library" style={S.backLink}>← العودة للمكتبة</Link>
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    const pct = validCount > 0 ? Math.round((foundWords.length / validCount) * 100) : 0;
    const stars = score >= 20 ? 3 : score >= 10 ? 2 : score > 0 ? 1 : 0;

    return (
      <div style={S.page}>
        <style>{`
          @keyframes ww-pop { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        `}</style>
        <div style={{ ...S.centerCard, gap: 18 }}>
          <div style={{ fontSize: '3.5rem', animation: 'ww-pop 0.6s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}>
            {stars === 3 ? '🏆' : stars === 2 ? '🥈' : stars === 1 ? '🥉' : '🎡'}
          </div>
          <h2 style={S.mainTitle}>انتهى الوقت!</h2>

          <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
            <div style={S.statBox}>
              <span style={{ ...S.statNum, color: '#D97706' }}>{score}</span>
              <span style={S.statLbl}>نقطة</span>
            </div>
            <div style={S.statDiv} />
            <div style={S.statBox}>
              <span style={{ ...S.statNum, color: '#059669' }}>{foundWords.length}</span>
              <span style={S.statLbl}>كلمة</span>
            </div>
            <div style={S.statDiv} />
            <div style={S.statBox}>
              <span style={{ ...S.statNum, color: '#6366F1' }}>{pct}%</span>
              <span style={S.statLbl}>من الكلمات</span>
            </div>
          </div>

          {bestWord && (
            <div style={{ background: '#FFFBEB', border: '2px solid #FDE68A', borderRadius: 14, padding: '12px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '.78rem', color: '#92400E', fontWeight: 700, marginBottom: 4 }}>أفضل كلمة وجدتها</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#D97706' }}>{bestWord}</div>
            </div>
          )}

          {foundWords.length > 0 && (
            <div style={{ width: '100%', background: '#F9FAFB', borderRadius: 14, padding: '12px 16px', maxHeight: 160, overflowY: 'auto' }}>
              <div style={{ fontSize: '.78rem', color: '#6B7280', fontWeight: 700, marginBottom: 8, textAlign: 'right' }}>الكلمات التي وجدتها:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, direction: 'rtl' }}>
                {foundWords.map(w => (
                  <span key={w} style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 20, padding: '3px 12px', fontSize: '.88rem', fontWeight: 700 }}>{w}</span>
                ))}
              </div>
            </div>
          )}

          <button style={S.btnGold} onClick={fetchWheel}>🎡 عجلة جديدة</button>
          <button style={S.btnOutline} onClick={startGame}>🔄 العب مجدداً</button>
          <Link href="/library" style={S.backLink}>← العودة للمكتبة</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <style>{`
        @keyframes ww-shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-5px)}
          80%{transform:translateX(5px)}
        }
        @keyframes ww-flash {
          0%{background:rgba(16,185,129,0.35)}
          100%{background:transparent}
        }
        @keyframes ww-fly {
          0%{opacity:1;transform:translateY(0) scale(1)}
          100%{opacity:0;transform:translateY(-60px) scale(1.4)}
        }
        @keyframes ww-fadeIn {
          from{opacity:0;transform:translateY(6px)}
          to{opacity:1;transform:translateY(0)}
        }
        @keyframes ww-timerpulse {
          0%,100%{opacity:1}
          50%{opacity:0.6}
        }
      `}</style>

      <div style={S.topBar}>
        <Link href="/library" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '.85rem', textDecoration: 'none' }}>← المكتبة</Link>
        <div style={S.scorePill}>✨ {score} نقطة</div>
        <div style={{ fontSize: '.88rem', fontWeight: 700,
          color: timeLeft <= 10 ? '#FCA5A5' : 'rgba(255,255,255,0.85)',
          animation: timeLeft <= 10 ? 'ww-timerpulse 0.7s ease-in-out infinite' : 'none' }}>
          ⏱ {timeLeft}ث
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 680, padding: '0 12px', boxSizing: 'border-box', marginBottom: 4 }}>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${timerPct}%`, background: timerColor, borderRadius: 4, transition: 'width 1s linear, background 0.5s' }} />
        </div>
      </div>

      <div style={S.gameLayout}>
        <div style={S.wheelCol}>
          <div style={{ position: 'relative' }}>
            {flyWord && (
              <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
                fontSize: '1.6rem', fontWeight: 900, color: '#059669', zIndex: 10, pointerEvents: 'none',
                animation: 'ww-fly 0.85s ease-out forwards', whiteSpace: 'nowrap' }}>
                {flyWord}
              </div>
            )}
            <WheelSVG
              letters={letters}
              center={center}
              selectedLetters={selected}
              onLetterClick={handleLetterClick}
            />
          </div>

          <div style={{
            ...S.inputDisplay,
            background: flashing ? 'rgba(16,185,129,0.15)' : '#FFF',
            animation: flashing ? 'ww-flash 0.8s ease-out' : shaking ? 'ww-shake 0.4s ease-in-out' : 'none',
          }}>
            <span style={{ flex: 1, fontSize: '1.8rem', fontWeight: 900, color: inputText ? '#92400E' : '#D1D5DB', letterSpacing: 4, textAlign: 'center' }}>
              {inputText || '…'}
            </span>
          </div>

          {feedback && (
            <div style={{
              ...S.feedbackBubble,
              background: feedback.type === 'success' ? '#D1FAE5' : feedback.type === 'warn' ? '#FEF3C7' : '#FEE2E2',
              color: feedback.type === 'success' ? '#065F46' : feedback.type === 'warn' ? '#92400E' : '#991B1B',
              animation: 'ww-fadeIn 0.2s ease-out',
            }}>
              {feedback.msg}
            </div>
          )}

          <div style={S.tileRow}>
            {letters.map((letter, i) => {
              const usedCount = selected.filter(l => l === letter).length;
              const totalCount = letters.filter(l => l === letter).length;
              const isUsedUp = usedCount >= totalCount;
              return (
                <button key={`tile-${i}`}
                  onClick={() => !isUsedUp && handleLetterClick(letter, 'outer', i)}
                  disabled={isUsedUp}
                  style={{
                    ...S.tile,
                    background: isUsedUp ? '#F3F4F6' : 'linear-gradient(135deg,#FEF3C7,#FDE68A)',
                    color: isUsedUp ? '#D1D5DB' : '#92400E',
                    border: isUsedUp ? '2px solid #E5E7EB' : '2px solid #F59E0B',
                    cursor: isUsedUp ? 'not-allowed' : 'pointer',
                  }}>
                  {letter}
                </button>
              );
            })}
            <button
              onClick={() => handleLetterClick(center, 'center', -1)}
              style={{ ...S.tile, background: 'linear-gradient(135deg,#FEF3C7,#F59E0B)', color: '#78350F', border: '2.5px solid #D97706', fontWeight: 900, fontSize: '1.3rem' }}>
              {center}
            </button>
          </div>

          <div style={S.controlRow}>
            <button onClick={handleBackspace} style={S.ctrlBtn}>⌫ حذف</button>
            <button onClick={handleSubmit} style={{ ...S.ctrlBtn, ...S.submitBtn }}>تأكيد ✓</button>
            <button onClick={handleClear} style={S.ctrlBtn}>مسح ✕</button>
          </div>
        </div>

        <div style={S.foundCol}>
          <div style={S.foundHeader}>
            <span style={{ fontWeight: 800, color: '#92400E' }}>الكلمات المكتشفة</span>
            <span style={{ background: '#FEF3C7', color: '#D97706', borderRadius: 20, padding: '2px 10px', fontSize: '.82rem', fontWeight: 700 }}>
              {foundWords.length}
            </span>
          </div>
          <div style={S.foundList}>
            {foundWords.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#D1D5DB', padding: '24px 0', fontSize: '.88rem' }}>
                ابدأ بكتابة كلمة!
              </div>
            ) : (
              foundWords.map((w, i) => (
                <div key={w} style={{ ...S.foundItem, animation: i === 0 ? 'ww-fadeIn 0.3s ease-out' : 'none' }}>
                  <span style={{ flex: 1, fontWeight: 700, color: '#1F2937', fontSize: '1rem' }}>{w}</span>
                  <span style={{ color: '#F59E0B', fontWeight: 800, fontSize: '.85rem' }}>+{calcScore(w, allLetters)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: '100vh',
    width: '100%',
    boxSizing: 'border-box',
    overflowX: 'hidden',
    background: 'linear-gradient(135deg,#92400E 0%,#B45309 40%,#D97706 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 12px 32px',
    fontFamily: "'Cairo','Tajawal',sans-serif",
    direction: 'rtl',
    gap: 10,
  },
  centerCard: {
    background: '#fff',
    borderRadius: 24,
    padding: '32px 24px',
    textAlign: 'center',
    maxWidth: 520,
    width: '100%',
    boxSizing: 'border-box',
    boxShadow: '0 24px 64px rgba(0,0,0,0.32)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
  },
  mainTitle: {
    fontSize: '2rem',
    fontWeight: 900,
    color: '#1a1a2e',
    margin: 0,
  },
  rulesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3,1fr)',
    gap: 8,
    width: '100%',
  },
  ruleBox: {
    background: '#FFFBEB',
    border: '1.5px solid #FDE68A',
    borderRadius: 10,
    padding: '8px 6px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    fontSize: '.82rem',
  },
  btnGold: {
    background: 'linear-gradient(135deg,#F59E0B,#D97706)',
    color: '#fff',
    border: 'none',
    borderRadius: 14,
    padding: '14px 0',
    fontSize: '1.1rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Cairo','Tajawal',sans-serif",
    width: '100%',
    boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
  },
  btnOutline: {
    background: 'transparent',
    color: '#D97706',
    border: '2px solid #D97706',
    borderRadius: 12,
    padding: '10px 0',
    fontSize: '.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Cairo','Tajawal',sans-serif",
    width: '100%',
  },
  backLink: {
    color: '#9CA3AF',
    fontSize: '0.87rem',
    textDecoration: 'none',
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  statNum: {
    fontSize: '2rem',
    fontWeight: 900,
  },
  statLbl: {
    fontSize: '0.8rem',
    color: '#9CA3AF',
    fontWeight: 500,
  },
  statDiv: {
    width: 1,
    height: 40,
    background: '#E5E7EB',
  },
  topBar: {
    width: '100%',
    maxWidth: 680,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 4px',
    boxSizing: 'border-box',
  },
  scorePill: {
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 20,
    padding: '5px 16px',
    fontWeight: 800,
    fontSize: '1rem',
  },
  gameLayout: {
    display: 'flex',
    gap: 16,
    width: '100%',
    maxWidth: 680,
    alignItems: 'flex-start',
    boxSizing: 'border-box',
    flexWrap: 'wrap',
  },
  wheelCol: {
    flex: '1 1 300px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    background: '#fff',
    borderRadius: 20,
    padding: '16px 14px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
    boxSizing: 'border-box',
  },
  inputDisplay: {
    width: '100%',
    minHeight: 60,
    background: '#FFF',
    border: '2.5px solid #FDE68A',
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 12px',
    boxSizing: 'border-box',
  },
  feedbackBubble: {
    width: '100%',
    borderRadius: 10,
    padding: '8px 14px',
    fontSize: '.88rem',
    fontWeight: 700,
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  tileRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  tile: {
    width: 46,
    height: 46,
    borderRadius: 12,
    fontSize: '1.15rem',
    fontWeight: 800,
    fontFamily: "'Cairo','Tajawal',sans-serif",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.12s',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
  },
  controlRow: {
    display: 'flex',
    gap: 8,
    width: '100%',
  },
  ctrlBtn: {
    flex: 1,
    padding: '10px 4px',
    border: '1.5px solid #E5E7EB',
    borderRadius: 10,
    background: '#F9FAFB',
    color: '#374151',
    fontSize: '.88rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Cairo','Tajawal',sans-serif",
  },
  submitBtn: {
    flex: 2,
    background: 'linear-gradient(135deg,#F59E0B,#D97706)',
    color: '#fff',
    border: 'none',
  },
  foundCol: {
    flex: '0 1 200px',
    minWidth: 170,
    background: '#fff',
    borderRadius: 20,
    padding: '14px 12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxHeight: 520,
  },
  foundHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '.9rem',
  },
  foundList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    overflowY: 'auto',
    flex: 1,
  },
  foundItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#FFFBEB',
    border: '1.5px solid #FDE68A',
    borderRadius: 10,
    padding: '7px 10px',
  },
};
