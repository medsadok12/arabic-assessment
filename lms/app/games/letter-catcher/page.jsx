'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

const DIACRITICS = /[ً-ْٰ]/g;

const FALLBACK_WORDS = [
  { id: 1, word: "قَلَم",     missing_letter: "ق", options: ["ق", "ف", "ك"], image_url: null, emoji: "✏️" },
  { id: 2, word: "كِتَاب",    missing_letter: "ا", options: ["ا", "و", "ي"], image_url: null, emoji: "📚" },
  { id: 3, word: "تُفَّاحَة", missing_letter: "ت", options: ["ت", "ب", "ث"], image_url: null, emoji: "🍎" },
  { id: 4, word: "بَيت",      missing_letter: "ب", options: ["ب", "ت", "ن"], image_url: null, emoji: "🏠" },
  { id: 5, word: "شَجَرَة",   missing_letter: "ش", options: ["ش", "س", "ص"], image_url: null, emoji: "🌳" },
  { id: 6, word: "نَجمَة",    missing_letter: "ن", options: ["ن", "م", "ل"], image_url: null, emoji: "⭐" },
  { id: 7, word: "سَيَّارَة", missing_letter: "س", options: ["س", "ش", "ص"], image_url: null, emoji: "🚗" },
  { id: 8, word: "طَيَّارَة", missing_letter: "ط", options: ["ط", "ض", "ظ"], image_url: null, emoji: "✈️" },
];

function splitWord(word, missingLetter) {
  const base = missingLetter.replace(DIACRITICS, '');
  const re = new RegExp(base + '[\\u064B-\\u0652\\u0670]?');
  const match = word.match(re);
  if (!match) return [word, ''];
  const i = word.indexOf(match[0]);
  return [word.slice(0, i), word.slice(i + match[0].length)];
}

function WordImage({ imageUrl, emoji }) {
  const [err, setErr] = useState(false);
  if (!imageUrl || err) {
    return <div style={S.emojiBox}>{emoji || '❓'}</div>;
  }
  return (
    <img src={imageUrl} alt="" style={S.wordImg} onError={() => setErr(true)} />
  );
}

