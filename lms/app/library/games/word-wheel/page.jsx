'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '../../../../lib/supabase';

/* ─── Constants ─────────────────────────────────────────────────────────── */

const STRIP_RE = /[ً-ْٰـ]/g;
const ARABIC_RE = /^[ء-ي]+$/;

const LEVEL_COLORS = {
  1: { bg: '#f0fdf4', border: '#86efac', accent: '#16a34a' },
  2: { bg: '#fefce8', border: '#fde047', accent: '#ca8a04' },
  3: { bg: '#fff7ed', border: '#fdba74', accent: '#ea580c' },
  4: { bg: '#fef2f2', border: '#fca5a5', accent: '#dc2626' },
};

/* ─── Pure helpers ───────────────────────────────────────────────────────── */

function strip(w) { return w.replace(STRIP_RE, ''); }
function isArabic(w) { return ARABIC_RE.test(w); }

function letterCounts(w) {
  const c = {};
  for (const ch of w) c[ch] = (c[ch] || 0) + 1;
  return c;
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
  const base = len >= 7 ? 12 : len === 6 ? 8 : len === 5 ? 4 : len === 4 ? 2 : 1;
  const uniqueWheel = [...new Set(allLetters)];
  const usesAll = uniqueWheel.every(ch => word.includes(ch));
  return usesAll ? base * 2 : base;
}

function speak(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ar-SA';
  u.rate = 0.82;
  function go() {
    const voices = window.speechSynthesis.getVoices();
    const ar = voices.find(v => v.lang.startsWith('ar'));
    if (ar) u.voice = ar;
    window.speechSynthesis.speak(u);
  }
  if (window.speechSynthesis.getVoices().length > 0) go();
  else {
    window.speechSynthesis.addEventListener('voiceschanged', go, { once: true });
    setTimeout(go, 500);
  }
}

