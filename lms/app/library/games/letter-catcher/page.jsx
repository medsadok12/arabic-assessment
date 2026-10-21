'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getRole } from '../../../../lib/auth-role';
import { childFetch, getActiveChildTab } from '../../../../lib/child-fetch';
import { LC_DEFAULT_SETTINGS, LEN_NO_LIMIT, normalizeLcSettings, roundSize, pickRotation, markSeen } from '../../../../lib/letter-catcher';
import { freshFetch } from '../../../../lib/fresh-fetch';
import { fitTileSize, compactTileStyle, compactRowStyle, compactGroupStyle, useElementWidth } from '../../../../lib/fit-tiles';
import { stripDia, isGap, getLetterForm, toContextual } from '../../../../lib/letter-forms';
import { speakArabic } from '../../../../lib/speak-arabic';
import GameScene from '../../../../components/GameScene';

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

/* إعدادات الجولة التي يحفظها المعلم (عدد الكلمات والخيارات) — تصل مع الكلمات،
   وتُحفظ محلياً كي تظهر الأرقام الصحيحة فوراً عند الفتح */
const LC_SETTINGS_KEY = 'lc_round_settings_v1';
function getCachedSettings() {
  try { return normalizeLcSettings(JSON.parse(localStorage.getItem(LC_SETTINGS_KEY) || 'null')); }
  catch { return { ...LC_DEFAULT_SETTINGS }; }
}

/* ذاكرة التدوير: الكلمات التي أجاب عنها الطفل في الدورة الحالية لكل مجموعة.
   منفصلة لكل حساب ولكل طفل في حساب العائلة (القسم 13.9) */