export default function LetterCatcherGame() {
  const [phase, setPhase]   = useState('start');
  const [words, setWords]   = useState([]);
  const [cur,   setCur]     = useState(0);
  const [score, setScore]   = useState(0);
  const [chosen, setChosen] = useState(null);
  const [correct, setCorrect] = useState(null);

  const startGame = useCallback(async () => {
    setPhase('loading');
    try {
      const res = await fetch('/api/games/letter-catcher');
      if (!res.ok) throw new Error();
      const json = await res.json();
      setWords(json.words?.length ? json.words : FALLBACK_WORDS);
    } catch {
      setWords(FALLBACK_WORDS);
    }
    setCur(0);
    setScore(0);
    setChosen(null);
    setCorrect(null);
    setPhase('playing');
  }, []);

  const pick = useCallback((opt) => {
    if (chosen !== null) return;
    const w = words[cur];
    const isRight = opt.replace(DIACRITICS, '') === w.missing_letter.replace(DIACRITICS, '');
    setChosen(opt);
    setCorrect(isRight);
    if (isRight) setScore((s) => s + 1);
  }, [chosen, cur, words]);

  const next = useCallback(() => {
    const nextIdx = cur + 1;
    if (nextIdx >= words.length) {
      setPhase('finished');
    } else {
      setCur(nextIdx);
      setChosen(null);
      setCorrect(null);
    }
  }, [cur, words.length]);

  const restart = useCallback(() => {
    setPhase('start');
    setWords([]);
    setCur(0);
    setScore(0);
    setChosen(null);
    setCorrect(null);
  }, []);

  /* ── Start / Loading ── */
  if (phase === 'start' || phase === 'loading') {
    return (
      <div style={S.page}>
        <div style={S.centerCard}>
          <div style={{ fontSize: '5rem' }}>🎯</div>
          <h1 style={S.mainTitle}>صياد الحروف</h1>
          <p style={S.sub}>اعثر على الحرف الضائع وأعده إلى مكانه في الكلمة!</p>
          <button
            style={{ ...S.btnGold, opacity: phase === 'loading' ? 0.7 : 1 }}
            onClick={startGame}
            disabled={phase === 'loading'}
          >
            {phase === 'loading' ? '⏳ جارٍ التحميل…' : '🚀 ابدأ اللعبة'}
          </button>
          <Link href="/library" style={S.backLink}>← العودة للمكتبة</Link>
        </div>
      </div>
    );
  }

  /* ── Finished ── */
  if (phase === 'finished') {
    const pct   = Math.round((score / words.length) * 100);
    const stars = pct >= 80 ? 3 : pct >= 50 ? 2 : 1;
    const msg   = pct >= 80
      ? 'ممتاز! أنت صياد حروف بارع 🏆'
      : pct >= 50 ? 'جيد! تستطيع أن تتحسن أكثر 💪'
      : 'لا تيأس! المحاولة مفتاح النجاح 🌟';
    return (
      <div style={S.page}>
        <div style={S.centerCard}>
          <div style={{ fontSize: '3rem' }}>{'⭐'.repeat(stars)}</div>
          <h2 style={S.mainTitle}>أحسنت!</h2>
          <div style={{ fontSize: '3.5rem', fontWeight: 800, color: '#F5A623' }}>
            {score} / {words.length}
          </div>
          <p style={S.sub}>{msg}</p>
          <button style={S.btnGold} onClick={restart}>🔄 العب مرة أخرى</button>
          <Link href="/library" style={S.backLink}>← العودة للمكتبة</Link>
        </div>
      </div>
    );
  }

  /* ── Playing ── */
  const w = words[cur];
  const [before, after] = splitWord(w.word, w.missing_letter);
  const last = cur + 1 >= words.length;

  return (
    <div style={S.page}>
      {/* progress bar */}
      <div style={S.headerRow}>
        <span style={S.scoreBadge}>النقاط: {score}</span>
        <div style={S.bar}>
          <div style={{ ...S.barFill, width: `${((cur + 1) / words.length) * 100}%` }} />
        </div>
        <span style={S.barLabel}>{cur + 1} / {words.length}</span>
      </div>

      {/* card */}
      <div style={S.card}>
        {/* image / emoji */}
        <WordImage imageUrl={w.image_url} emoji={w.emoji} />

        {/* word with blank */}
        <div style={S.wordRow}>
          {before && <span style={S.wordText}>{before}</span>}
          <span style={{
            ...S.blank,
            background:   correct === null ? '#e8f0fb' : correct ? '#d4edda' : '#f8d7da',
            borderColor:  correct === null ? '#185FA5'  : correct ? '#27ae60' : '#e74c3c',
            color:        correct === null ? '#185FA5'  : correct ? '#27ae60' : '#e74c3c',
          }}>
            {correct !== null ? w.missing_letter : '؟'}
          </span>
          {after && <span style={S.wordText}>{after}</span>}
        </div>

        {/* feedback */}
        {correct !== null && (
          <div style={{
            ...S.feedback,
            color:      correct ? '#27ae60' : '#e74c3c',
            background: correct ? '#d4edda'  : '#f8d7da',
          }}>
            {correct ? '✅ أحسنت! إجابة صحيحة' : `❌ الإجابة الصحيحة: ${w.missing_letter}`}
          </div>
        )}

        {/* options */}
        <div style={S.optRow}>
          {(w.options || []).filter(Boolean).map((opt) => {
            const isRight   = opt.replace(DIACRITICS, '') === w.missing_letter.replace(DIACRITICS, '');
            const isChosen  = chosen === opt;
            const revealed  = chosen !== null;
            let btn = { ...S.optBtn };
            if (revealed) {
              if (isRight)       btn = { ...btn, ...S.optCorrect };
              else if (isChosen) btn = { ...btn, ...S.optWrong };
              else               btn = { ...btn, opacity: 0.35 };
            }
            return (
              <button key={opt} style={btn} onClick={() => pick(opt)} disabled={revealed}>
                {opt}
              </button>
            );
          })}
        </div>

        {/* next */}
        {chosen !== null && (
          <button style={S.btnBlue} onClick={next}>
            {last ? '🏁 النتيجة النهائية' : 'التالي ←'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Styles ── */
const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #185FA5 0%, #0d3d73 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    fontFamily: "'Tajawal', sans-serif",
    direction: 'rtl',
  },
  centerCard: {
    background: '#fff',
    borderRadius: 24,
    padding: '48px 40px',
    textAlign: 'center',
    maxWidth: 420,
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.28)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 22,
  },
  mainTitle: {
    fontSize: '2.3rem',
    fontWeight: 800,
    color: '#185FA5',
    margin: 0,
  },
  sub: {
    fontSize: '1.05rem',
    color: '#6b7280',
    maxWidth: 320,
    lineHeight: 1.7,
    margin: 0,
  },
  btnGold: {
    background: '#F5A623',
    color: '#fff',
    border: 'none',
    borderRadius: 14,
    padding: '14px 0',
    fontSize: '1.15rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Tajawal', sans-serif",
    width: '100%',
    maxWidth: 280,
  },
  backLink: {
    color: '#9ca3af',
    fontSize: '0.88rem',
    textDecoration: 'none',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 540,
    marginBottom: 14,
    color: '#fff',
  },
  scoreBadge: {
    fontSize: '0.92rem',
    fontWeight: 700,
    flexShrink: 0,
    background: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    padding: '4px 14px',
  },
  bar: {
    flex: 1,
    height: 8,
    background: 'rgba(255,255,255,0.22)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    background: '#F5A623',
    borderRadius: 4,
    transition: 'width 0.4s',
  },
  barLabel: {
    fontSize: '0.88rem',
    flexShrink: 0,
    opacity: 0.82,
  },
  card: {
    background: '#fff',
    borderRadius: 24,
    padding: '32px 28px',
    width: '100%',
    maxWidth: 540,
    boxShadow: '0 20px 60px rgba(0,0,0,0.28)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
  },
  emojiBox: {
    width: 110,
    height: 110,
    background: '#f4f7fc',
    borderRadius: 18,
    fontSize: '3.8rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  wordImg: {
    width: 110,
    height: 110,
    objectFit: 'contain',
    borderRadius: 14,
  },
  wordRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
    direction: 'rtl',
  },
  wordText: {
    fontSize: '2.4rem',
    fontWeight: 700,
    color: '#1a1a2e',
  },
  blank: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
    height: 66,
    border: '3px dashed',
    borderRadius: 12,
    fontSize: '2.4rem',
    fontWeight: 700,
    transition: 'all 0.3s',
    padding: '0 8px',
  },
  feedback: {
    padding: '10px 22px',
    borderRadius: 10,
    fontSize: '1rem',
    fontWeight: 600,
    textAlign: 'center',
    width: '100%',
  },
  optRow: {
    display: 'flex',
    gap: 16,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  optBtn: {
    width: 84,
    height: 84,
    borderRadius: 18,
    border: '2px solid #d1d5db',
    background: '#f4f7fc',
    fontSize: '2.1rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: "'Tajawal', sans-serif",
    color: '#1a1a2e',
  },
  optCorrect: {
    background: '#d4edda',
    borderColor: '#27ae60',
    color: '#27ae60',
  },
  optWrong: {
    background: '#f8d7da',
    borderColor: '#e74c3c',
    color: '#e74c3c',
  },
  btnBlue: {
    background: '#185FA5',
    color: '#fff',
    border: 'none',
    borderRadius: 14,
    padding: '13px 0',
    fontSize: '1.05rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Tajawal', sans-serif",
    width: '100%',
    maxWidth: 280,
  },
};
