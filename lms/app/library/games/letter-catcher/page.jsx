'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

/* teacher-only panel loads only when the teacher opens it — not in students' bundle */
const SettingsPanel = dynamic(() => import('./_teacher-panel'), { ssr: false, loading: () => null });

/* ────────────────────────── fallback words (instant start) ─── */
const LC_FALLBACK = [
  { id:'f1',  word:'قِطَّة',   missing_letter:'ق', options:['ق','ك','ع','ج','ح'], emoji:'🐱', topic:'الحيوانات', grade_level:1, category:'الحيوانات' },
  { id:'f2',  word:'كَلْب',   missing_letter:'ك', options:['ك','ق','ع','غ','ج'], emoji:'🐶', topic:'الحيوانات', grade_level:1, category:'الحيوانات' },
  { id:'f3',  word:'بَيْت',   missing_letter:'ب', options:['ب','ت','ن','ف','ث'], emoji:'🏠', topic:'المنزل',    grade_level:1, category:'المنزل' },
  { id:'f4',  word:'شَمْس',   missing_letter:'ش', options:['ش','س','ص','ض','ز'], emoji:'☀️', topic:'الطبيعة',   grade_level:1, category:'الطبيعة' },
  { id:'f5',  word:'نَجْم',   missing_letter:'ن', options:['ن','م','ب','ت','ي'], emoji:'⭐', topic:'الطبيعة',   grade_level:1, category:'الطبيعة' },
  { id:'f6',  word:'سَمَك',   missing_letter:'س', options:['س','ش','ص','ث','ز'], emoji:'🐟', topic:'الحيوانات', grade_level:1, category:'الحيوانات' },
  { id:'f7',  word:'تُفَّاح', missing_letter:'ت', options:['ت','ث','ن','ب','ف'], emoji:'🍎', topic:'الفواكه',   grade_level:1, category:'الفواكه' },
  { id:'f8',  word:'مَاء',    missing_letter:'م', options:['م','ن','ب','ه','و'], emoji:'💧', topic:'الطبيعة',   grade_level:1, category:'الطبيعة' },
  { id:'f9',  word:'كِتَاب',  missing_letter:'ك', options:['ك','ق','ع','غ','خ'], emoji:'📚', topic:'المدرسة',   grade_level:1, category:'المدرسة' },
  { id:'f10', word:'قَمَر',   missing_letter:'ق', options:['ق','ك','ع','غ','خ'], emoji:'🌙', topic:'الطبيعة',   grade_level:1, category:'الطبيعة' },
];

const LC_CACHE_KEY = 'lc_words_cache_v2';
const LC_CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCachedWords() {
  try {
    const raw = localStorage.getItem(LC_CACHE_KEY);
    if (!raw) return null;
    const { words, ts } = JSON.parse(raw);
    if (Date.now() - ts > LC_CACHE_TTL) return null;
    return words;
  } catch { return null; }
}

function setCachedWords(words) {
  try { localStorage.setItem(LC_CACHE_KEY, JSON.stringify({ words, ts: Date.now() })); } catch {}
}

/* ────────────────────────── helpers ────────────────────────── */
const DIACRITICS = /[ً-ْٰ]/g;
function stripDia(s) { return (s || '').replace(DIACRITICS, ''); }


function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── contextual Arabic letter forms ─────────────────────────── */
const NON_CONNECTORS = new Set('اأإآءوردذزىة');

function getLetterForm(stripped, idx) {
  const letter    = stripped[idx];
  const prev      = idx > 0                   ? stripped[idx - 1] : null;
  const next      = idx < stripped.length - 1 ? stripped[idx + 1] : null;
  const joinsPrev = prev !== null && !NON_CONNECTORS.has(prev);
  const joinsNext = next !== null && !NON_CONNECTORS.has(letter);
  if (joinsPrev && joinsNext) return 'medial';
  if (joinsPrev)              return 'final';
  if (joinsNext)              return 'initial';
  return 'isolated';
}

const ZWJ = '‍'; // U+200D zero-width joiner

function toContextual(letter, form) {
  const base = (letter || '').replace(DIACRITICS, '');
  switch (form) {
    case 'initial': return base + ZWJ;
    case 'medial':  return ZWJ + base + ZWJ;
    case 'final':   return ZWJ + base;
    default:        return base;
  }
}

const TOPICS = ['الحيوانات', 'الأشكال', 'الأسرة', 'الألوان', 'الفواكه', 'المدرسة', 'الطقس', 'الأرقام'];

/* ── category visual metadata ────────────────────────────────── */
const CAT_META = {
  'الحيوانات': { emoji:'🦁', grad:'linear-gradient(135deg,#f59e0b,#f97316)' },
  'الفواكه':   { emoji:'🍎', grad:'linear-gradient(135deg,#ef4444,#fb923c)' },
  'الغلال':    { emoji:'🍇', grad:'linear-gradient(135deg,#8b5cf6,#a855f7)' },
  'الخضروات':  { emoji:'🥦', grad:'linear-gradient(135deg,#10b981,#34d399)' },
  'الأشكال':   { emoji:'🔷', grad:'linear-gradient(135deg,#3b82f6,#60a5fa)' },
  'الأسرة':    { emoji:'👨‍👩‍👧‍👦', grad:'linear-gradient(135deg,#ec4899,#f472b6)' },
  'الألوان':   { emoji:'🎨', grad:'linear-gradient(135deg,#eab308,#f59e0b)' },
  'المدرسة':   { emoji:'📚', grad:'linear-gradient(135deg,#06b6d4,#0ea5e9)' },
  'الطقس':     { emoji:'⛅', grad:'linear-gradient(135deg,#818cf8,#60a5fa)' },
  'الأرقام':   { emoji:'🔢', grad:'linear-gradient(135deg,#84cc16,#10b981)' },
};
const FALLBACK_CAT_STYLES = [
  { emoji:'🌟', grad:'linear-gradient(135deg,#f59e0b,#f97316)' },
  { emoji:'🎯', grad:'linear-gradient(135deg,#7c3aed,#8b5cf6)' },
  { emoji:'🚀', grad:'linear-gradient(135deg,#3b82f6,#06b6d4)' },
  { emoji:'🌈', grad:'linear-gradient(135deg,#10b981,#84cc16)' },
  { emoji:'🎪', grad:'linear-gradient(135deg,#ec4899,#f43f5e)' },
];
function getCatStyle(cat, idx) {
  return CAT_META[cat] || FALLBACK_CAT_STYLES[idx % FALLBACK_CAT_STYLES.length];
}