function seenKey(userId, catKey) {
  return `lc_seen_v1:${userId || 'guest'}:${getActiveChildTab() || 'self'}:${catKey}`;
}
function readSeen(key) {
  try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
function writeSeen(key, ids) {
  try { localStorage.setItem(key, JSON.stringify(ids)); } catch {}
}

/* ────────────────────────── helpers ────────────────────────── */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

/* ────────────────────── image with fallback ─────────────────── */
function WordImage({ imageUrl, emoji }) {
  const [err, setErr] = useState(false);
  if (!imageUrl || err) return <div style={S.emojiBox}>{emoji || '❓'}</div>;
  return <img src={imageUrl} alt="" style={S.wordImg} onError={() => setErr(true)} />;
}

/* ── تصميم «عوالم المجموعات» (2026-10-21): خلفية مرسومة لكل مجموعة (components/GameScene)،
   شرائط وبطاقة زجاجية، وألوان الهوية — لكل زر حرف حافة سفلية بدرجة من ألوانها، ولا أحمر عند الخطأ ── */
const TILE_TINTS = ['#E8B84B', '#A48BE6', '#8798B3', '#6CCFA0', '#D9CCB6'];

/* فهيم واقف في المشهد أسفل الشاشة مع كلمة تشجيع */
function FaheemBuddy({ text }) {
  return (
    <div style={S.buddy} aria-live="polite">
      <img src="/faheem.png" alt="فهيم" style={S.buddyImg} />
      <div style={S.buddyBubble}>{text}</div>
    </div>
  );
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
  /* فلاتر معاينة للمعلم فقط (لا تُحفظ ولا تؤثر على الطلاب) — بلا حد للطول افتراضياً */
  const [cfg, setCfg] = useState({
    topic: '',
    grade: 0,
    minLen: 2,
    maxLen: LEN_NO_LIMIT,
  });
  /* إعدادات الجولة المحفوظة لكل الطلاب */
  const [settings, setSettings] = useState(() => (typeof window === 'undefined' ? { ...LC_DEFAULT_SETTINGS } : getCachedSettings()));
  const roundRef = useRef({ key: null, ids: [] });
  const [totalPoints,   setTotalPoints]   = useState(0);
  const [ptPopupKey,    setPtPopupKey]    = useState(0);
  const [ptPopupActive, setPtPopupActive] = useState(false);
  const [catResults,    setCatResults]    = useState({});  // category → {correct,wrong,total}
  const [currentUser,   setCurrentUser]   = useState(null);
  /* عرض صف مربعات الكلمة — لتصغير مربعات الاسم المكوّن من كلمتين ليسع سطراً واحداً */
  const [wordRowEl, setWordRowEl] = useState(null);
  const wordRowWidth = useElementWidth(wordRowEl);

  /* «اسمع الكلمة»: تسجيل المعلم إن وُجد، وإلا صوت فهيم البشري (مخزَّن لكل الطلاب c=1)،
     وصوت الجهاز احتياطاً. يُستدعى داخل اللمسة نفسها (شرط سفاري) */
  const wordAudioRef = useRef(null);
  const stopWordAudio = useCallback(() => {
    try { wordAudioRef.current?.pause(); } catch {}
    wordAudioRef.current = null;
  }, []);
  const playWord = useCallback((wd) => {
    const text = wd.word.includes('_') ? wd.word.replace('_', wd.missing_letter) : wd.word;
    stopWordAudio();
    const a = new Audio(wd.audio_url || `/api/faheem/tts?c=1&t=${encodeURIComponent(text)}`);
    wordAudioRef.current = a;
    a.onerror = () => speakArabic(text);
    a.play().catch(() => speakArabic(text));
  }, [stopWordAudio]);
  useEffect(() => stopWordAudio, [stopWordAudio]);

  /* ── detect teacher/admin role + load user + load past results ── */
  useEffect(() => {
    childFetch('/api/points').then(r => r.json()).then(j => setTotalPoints(j.points ?? 0)).catch(() => {});
    import('../../../../lib/supabase').then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        const role = getRole(user) ?? '';
        setIsTeacher(['super_admin', 'admin', 'teacher'].includes(role));
        if (user) {
          setCurrentUser(user);
          childFetch('/api/game-results?game=letter_catcher')
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
      const res  = await freshFetch('/api/games/letter-catcher');
      const json = await res.json();
      setDbWords((json.words || []).filter(isValid));
    } catch {
      setDbWords([]);
    }
  }, [isTeacher]);

  /* ── fetch fresh words from API silently in background (never blocks UI) ──
     القراءة حيّة دائماً (القسم 9.5): الكاش المحلي يُظهر الكلمات فوراً عند الفتح فقط،
     ثم تحلّ محله النسخة الحالية من قاعدة البيانات. quiet: بلا شريط تحميل (العودة للتبويب) */
  const loadGameWords = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoadProgress(10);
    try {
      const p = new URLSearchParams();
      if (cfg.topic)     p.set('topic',  cfg.topic);
      if (cfg.grade > 0) p.set('grade',  String(cfg.grade));
      if (cfg.minLen > 2) p.set('minLen', String(cfg.minLen));
      if (cfg.maxLen < LEN_NO_LIMIT) p.set('maxLen', String(cfg.maxLen));
      if (!quiet) setLoadProgress(50);
      const res  = await freshFetch(`/api/games/letter-catcher?${p}`);
      const json = await res.json();
      if (json.settings) {
        const st = normalizeLcSettings(json.settings);
        setSettings(st);
        try { localStorage.setItem(LC_SETTINGS_KEY, JSON.stringify(st)); } catch {}
      }
      const fresh = (json.words || []).filter(isValid);
      if (fresh.length > 0) {
        setGameWords(fresh);
        setCachedWords(fresh);
      }
    } catch { /* keep fallback/cached words already shown */ }
    if (!quiet) setLoadProgress(100);
  }, [cfg.topic, cfg.grade, cfg.minLen, cfg.maxLen]);

  const loadCatMeta = useCallback(async () => {
    try {
      const res  = await freshFetch('/api/games/letter-catcher/categories');
      const json = await res.json();
      const m = {};
      (json.categories || []).forEach(c => { m[c.name] = c; });
      setCatMeta(m);
    } catch {}
  }, []);

  useEffect(() => { loadWords(); }, [loadWords]);
  useEffect(() => { loadGameWords(); }, [loadGameWords]);
  useEffect(() => { loadCatMeta(); }, [loadCatMeta]);

  /* عودة الطفل لتبويب مفتوح مسبقاً: يجلب آخر ما عدّله المعلم بدل نسخة قديمة */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      loadGameWords({ quiet: true });
      loadCatMeta();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadGameWords, loadCatMeta]);

  /* بعد أي حفظ/حذف في لوحة المعلم: قائمة الإدارة وكلمات اللعب معاً */
  const refreshAfterEdit = useCallback(
    () => Promise.all([loadWords(), loadGameWords({ quiet: true })]),
    [loadWords, loadGameWords]
  );

  /* ── save result when game finishes ── */
  const savedResultRef = useRef(false);
  useEffect(() => {
    if (phase !== 'finished' || !currentUser || savedResultRef.current) return;
    savedResultRef.current = true;
    const wrong    = queue.length - score;
    const catKey   = selectedCategory ?? '__all__';
    childFetch('/api/game-results', {
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
      .then(() => childFetch('/api/game-results?game=letter_catcher'))
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
  const buildQueue = useCallback((words, optCount) => {
    return words.map(w => {
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

  /* ── كلمات الجولة بالتدوير: ما لم يُجب عنه الطفل بعد في هذه المجموعة أولاً ── */
  const pickRoundWords = useCallback((words, catKey) => {
    const ids = words.map(w => String(w.id));
    const key = seenKey(currentUser?.id, catKey);
    const { picked } = pickRotation(ids, readSeen(key), roundSize(words.length, settings.words_per_round));
    roundRef.current = { key, ids };
    const byId = new Map(words.map(w => [String(w.id), w]));
    return picked.map(id => byId.get(id));
  }, [currentUser, settings.words_per_round]);

  /* ── start game (catFilter = null → all words) ── */
  const startGame = useCallback((catFilter) => {
    const filtered = catFilter === null
      ? gameWords
      : gameWords.filter(w => w.category === catFilter);
    if (filtered.length === 0) return;
    setSelectedCategory(catFilter);
    setQueue(buildQueue(pickRoundWords(filtered, catFilter ?? '__all__'), settings.options_count));
    setCur(0); setScore(0); setChosen(null); setCorrect(null);
    setPhase('playing');
    window.scrollTo(0, 0); // البطاقة المختارة قد تكون أسفل القائمة — اللعبة تبدأ من أعلاها
  }, [gameWords, buildQueue, pickRoundWords, settings.options_count]);

  const pick = useCallback((opt) => {
    if (chosen !== null) return;
    const w       = queue[cur];
    const isRight = stripDia(opt) === stripDia(w.missing_letter);
    setChosen(opt); setCorrect(isRight);
    // الكلمة تُحسب «مرّ عليها» عند الإجابة فقط — ما لم يصله الطفل يبقى للجولة القادمة
    const { key, ids } = roundRef.current;
    if (key) writeSeen(key, markSeen(ids, readSeen(key), String(w.id)));
    if (isRight) {
      setScore(s => s + 1);
      setPtPopupKey(k => k + 1);
      setPtPopupActive(true);
      setTimeout(() => setPtPopupActive(false), 1200);
      childFetch('/api/points', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'letter_catcher' }) }).then(r => r.json()).then(j => { if (j.points) setTotalPoints(j.points); }).catch(() => {});
      if (w.audio_url) { try { new Audio(w.audio_url).play(); } catch {} }
      else speakArabic(w.word.includes('_') ? w.word.replace('_', w.missing_letter) : w.word);
    } else {
      const fullWord = w.word.includes('_') ? w.word.replace('_', w.missing_letter) : w.word;
      childFetch('/api/flashcards/mistake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word_text: fullWord, topic: w.topic, grade_level: w.grade_level }) }).catch(() => {});
    }
  }, [chosen, cur, queue]);

  const next = useCallback(() => {
    stopWordAudio();
    const n = cur + 1;
    if (n >= queue.length) setPhase('finished');
    else { setCur(n); setChosen(null); setCorrect(null); }
  }, [cur, queue.length, stopWordAudio]);

  const restart = useCallback(() => {
    const filtered = selectedCategory === null
      ? gameWords
      : gameWords.filter(w => w.category === selectedCategory);
    if (filtered.length === 0) return;
    setQueue(buildQueue(pickRoundWords(filtered, selectedCategory ?? '__all__'), settings.options_count));
    setCur(0); setScore(0); setChosen(null); setCorrect(null);
    setPhase('playing');
    window.scrollTo(0, 0);
  }, [selectedCategory, gameWords, buildQueue, pickRoundWords, settings.options_count]);

  /* ══════════════════════ RENDER: START ══════════════════════ */
  if (phase === 'start') {
    const categories = [...new Set(gameWords.map(w => w.category).filter(Boolean))];

    /* modal data when a category was tapped */
    const modalCatLabel = pendingCategory === '__all__' ? 'كل المجموعات' : pendingCategory;
    const modalWords    = pendingCategory === '__all__' || pendingCategory === undefined
      ? gameWords
      : gameWords.filter(w => w.category === pendingCategory);
    const modalCount    = roundSize(modalWords.length, settings.words_per_round);
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
          <SettingsPanel cfg={cfg} onChange={setCfg} settings={settings} onSettingsSaved={(st) => { setSettings(st); try { localStorage.setItem(LC_SETTINGS_KEY, JSON.stringify(st)); } catch {} }} onClose={() => setShowCfg(false)} dbWords={dbWords} onRefresh={refreshAfterEdit} catMeta={catMeta} onCatMetaRefresh={loadCatMeta} />
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
                  <span style={S.statNum}>{settings.options_count}</span>
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
      <div style={S.scenePage}>
        <GameScene category={selectedCategory} />
        <div style={S.sceneColumn}>
          <div style={{ ...S.glassCard, alignItems: 'center', textAlign: 'center', gap: 14, padding: '26px 20px', marginTop: 24 }}>
            <div style={{ fontSize: '3rem', lineHeight: 1 }}>{'⭐'.repeat(stars)}</div>
            <h2 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, color: '#1A2B4A' }}>أَحْسَنْتَ!</h2>
            <div style={{ fontSize: '3.2rem', fontWeight: 900, color: '#1A2B4A', direction: 'ltr' }}>{score} / {queue.length}</div>
            <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#4A5A75', lineHeight: 1.8 }}>{msg}</p>
            <button style={S.goldBtn} onClick={restart}>🔄 العب مرة أخرى</button>
            <button
              style={S.whiteBtn}
              onClick={() => { setPhase('start'); setPendingCategory(undefined); setQueue([]); setCur(0); setScore(0); setChosen(null); setCorrect(null); }}
            >🏠 اختر مجموعة أخرى</button>
            <Link href="/library" style={{ ...S.backLink, color: '#4A5A75', fontWeight: 700 }}>← العودة للمكتبة</Link>
          </div>
          <FaheemBuddy text={pct >= 50 ? 'أَنْتَ صَيَّادُ حُرُوفٍ بَارِعٌ!' : 'كُلُّ مُحَاوَلَةٍ تَجْعَلُكَ أَقْوَى!'} />
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

  // عبارة من كلمتين أو أكثر (مثل «حمار وحشي»): كل كلمة مجموعة مربعات مستقلة
  // وبينها مسافة — لا مربع فارغ للمسافة يبدو كأنه حرف ناقص، ولا تنكسر الكلمة
  // الواحدة على سطرين
  const wordGroups = [[]];
  sw.split('').forEach((ch, i) => {
    if (isGap(ch) && i !== mi) {
      if (wordGroups[wordGroups.length - 1].length) wordGroups.push([]);
    } else {
      wordGroups[wordGroups.length - 1].push(i);
    }
  });
  const letterGroups = wordGroups.filter(g => g.length);
  // اسم من كلمتين فأكثر: مربعات أصغر في سطر واحد (lib/fit-tiles.js). الكلمة الواحدة كما هي.
  const isPhrase = mi >= 0 && letterGroups.length > 1;
  const tile = isPhrase
    ? compactTileStyle(fitTileSize(wordRowWidth, letterGroups.reduce((n, g) => n + g.length, 0), letterGroups.length))
    : null;

  const catLabel = selectedCategory ?? w.category ?? '';
  const buddyText = correct === true ? 'أَحْسَنْتَ يَا بَطَل!'
    : correct === false ? 'لَا بَأْسَ، تَعَلَّمْنَا حَرْفًا جَدِيدًا!'
    : 'هَيَّا يَا بَطَل، أَنْتَ تَسْتَطِيعُ!';

  return (
    <div style={S.scenePage}>
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
          0%,100% { box-shadow:0 0 18px 2px rgba(42,187,122,.22), 0 6px 28px rgba(0,0,0,.1); }
          50%     { box-shadow:0 0 36px 8px rgba(42,187,122,.38), 0 8px 32px rgba(0,0,0,.12); }
        }
      `}</style>

      {/* في «العب الكل» يتغير العالم مع مجموعة كل كلمة */}
      <GameScene category={catLabel} />

      <div style={S.sceneColumn}>
        <div style={S.glassBar}>
          <button
            onClick={() => { stopWordAudio(); setPhase('start'); setQueue([]); setCur(0); setScore(0); setChosen(null); setCorrect(null); }}
            style={S.roundBlueBtn}
            aria-label="رجوع إلى المجموعات"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
          </button>
          <div style={S.barTitle}>
            صَيَّادُ الْحُرُوفِ{catLabel ? <span style={{ color: '#4A5A75', fontWeight: 800 }}> — {catLabel}</span> : null}
          </div>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <span style={S.pointsPill}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#E8B84B" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" /></svg>
              {totalPoints.toLocaleString('en-US')}
            </span>
            {ptPopupActive && (
              <span key={ptPopupKey} style={{ position: 'absolute', top: -28, left: '50%', transform: 'translateX(-50%)', color: '#E8B84B', fontWeight: 900, fontSize: '1.05rem', pointerEvents: 'none', whiteSpace: 'nowrap', animation: 'ptFloatUp 1.1s ease forwards', textShadow: '0 1px 6px rgba(26,43,74,.45)' }}>+5 ⭐</span>
            )}
          </div>
        </div>

        <div style={{ ...S.glassBar, padding: '6px 8px', gap: 10 }}>
          <span style={S.qChip}>السؤال {cur + 1} من {queue.length}</span>
          <div style={S.bar}>
            <div style={{ ...S.barFill, width: `${((cur + 1) / queue.length) * 100}%` }} />
          </div>
          <span style={S.scoreChip} aria-label={`إجابات صحيحة: ${score}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#E8B84B" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" /></svg>
            {score}
          </span>
        </div>

        <div style={S.glassCard}>
          <h1 style={S.questionPill}>اِخْتَرِ الْحَرْفَ النَّاقِصَ</h1>

          <div style={S.pictureCard}>
            <WordImage imageUrl={w.image_url} emoji={w.emoji} />
            <button style={S.listenRow} onClick={() => playWord(w)} aria-label="اسمع الكلمة">
              <span style={S.listenBtn}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></svg>
              </span>
              <span style={{ fontSize: '.95rem', fontWeight: 800, color: '#8A6212' }}>اِسْمَعِ الْكَلِمَةَ أَوَّلًا</span>
            </button>
          </div>

          {/* ── word display area ── */}
          {correct === true ? (
            /* ── correct: beautiful full-word reveal ── */
            <div style={{ position:'relative', padding:'4px 0 8px', textAlign:'center', overflow:'visible' }}>
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
              <div style={{
                display:'inline-flex', flexDirection:'column', alignItems:'center',
                background:'linear-gradient(135deg,#F2FBF6,#DCF3E8)',
                borderRadius:26, padding:'10px 28px 14px',
                border:'2.5px solid #6CCFA0',
                animation:'lcGlowPulse 1.8s .4s ease-in-out infinite, lcWordReveal .55s cubic-bezier(.34,1.56,.64,1) both',
              }}>
                <div style={{ fontSize:'.85rem', fontWeight:800, color:'#17784C', marginBottom:3 }}>
                  ✅ أَحْسَنْتَ! 🎉
                </div>
                <div style={{
                  fontSize: fullWordDisplay.length > 6 ? '2.1rem' : '2.7rem',
                  fontWeight:900,
                  fontFamily:'inherit',
                  direction:'rtl',
                  background:'linear-gradient(90deg,#E8B84B,#2ABB7A,#1A2B4A,#7C5CD9,#E8B84B)',
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
            <div ref={setWordRowEl} style={{ ...S.wordRow, ...(isPhrase ? compactRowStyle : null), animation: correct === false ? 'lcWrongShake .45s cubic-bezier(.36,.07,.19,.97) both' : 'none' }}>
              {mi < 0 ? (
                <>
                  <span style={S.wordLetterBox}>{w.word}</span>
                  <span style={{ ...S.blank, ...S.blankOpen }}>؟</span>
                </>
              ) : letterGroups.map((group, gi) => (
                <span key={gi} style={isPhrase ? { ...S.wordGroup, ...compactGroupStyle } : S.wordGroup}>
                  {group.map(i => {
                    const form = getLetterForm(sw, i);
                    if (i === mi) {
                      return (
                        <span key={i} style={{ ...S.blank, ...tile, ...(correct === null ? S.blankOpen : S.blankShown) }}>
                          {correct !== null ? toContextual(w.missing_letter, form) : '؟'}
                        </span>
                      );
                    }
                    return (
                      <span key={i} style={tile ? { ...S.wordLetterBox, ...tile } : S.wordLetterBox}>
                        {toContextual(sw[i], form)}
                      </span>
                    );
                  })}
                </span>
              ))}
            </div>
          )}

          {/* الخطأ بلا أحمر (صفر إحباط): الحرف الصحيح يظهر بالأخضر ورسالة تشجيع */}
          {correct === false && (
            <div style={S.gentleFeedback}>
              💡 قَرِيبٌ! الْحَرْفُ النَّاقِصُ هُوَ «{w.missing_letter}»
            </div>
          )}

          <div style={{ ...S.optRow, gridTemplateColumns: `repeat(${Math.min(opts.length, 5)}, 1fr)` }}>
            {opts.filter(Boolean).map((opt, idx) => {
              const isRight  = stripDia(opt) === stripDia(w.missing_letter);
              const picked   = chosen === opt;
              const revealed = chosen !== null;
              let btn = { ...S.optBtn, borderBottom: `6px solid ${TILE_TINTS[idx % TILE_TINTS.length]}` };
              if (revealed) {
                if (isRight)     btn = { ...btn, ...S.optCorrect };
                else if (picked) btn = { ...btn, ...S.optTried };
                else             btn = { ...btn, opacity: 0.35 };
              }
              return (
                <button key={`${opt}-${idx}`} style={btn} onClick={() => pick(opt)} disabled={revealed} aria-label={`الحرف ${opt}`}>
                  {toContextual(opt, w._form || 'isolated')}
                </button>
              );
            })}
          </div>

          {chosen !== null && (
            <button style={S.goldBtn} onClick={next}>
              {isLast ? '🏁 النَّتِيجَةُ النِّهَائِيَّةُ' : 'التَّالِي ←'}
            </button>
          )}
        </div>

        <FaheemBuddy text={buddyText} />
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
  /* ── شاشة اللعب بعوالم المجموعات ── */
  scenePage: {
    position: 'relative', minHeight: '100dvh', width: '100%', boxSizing: 'border-box',
    overflowX: 'hidden', background: '#F4EFE6', direction: 'rtl', fontFamily: 'inherit',
    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 12px 12px',
  },
  sceneColumn: {
    position: 'relative', zIndex: 1, width: '100%', maxWidth: 560, flex: 1,
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  glassBar: {
    display: 'flex', alignItems: 'center', gap: 8, padding: 6, borderRadius: 999,
    background: 'rgba(255,255,255,0.62)', WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)',
    border: '1.5px solid rgba(255,255,255,0.85)', boxShadow: '0 8px 24px rgba(26,43,74,0.14)',
  },
  roundBlueBtn: {
    width: 44, height: 44, flexShrink: 0, borderRadius: '50%', background: '#1A2B4A',
    border: 'none', borderBottom: '4px solid #0F1B30', color: '#fff', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
  },
  barTitle: {
    flex: 1, minWidth: 0, textAlign: 'center', fontSize: '.95rem', fontWeight: 900, color: '#1A2B4A',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  pointsPill: {
    display: 'inline-flex', alignItems: 'center', gap: 5, background: '#1A2B4A', color: '#fff',
    borderRadius: 999, padding: '8px 12px', fontWeight: 800, fontSize: '.95rem', whiteSpace: 'nowrap',
  },
  qChip: {
    background: '#1A2B4A', color: '#fff', borderRadius: 999, padding: '5px 12px',
    fontSize: '.82rem', fontWeight: 800, whiteSpace: 'nowrap',
  },
  scoreChip: {
    display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fff', color: '#1A2B4A',
    borderRadius: 999, padding: '4px 10px', fontSize: '.88rem', fontWeight: 900, flexShrink: 0,
  },
  bar: { flex: 1, height: 10, background: 'rgba(26,43,74,0.14)', borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', background: '#E8B84B', borderRadius: 999, transition: 'width 0.4s' },
  glassCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12, padding: 14, borderRadius: 30,
    background: 'rgba(255,255,255,0.64)', WebkitBackdropFilter: 'blur(14px)', backdropFilter: 'blur(14px)',
    border: '1.5px solid rgba(255,255,255,0.88)', boxShadow: '0 14px 34px rgba(26,43,74,0.18)',
    boxSizing: 'border-box', width: '100%',
  },
  questionPill: {
    margin: 0, background: 'rgba(255,255,255,0.9)', borderRadius: 999, padding: '9px 12px',
    textAlign: 'center', fontSize: '1.15rem', fontWeight: 900, color: '#1A2B4A',
  },
  pictureCard: {
    background: '#fff', borderRadius: 22, padding: '10px 10px 12px', boxShadow: '0 4px 14px rgba(26,43,74,0.08)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
  },
  listenRow: {
    display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
    padding: '2px 6px', cursor: 'pointer', fontFamily: 'inherit', minHeight: 44,
  },
  listenBtn: {
    width: 42, height: 42, borderRadius: '50%', background: '#E8B84B', borderBottom: '4px solid #C99A2E',
    color: '#1A2B4A', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
  },
  emojiBox: {
    width: 150, height: 150, background: '#FAF7F2', borderRadius: 20,
    fontSize: '4.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  wordImg: { width: 150, height: 150, objectFit: 'contain', borderRadius: 16 },
  wordRow: {
    width: '100%',
    display: 'flex', alignItems: 'center', gap: '10px 26px',
    flexWrap: 'wrap', justifyContent: 'center', direction: 'rtl',
  },
  wordGroup: {
    display: 'flex', alignItems: 'center', gap: 6,
    flexWrap: 'wrap', justifyContent: 'center', direction: 'rtl', maxWidth: '100%',
  },
  wordLetterBox: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 46, height: 58, borderRadius: 14, boxSizing: 'border-box',
    background: '#fff', border: '2px solid #EDE5D8',
    fontSize: '2rem', fontWeight: 800, color: '#1A2B4A', padding: '0 6px',
  },
  blank: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
    minWidth: 50, height: 58, borderRadius: 14,
    fontSize: '2rem', fontWeight: 800, transition: 'all 0.3s', padding: '0 6px',
  },
  blankOpen:  { background: '#FBF3DF', border: '3px dashed #E8B84B', color: '#B07F1E' },
  blankShown: { background: '#DCF3E8', border: '3px solid #2ABB7A', color: '#17784C' },
  gentleFeedback: {
    padding: '10px 18px', borderRadius: 14, fontSize: '1rem', fontWeight: 800, textAlign: 'center',
    background: '#FBF3DF', color: '#8A6212', border: '1.5px solid #F1DDA6',
  },
  optRow: { display: 'grid', gap: 9, width: '100%', boxSizing: 'border-box' },
  optBtn: {
    width: '100%', minHeight: 64, maxHeight: 92,
    aspectRatio: '1',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 18, border: '2px solid #fff',
    background: '#fff', fontSize: '1.9rem', fontWeight: 800, cursor: 'pointer',
    transition: 'all 0.18s', fontFamily: 'inherit', color: '#1A2B4A',
    boxSizing: 'border-box', boxShadow: '0 4px 10px rgba(26,43,74,0.08)',
  },
  optCorrect: { background: '#1E9E64', borderColor: '#1E9E64', borderBottomColor: '#17784C', color: '#fff', opacity: 1 },
  optTried:   { background: '#FBF3DF', border: '2px dashed #E8B84B', borderBottom: '6px solid #E8B84B', opacity: 0.75 },
  goldBtn: {
    width: '100%', minHeight: 58, borderRadius: 18, background: '#E8B84B', color: '#1A2B4A',
    border: 'none', borderBottom: '6px solid #C99A2E', fontSize: '1.15rem', fontWeight: 900,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  whiteBtn: {
    width: '100%', minHeight: 54, borderRadius: 18, background: '#fff', color: '#1A2B4A',
    border: '2px solid #EDE5D8', borderBottom: '5px solid #E2D6C2', fontSize: '1.05rem', fontWeight: 800,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  buddy: {
    marginTop: 'auto', paddingTop: 8, display: 'flex', alignItems: 'flex-end', gap: 6,
    alignSelf: 'flex-start', pointerEvents: 'none',
  },
  buddyImg: { width: 84, height: 104, objectFit: 'contain', flexShrink: 0 },
  buddyBubble: {
    marginBottom: 64, maxWidth: 220, background: '#fff', color: '#5A3FBF', borderRadius: '18px 18px 18px 6px',
    padding: '9px 13px', fontSize: '.92rem', fontWeight: 800, boxShadow: '0 6px 16px rgba(26,43,74,0.16)',
  },
};