/* ─── WheelSVG ──────────────────────────────────────────────────────────── */

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
        const countInSelected = selectedLetters.filter(l => l === letter).length;
        const countInWheel = letters.filter(l => l === letter).length;
        const isUsedUp = countInSelected >= countInWheel;

        return (
          <g key={`outer-${i}`}
            onClick={() => !isUsedUp && onLetterClick(letter)}
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

      <g onClick={() => onLetterClick(center)} style={{ cursor: 'pointer' }}>
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

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function WordWheelGame() {
  const [phase, setPhase] = useState('lobby');
  const [levelsData, setLevelsData] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalWheels, setTotalWheels] = useState(5);

  const [letters, setLetters] = useState([]);
  const [center, setCenter] = useState('');
  const [gameTime, setGameTime] = useState(120);

  const [selected, setSelected] = useState([]);
  const [inputText, setInputText] = useState('');
  const [foundWords, setFoundWords] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [feedback, setFeedback] = useState(null);
  const [shaking, setShaking] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const [flyWord, setFlyWord] = useState(null);

  const [customConfigs, setCustomConfigs] = useState([]);
  const [customConfig, setCustomConfig] = useState(null);
  const [wordImagePopup, setWordImagePopup] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const timerRef = useRef(null);
  const feedbackRef = useRef(null);

  /* ── Load levels metadata, custom configs, and user role on mount ─────── */
  useEffect(() => {
    fetch('/api/word-wheel?level=1&index=0')
      .then(r => r.json())
      .then(json => { if (json.levels?.length) setLevelsData(json.levels); })
      .catch(() => {});

    fetch('/api/word-wheel/configs')
      .then(r => r.json())
      .then(json => setCustomConfigs(json.configs || []))
      .catch(() => {});

    const supabase = createClient();
    supabase.auth.getUser()
      .then(({ data }) => setUserRole(data?.user?.user_metadata?.role || null))
      .catch(() => {});
  }, []);

  /* ── Play a custom config ────────────────────────────────────────────── */
  const playCustomConfig = useCallback((config) => {
    setCustomConfig(config);
    setLetters(config.outer_letters || []);
    setCenter(config.center_letter || '');
    setGameTime(config.time_seconds || 90);
    setCurrentIndex(0);
    setTotalWheels(1);
    setPhase('start');
  }, []);

  /* ── Fetch a wheel ───────────────────────────────────────────────────── */
  const fetchWheel = useCallback(async (level, index) => {
    setCustomConfig(null);
    setPhase('loading');
    try {
      const res = await fetch(`/api/word-wheel?level=${level}&index=${index}`);
      const json = await res.json();
      if (json.levels?.length) setLevelsData(json.levels);
      setLetters(json.letters || []);
      setCenter(json.center || '');
      setGameTime(json.time || 90);
      setTotalWheels(json.total || 5);
      setPhase('start');
    } catch {
      setPhase('lobby');
    }
  }, []);

  /* ── Start playing ───────────────────────────────────────────────────── */
  const startGame = useCallback(() => {
    setSelected([]);
    setInputText('');
    setFoundWords([]);
    setScore(0);
    setTimeLeft(gameTime);
    setFeedback(null);
    setShaking(false);
    setFlashing(false);
    setFlyWord(null);
    setPhase('playing');
  }, [gameTime]);

  /* ── Timer ───────────────────────────────────────────────────────────── */
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

  const pointsSentRef = useRef(false);
  useEffect(() => {
    if (phase === 'playing') pointsSentRef.current = false;
    if (phase === 'finished' && !pointsSentRef.current && score > 0) {
      pointsSentRef.current = true;
      fetch('/api/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: score, reason: 'word_wheel' }),
      }).catch(() => {});
    }
  }, [phase, score]);

  const allLetters = [...letters, center];
  const wheelCounts = letterCounts(allLetters.join(''));

  /* ── Letter click ────────────────────────────────────────────────────── */
  const handleLetterClick = useCallback((letter) => {
    if (phase !== 'playing') return;
    setSelected(prev => [...prev, letter]);
    setInputText(prev => prev + letter);
  }, [phase]);

  /* ── Backspace / Clear ───────────────────────────────────────────────── */
  const handleBackspace = useCallback(() => {
    setSelected(prev => prev.slice(0, -1));
    setInputText(prev => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setSelected([]);
    setInputText('');
  }, []);

  /* ── Feedback helper ─────────────────────────────────────────────────── */
  const showFeedback = useCallback((msg, type) => {
    clearTimeout(feedbackRef.current);
    setFeedback({ msg, type });
    feedbackRef.current = setTimeout(() => setFeedback(null), 1800);
  }, []);

  /* ── Submit word ─────────────────────────────────────────────────────── */
  const handleSubmit = useCallback(() => {
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
      showFeedback(`الحرف "${center}" إلزامي في كل كلمة`, 'error');
      return;
    }
    if (!canFormFrom(word, wheelCounts)) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      showFeedback('الكلمة تحتوي على حروف خارج العجلة', 'error');
      return;
    }
    if (customConfig && (customConfig.valid_words || []).length > 0) {
      const entry = (customConfig.valid_words || []).find(vw => vw.word === word);
      if (!entry) {
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
        showFeedback('الكلمة غير موجودة في قائمة هذه العجلة', 'error');
        return;
      }
    }
    if (foundWords.includes(word)) {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      showFeedback('وجدت هذه الكلمة من قبل!', 'warn');
      return;
    }

    const pts = calcScore(word, allLetters);
    setScore(s => s + pts);
    setFoundWords(prev => [word, ...prev]);
    setFlyWord(word);
    setFlashing(true);
    setTimeout(() => { setFlashing(false); setFlyWord(null); }, 900);
    speak(word);
    showFeedback(`+${pts} نقطة — ممتاز! ✨`, 'success');
    setSelected([]);
    setInputText('');

    if (customConfig) {
      const entry = (customConfig.valid_words || []).find(vw => vw.word === word);
      if (entry?.image) {
        setWordImagePopup({ word, image: entry.image });
        setTimeout(() => setWordImagePopup(null), 2500);
      }
    }
  }, [phase, inputText, center, wheelCounts, foundWords, allLetters, showFeedback, customConfig]);

  /* ── Keyboard shortcuts ──────────────────────────────────────────────── */
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

  /* ── Game-over navigation ────────────────────────────────────────────── */
  function handleNextWheel() {
    if (customConfig) {
      setCustomConfig(null);
      setPhase('lobby');
      return;
    }
    const nextIndex = currentIndex + 1;
    if (nextIndex < totalWheels) {
      setCurrentIndex(nextIndex);
      fetchWheel(currentLevel, nextIndex);
    } else if (currentLevel < 4) {
      const nextLevel = currentLevel + 1;
      setCurrentLevel(nextLevel);
      setCurrentIndex(0);
      fetchWheel(nextLevel, 0);
    } else {
      setPhase('lobby');
    }
  }

  function handleRetryWheel() {
    if (customConfig) {
      playCustomConfig(customConfig);
      return;
    }
    fetchWheel(currentLevel, currentIndex);
  }

  /* ── Derived values ──────────────────────────────────────────────────── */
  const timerPct = (timeLeft / gameTime) * 100;
  const timerColor = timeLeft > 30 ? '#10B981' : timeLeft > 10 ? '#F59E0B' : '#EF4444';

  const bestWord = foundWords.length > 0
    ? foundWords.reduce((best, w) =>
        calcScore(w, allLetters) >= calcScore(best, allLetters) ? w : best,
        foundWords[0])
    : null;

  const currentLevelInfo = levelsData.find(l => l.id === currentLevel) || null;

  const levelLabel = customConfig
    ? `🎡 ${customConfig.name}`
    : currentLevelInfo
    ? `${currentLevelInfo.icon} ${currentLevelInfo.label} — ${currentIndex + 1}/${totalWheels}`
    : `العجلة ${currentIndex + 1}/${totalWheels}`;

  const isLastWheel = currentIndex + 1 >= totalWheels;
  const isLastLevel = currentLevel >= 4;

  /* ════════════════════════════════════════════════════════════════════════
     PHASE: LOBBY
  ════════════════════════════════════════════════════════════════════════ */
  if (phase === 'lobby') {
    const defaultLevels = [
      { id: 1, label: 'مبتدئ', icon: '🟢', desc: 'حروف شائعة — 120 ثانية' },
      { id: 2, label: 'متوسط', icon: '🟡', desc: 'حروف أصعب — 90 ثانية' },
      { id: 3, label: 'متقدم', icon: '🟠', desc: 'حروف نادرة — 75 ثانية' },
      { id: 4, label: 'أسطوري', icon: '🔴', desc: 'التحدي الأقصى — 60 ثانية' },
    ];
    const displayLevels = levelsData.length ? levelsData : defaultLevels;

    return (
      <div style={S.page}>
        <style>{CSS_KEYFRAMES}</style>

        <div style={S.lobbyWrap}>
          {/* Header */}
          <div style={S.lobbyHeader}>
            <Link href="/library" style={S.topBackLink}>← المكتبة</Link>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3.5rem', animation: 'ww-wheelSpin 10s linear infinite', display: 'inline-block' }}>🎡</div>
              <h1 style={S.mainTitle}>عجلة الكلمات</h1>
              <p style={{ color: 'rgba(255,255,255,0.75)', margin: 0, fontSize: '.93rem' }}>
                اختر مرحلتك وابدأ التحدي!
              </p>
            </div>
          </div>

          {/* Level grid */}
          <div style={S.lobbyGrid}>
            {displayLevels.map(lvl => {
              const colors = LEVEL_COLORS[lvl.id] || LEVEL_COLORS[1];
              return (
                <button
                  key={lvl.id}
                  onClick={() => {
                    setCurrentLevel(lvl.id);
                    setCurrentIndex(0);
                    fetchWheel(lvl.id, 0);
                  }}
                  style={{
                    ...S.levelCard,
                    background: colors.bg,
                    borderColor: colors.border,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.04)';
                    e.currentTarget.style.boxShadow = `0 8px 24px ${colors.border}80`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}>
                  <div style={{ fontSize: '2.4rem' }}>{lvl.icon}</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900, color: colors.accent }}>{lvl.label}</div>
                  <div style={{ fontSize: '.8rem', color: '#6B7280', lineHeight: 1.5 }}>{lvl.desc}</div>
                  <div style={{ fontSize: '.75rem', color: colors.accent, fontWeight: 700, background: `${colors.border}60`, borderRadius: 20, padding: '2px 10px' }}>
                    5 عجلات
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Wheels Section */}
          {customConfigs.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 18, padding: '16px 14px' }}>
              <div style={{ fontSize: '.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
                عجلات مخصصة
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {customConfigs.map(cfg => (
                  <button
                    key={cfg.id}
                    onClick={() => playCustomConfig(cfg)}
                    style={{
                      background: '#fff',
                      border: 'none',
                      borderRadius: 14,
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      cursor: 'pointer',
                      textAlign: 'right',
                      fontFamily: "'Cairo','Tajawal',sans-serif",
                      direction: 'rtl',
                      transition: 'transform .12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#F59E0B,#D97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 900, color: '#fff', flexShrink: 0 }}>
                      {cfg.center_letter}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: '#1F2937', fontSize: '1rem' }}>{cfg.name}</div>
                      <div style={{ fontSize: '.76rem', color: '#6B7280', marginTop: 2 }}>
                        {(cfg.outer_letters || []).length} حرفاً خارجياً • {(cfg.valid_words || []).length} كلمة • {cfg.time_seconds}ث
                      </div>
                    </div>
                    <div style={{ fontSize: '1.2rem', color: '#D97706' }}>←</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Settings link for teachers */}
          {['teacher', 'admin', 'super_admin'].includes(userRole) && (
            <Link
              href="/library/games/word-wheel/settings"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: 'rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.9)',
                borderRadius: 14,
                padding: '12px 20px',
                textDecoration: 'none',
                fontFamily: "'Cairo','Tajawal',sans-serif",
                fontWeight: 700,
                fontSize: '.9rem',
                border: '1.5px solid rgba(255,255,255,0.25)',
                transition: 'background .15s',
              }}
            >
              ⚙️ إدارة العجلات المخصصة
            </Link>
          )}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════════
     PHASE: LOADING
  ════════════════════════════════════════════════════════════════════════ */
  if (phase === 'loading') {
    return (
      <div style={S.page}>
        <style>{CSS_KEYFRAMES}</style>
        <div style={S.centerCard}>
          <div style={{ fontSize: '4rem', animation: 'ww-spin 2.5s linear infinite', display: 'inline-block' }}>🎡</div>
          <h2 style={S.mainTitle}>عجلة الكلمات</h2>
          <p style={{ color: '#D97706', fontWeight: 700, margin: 0 }}>جارٍ تجهيز العجلة…</p>
          <div style={{ display: 'flex', gap: 10 }}>
            {[0, 200, 400].map(d => (
              <div key={d} style={{
                width: 12, height: 12, borderRadius: '50%', background: '#F59E0B',
                animation: `ww-pulse 1.2s ${d}ms ease-in-out infinite`,
              }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════════
     PHASE: START
  ════════════════════════════════════════════════════════════════════════ */
  if (phase === 'start') {
    const colors = LEVEL_COLORS[currentLevel] || LEVEL_COLORS[1];
    return (
      <div style={S.page}>
        <style>{CSS_KEYFRAMES}</style>
        <div style={{ ...S.centerCard, animation: 'ww-floatin 0.5s ease-out', padding: '28px 22px', gap: 18 }}>

          {/* Level badge + wheel badge */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {customConfig ? (
              <span style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', color: '#92400E', borderRadius: 20, padding: '4px 14px', fontSize: '.85rem', fontWeight: 800 }}>
                🎡 {customConfig.name}
              </span>
            ) : (
              <>
                <span style={{ background: colors.bg, border: `1.5px solid ${colors.border}`, color: colors.accent, borderRadius: 20, padding: '4px 14px', fontSize: '.85rem', fontWeight: 800 }}>
                  {currentLevelInfo ? `${currentLevelInfo.icon} ${currentLevelInfo.label}` : `المرحلة ${currentLevel}`}
                </span>
                <span style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', color: '#92400E', borderRadius: 20, padding: '4px 14px', fontSize: '.85rem', fontWeight: 700 }}>
                  العجلة {currentIndex + 1}/{totalWheels}
                </span>
              </>
            )}
            <span style={{ background: '#EFF6FF', border: '1.5px solid #BAE6FD', color: '#0369A1', borderRadius: 20, padding: '4px 14px', fontSize: '.85rem', fontWeight: 700 }}>
              ⏱ {gameTime} ثانية
            </span>
          </div>

          {/* Wheel preview */}
          <div style={{ width: '100%', maxWidth: 260 }}>
            <WheelSVG
              letters={letters}
              center={center}
              selectedLetters={[]}
              onLetterClick={() => {}}
            />
          </div>

          {/* Rules */}
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
                <span style={{ fontWeight: 800, color: '#92400E', fontSize: '.82rem' }}>{label}</span>
                <span style={{ color: '#D97706', fontWeight: 700, fontSize: '.8rem' }}>{pts}</span>
              </div>
            ))}
          </div>

          <p style={{ color: '#6B7280', fontSize: '.88rem', margin: 0, textAlign: 'center', lineHeight: 1.8 }}>
            الحرف الأوسط <strong style={{ color: '#D97706' }}>إلزامي</strong> في كل كلمة — الكلمة الأطول = نقاط أكثر!
          </p>

          <button style={S.btnGold} onClick={startGame}>ابدأ اللعب ←</button>
          <button style={S.btnOutline} onClick={() => setPhase('lobby')}>تغيير المرحلة</button>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════════
     PHASE: FINISHED
  ════════════════════════════════════════════════════════════════════════ */
  if (phase === 'finished') {
    const stars = score >= 20 ? 3 : score >= 10 ? 2 : score > 0 ? 1 : 0;
    const nextBtnLabel = customConfig
      ? '← العودة للقائمة'
      : isLastWheel
      ? isLastLevel ? '🏅 العودة للقائمة' : 'المرحلة التالية 🎯'
      : 'العجلة التالية ←';

    return (
      <div style={S.page}>
        <style>{CSS_KEYFRAMES}</style>
        <div style={{ ...S.centerCard, gap: 16 }}>
          <div style={{ fontSize: '3.5rem', animation: 'ww-pop 0.6s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}>
            {stars === 3 ? '🏆' : stars === 2 ? '🥈' : stars === 1 ? '🥉' : '🎡'}
          </div>
          <h2 style={{ ...S.mainTitle, fontSize: '1.6rem' }}>انتهى الوقت!</h2>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'stretch' }}>
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
              <span style={{ ...S.statNum, color: '#6366F1' }}>
                {letters.length > 0
                  ? Math.min(100, Math.round((foundWords.length / Math.max(1, Math.ceil(letters.length * 1.5))) * 100))
                  : 0}%
              </span>
              <span style={S.statLbl}>استغلال</span>
            </div>
          </div>

          {/* Best word */}
          {bestWord && (
            <div style={{ background: '#FFFBEB', border: '2px solid #FDE68A', borderRadius: 14, padding: '10px 18px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ fontSize: '.76rem', color: '#92400E', fontWeight: 700, marginBottom: 4 }}>أفضل كلمة وجدتها</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#D97706' }}>{bestWord}</div>
              <div style={{ fontSize: '.78rem', color: '#B45309' }}>+{calcScore(bestWord, allLetters)} نقطة</div>
            </div>
          )}

          {/* Found words list */}
          {foundWords.length > 0 && (
            <div style={{ width: '100%', background: '#F9FAFB', borderRadius: 14, padding: '10px 14px', maxHeight: 140, overflowY: 'auto', boxSizing: 'border-box' }}>
              <div style={{ fontSize: '.76rem', color: '#6B7280', fontWeight: 700, marginBottom: 6, textAlign: 'right' }}>الكلمات التي وجدتها:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, direction: 'rtl' }}>
                {foundWords.map(w => (
                  <span key={w} style={{ background: '#FEF3C7', color: '#92400E', borderRadius: 20, padding: '3px 10px', fontSize: '.86rem', fontWeight: 700 }}>{w}</span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <button style={S.btnGold} onClick={handleNextWheel}>{nextBtnLabel}</button>
          <button style={S.btnOutline} onClick={handleRetryWheel}>أعد هذه العجلة 🔄</button>
          <button
            style={{ ...S.btnOutline, borderColor: '#9CA3AF', color: '#6B7280' }}
            onClick={() => setPhase('lobby')}>
            تغيير المرحلة
          </button>
          <Link href="/library" style={S.backLink}>← المكتبة</Link>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════════
     PHASE: PLAYING
  ════════════════════════════════════════════════════════════════════════ */
  return (
    <div style={S.page}>
      <style>{CSS_KEYFRAMES}</style>

      {/* Word image popup for custom wheels */}
      {wordImagePopup && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 20,
            padding: '20px 24px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            animation: 'ww-floatin 0.3s ease-out, ww-pop 0.4s ease-out',
            maxWidth: 240,
          }}>
            <img
              src={wordImagePopup.image}
              alt={wordImagePopup.word}
              style={{ width: 150, height: 150, objectFit: 'cover', borderRadius: 14, border: '3px solid #F59E0B' }}
            />
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#D97706', fontFamily: "'Cairo','Tajawal',sans-serif" }}>
              {wordImagePopup.word}
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={S.topBar}>
        <Link href="/library" style={{ color: 'rgba(255,255,255,0.75)', fontSize: '.85rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          ← المكتبة
        </Link>
        <div style={{ fontSize: '.82rem', fontWeight: 800, color: 'rgba(255,255,255,0.9)', textAlign: 'center', flex: 1, padding: '0 8px' }}>
          {levelLabel}
        </div>
        <div style={S.scorePill}>✨ {score}</div>
        <div style={{
          fontSize: '.9rem', fontWeight: 800, minWidth: 44, textAlign: 'center',
          color: timeLeft <= 10 ? '#FCA5A5' : 'rgba(255,255,255,0.85)',
          animation: timeLeft <= 10 ? 'ww-timerpulse 0.7s ease-in-out infinite' : 'none',
        }}>
          {timeLeft}ث
        </div>
      </div>

      {/* Timer bar */}
      <div style={{ width: '100%', maxWidth: 680, padding: '0 12px', boxSizing: 'border-box' }}>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${timerPct}%`,
            background: timerColor, borderRadius: 4,
            transition: 'width 1s linear, background 0.5s',
          }} />
        </div>
      </div>

      {/* Game layout */}
      <div style={S.gameLayout}>

        {/* Wheel column */}
        <div style={S.wheelCol}>
          {/* SVG wheel with fly word overlay */}
          <div style={{ position: 'relative', width: '100%' }}>
            {flyWord && (
              <div style={{
                position: 'absolute', top: '40%', left: '50%',
                transform: 'translate(-50%,-50%)',
                fontSize: '1.6rem', fontWeight: 900, color: '#059669',
                zIndex: 10, pointerEvents: 'none',
                animation: 'ww-fly 0.85s ease-out forwards',
                whiteSpace: 'nowrap',
              }}>
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

          {/* Input display */}
          <div style={{
            ...S.inputDisplay,
            animation: flashing ? 'ww-flash 0.8s ease-out' : shaking ? 'ww-shake 0.4s ease-in-out' : 'none',
          }}>
            <span style={{
              flex: 1, fontSize: '1.8rem', fontWeight: 900, letterSpacing: 4, textAlign: 'center',
              color: inputText ? '#92400E' : '#D1D5DB',
            }}>
              {inputText || '…'}
            </span>
          </div>

          {/* Feedback */}
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

          {/* Letter tiles */}
          <div style={S.tileRow}>
            {letters.map((letter, i) => {
              const usedCount = selected.filter(l => l === letter).length;
              const totalCount = letters.filter(l => l === letter).length;
              const isUsedUp = usedCount >= totalCount;
              return (
                <button key={`tile-${i}`}
                  onClick={() => !isUsedUp && handleLetterClick(letter)}
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
              onClick={() => handleLetterClick(center)}
              style={{
                ...S.tile,
                background: 'linear-gradient(135deg,#FEF3C7,#F59E0B)',
                color: '#78350F', border: '2.5px solid #D97706',
                fontWeight: 900, fontSize: '1.3rem',
              }}>
              {center}
            </button>
          </div>

          {/* Controls */}
          <div style={S.controlRow}>
            <button onClick={handleBackspace} style={S.ctrlBtn}>⌫ حذف</button>
            <button onClick={handleSubmit} style={{ ...S.ctrlBtn, ...S.submitBtn }}>تأكيد ✓</button>
            <button onClick={handleClear} style={S.ctrlBtn}>مسح ✕</button>
          </div>
        </div>

        {/* Found words column */}
        <div style={S.foundCol}>
          <div style={S.foundHeader}>
            <span style={{ fontWeight: 800, color: '#92400E', fontSize: '.9rem' }}>الكلمات المكتشفة</span>
            <span style={{ background: '#FEF3C7', color: '#D97706', borderRadius: 20, padding: '2px 10px', fontSize: '.8rem', fontWeight: 700 }}>
              {foundWords.length}
            </span>
          </div>
          <div style={S.foundList}>
            {foundWords.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#D1D5DB', padding: '24px 0', fontSize: '.86rem' }}>
                ابدأ بكتابة كلمة!
              </div>
            ) : (
              foundWords.map((w, i) => (
                <div key={w} style={{
                  ...S.foundItem,
                  animation: i === 0 ? 'ww-fadeIn 0.3s ease-out' : 'none',
                }}>
                  <span style={{ flex: 1, fontWeight: 700, color: '#1F2937', fontSize: '.95rem' }}>{w}</span>
                  <span style={{ color: '#F59E0B', fontWeight: 800, fontSize: '.82rem' }}>+{calcScore(w, allLetters)}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── CSS Keyframes ──────────────────────────────────────────────────────── */

const CSS_KEYFRAMES = `
  @keyframes ww-shake {
    0%,100%{transform:translateX(0)}
    20%{transform:translateX(-8px)}
    40%{transform:translateX(8px)}
    60%{transform:translateX(-5px)}
    80%{transform:translateX(5px)}
  }
  @keyframes ww-flash {
    0%{background:rgba(16,185,129,0.3)}
    100%{background:#fff}
  }
  @keyframes ww-fly {
    0%{opacity:1;transform:translate(-50%,-50%) scale(1)}
    100%{opacity:0;transform:translate(-50%,-110%) scale(1.4)}
  }
  @keyframes ww-fadeIn {
    from{opacity:0;transform:translateY(6px)}
    to{opacity:1;transform:translateY(0)}
  }
  @keyframes ww-timerpulse {
    0%,100%{opacity:1}
    50%{opacity:0.55}
  }
  @keyframes ww-spin {
    from{transform:rotate(0deg)}
    to{transform:rotate(360deg)}
  }
  @keyframes ww-pop {
    0%{transform:scale(0);opacity:0}
    70%{transform:scale(1.15)}
    100%{transform:scale(1);opacity:1}
  }
  @keyframes ww-floatin {
    from{opacity:0;transform:translateY(20px)}
    to{opacity:1;transform:translateY(0)}
  }
  @keyframes ww-wheelSpin {
    from{transform:rotate(0deg)}
    to{transform:rotate(360deg)}
  }
  @keyframes ww-pulse {
    0%,100%{opacity:.4;transform:scale(.8)}
    50%{opacity:1;transform:scale(1.1)}
  }
`;

/* ─── Styles ─────────────────────────────────────────────────────────────── */

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
    padding: '12px 12px 40px',
    fontFamily: "'Cairo','Tajawal',sans-serif",
    direction: 'rtl',
    gap: 10,
  },

  /* ── Lobby ── */
  lobbyWrap: {
    width: '100%',
    maxWidth: 520,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  lobbyHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  topBackLink: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: '.85rem',
    textDecoration: 'none',
    alignSelf: 'flex-start',
  },
  lobbyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2,1fr)',
    gap: 14,
    width: '100%',
  },
  levelCard: {
    borderRadius: 18,
    padding: '20px 14px',
    textAlign: 'center',
    cursor: 'pointer',
    border: '2px solid',
    transition: 'transform .15s, box-shadow .15s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    fontFamily: "'Cairo','Tajawal',sans-serif",
    direction: 'rtl',
  },

  /* ── Center card (loading / start / finished) ── */
  centerCard: {
    background: '#fff',
    borderRadius: 24,
    padding: '32px 22px',
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
  },

  /* ── Buttons ── */
  btnGold: {
    background: 'linear-gradient(135deg,#F59E0B,#D97706)',
    color: '#fff',
    border: 'none',
    borderRadius: 14,
    padding: '14px 0',
    fontSize: '1.05rem',
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
    fontSize: '.93rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Cairo','Tajawal',sans-serif",
    width: '100%',
  },
  backLink: {
    color: '#9CA3AF',
    fontSize: '.87rem',
    textDecoration: 'none',
  },

  /* ── Stats ── */
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
    fontSize: '.78rem',
    color: '#9CA3AF',
    fontWeight: 500,
  },
  statDiv: {
    width: 1,
    background: '#E5E7EB',
    alignSelf: 'stretch',
    margin: '4px 0',
  },

  /* ── Playing: top bar ── */
  topBar: {
    width: '100%',
    maxWidth: 680,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 4px',
    boxSizing: 'border-box',
    gap: 6,
  },
  scorePill: {
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 20,
    padding: '4px 12px',
    fontWeight: 800,
    fontSize: '.9rem',
    whiteSpace: 'nowrap',
  },

  /* ── Game layout ── */
  gameLayout: {
    display: 'flex',
    gap: 14,
    width: '100%',
    maxWidth: 680,
    alignItems: 'flex-start',
    boxSizing: 'border-box',
    flexWrap: 'wrap',
  },

  /* ── Wheel column ── */
  wheelCol: {
    flex: '1 1 300px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    background: '#fff',
    borderRadius: 20,
    padding: '14px 12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
    boxSizing: 'border-box',
  },
  inputDisplay: {
    width: '100%',
    minHeight: 58,
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
    padding: '7px 12px',
    fontSize: '.86rem',
    fontWeight: 700,
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  tileRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 7,
    justifyContent: 'center',
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 11,
    fontSize: '1.1rem',
    fontWeight: 800,
    fontFamily: "'Cairo','Tajawal',sans-serif",
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.12s',
    boxShadow: '0 2px 6px rgba(0,0,0,0.09)',
    padding: 0,
  },
  controlRow: {
    display: 'flex',
    gap: 8,
    width: '100%',
  },
  ctrlBtn: {
    flex: 1,
    padding: '9px 4px',
    border: '1.5px solid #E5E7EB',
    borderRadius: 10,
    background: '#F9FAFB',
    color: '#374151',
    fontSize: '.86rem',
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

  /* ── Found words column ── */
  foundCol: {
    flex: '0 1 190px',
    minWidth: 160,
    background: '#fff',
    borderRadius: 20,
    padding: '12px 10px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 520,
  },
  foundHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  foundList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    overflowY: 'auto',
    flex: 1,
  },
  foundItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: '#FFFBEB',
    border: '1.5px solid #FDE68A',
    borderRadius: 9,
    padding: '6px 8px',
  },
};
