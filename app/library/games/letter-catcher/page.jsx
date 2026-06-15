'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

/* ────────────────────────── helpers ────────────────────────── */
const DIACRITICS = /[ً-ْٰ]/g;

function stripDia(s) { return (s || '').replace(DIACRITICS, ''); }

function splitWord(word, missingLetter) {
  const base = stripDia(missingLetter);
  const re   = new RegExp(base + '[\\u064B-\\u0652\\u0670]?');
  const m    = word.match(re);
  if (!m) return [word, ''];
  const i = word.indexOf(m[0]);
  return [word.slice(0, i), word.slice(i + m[0].length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ────────────────────── fallback word bank ──────────────────── */
const FALLBACK_WORDS = [
  { id:  1, word:"قَلَم",      missing_letter:"ق", options:["ق","ف","ك","ح","ع"], emoji:"✏️" },
  { id:  2, word:"كِتَاب",     missing_letter:"ا", options:["ا","و","ي","ه","ء"], emoji:"📚" },
  { id:  3, word:"تُفَّاحَة",  missing_letter:"ت", options:["ت","ب","ث","ن","ي"], emoji:"🍎" },
  { id:  4, word:"بَيت",       missing_letter:"ب", options:["ب","ت","ن","م","ه"], emoji:"🏠" },
  { id:  5, word:"شَجَرَة",    missing_letter:"ش", options:["ش","س","ص","ض","ز"], emoji:"🌳" },
  { id:  6, word:"نَجمَة",     missing_letter:"ن", options:["ن","م","ل","ب","ر"], emoji:"⭐" },
  { id:  7, word:"سَيَّارَة",  missing_letter:"س", options:["س","ش","ص","ز","ط"], emoji:"🚗" },
  { id:  8, word:"طَيَّارَة",  missing_letter:"ط", options:["ط","ض","ظ","ت","ذ"], emoji:"✈️" },
  { id:  9, word:"مَدرَسَة",   missing_letter:"م", options:["م","ن","ب","ه","و"], emoji:"🏫" },
  { id: 10, word:"بَحر",       missing_letter:"ب", options:["ب","ت","ن","ف","ه"], emoji:"🌊" },
  { id: 11, word:"سَمَكَة",    missing_letter:"س", options:["س","ص","ش","ز","ث"], emoji:"🐟" },
  { id: 12, word:"دَجَاجَة",   missing_letter:"د", options:["د","ذ","ر","ز","و"], emoji:"🐔" },
];

/* ────────────────────── sub-components ─────────────────────── */
function WordImage({ imageUrl, emoji }) {
  const [err, setErr] = useState(false);
  if (!imageUrl || err) {
    return <div style={S.emojiBox}>{emoji || '❓'}</div>;
  }
  return <img src={imageUrl} alt="" style={S.wordImg} onError={() => setErr(true)} />;
}

function SettingsPanel({ cfg, onChange, onClose, totalWords }) {
  return (
    <div style={S.settingsOverlay} onClick={onClose}>
      <div style={S.settingsCard} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 20px', color: '#185FA5', fontSize: '1.2rem' }}>⚙️ إعدادات اللعبة</h3>
        <label style={S.settingsLabel}>
          عدد الأسئلة في الجولة
          <select
            value={cfg.questionsPerRound}
            onChange={e => onChange({ ...cfg, questionsPerRound: Number(e.target.value) })}
            style={S.settingsSelect}
          >
            {[10, 20, 30, 50, totalWords].filter((v, i, a) => a.indexOf(v) === i).sort((a,b)=>a-b).map(v =>
              <option key={v} value={v}>{v} سؤال</option>
            )}
          </select>
        </label>
        <label style={S.settingsLabel}>
          عدد الخيارات لكل سؤال
          <select
            value={cfg.optionsCount}
            onChange={e => onChange({ ...cfg, optionsCount: Number(e.target.value) })}
            style={S.settingsSelect}
          >
            {[3, 4, 5].map(v => <option key={v} value={v}>{v} خيارات</option>)}
          </select>
        </label>
        <button style={S.btnGold} onClick={onClose}>حفظ الإعدادات ✓</button>
      </div>
    </div>
  );
}

/* ═══════════════════════ MAIN COMPONENT ════════════════════════ */
export default function LetterCatcherGame() {
  const [phase,    setPhase]    = useState('start');
  const [allWords, setAllWords] = useState([]);
  const [queue,    setQueue]    = useState([]);
  const [cur,      setCur]      = useState(0);
  const [score,    setScore]    = useState(0);
  const [chosen,   setChosen]   = useState(null);
  const [correct,  setCorrect]  = useState(null);
  const [showCfg,  setShowCfg]  = useState(false);
  const [cfg,      setCfg]      = useState({ questionsPerRound: 50, optionsCount: 5 });

  const ensureWords = useCallback(async () => {
    if (allWords.length > 0) return allWords;
    try {
      const res = await fetch('/api/games/letter-catcher');
      if (!res.ok) throw new Error();
      const json = await res.json();
      const loaded = (json.words || []).filter(
        w => w.word && w.missing_letter && Array.isArray(w.options) && w.options.filter(Boolean).length >= 2
      );
      const result = loaded.length ? loaded : FALLBACK_WORDS;
      setAllWords(result);
      return result;
    } catch {
      setAllWords(FALLBACK_WORDS);
      return FALLBACK_WORDS;
    }
  }, [allWords]);

  const buildQueue = useCallback((words, count, optCount) => {
    const shuffled = shuffle(words).slice(0, count);
    return shuffled.map(w => {
      const correct   = stripDia(w.missing_letter);
      const pool      = (w.options || []).filter(Boolean).filter(o => stripDia(o) !== correct);
      const distractors = shuffle(pool).slice(0, optCount - 1);
      const opts      = shuffle([w.missing_letter, ...distractors]);
      return { ...w, _opts: opts };
    });
  }, []);

  const startGame = useCallback(async () => {
    setPhase('loading');
    const words = await ensureWords();
    const count = Math.min(cfg.questionsPerRound, words.length);
    setQueue(buildQueue(words, count, cfg.optionsCount));
    setCur(0);
    setScore(0);
    setChosen(null);
    setCorrect(null);
    setPhase('playing');
  }, [ensureWords, buildQueue, cfg]);

  const pick = useCallback((opt) => {
    if (chosen !== null) return;
    const w       = queue[cur];
    const isRight = stripDia(opt) === stripDia(w.missing_letter);
    setChosen(opt);
    setCorrect(isRight);
    if (isRight) setScore(s => s + 1);
  }, [chosen, cur, queue]);

  const next = useCallback(() => {
    const n = cur + 1;
    if (n >= queue.length) { setPhase('finished'); }
    else { setCur(n); setChosen(null); setCorrect(null); }
  }, [cur, queue.length]);

  const restart = useCallback(() => {
    setPhase('start'); setQueue([]); setCur(0); setScore(0); setChosen(null); setCorrect(null);
  }, []);

  const totalWords = allWords.length || FALLBACK_WORDS.length;

  if (phase === 'start' || phase === 'loading') {
    return (
      <div style={S.page}>
        {showCfg && <SettingsPanel cfg={cfg} onChange={setCfg} onClose={() => setShowCfg(false)} totalWords={totalWords} />}
        <div style={S.centerCard}>
          <button style={S.cfgBtn} onClick={() => setShowCfg(true)}>⚙️ الإعدادات</button>
          <div style={{ fontSize: '4.5rem', lineHeight: 1 }}>🦉</div>
          <h1 style={S.mainTitle}>صيّاد الحروف!</h1>
          <p style={S.sub}>سأريك صورة وكلمة فيها حرف ناقص.<br />استمع للكلمة، انظر للصورة، ثم اختر الحرف الصحيح!</p>
          <div style={S.statsRow}>
            <div style={S.statBox}><span style={S.statNum}>{totalWords}</span><span style={S.statLbl}>كلمة متاحة</span></div>
            <div style={S.statDiv} />
            <div style={S.statBox}><span style={S.statNum}>{Math.min(cfg.questionsPerRound, totalWords)}</span><span style={S.statLbl}>سؤال</span></div>
            <div style={S.statDiv} />
            <div style={S.statBox}><span style={S.statNum}>{cfg.optionsCount}</span><span style={S.statLbl}>خيارات</span></div>
          </div>
          <div style={S.bullets}>
            <div style={S.bullet}><span>📚</span><span>بنك الكلمات</span></div>
            <div style={S.bullet}><span>🎯</span><span>كل جولة</span></div>
            <div style={S.bullet}><span>🖥️</span><span>لكل سؤال</span></div>
          </div>
          <button style={{ ...S.btnGold, opacity: phase === 'loading' ? 0.7 : 1 }} disabled={phase === 'loading'} onClick={startGame}>
            {phase === 'loading' ? '⏳ جارٍ التحميل…' : '🚀 ابدأ اللعبة'}
          </button>
          <Link href="/library" style={S.backLink}>← العودة للمكتبة</Link>
        </div>
      </div>
    );
  }

  if (phase === 'finished') {
    const pct   = Math.round((score / queue.length) * 100);
    const stars = pct >= 80 ? 3 : pct >= 50 ? 2 : 1;
    return (
      <div style={S.page}>
        <div style={S.centerCard}>
          <div style={{ fontSize: '3rem' }}>{'⭐'.repeat(stars)}</div>
          <h2 style={S.mainTitle}>أحسنت!</h2>
          <div style={{ fontSize: '3.5rem', fontWeight: 800, color: '#F5A623' }}>{score} / {queue.length}</div>
          <p style={S.sub}>{pct >= 80 ? 'ممتاز! أنت صياد حروف بارع 🏆' : pct >= 50 ? 'جيد! تستطيع أن تتحسن أكثر 💪' : 'لا تيأس! المحاولة مفتاح النجاح 🌟'}</p>
          <button style={S.btnGold} onClick={restart}>🔄 العب مرة أخرى</button>
          <Link href="/library" style={S.backLink}>← العودة للمكتبة</Link>
        </div>
      </div>
    );
  }

  const w             = queue[cur];
  const [before, after] = splitWord(w.word, w.missing_letter);
  const opts          = w._opts || [];
  const isLast        = cur + 1 >= queue.length;

  return (
    <div style={S.page}>
      <div style={S.headerRow}>
        <span style={S.scoreBadge}>✨ {score}</span>
        <div style={S.bar}><div style={{ ...S.barFill, width: `${((cur + 1) / queue.length) * 100}%` }} /></div>
        <span style={S.barLabel}>{cur + 1} / {queue.length}</span>
      </div>
      <div style={S.card}>
        <WordImage imageUrl={w.image_url} emoji={w.emoji} />
        <div style={S.wordRow}>
          {before && <span style={S.wordTxt}>{before}</span>}
          <span style={{ ...S.blank, background: correct === null ? '#eef3fc' : correct ? '#d4edda' : '#f8d7da', borderColor: correct === null ? '#185FA5' : correct ? '#27ae60' : '#e74c3c', color: correct === null ? '#185FA5' : correct ? '#27ae60' : '#e74c3c' }}>
            {correct !== null ? w.missing_letter : '؟'}
          </span>
          {after && <span style={S.wordTxt}>{after}</span>}
        </div>
        {correct !== null && (
          <div style={{ ...S.feedback, color: correct ? '#1a6b38' : '#9b1c1c', background: correct ? '#d4edda' : '#f8d7da' }}>
            {correct ? '✅ أحسنت! إجابة صحيحة' : `❌ الصحيح: ${w.missing_letter}`}
          </div>
        )}
        <div style={{ ...S.optRow, gridTemplateColumns: `repeat(${Math.min(opts.length, 5)}, 1fr)` }}>
          {opts.filter(Boolean).map((opt, idx) => {
            const isRight  = stripDia(opt) === stripDia(w.missing_letter);
            const picked   = chosen === opt;
            const revealed = chosen !== null;
            let btn = { ...S.optBtn };
            if (revealed) {
              if (isRight)     btn = { ...btn, ...S.optCorrect };
              else if (picked) btn = { ...btn, ...S.optWrong };
              else             btn = { ...btn, opacity: 0.32 };
            }
            return <button key={`${opt}-${idx}`} style={btn} onClick={() => pick(opt)} disabled={revealed}>{opt}</button>;
          })}
        </div>
        {chosen !== null && (
          <button style={S.btnBlue} onClick={next}>{isLast ? '🏁 النتيجة النهائية' : 'التالي ←'}</button>
        )}
      </div>
    </div>
  );
}

const S = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg, #5b4fc4 0%, #7c3aed 50%, #9c3ec4 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: "'Tajawal', sans-serif", direction: 'rtl' },
  centerCard: { position: 'relative', background: '#fff', borderRadius: 24, padding: '44px 36px', textAlign: 'center', maxWidth: 440, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.32)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 },
  cfgBtn: { position: 'absolute', top: 16, left: 16, background: '#f3f4f6', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', color: '#374151', fontFamily: "'Tajawal', sans-serif" },
  mainTitle: { fontSize: '2rem', fontWeight: 800, color: '#1a1a2e', margin: 0 },
  sub: { fontSize: '0.97rem', color: '#6b7280', lineHeight: 1.8, margin: 0 },
  statsRow: { display: 'flex', alignItems: 'center', background: '#f9fafb', borderRadius: 14, padding: '14px 20px', width: '100%', justifyContent: 'space-around' },
  statBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  statNum: { fontSize: '1.6rem', fontWeight: 800, color: '#7c3aed' },
  statLbl: { fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 },
  statDiv: { width: 1, height: 36, background: '#e5e7eb' },
  bullets: { display: 'flex', flexDirection: 'column', gap: 8, width: '100%', textAlign: 'right' },
  bullet: { display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.92rem', color: '#4b5563', background: '#f9fafb', borderRadius: 10, padding: '8px 14px' },
  btnGold: { background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff', border: 'none', borderRadius: 14, padding: '14px 0', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", width: '100%', boxShadow: '0 4px 16px rgba(245,158,11,0.4)' },
  backLink: { color: '#9ca3af', fontSize: '0.87rem', textDecoration: 'none' },
  settingsOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20 },
  settingsCard: { background: '#fff', borderRadius: 20, padding: '32px 28px', width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 18, boxShadow: '0 16px 48px rgba(0,0,0,0.3)' },
  settingsLabel: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.95rem', fontWeight: 600, color: '#374151', textAlign: 'right' },
  settingsSelect: { padding: '10px 14px', borderRadius: 10, border: '2px solid #e5e7eb', fontSize: '1rem', fontFamily: "'Tajawal', sans-serif", direction: 'rtl', color: '#1a1a2e', cursor: 'pointer' },
  headerRow: { display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 540, marginBottom: 14, color: '#fff' },
  scoreBadge: { fontSize: '1rem', fontWeight: 700, flexShrink: 0, background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 14px' },
  bar: { flex: 1, height: 8, background: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', background: '#fbbf24', borderRadius: 4, transition: 'width 0.4s' },
  barLabel: { fontSize: '0.88rem', flexShrink: 0, opacity: 0.82 },
  card: { background: '#fff', borderRadius: 24, padding: '32px 28px', width: '100%', maxWidth: 540, boxShadow: '0 24px 64px rgba(0,0,0,0.32)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 },
  emojiBox: { width: 110, height: 110, background: '#f5f3ff', borderRadius: 18, fontSize: '3.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  wordImg: { width: 110, height: 110, objectFit: 'contain', borderRadius: 14 },
  wordRow: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center', direction: 'rtl' },
  wordTxt: { fontSize: '2.4rem', fontWeight: 700, color: '#1a1a2e' },
  blank: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 58, height: 66, border: '3px dashed', borderRadius: 12, fontSize: '2.4rem', fontWeight: 700, transition: 'all 0.3s', padding: '0 8px' },
  feedback: { padding: '10px 22px', borderRadius: 10, fontSize: '1rem', fontWeight: 600, textAlign: 'center', width: '100%' },
  optRow: { display: 'grid', gap: 12, width: '100%', justifyItems: 'center' },
  optBtn: { width: 76, height: 76, borderRadius: 16, border: '2px solid #e5e7eb', background: '#f9fafb', fontSize: '1.9rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.18s', fontFamily: "'Tajawal', sans-serif", color: '#1a1a2e' },
  optCorrect: { background: '#d4edda', borderColor: '#27ae60', color: '#1a6b38' },
  optWrong:   { background: '#f8d7da', borderColor: '#e74c3c', color: '#9b1c1c' },
  btnBlue: { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 14, padding: '13px 0', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", width: '100%', maxWidth: 280 },
};