/* ── Arabic TTS ─────────────────────────────────────────────── */
function speak(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ar-SA';
  u.rate = 0.82;
  function go() {
    window.speechSynthesis.cancel();
    // prefer Arabic voice if available
    const voices = window.speechSynthesis.getVoices();
    const ar = voices.find(v => v.lang.startsWith('ar'));
    if (ar) u.voice = ar;
    window.speechSynthesis.speak(u);
  }
  if (window.speechSynthesis.getVoices().length > 0) go();
  else { window.speechSynthesis.addEventListener('voiceschanged', go, { once: true }); setTimeout(go, 500); }
}

/* ────────────────────── image with fallback ─────────────────── */
function WordImage({ imageUrl, emoji }) {
  const [err, setErr] = useState(false);
  if (!imageUrl || err) return <div style={S.emojiBox}>{emoji || '❓'}</div>;
  return <img src={imageUrl} alt="" style={S.wordImg} onError={() => setErr(true)} />;
}

/* ═══════════════════════ MAIN COMPONENT ════════════════════════ */
export default function LetterCatcherGame() {
  const [phase,      setPhase]      = useState('start');
  const [dbWords,    setDbWords]    = useState([]);
  const [gameWords,  setGameWords]  = useState(() => {
    const cached = getCachedWords();
    return (cached && cached.length > 0 ? cached : LC_FALLBACK).filter(
      w => w.word && w.missing_letter && Array.isArray(w.options) && w.options.filter(Boolean).length >= 2
    );
  });
  const [queue,      setQueue]      = useState([]);
  const [cur,        setCur]        = useState(0);
  const [score,      setScore]      = useState(0);
  const [chosen,     setChosen]     = useState(null);
  const [correct,    setCorrect]    = useState(null);
  const [showCfg,    setShowCfg]    = useState(false);
  const [catMeta,    setCatMeta]    = useState({});
  const [isTeacher,        setIsTeacher]        = useState(false);
  const [loadProgress,     setLoadProgress]     = useState(0);
  const [pendingCategory,  setPendingCategory]  = useState(undefined); // undefined=grid shown; string/'__all__'=modal open
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cfg, setCfg] = useState({
    questionsPerRound: 10,
    optionsCount: 5,
    topic: '',
    grade: 0,
    minLen: 2,
    maxLen: 12,
  });
  const [totalPoints,   setTotalPoints]   = useState(0);
  const [ptPopupKey,    setPtPopupKey]    = useState(0);
  const [ptPopupActive, setPtPopupActive] = useState(false);
  const [catResults,    setCatResults]    = useState({});  // category → {correct,wrong,total}
  const [currentUser,   setCurrentUser]   = useState(null);

  /* ── detect teacher/admin role + load user + load past results ── */
  useEffect(() => {
    fetch('/api/points').then(r => r.json()).then(j => setTotalPoints(j.points ?? 0)).catch(() => {});
    import('../../../../lib/supabase').then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        const role = user?.user_metadata?.role ?? '';
        setIsTeacher(['super_admin', 'admin', 'teacher'].includes(role));
        if (user) {
          setCurrentUser(user);
          fetch('/api/game-results?game=letter_catcher')
            .then(r => r.json())
            .then(j => {
              const map = {};
              (j.results ?? []).forEach(r => { map[r.category] = r; });
              setCatResults(map);
            })
            .catch(() => {});
        }
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const isValid = w => w.word && w.missing_letter && Array.isArray(w.options) && w.options.filter(Boolean).length >= 2;

  /* ── load ALL words — teachers only (for word manager) ── */
  const loadWords = useCallback(async () => {
    if (!isTeacher) return;
    try {
      const res  = await fetch('/api/games/letter-catcher');
      const json = await res.json();
      setDbWords((json.words || []).filter(isValid));
    } catch {
      setDbWords([]);
    }
  }, [isTeacher]);

  /* ── fetch fresh words from API silently in background (never blocks UI) ── */
  const loadGameWords = useCallback(async () => {
    setLoadProgress(10);
    try {
      const p = new URLSearchParams();
      if (cfg.topic)     p.set('topic',  cfg.topic);
      if (cfg.grade > 0) p.set('grade',  String(cfg.grade));
      p.set('minLen', String(cfg.minLen));
      p.set('maxLen', String(cfg.maxLen));
      setLoadProgress(50);
      const res  = await fetch(`/api/games/letter-catcher?${p}`);
      const json = await res.json();
      const fresh = (json.words || []).filter(isValid);
      if (fresh.length > 0) {
        setGameWords(fresh);
        setCachedWords(fresh);
      }
    } catch { /* keep fallback/cached words already shown */ }
    setLoadProgress(100);
  }, [cfg.topic, cfg.grade, cfg.minLen, cfg.maxLen]);

  const loadCatMeta = useCallback(async () => {
    try {
      const res  = await fetch('/api/games/letter-catcher/categories');
      const json = await res.json();
      const m = {};
      (json.categories || []).forEach(c => { m[c.name] = c; });
      setCatMeta(m);
    } catch {}
  }, []);

  useEffect(() => { loadWords(); }, [loadWords]);
  useEffect(() => { loadGameWords(); }, [loadGameWords]);
  useEffect(() => { loadCatMeta(); }, [loadCatMeta]);

  /* ── save result when game finishes ── */
  const savedResultRef = useRef(false);
  useEffect(() => {
    if (phase !== 'finished' || !currentUser || savedResultRef.current) return;
    savedResultRef.current = true;
    const wrong    = queue.length - score;
    const catKey   = selectedCategory ?? '__all__';
    fetch('/api/game-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_id:  'letter_catcher',
        category: catKey,
        correct:  score,
        wrong,
        total:    queue.length,
      }),
    })
      .then(() => fetch('/api/game-results?game=letter_catcher'))
      .then(r  => r.json())
      .then(j  => {
        const map = {};
        (j.results ?? []).forEach(r => { map[r.category] = r; });
        setCatResults(map);
      })
      .catch(() => {});
  }, [phase, currentUser, score, queue.length, selectedCategory]);

  /* reset save guard when a new game starts */
  useEffect(() => {
    if (phase === 'playing') savedResultRef.current = false;
  }, [phase]);

  /* ── build round queue ── */
  const buildQueue = useCallback((words, count, optCount) => {
    return shuffle(words).slice(0, count).map(w => {
      const correctLetter = stripDia(w.missing_letter);
      const strippedW     = stripDia(w.word);
      const missingIdx    = strippedW.indexOf(correctLetter);
      const form          = missingIdx >= 0 ? getLetterForm(strippedW, missingIdx) : 'isolated';
      const pool2         = (w.options || []).filter(Boolean).filter(o => stripDia(o) !== correctLetter);
      const distractors   = shuffle(pool2).slice(0, optCount - 1);
      const opts          = shuffle([w.missing_letter, ...distractors]);
      return { ...w, _opts: opts, _form: form };
    });
  }, []);

  /* ── start game (catFilter = null → all words) ── */
  const startGame = useCallback((catFilter) => {
    const filtered = catFilter === null
      ? gameWords
      : gameWords.filter(w => w.category === catFilter);
    if (filtered.length === 0) return;
    const count = isTeacher
      ? Math.min(filtered.length, cfg.questionsPerRound)
      : Math.min(filtered.length, 20);
    setSelectedCategory(catFilter);
    setQueue(buildQueue(filtered, count, cfg.optionsCount));
    setCur(0); setScore(0); setChosen(null); setCorrect(null);
    setPhase('playing');
  }, [gameWords, buildQueue, cfg, isTeacher]);

  const pick = useCallback((opt) => {
    if (chosen !== null) return;
    const w       = queue[cur];
    const isRight = stripDia(opt) === stripDia(w.missing_letter);
    setChosen(opt); setCorrect(isRight);
    if (isRight) {
      setScore(s => s + 1);
      setPtPopupKey(k => k + 1);
      setPtPopupActive(true);
      setTimeout(() => setPtPopupActive(false), 1200);
      fetch('/api/points', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 5, reason: 'letter_catcher' }) }).then(r => r.json()).then(j => { if (j.points) setTotalPoints(j.points); }).catch(() => {});
      if (w.audio_url) { try { new Audio(w.audio_url).play(); } catch {} }
      else speak(w.word.includes('_') ? w.word.replace('_', w.missing_letter) : w.word);
    } else {
      const fullWord = w.word.includes('_') ? w.word.replace('_', w.missing_letter) : w.word;
      fetch('/api/flashcards/mistake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word_text: fullWord, topic: w.topic, grade_level: w.grade_level }) }).catch(() => {});
    }
  }, [chosen, cur, queue]);

  const next = useCallback(() => {
    const n = cur + 1;
    if (n >= queue.length) setPhase('finished');
    else { setCur(n); setChosen(null); setCorrect(null); }
  }, [cur, queue.length]);

  const restart = useCallback(() => {
    const filtered = selectedCategory === null
      ? gameWords
      : gameWords.filter(w => w.category === selectedCategory);
    const count = isTeacher
      ? Math.min(filtered.length, cfg.questionsPerRound)
      : Math.min(filtered.length, 20);
    setQueue(buildQueue(filtered, count, cfg.optionsCount));
    setCur(0); setScore(0); setChosen(null); setCorrect(null);
    setPhase('playing');
  }, [selectedCategory, gameWords, buildQueue, cfg, isTeacher]);

  const notEnough = isTeacher && gameWords.length > 0 && gameWords.length < cfg.questionsPerRound;

  /* ══════════════════════ RENDER: START ══════════════════════ */
  if (phase === 'start') {
    const categories = [...new Set(gameWords.map(w => w.category).filter(Boolean))];

    /* modal data when a category was tapped */
    const modalCatLabel = pendingCategory === '__all__' ? 'كل المجموعات' : pendingCategory;
    const modalWords    = pendingCategory === '__all__' || pendingCategory === undefined
      ? gameWords
      : gameWords.filter(w => w.category === pendingCategory);
    const modalCount    = Math.min(modalWords.length, isTeacher ? cfg.questionsPerRound : 20);
    const modalCatObj   = pendingCategory !== '__all__' ? catMeta[pendingCategory] : null;
    const modalCatStyle = pendingCategory !== '__all__' && pendingCategory !== undefined
      ? getCatStyle(pendingCategory, categories.indexOf(pendingCategory))
      : { emoji: '🌟', grad: 'linear-gradient(135deg,#f59e0b,#f97316)' };

    const handleStartFromModal = () => {
      const catArg = pendingCategory === '__all__' ? null : pendingCategory;
      setPendingCategory(undefined);
      startGame(catArg);
    };

    return (
      <div style={{ ...S.page, justifyContent: 'flex-start', paddingTop: 36, paddingBottom: 44 }}>
        {/* non-blocking progress strip */}
        {loadProgress > 0 && loadProgress < 100 && (
          <div style={{ position:'fixed', top:0, left:0, right:0, height:3, zIndex:9999, background:'#ede9fe' }}>
            <div style={{ height:'100%', width:`${loadProgress}%`, background:'#7c3aed', transition:'width .4s ease' }} />
          </div>
        )}
        <style>{`
          @keyframes lcCatIn {
            0%  { opacity:0; transform:scale(.28) rotate(-10deg); }
            55% { transform:scale(1.14) rotate(2deg); }
            100%{ opacity:1; transform:scale(1) rotate(0deg); }
          }
          @keyframes lcModalIn {
            0%  { opacity:0; transform:scale(.88) translateY(24px); }
            100%{ opacity:1; transform:scale(1)   translateY(0); }
          }
          .lc-cat {
            cursor:pointer;
            transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s ease;
          }
          .lc-cat:hover  { transform:scale(1.11) !important; box-shadow:0 22px 48px rgba(0,0,0,.32) !important; }
          .lc-cat:active { transform:scale(0.94) !important; }
        `}</style>

        {isTeacher && showCfg && (
          <SettingsPanel cfg={cfg} onChange={setCfg} onClose={() => setShowCfg(false)} dbWords={dbWords} onRefresh={loadWords} catMeta={catMeta} onCatMetaRefresh={loadCatMeta} />
        )}

        {/* ── STEP 2 MODAL: settings + start button ── */}
        {pendingCategory !== undefined && (
          <div
            style={{
              position:'fixed', inset:0, zIndex:800,
              background:'rgba(30,0,60,.55)', backdropFilter:'blur(4px)',
              display:'flex', alignItems:'center', justifyContent:'center',
              padding:20,
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setPendingCategory(undefined); }}
          >
            <div style={{
              background:'#fff', borderRadius:28, padding:'32px 28px', maxWidth:340, width:'100%',
              textAlign:'center', boxShadow:'0 24px 64px rgba(0,0,0,.4)',
              animation:'lcModalIn .28s cubic-bezier(.34,1.56,.64,1) both',
            }}>
              {/* category badge */}
              <div style={{
                display:'inline-flex', alignItems:'center', gap:8,
                background: modalCatObj?.gradient || modalCatStyle.grad,
                borderRadius:50, padding:'8px 20px', marginBottom:20,
              }}>
                <span style={{ fontSize:'1.6rem' }}>
                  {modalCatObj?.image_url
                    ? <img src={modalCatObj.image_url} alt="" style={{ width:32, height:32, borderRadius:8, objectFit:'cover' }} />
                    : (modalCatObj?.emoji || modalCatStyle.emoji)
                  }
                </span>
                <span style={{ fontSize:'1rem', fontWeight:800, color:'#fff', textShadow:'0 1px 4px rgba(0,0,0,.3)' }}>
                  {modalCatLabel}
                </span>
              </div>

              <h3 style={{ margin:'0 0 20px', fontSize:'1.1rem', fontWeight:800, color:'#1f2937' }}>
                جاهز للصيد؟ 🎯
              </h3>

              {/* stats */}
              <div style={{ ...S.statsRow, marginBottom:24 }}>
                <div style={S.statBox}>
                  <span style={S.statNum}>{modalCount}</span>
                  <span style={S.statLbl}>سؤال</span>
                </div>
                <div style={S.statDiv} />
                <div style={S.statBox}>
                  <span style={S.statNum}>{cfg.optionsCount}</span>
                  <span style={S.statLbl}>خيارات</span>
                </div>
              </div>

              <button style={{ ...S.btnGold, width:'100%', marginBottom:10 }} onClick={handleStartFromModal}>
                🚀 ابدأ اللعبة
              </button>
              <button
                style={{ background:'none', border:'none', cursor:'pointer', color:'#7c3aed', fontWeight:700, fontSize:'.9rem', fontFamily:'inherit' }}
                onClick={() => setPendingCategory(undefined)}
              >
                ← رجوع للمجموعات
              </button>
            </div>
          </div>
        )}

        <div style={{ width:'100%', maxWidth:580, boxSizing:'border-box', textAlign:'center', position:'relative' }}>

          {/* settings button (teachers only) */}
          {isTeacher && (
            <div style={{ textAlign:'left', marginBottom:8 }}>
              <button style={{ ...S.cfgBtn, position:'static' }} onClick={() => setShowCfg(true)}>⚙️ الإعدادات</button>
            </div>
          )}

          {/* header */}
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:'4rem', lineHeight:1 }}>🦉</div>
            <h1 style={{ fontSize:'1.9rem', fontWeight:900, color:'#fff', margin:'8px 0 4px', textShadow:'0 2px 14px rgba(0,0,0,.35)' }}>
              صيّاد الحروف!
            </h1>
            <p style={{ fontSize:'.9rem', color:'rgba(255,255,255,.8)', margin:0 }}>
              اختر مجموعتك وابدأ الصيد 🎯
            </p>
          </div>

          {/* ── empty / lock ── */}
          {gameWords.length === 0 ? (
            <div style={{ ...S.centerCard, padding:'32px 24px' }}>
              {isTeacher ? (
                <>
                  <div style={{ fontSize:'3rem' }}>📭</div>
                  <p style={{ color:'#374151', fontSize:'.97rem', fontWeight:700, lineHeight:1.9, margin:0, textAlign:'center' }}>
                    عذراً، لا توجد كلمات مضافة.<br />أضف كلمات أولاً من لوحة الإعدادات.
                  </p>
                  <button style={S.btnOutline} onClick={() => setShowCfg(true)}>⚙️ إضافة كلمات</button>
                </>
              ) : (
                <>
                  <div style={{ fontSize:'3rem' }}>🔒</div>
                  <p style={{ color:'#374151', fontSize:'.97rem', fontWeight:700, lineHeight:1.9, margin:0, textAlign:'center' }}>
                    اللعبة غير متاحة حالياً.<br />تواصل مع معلمك لإعداد الكلمات.
                  </p>
                </>
              )}
            </div>

          ) : (
            /* ── STEP 1: always show category grid ── */
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

              {/* play-all card */}
              {(() => {
                const allRes   = catResults['__all__'];
                const allPct   = allRes ? Math.round((allRes.correct / allRes.total) * 100) : null;
                const allStars = allPct === null ? 0 : allPct >= 80 ? 3 : allPct >= 50 ? 2 : 1;
                return (
                  <div
                    className="lc-cat"
                    style={{
                      background:'rgba(255,255,255,.18)', backdropFilter:'blur(10px)',
                      border:'2px solid rgba(255,255,255,.3)', borderRadius:18,
                      padding:'16px 20px', display:'flex', alignItems:'center', gap:14,
                      boxShadow:'0 6px 22px rgba(0,0,0,.2)',
                      animation:'lcCatIn .4s cubic-bezier(.34,1.56,.64,1) both',
                    }}
                    onClick={() => setPendingCategory('__all__')}
                  >
                    <span style={{ fontSize:'2.2rem', lineHeight:1, flexShrink:0 }}>🌟</span>
                    <div style={{ flex:1, textAlign:'right' }}>
                      <div style={{ fontSize:'1.08rem', fontWeight:800, color:'#fff', textShadow:'0 1px 6px rgba(0,0,0,.25)' }}>العب الكل</div>
                      <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.75)', marginTop:2 }}>{gameWords.length} كلمة من كل المجموعات</div>
                      {allRes && (
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:5, flexWrap:'wrap' }}>
                          <span style={{ fontSize:'.8rem', color:'#86efac', fontWeight:700 }}>{'⭐'.repeat(allStars)}{'☆'.repeat(3 - allStars)}</span>
                          <span style={{ fontSize:'.76rem', background:'#16a34a', color:'#fff', borderRadius:30, padding:'2px 10px', fontWeight:800, boxShadow:'0 2px 6px rgba(0,0,0,.25)' }}>✓ {allRes.correct}</span>
                          <span style={{ fontSize:'.76rem', background:'#dc2626', color:'#fff', borderRadius:30, padding:'2px 10px', fontWeight:800, boxShadow:'0 2px 6px rgba(0,0,0,.25)' }}>✗ {allRes.wrong}</span>
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize:'1.4rem', color:'rgba(255,255,255,.65)', flexShrink:0 }}>←</span>
                  </div>
                );
              })()}

              {/* category grid — الحيوانات first, progressive unlock */}
              {categories.length > 0 && (() => {
                const FIRST = 'الحيوانات';
                const sorted = [
                  ...(categories.includes(FIRST) ? [FIRST] : []),
                  ...categories.filter(c => c !== FIRST),
                ];
                return (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14 }}>
                    {sorted.map((cat, idx) => {
                      const cs       = getCatStyle(cat, idx);
                      const custom   = catMeta[cat];
                      const bgGrad   = custom?.gradient || cs.grad;
                      const count    = gameWords.filter(w => w.category === cat).length;
                      const res      = catResults[cat];
                      const pct      = res ? Math.round((res.correct / res.total) * 100) : null;
                      const stars    = pct === null ? 0 : pct >= 80 ? 3 : pct >= 50 ? 2 : 1;
                      const unlocked = isTeacher || idx === 0 || !!catResults[sorted[idx - 1]];
                      const prevCat  = sorted[idx - 1];
                      return (
                        <div
                          key={cat}
                          className={unlocked ? 'lc-cat' : ''}
                          style={{
                            background: bgGrad,
                            borderRadius: 22,
                            padding: '18px 8px 14px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                            boxShadow: '0 8px 28px rgba(0,0,0,.26)',
                            animation: `lcCatIn .45s ${(idx + 1) * 0.07}s cubic-bezier(.34,1.56,.64,1) both`,
                            position: 'relative',
                            cursor: unlocked ? 'pointer' : 'not-allowed',
                          }}
                          onClick={() => unlocked && setPendingCategory(cat)}
                        >
                          {/* Lock overlay */}
                          {!unlocked && (
                            <div style={{
                              position:'absolute', inset:0, borderRadius:22, zIndex:2,
                              background:'rgba(10,5,30,0.58)',
                              backdropFilter:'blur(1px)',
                              display:'flex', flexDirection:'column',
                              alignItems:'center', justifyContent:'center', gap:6,
                            }}>
                              <span style={{ fontSize:'1.9rem', lineHeight:1, filter:'drop-shadow(0 2px 6px rgba(0,0,0,.6))' }}>🔒</span>
                              <span style={{
                                fontSize:'.6rem', color:'rgba(255,255,255,.8)',
                                fontWeight:800, textAlign:'center', padding:'0 10px',
                                lineHeight:1.55, textShadow:'0 1px 4px rgba(0,0,0,.5)',
                              }}>
                                أكمل {prevCat}<br/>أولاً
                              </span>
                            </div>
                          )}
                          {/* First badge */}
                          {idx === 0 && (
                            <div style={{
                              position:'absolute', top:8, right:8, zIndex:3,
                              background:'#f59e0b', borderRadius:99,
                              padding:'2px 8px', fontSize:'.58rem', fontWeight:900,
                              color:'#fff', boxShadow:'0 2px 6px rgba(0,0,0,.3)',
                            }}>ابدأ هنا ⭐</div>
                          )}
                          {custom?.image_url
                            ? <img src={custom.image_url} alt="" style={{ width:56, height:56, borderRadius:14, objectFit:'cover', boxShadow:'0 2px 8px rgba(0,0,0,.22)' }} />
                            : <span style={{ fontSize:'2.4rem', lineHeight:1 }}>{custom?.emoji || cs.emoji}</span>
                          }
                          <span style={{
                            fontSize:'.78rem', fontWeight:800, color:'#fff',
                            textShadow:'0 1px 4px rgba(0,0,0,.3)', lineHeight:1.3,
                            textAlign:'center', padding:'0 4px',
                          }}>
                            {cat}
                          </span>
                          {res ? (
                            <>
                              <span style={{ fontSize:'.72rem', letterSpacing:1, color:'rgba(255,255,255,.95)' }}>
                                {'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}
                              </span>
                              <div style={{ display:'flex', gap:5 }}>
                                <span style={{ fontSize:'.7rem', background:'#16a34a', color:'#fff', borderRadius:20, padding:'2px 9px', fontWeight:800, boxShadow:'0 2px 6px rgba(0,0,0,.3)' }}>✓ {res.correct}</span>
                                <span style={{ fontSize:'.7rem', background:'#dc2626', color:'#fff', borderRadius:20, padding:'2px 9px', fontWeight:800, boxShadow:'0 2px 6px rgba(0,0,0,.3)' }}>✗ {res.wrong}</span>
                              </div>
                            </>
                          ) : (
                            <span style={{ fontSize:'.65rem', color:'rgba(255,255,255,.7)', fontWeight:600 }}>
                              {count} كلمة
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          <Link href="/library" style={{ ...S.backLink, color:'rgba(255,255,255,.6)', display:'block', marginTop:28 }}>
            ← العودة للمكتبة
          </Link>
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
          <div style={{ fontSize: '3.5rem', fontWeight: 800, color: '#F5A623' }}>{score} / {queue.length}</div>
          <p style={S.sub}>{msg}</p>
          <button style={S.btnGold} onClick={restart}>🔄 العب مرة أخرى</button>
          <button
            style={{ ...S.btnGold, background:'linear-gradient(135deg,#5b4fc4,#7c3aed)', marginTop:-8 }}
            onClick={() => { setPhase('start'); setPendingCategory(undefined); setQueue([]); setCur(0); setScore(0); setChosen(null); setCorrect(null); }}
          >🏠 اختر مجموعة أخرى</button>
          <Link href="/library" style={S.backLink}>← العودة للمكتبة</Link>
        </div>
      </div>
    );
  }

  /* ══════════════════════ RENDER: PLAYING ══════════════════════ */
  const w    = queue[cur];
  const opts = w._opts || [];

  // Resolve blank position: use explicit '_' marker if present, else fall back to indexOf
  let sw, mi;
  if ((w.word || '').includes('_')) {
    const [bef, aft] = w.word.split('_');
    const bs = stripDia(bef  || '');
    const as = stripDia(aft  || '');
    sw = bs + stripDia(w.missing_letter) + as;
    mi = bs.length;
  } else {
    sw = stripDia(w.word);
    mi = sw.indexOf(stripDia(w.missing_letter));
  }
  const isLast        = cur + 1 >= queue.length;
  const fullWordDisplay = w.word.includes('_') ? w.word.replace('_', w.missing_letter) : w.word;

  return (
    <div style={S.page}>
      <style>{`
        @keyframes ptFloatUp {
          0%   { opacity: 1; transform: translateY(0) scale(1.25); }
          70%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-48px) scale(0.9); }
        }
        @keyframes lcWordReveal {
          0%   { opacity:0; transform:scale(.15) rotate(-10deg); filter:blur(12px); }
          55%  { transform:scale(1.18) rotate(2deg);  filter:blur(0); }
          75%  { transform:scale(.95)  rotate(-1deg); }
          100% { opacity:1; transform:scale(1)   rotate(0); }
        }
        @keyframes lcWordFloat {
          0%,100% { transform:translateY(0px); }
          50%     { transform:translateY(-6px); }
        }
        @keyframes lcWordShimmer {
          0%   { background-position: 200% center; }
          100% { background-position:-200% center; }
        }
        @keyframes lcWrongShake {
          0%,100%{ transform:translateX(0); }
          20%   { transform:translateX(-7px); }
          40%   { transform:translateX(7px); }
          60%   { transform:translateX(-5px); }
          80%   { transform:translateX(5px); }
        }
        @keyframes lcSpark0 { 0%{opacity:0;transform:translate(0,0) scale(0)} 50%{opacity:1;transform:translate(-58px,-38px) scale(1.4)} 100%{opacity:0;transform:translate(-80px,-60px) scale(0)} }
        @keyframes lcSpark1 { 0%{opacity:0;transform:translate(0,0) scale(0)} 50%{opacity:1;transform:translate(55px,-46px) scale(1.4)} 100%{opacity:0;transform:translate(78px,-68px) scale(0)} }
        @keyframes lcSpark2 { 0%{opacity:0;transform:translate(0,0) scale(0)} 50%{opacity:1;transform:translate(-45px,44px) scale(1.2)} 100%{opacity:0;transform:translate(-64px,66px) scale(0)} }
        @keyframes lcSpark3 { 0%{opacity:0;transform:translate(0,0) scale(0)} 50%{opacity:1;transform:translate(58px,40px) scale(1.3)} 100%{opacity:0;transform:translate(80px,62px) scale(0)} }
        @keyframes lcSpark4 { 0%{opacity:0;transform:translate(0,0) scale(0)} 50%{opacity:1;transform:translate(0,-68px) scale(1.5)} 100%{opacity:0;transform:translate(0,-95px) scale(0)} }
        @keyframes lcSpark5 { 0%{opacity:0;transform:translate(0,0) scale(0)} 50%{opacity:1;transform:translate(-30px,58px) scale(1.2)} 100%{opacity:0;transform:translate(-44px,80px) scale(0)} }
        @keyframes lcSpark6 { 0%{opacity:0;transform:translate(0,0) scale(0)} 50%{opacity:1;transform:translate(36px,62px) scale(1.3)} 100%{opacity:0;transform:translate(52px,88px) scale(0)} }
        @keyframes lcGlowPulse {
          0%,100% { box-shadow:0 0 18px 2px rgba(34,197,94,.22), 0 6px 28px rgba(0,0,0,.1); }
          50%     { box-shadow:0 0 36px 8px rgba(34,197,94,.38), 0 8px 32px rgba(0,0,0,.12); }
        }
      `}</style>

      <div style={S.headerRow}>
        <button
          onClick={() => { setPhase('start'); setQueue([]); setCur(0); setScore(0); setChosen(null); setCorrect(null); }}
          style={{ flexShrink:0, background:'rgba(255,255,255,.18)', border:'none', borderRadius:10, padding:'5px 12px', color:'#fff', cursor:'pointer', fontSize:'.82rem', fontWeight:700, fontFamily:'inherit' }}
        >← رجوع</button>
        <span style={S.scoreBadge}>✨ {score}</span>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <span style={{ background: 'rgba(245,158,11,0.28)', borderRadius: 20, padding: '4px 12px', fontSize: '.88rem', fontWeight: 800, color: '#fff' }}>⭐ {totalPoints.toLocaleString('en-US')}</span>
          {ptPopupActive && (
            <span key={ptPopupKey} style={{ position: 'absolute', top: -28, left: '50%', transform: 'translateX(-50%)', color: '#fbbf24', fontWeight: 900, fontSize: '1.05rem', pointerEvents: 'none', whiteSpace: 'nowrap', animation: 'ptFloatUp 1.1s ease forwards', textShadow: '0 1px 6px rgba(0,0,0,.45)' }}>+5 ⭐</span>
          )}
        </div>
        <div style={S.bar}>
          <div style={{ ...S.barFill, width: `${((cur + 1) / queue.length) * 100}%` }} />
        </div>
        <span style={S.barLabel}>{cur + 1} / {queue.length}</span>
      </div>

      <div style={S.card}>
        <WordImage imageUrl={w.image_url} emoji={w.emoji} />

        {/* ── word display area ── */}
        {correct === true ? (
          /* ── correct: beautiful full-word reveal ── */
          <div style={{ position:'relative', padding:'10px 0 14px', textAlign:'center', overflow:'visible' }}>
            {/* sparkle particles */}
            {[
              { em:'✨', an:'lcSpark0', delay:'0ms',   fs:'1.3rem' },
              { em:'⭐', an:'lcSpark1', delay:'80ms',  fs:'1.1rem' },
              { em:'💫', an:'lcSpark2', delay:'50ms',  fs:'1.2rem' },
              { em:'🌟', an:'lcSpark3', delay:'130ms', fs:'1.1rem' },
              { em:'✨', an:'lcSpark4', delay:'30ms',  fs:'1.4rem' },
              { em:'⭐', an:'lcSpark5', delay:'100ms', fs:'1rem'   },
              { em:'💫', an:'lcSpark6', delay:'60ms',  fs:'1.1rem' },
            ].map((p, i) => (
              <span key={i} style={{
                position:'absolute', top:'50%', left:'50%',
                fontSize: p.fs, lineHeight:1, pointerEvents:'none',
                animation: `${p.an} .9s ${p.delay} cubic-bezier(.25,.46,.45,.94) both`,
              }}>{p.em}</span>
            ))}

            {/* reveal container */}
            <div style={{
              display:'inline-flex', flexDirection:'column', alignItems:'center',
              background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',
              borderRadius:28, padding:'10px 28px 14px',
              border:'2.5px solid #86efac',
              animation:'lcGlowPulse 1.8s .4s ease-in-out infinite, lcWordReveal .55s cubic-bezier(.34,1.56,.64,1) both',
            }}>
              <div style={{ fontSize:'.8rem', fontWeight:800, color:'#15803d', marginBottom:3, letterSpacing:'.02em' }}>
                ✅ أحسنت! 🎉
              </div>
              <div style={{
                fontSize: fullWordDisplay.length > 6 ? '2.1rem' : '2.7rem',
                fontWeight:900,
                fontFamily:'inherit',
                direction:'rtl',
                background:'linear-gradient(90deg,#f59e0b,#10b981,#3b82f6,#8b5cf6,#f59e0b)',
                backgroundSize:'300% auto',
                WebkitBackgroundClip:'text',
                WebkitTextFillColor:'transparent',
                backgroundClip:'text',
                lineHeight:1.45,
                animation:'lcWordShimmer 2.5s .55s linear infinite, lcWordFloat 2.8s .55s ease-in-out infinite',
                willChange:'transform',
              }}>
                {fullWordDisplay}
              </div>
            </div>
          </div>
        ) : (
          /* ── unanswered / wrong: segmented letter boxes ── */
          <div style={{ ...S.wordRow, animation: correct === false ? 'lcWrongShake .45s cubic-bezier(.36,.07,.19,.97) both' : 'none' }}>
            {mi < 0 ? (
              <>
                <span style={S.wordLetterBox}>{w.word}</span>
                <span style={{ ...S.blank, background:'#eef3fc', borderColor:'#7c3aed', color:'#7c3aed' }}>؟</span>
              </>
            ) : sw.split('').map((ch, i) => {
              const form = getLetterForm(sw, i);
              if (i === mi) {
                return (
                  <span key={i} style={{
                    ...S.blank,
                    background:  correct === null ? '#eef3fc' : '#f8d7da',
                    borderColor: correct === null ? '#7c3aed'  : '#e74c3c',
                    color:       correct === null ? '#7c3aed'  : '#e74c3c',
                  }}>
                    {correct !== null ? toContextual(w.missing_letter, form) : '؟'}
                  </span>
                );
              }
              return (
                <span key={i} style={S.wordLetterBox}>
                  {toContextual(ch, form)}
                </span>
              );
            })}
          </div>
        )}

        {/* feedback for wrong answer only */}
        {correct === false && (
          <div style={{ ...S.feedback, color:'#9b1c1c', background:'#f8d7da' }}>
            {`❌ الصحيح: ${w.missing_letter}`}
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
            return (
              <button key={`${opt}-${idx}`} style={btn} onClick={() => pick(opt)} disabled={revealed}>
                {toContextual(opt, w._form || 'isolated')}
              </button>
            );
          })}
        </div>

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
    width: '100%',
    boxSizing: 'border-box',
    overflowX: 'hidden',
    background: 'linear-gradient(135deg, #5b4fc4 0%, #7c3aed 50%, #9c3ec4 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '16px 12px', fontFamily:'inherit', direction: 'rtl',
  },
  centerCard: {
    position: 'relative', background: '#fff', borderRadius: 24, padding: '32px 22px',
    textAlign: 'center', maxWidth: 580, width: '100%',
    boxSizing: 'border-box',
    boxShadow: '0 24px 64px rgba(0,0,0,0.32)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
  },
  cfgBtn: {
    position: 'absolute', top: 16, left: 16, background: '#f3f4f6', border: 'none',
    borderRadius: 10, padding: '7px 14px', fontSize: '0.85rem', fontWeight: 600,
    cursor: 'pointer', color: '#374151', fontFamily:'inherit',
  },
  mainTitle: { fontSize: '2rem', fontWeight: 800, color: '#1a1a2e', margin: 0 },
  sub: { fontSize: '0.97rem', color: '#6b7280', lineHeight: 1.8, margin: 0 },
  statsRow: {
    display: 'flex', alignItems: 'center', background: '#f9fafb', borderRadius: 14,
    padding: '14px 20px', width: '100%', justifyContent: 'space-around', boxSizing: 'border-box',
  },
  statBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  statNum: { fontSize: '1.6rem', fontWeight: 800, color: '#7c3aed' },
  statLbl: { fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 },
  statDiv: { width: 1, height: 36, background: '#e5e7eb' },
  warningBanner: {
    background: '#fff7e6', border: '2px solid #f59e0b', borderRadius: 12,
    padding: '12px 16px', color: '#92400e', fontSize: '0.88rem', fontWeight: 600,
    textAlign: 'center', lineHeight: 1.7, width: '100%', boxSizing: 'border-box',
  },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    background: '#f9fafb', border: '2px dashed #d1d5db', borderRadius: 16,
    padding: '28px 20px', width: '100%', boxSizing: 'border-box',
  },
  btnOutline: {
    background: 'transparent', color: '#7c3aed', border: '2px solid #7c3aed',
    borderRadius: 12, padding: '10px 24px', fontSize: '.92rem', fontWeight: 700,
    cursor: 'pointer', fontFamily:'inherit', marginTop: 4,
  },
  btnGold: {
    background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff', border: 'none',
    borderRadius: 14, padding: '14px 0', fontSize: '1.1rem', fontWeight: 700,
    cursor: 'pointer', fontFamily:'inherit', width: '100%',
    boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
  },
  addBtn: {
    marginTop: 12, width: '100%', background: 'linear-gradient(135deg,#5b4fc4,#7c3aed)',
    color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0',
    fontSize: '.9rem', fontWeight: 700, fontFamily:'inherit',
  },
  input: {
    width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10,
    padding: '9px 12px', fontSize: '1rem', fontFamily:'inherit',
    boxSizing: 'border-box', outline: 'none',
  },
  backLink: { color: '#9ca3af', fontSize: '0.87rem', textDecoration: 'none' },
  settingsOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20,
  },
  settingsCard: {
    background: '#fff', borderRadius: 20, padding: '24px 20px', width: '100%', maxWidth: 520,
    boxSizing: 'border-box',
    display: 'flex', flexDirection: 'column', gap: 0,
    boxShadow: '0 16px 48px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto',
    fontFamily:'inherit',
  },
  settingsLabel: {
    display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.95rem', fontWeight: 600,
    color: '#374151', textAlign: 'right', marginBottom: 16,
  },
  settingsSelect: {
    padding: '10px 14px', borderRadius: 10, border: '2px solid #e5e7eb',
    fontSize: '1rem', fontFamily:'inherit', direction: 'rtl',
    color: '#1a1a2e', cursor: 'pointer',
  },
  headerRow: {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', maxWidth: 640,
    boxSizing: 'border-box',
    marginBottom: 12, color: '#fff',
  },
  scoreBadge: {
    fontSize: '1rem', fontWeight: 700, flexShrink: 0,
    background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 14px',
  },
  bar: { flex: 1, height: 8, background: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', background: '#fbbf24', borderRadius: 4, transition: 'width 0.4s' },
  barLabel: { fontSize: '0.88rem', flexShrink: 0, opacity: 0.82 },
  card: {
    background: '#fff', borderRadius: 24, padding: '24px 18px', width: '100%', maxWidth: 640,
    boxSizing: 'border-box',
    boxShadow: '0 24px 64px rgba(0,0,0,0.32)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
  },
  emojiBox: {
    width: 140, height: 140, background: '#f5f3ff', borderRadius: 20,
    fontSize: '4.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  wordImg: { width: 140, height: 140, objectFit: 'contain', borderRadius: 16 },
  wordRow: {
    display: 'flex', alignItems: 'center', gap: 6,
    flexWrap: 'wrap', justifyContent: 'center', direction: 'rtl',
  },
  wordLetterBox: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 44, height: 56, borderRadius: 10,
    background: '#f5f3ff', border: '2px solid #ede9fe',
    fontSize: '2rem', fontWeight: 700, color: '#1a1a2e', padding: '0 6px',
  },
  blank: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 48, height: 56, border: '3px dashed', borderRadius: 10,
    fontSize: '2rem', fontWeight: 700, transition: 'all 0.3s', padding: '0 6px',
  },
  feedback: {
    padding: '10px 22px', borderRadius: 10, fontSize: '1rem',
    fontWeight: 600, textAlign: 'center', width: '100%',
  },
  optRow: { display: 'grid', gap: 10, width: '100%', boxSizing: 'border-box' },
  optBtn: {
    width: '100%',
    aspectRatio: '1',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, border: '2px solid #e5e7eb',
    background: '#f9fafb', fontSize: '1.8rem', fontWeight: 700, cursor: 'pointer',
    transition: 'all 0.18s', fontFamily:'inherit', color: '#1a1a2e',
    boxSizing: 'border-box',
  },
  optCorrect: { background: '#d4edda', borderColor: '#27ae60', color: '#1a6b38' },
  optWrong:   { background: '#f8d7da', borderColor: '#e74c3c', color: '#9b1c1c' },
  btnBlue: {
    background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 14,
    padding: '13px 0', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer',
    fontFamily:'inherit', width: '100%', maxWidth: 420,
  },
};
