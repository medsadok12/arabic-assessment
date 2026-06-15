'use client';

import { useState, useEffect, useCallback } from 'react';
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

/* ── contextual Arabic letter forms ─────────────────────────── */
// Letters that do NOT connect to the letter that follows them (non-left-joiners)
const NON_CONNECTORS = new Set('اأإآءوردذزىة');

function getLetterForm(stripped, idx) {
  const letter   = stripped[idx];
  const prev     = idx > 0                    ? stripped[idx - 1] : null;
  const next     = idx < stripped.length - 1  ? stripped[idx + 1] : null;
  const joinsPrev = prev !== null && !NON_CONNECTORS.has(prev);
  const joinsNext = next !== null && !NON_CONNECTORS.has(letter);
  if (joinsPrev && joinsNext) return 'medial';
  if (joinsPrev)              return 'final';
  if (joinsNext)              return 'initial';
  return 'isolated';
}

const ZWJ = '‍';

function toContextual(letter, form) {
  const base = (letter || '').replace(DIACRITICS, '');
  switch (form) {
    case 'initial': return base + ZWJ;
    case 'medial':  return ZWJ + base + ZWJ;
    case 'final':   return ZWJ + base;
    default:        return base;
  }
}


/* ────────────────── word manager in settings ────────────────── */
function WordManager({ dbWords, onRefresh }) {
  const [word,    setWord]    = useState('');
  const [missing, setMissing] = useState('');
  const [emoji,   setEmoji]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [msg,     setMsg]     = useState(null);

  const handleAdd = async () => {
    if (!word.trim() || !missing.trim()) {
      setMsg({ ok: false, text: 'اكتب الكلمة والحرف الناقص أولاً' });
      return;
    }
    setSaving(true); setMsg(null);
    try {
      const res = await fetch('/api/games/letter-catcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: word.trim(), missing_letter: missing.trim(), emoji: emoji.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'فشل الحفظ');
      setMsg({ ok: true, text: `✅ أُضيفت "${word.trim()}" بنجاح` });
      setWord(''); setMissing(''); setEmoji('');
      onRefresh();
    } catch (e) {
      setMsg({ ok: false, text: `❌ ${e.message}` });
    }
    setSaving(false);
  };

  const handleDelete = async (id, w) => {
    if (!confirm(`حذف كلمة "${w}"؟`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/games/letter-catcher?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onRefresh();
    } catch {
      alert('فشل الحذف');
    }
    setDeleting(null);
  };

  return (
    <div>
      {/* Add form */}
      <div style={{ background: '#f5f3ff', borderRadius: 14, padding: 16, marginBottom: 18, border: '1.5px dashed #7c3aed' }}>
        <div style={{ fontWeight: 800, color: '#7c3aed', marginBottom: 12, fontSize: '.92rem' }}>➕ إضافة كلمة جديدة</div>

        <input
          value={word}
          onChange={e => setWord(e.target.value)}
          placeholder="الكلمة (مثال: قَلَم)"
          style={S.input}
          dir="rtl"
        />

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            value={missing}
            onChange={e => setMissing(e.target.value)}
            placeholder="الحرف الناقص (مثال: ق)"
            style={{ ...S.input, flex: 2, margin: 0 }}
            dir="rtl"
            maxLength={2}
          />
          <input
            value={emoji}
            onChange={e => setEmoji(e.target.value)}
            placeholder="إيموجي 🎯"
            style={{ ...S.input, flex: 1, margin: 0, textAlign: 'center' }}
            maxLength={4}
          />
        </div>

        {msg && (
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 8, fontSize: '.85rem', fontWeight: 700,
            background: msg.ok ? '#d4edda' : '#f8d7da',
            color: msg.ok ? '#155724' : '#721c24',
          }}>
            {msg.text}
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={saving || !word.trim() || !missing.trim()}
          style={{
            ...S.addBtn,
            opacity: (saving || !word.trim() || !missing.trim()) ? 0.6 : 1,
            cursor: (saving || !word.trim() || !missing.trim()) ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'جارٍ الحفظ…' : '💾 حفظ في قاعدة البيانات'}
        </button>
      </div>

      {/* Word list */}
      <div style={{ fontWeight: 700, color: '#374151', marginBottom: 8, fontSize: '.88rem' }}>
        📚 الكلمات في قاعدة البيانات ({dbWords.length})
      </div>
      {dbWords.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '16px 0', fontSize: '.88rem' }}>
          لا توجد كلمات بعد — أضف أولى كلماتك أعلاه
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
          {dbWords.map(w => (
            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', borderRadius: 10, padding: '8px 12px', border: '1px solid #e5e7eb' }}>
              {w.emoji && <span style={{ fontSize: '1.2rem' }}>{w.emoji}</span>}
              <span style={{ flex: 1, fontWeight: 700, color: '#1f2937', fontSize: '.9rem' }}>{w.word}</span>
              <span style={{ background: '#ede9fe', color: '#7c3aed', borderRadius: 20, padding: '2px 8px', fontSize: '.75rem', fontWeight: 700 }}>{w.missing_letter}</span>
              <button
                onClick={() => handleDelete(w.id, w.word)}
                disabled={deleting === w.id}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1.05rem', padding: '2px 4px', lineHeight: 1 }}
                title="حذف"
              >
                {deleting === w.id ? '…' : '🗑️'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────── settings panel (modal) ─────────────────── */
function SettingsPanel({ cfg, onChange, onClose, dbWords, onRefresh }) {
  const [tab, setTab] = useState('settings');
  const tabStyle = (id) => ({
    flex: 1, padding: '9px 0', border: 'none', borderRadius: 10, fontFamily: "'Tajawal', sans-serif",
    fontWeight: 700, fontSize: '.88rem', cursor: 'pointer', transition: 'all .15s',
    background: tab === id ? 'linear-gradient(135deg,#5b4fc4,#7c3aed)' : '#f3f4f6',
    color: tab === id ? '#fff' : '#6b7280',
  });

  return (
    <div style={S.settingsOverlay} onClick={onClose}>
      <div style={S.settingsCard} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: '#1f2937', fontSize: '1.1rem' }}>⚙️ إعدادات اللعبة</h3>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          <button style={tabStyle('settings')} onClick={() => setTab('settings')}>⚙️ الإعدادات</button>
          <button style={tabStyle('words')} onClick={() => setTab('words')}>📖 الكلمات ({dbWords.length})</button>
        </div>

        {tab === 'settings' && (
          <>
            <label style={S.settingsLabel}>
              عدد الأسئلة في الجولة
              <select
                value={cfg.questionsPerRound}
                onChange={e => onChange({ ...cfg, questionsPerRound: Number(e.target.value) })}
                style={S.settingsSelect}
              >
                {[10, 20, 30, 50].map(v => <option key={v} value={v}>{v} سؤال</option>)}
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
          </>
        )}

        {tab === 'words' && (
          <WordManager dbWords={dbWords} onRefresh={onRefresh} />
        )}
      </div>
    </div>
  );
}

/* ────────────────────── image with fallback ─────────────────── */
function WordImage({ imageUrl, emoji }) {
  const [err, setErr] = useState(false);
  if (!imageUrl || err) {
    return <div style={S.emojiBox}>{emoji || '❓'}</div>;
  }
  return <img src={imageUrl} alt="" style={S.wordImg} onError={() => setErr(true)} />;
}

/* ═══════════════════════ MAIN COMPONENT ════════════════════════ */
export default function LetterCatcherGame() {
  const [phase,   setPhase]   = useState('start');
  const [dbWords, setDbWords] = useState([]);        // words from DB (empty = none saved yet)
  const [gameWords, setGameWords] = useState([]);
  const [queue,   setQueue]   = useState([]);
  const [cur,     setCur]     = useState(0);
  const [score,   setScore]   = useState(0);
  const [chosen,  setChosen]  = useState(null);
  const [correct, setCorrect] = useState(null);
  const [showCfg, setShowCfg] = useState(false);
  const [cfg, setCfg] = useState({ questionsPerRound: 50, optionsCount: 5 });

  /* ── fetch words from DB on mount and after mutations ── */
  const loadWords = useCallback(async () => {
    try {
      const res  = await fetch('/api/games/letter-catcher');
      const json = await res.json();
      const valid = (json.words || []).filter(
        w => w.word && w.missing_letter && Array.isArray(w.options) && w.options.filter(Boolean).length >= 2
      );
      setDbWords(valid);
      setGameWords(valid);
    } catch {
      setDbWords([]);
      setGameWords([]);
    }
  }, []);

  useEffect(() => { loadWords(); }, [loadWords]);

  /* ── build round queue ── */
  const buildQueue = useCallback((words, count, optCount) => {
    const shuffled = shuffle(words).slice(0, count);
    return shuffled.map(w => {
      const correct    = stripDia(w.missing_letter);
      const strippedW  = stripDia(w.word);
      const missingIdx = strippedW.indexOf(correct);
      const form       = missingIdx >= 0 ? getLetterForm(strippedW, missingIdx) : 'isolated';

      const pool        = (w.options || []).filter(Boolean).filter(o => stripDia(o) !== correct);
      const distractors = shuffle(pool).slice(0, optCount - 1);
      const opts        = shuffle([w.missing_letter, ...distractors]);
      return { ...w, _opts: opts, _form: form };
    });
  }, []);

  /* ── start game ── */
  const startGame = useCallback(() => {
    const words = gameWords;
    const count = Math.min(cfg.questionsPerRound, words.length);
    setQueue(buildQueue(words, count, cfg.optionsCount));
    setCur(0); setScore(0); setChosen(null); setCorrect(null);
    setPhase('playing');
  }, [gameWords, buildQueue, cfg]);

  /* ── pick option ── */
  const pick = useCallback((opt) => {
    if (chosen !== null) return;
    const w       = queue[cur];
    const isRight = stripDia(opt) === stripDia(w.missing_letter);
    setChosen(opt); setCorrect(isRight);
    if (isRight) setScore(s => s + 1);
  }, [chosen, cur, queue]);

  /* ── next word ── */
  const next = useCallback(() => {
    const n = cur + 1;
    if (n >= queue.length) setPhase('finished');
    else { setCur(n); setChosen(null); setCorrect(null); }
  }, [cur, queue.length]);

  /* ── restart ── */
  const restart = useCallback(() => {
    setPhase('start'); setQueue([]); setCur(0);
    setScore(0); setChosen(null); setCorrect(null);
  }, []);

  const totalForRound = Math.min(cfg.questionsPerRound, gameWords.length);

  /* ══════════════════════ RENDER: START ══════════════════════ */
  if (phase === 'start') {
    return (
      <div style={S.page}>
        {showCfg && (
          <SettingsPanel
            cfg={cfg}
            onChange={setCfg}
            onClose={() => setShowCfg(false)}
            dbWords={dbWords}
            onRefresh={loadWords}
          />
        )}

        <div style={S.centerCard}>
          <button style={S.cfgBtn} onClick={() => setShowCfg(true)}>⚙️ الإعدادات</button>

          <div style={{ fontSize: '4.5rem', lineHeight: 1 }}>🦉</div>
          <h1 style={S.mainTitle}>صيّاد الحروف!</h1>
          <p style={S.sub}>
            سأريك صورة وكلمة فيها حرف ناقص.<br />
            استمع للكلمة، انظر للصورة، ثم اختر الحرف الصحيح!
          </p>

          {gameWords.length > 0 ? (
            <>
              {/* stats row */}
              <div style={S.statsRow}>
                <div style={S.statBox}>
                  <span style={S.statNum}>{gameWords.length}</span>
                  <span style={S.statLbl}>كلمة في البنك</span>
                </div>
                <div style={S.statDiv} />
                <div style={S.statBox}>
                  <span style={S.statNum}>{totalForRound}</span>
                  <span style={S.statLbl}>سؤال</span>
                </div>
                <div style={S.statDiv} />
                <div style={S.statBox}>
                  <span style={S.statNum}>{cfg.optionsCount}</span>
                  <span style={S.statLbl}>خيارات</span>
                </div>
              </div>

              <button style={S.btnGold} onClick={startGame}>
                🚀 ابدأ اللعبة
              </button>
            </>
          ) : (
            /* ── Empty state ── */
            <div style={S.emptyState}>
              <div style={{ fontSize: '3rem' }}>📭</div>
              <div style={{ fontWeight: 800, color: '#374151', fontSize: '1.05rem' }}>
                بنك الكلمات فارغ
              </div>
              <p style={{ color: '#6b7280', fontSize: '.9rem', lineHeight: 1.8, margin: 0, textAlign: 'center' }}>
                لم يتم إضافة أي كلمات بعد.<br />
                يرجى التواصل مع المعلم لإضافة كلمات اللعبة.
              </p>
              <button style={S.btnOutline} onClick={() => setShowCfg(true)}>
                ⚙️ إضافة كلمات (للمعلم)
              </button>
            </div>
          )}

          <Link href="/library" style={S.backLink}>← العودة للمكتبة</Link>
        </div>
      </div>
    );
  }

  /* ══════════════════════ RENDER: FINISHED ══════════════════════ */
  if (phase === 'finished') {
    const pct   = Math.round((score / queue.length) * 100);
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
            {score} / {queue.length}
          </div>
          <p style={S.sub}>{msg}</p>
          <button style={S.btnGold} onClick={restart}>🔄 العب مرة أخرى</button>
          <Link href="/library" style={S.backLink}>← العودة للمكتبة</Link>
        </div>
      </div>
    );
  }

  /* ══════════════════════ RENDER: PLAYING ══════════════════════ */
  const w             = queue[cur];
  const [before, after] = splitWord(w.word, w.missing_letter);
  const opts          = w._opts || [];
  const isLast        = cur + 1 >= queue.length;

  return (
    <div style={S.page}>
      {/* progress */}
      <div style={S.headerRow}>
        <span style={S.scoreBadge}>✨ {score}</span>
        <div style={S.bar}>
          <div style={{ ...S.barFill, width: `${((cur + 1) / queue.length) * 100}%` }} />
        </div>
        <span style={S.barLabel}>{cur + 1} / {queue.length}</span>
      </div>

      <div style={S.card}>
        {/* image */}
        <WordImage imageUrl={w.image_url} emoji={w.emoji} />

        {/* word with blank */}
        <div style={S.wordRow}>
          {before && <span style={S.wordTxt}>{before}</span>}
          <span style={{
            ...S.blank,
            background:  correct === null ? '#eef3fc' : correct ? '#d4edda' : '#f8d7da',
            borderColor: correct === null ? '#7c3aed'  : correct ? '#27ae60' : '#e74c3c',
            color:       correct === null ? '#7c3aed'  : correct ? '#27ae60' : '#e74c3c',
          }}>
            {correct !== null ? toContextual(w.missing_letter, w._form || 'isolated') : '؟'}
          </span>
          {after && <span style={S.wordTxt}>{after}</span>}
        </div>

        {/* feedback */}
        {correct !== null && (
          <div style={{
            ...S.feedback,
            color:      correct ? '#1a6b38' : '#9b1c1c',
            background: correct ? '#d4edda'  : '#f8d7da',
          }}>
            {correct ? '✅ أحسنت! إجابة صحيحة' : `❌ الصحيح: ${w.missing_letter}`}
          </div>
        )}

        {/* options */}
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
            return (
              <button key={`${opt}-${idx}`} style={btn} onClick={() => pick(opt)} disabled={revealed}>
                {toContextual(opt, w._form || 'isolated')}
              </button>
            );
          })}
        </div>

        {/* next */}
        {chosen !== null && (
          <button style={S.btnBlue} onClick={next}>
            {isLast ? '🏁 النتيجة النهائية' : 'التالي ←'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════ STYLES ════════════════════════════ */
const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #5b4fc4 0%, #7c3aed 50%, #9c3ec4 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    fontFamily: "'Tajawal', sans-serif",
    direction: 'rtl',
  },
  centerCard: {
    position: 'relative',
    background: '#fff',
    borderRadius: 24,
    padding: '44px 36px',
    textAlign: 'center',
    maxWidth: 440,
    width: '100%',
    boxShadow: '0 24px 64px rgba(0,0,0,0.32)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
  },
  cfgBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    background: '#f3f4f6',
    border: 'none',
    borderRadius: 10,
    padding: '7px 14px',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    color: '#374151',
    fontFamily: "'Tajawal', sans-serif",
  },
  mainTitle: {
    fontSize: '2rem',
    fontWeight: 800,
    color: '#1a1a2e',
    margin: 0,
  },
  sub: {
    fontSize: '0.97rem',
    color: '#6b7280',
    lineHeight: 1.8,
    margin: 0,
  },
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    background: '#f9fafb',
    borderRadius: 14,
    padding: '14px 20px',
    width: '100%',
    justifyContent: 'space-around',
    boxSizing: 'border-box',
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  statNum: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: '#7c3aed',
  },
  statLbl: {
    fontSize: '0.8rem',
    color: '#9ca3af',
    fontWeight: 500,
  },
  statDiv: {
    width: 1,
    height: 36,
    background: '#e5e7eb',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    background: '#f9fafb',
    border: '2px dashed #d1d5db',
    borderRadius: 16,
    padding: '28px 20px',
    width: '100%',
    boxSizing: 'border-box',
  },
  btnOutline: {
    background: 'transparent',
    color: '#7c3aed',
    border: '2px solid #7c3aed',
    borderRadius: 12,
    padding: '10px 24px',
    fontSize: '.92rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Tajawal', sans-serif",
    marginTop: 4,
  },
  btnGold: {
    background: 'linear-gradient(135deg, #f59e0b, #f97316)',
    color: '#fff',
    border: 'none',
    borderRadius: 14,
    padding: '14px 0',
    fontSize: '1.1rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Tajawal', sans-serif",
    width: '100%',
    boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
  },
  addBtn: {
    marginTop: 12,
    width: '100%',
    background: 'linear-gradient(135deg,#5b4fc4,#7c3aed)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '11px 0',
    fontSize: '.9rem',
    fontWeight: 700,
    fontFamily: "'Tajawal', sans-serif",
  },
  input: {
    width: '100%',
    border: '1.5px solid #e5e7eb',
    borderRadius: 10,
    padding: '9px 12px',
    fontSize: '1rem',
    fontFamily: "'Tajawal', sans-serif",
    boxSizing: 'border-box',
    outline: 'none',
  },
  backLink: {
    color: '#9ca3af',
    fontSize: '0.87rem',
    textDecoration: 'none',
  },
  settingsOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    padding: 20,
  },
  settingsCard: {
    background: '#fff',
    borderRadius: 20,
    padding: '24px 20px',
    width: '100%',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
    maxHeight: '90vh',
    overflowY: 'auto',
    fontFamily: "'Tajawal', sans-serif",
  },
  settingsLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#374151',
    textAlign: 'right',
    marginBottom: 16,
  },
  settingsSelect: {
    padding: '10px 14px',
    borderRadius: 10,
    border: '2px solid #e5e7eb',
    fontSize: '1rem',
    fontFamily: "'Tajawal', sans-serif",
    direction: 'rtl',
    color: '#1a1a2e',
    cursor: 'pointer',
  },
  /* playing */
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
    fontSize: '1rem',
    fontWeight: 700,
    flexShrink: 0,
    background: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: '4px 14px',
  },
  bar: {
    flex: 1,
    height: 8,
    background: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    background: '#fbbf24',
    borderRadius: 4,
    transition: 'width 0.4s',
  },
  barLabel: { fontSize: '0.88rem', flexShrink: 0, opacity: 0.82 },
  card: {
    background: '#fff',
    borderRadius: 24,
    padding: '32px 28px',
    width: '100%',
    maxWidth: 540,
    boxShadow: '0 24px 64px rgba(0,0,0,0.32)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 22,
  },
  emojiBox: {
    width: 110,
    height: 110,
    background: '#f5f3ff',
    borderRadius: 18,
    fontSize: '3.8rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
  wordTxt: {
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
    display: 'grid',
    gap: 12,
    width: '100%',
    justifyItems: 'center',
  },
  optBtn: {
    width: 76,
    height: 76,
    borderRadius: 16,
    border: '2px solid #e5e7eb',
    background: '#f9fafb',
    fontSize: '1.9rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.18s',
    fontFamily: "'Tajawal', sans-serif",
    color: '#1a1a2e',
  },
  optCorrect: { background: '#d4edda', borderColor: '#27ae60', color: '#1a6b38' },
  optWrong:   { background: '#f8d7da', borderColor: '#e74c3c', color: '#9b1c1c' },
  btnBlue: {
    background: '#7c3aed',
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
