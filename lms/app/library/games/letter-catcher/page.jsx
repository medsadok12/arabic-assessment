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
import GameScene, { SceneThumb } from '../../../../components/GameScene';

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

/* ── رمز معروف لكل مجموعة (يظهر شارةً على صورة عالمها إن لم يضع المعلم صورة/رمزاً) ── */
const CAT_META = {
  'الحيوانات': { emoji:'🦁' },
  'الفواكه':   { emoji:'🍎' },
  'الغلال':    { emoji:'🍇' },
  'الخضروات':  { emoji:'🥦' },
  'الأشكال':   { emoji:'🔷' },
  'الأسرة':    { emoji:'👨‍👩‍👧‍👦' },
  'الألوان':   { emoji:'🎨' },
  'المدرسة':   { emoji:'📚' },
  'الطقس':     { emoji:'⛅' },
  'الأرقام':   { emoji:'🔢' },
};

/* ────────────────────── image with fallback ─────────────────── */
function WordImage({ imageUrl, emoji }) {
  const [err, setErr] = useState(false);
  if (!imageUrl || err) return <div style={S.emojiBox}>{emoji || '❓'}</div>;
  return <img src={imageUrl} alt="" style={S.wordImg} onError={() => setErr(true)} />;
}

/* ── تصميم «عوالم المجموعات» (2026-10-21): خلفية مرسومة لكل مجموعة (components/GameScene)،
   شرائط وبطاقة زجاجية، وألوان الهوية — لكل زر حرف حافة سفلية بدرجة من ألوانها، ولا أحمر عند الخطأ ── */
const TILE_TINTS = ['#E8B84B', '#A48BE6', '#8798B3', '#6CCFA0', '#D9CCB6'];
const MAX_TRIES  = 2; // محاولتان لكل كلمة قبل كشف الحرف

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
  /* محاولة ثانية (صفر إحباط): الحرف الخطأ الأول يبهت ويجرّب الطفل مرة أخرى قبل كشف الجواب.
     النقاط والنتيجة للمحاولة الأولى فقط — فتبقى نتائج المجموعة صادقة */
  const [tried,      setTried]      = useState([]);
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
    setCur(0); setScore(0); setChosen(null); setCorrect(null); setTried([]);
    setPhase('playing');
    window.scrollTo(0, 0); // البطاقة المختارة قد تكون أسفل القائمة — اللعبة تبدأ من أعلاها
  }, [gameWords, buildQueue, pickRoundWords, settings.options_count]);

  const pick = useCallback((opt) => {
    if (chosen !== null || tried.includes(opt)) return;
    const w        = queue[cur];
    const isRight  = stripDia(opt) === stripDia(w.missing_letter);
    const firstTry = tried.length === 0;
    const fullWord = w.word.includes('_') ? w.word.replace('_', w.missing_letter) : w.word;
    // الكلمة تُحسب «مرّ عليها» عند أول إجابة — ما لم يصله الطفل يبقى للجولة القادمة
    if (firstTry) {
      const { key, ids } = roundRef.current;
      if (key) writeSeen(key, markSeen(ids, readSeen(key), String(w.id)));
    }
    if (isRight) {
      setChosen(opt); setCorrect(true);
      if (firstTry) {
        setScore(s => s + 1);
        setPtPopupKey(k => k + 1);
        setPtPopupActive(true);
        setTimeout(() => setPtPopupActive(false), 1200);
        childFetch('/api/points', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'letter_catcher' }) }).then(r => r.json()).then(j => { if (j.points) setTotalPoints(j.points); }).catch(() => {});
      }
      if (w.audio_url) { try { new Audio(w.audio_url).play(); } catch {} }
      else speakArabic(fullWord);
      return;
    }
    // أول خطأ: الكلمة تذهب لبطاقات المراجعة (مرة واحدة)
    if (firstTry) {
      childFetch('/api/flashcards/mistake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word_text: fullWord, topic: w.topic, grade_level: w.grade_level }) }).catch(() => {});
    }
    const nextTried = [...tried, opt];
    setTried(nextTried);
    if (nextTried.length >= MAX_TRIES) { setChosen(opt); setCorrect(false); }
  }, [chosen, tried, cur, queue]);

  const next = useCallback(() => {
    stopWordAudio();
    const n = cur + 1;
    if (n >= queue.length) setPhase('finished');
    else { setCur(n); setChosen(null); setCorrect(null); setTried([]); }
  }, [cur, queue.length, stopWordAudio]);

  const restart = useCallback(() => {
    const filtered = selectedCategory === null
      ? gameWords
      : gameWords.filter(w => w.category === selectedCategory);
    if (filtered.length === 0) return;
    setQueue(buildQueue(pickRoundWords(filtered, selectedCategory ?? '__all__'), settings.options_count));
    setCur(0); setScore(0); setChosen(null); setCorrect(null); setTried([]);
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
    const modalEmoji    = pendingCategory === '__all__' ? '🌟' : (modalCatObj?.emoji || CAT_META[pendingCategory]?.emoji || null);

    const handleStartFromModal = () => {
      const catArg = pendingCategory === '__all__' ? null : pendingCategory;
      setPendingCategory(undefined);
      startGame(catArg);
    };

    const resultChips = (res) => (
      <span style={{ display: 'inline-flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={S.chipOk}>✓ {res.correct}</span>
        <span style={S.chipSoft}>✗ {res.wrong}</span>
      </span>
    );
    const starsOf = (res) => {
      const pct = res ? Math.round((res.correct / res.total) * 100) : null;
      return pct === null ? 0 : pct >= 80 ? 3 : pct >= 50 ? 2 : 1;
    };

    return (
      <div style={S.scenePage}>
        {/* non-blocking progress strip */}
        {loadProgress > 0 && loadProgress < 100 && (
          <div style={{ position:'fixed', top:0, left:0, right:0, height:3, zIndex:9999, background:'#EDE5D8' }}>
            <div style={{ height:'100%', width:`${loadProgress}%`, background:'#E8B84B', transition:'width .4s ease' }} />
          </div>
        )}
        <style>{`
          @keyframes lcCatIn {
            0%  { opacity:0; transform:scale(.6) translateY(16px); }
            60% { transform:scale(1.04) translateY(0); }
            100%{ opacity:1; transform:scale(1); }
          }
          @keyframes lcModalIn {
            0%  { opacity:0; transform:scale(.88) translateY(24px); }
            100%{ opacity:1; transform:scale(1)   translateY(0); }
          }
          .lc-cat {
            cursor:pointer;
            transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s ease;
          }
          .lc-cat:hover  { transform:translateY(-4px) scale(1.03); box-shadow:0 18px 36px rgba(26,43,74,.22) !important; }
          .lc-cat:active { transform:scale(0.96); }
          @media (prefers-reduced-motion: reduce) { .lc-cat, .lc-anim { animation:none !important; transition:none !important; } }
        `}</style>

        {/* مرجٌ هادئ خلف قائمة المجموعات — وكل بطاقة تُري عالمها */}
        <GameScene scene="meadow" />

        {isTeacher && showCfg && (
          <SettingsPanel cfg={cfg} onChange={setCfg} settings={settings} onSettingsSaved={(st) => { setSettings(st); try { localStorage.setItem(LC_SETTINGS_KEY, JSON.stringify(st)); } catch {} }} onClose={() => setShowCfg(false)} dbWords={dbWords} onRefresh={refreshAfterEdit} catMeta={catMeta} onCatMetaRefresh={loadCatMeta} />
        )}

        {/* ── STEP 2 MODAL: settings + start button ── */}
        {pendingCategory !== undefined && (
          <div
            style={{
              position:'fixed', inset:0, zIndex:800,
              background:'rgba(26,43,74,.5)', WebkitBackdropFilter:'blur(4px)', backdropFilter:'blur(4px)',
              display:'flex', alignItems:'center', justifyContent:'center',
              padding:20,
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setPendingCategory(undefined); }}
          >
            <div role="dialog" aria-modal="true" aria-label={`ابدأ ${modalCatLabel}`} style={{
              background:'#fff', borderRadius:28, padding:14, maxWidth:360, width:'100%',
              textAlign:'center', boxShadow:'0 24px 64px rgba(26,43,74,.4)',
              animation:'lcModalIn .28s cubic-bezier(.34,1.56,.64,1) both',
            }}>
              <div style={{ position:'relative', height:150, borderRadius:20, overflow:'hidden', marginBottom:16 }}>
                {pendingCategory === '__all__'
                  ? <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', height:'100%' }}>
                      {categories.slice(0, 3).map(c => <SceneThumb key={c} category={c} />)}
                    </div>
                  : <SceneThumb category={pendingCategory} />}
                <span style={{ position:'absolute', bottom:10, right:10, display:'inline-flex', alignItems:'center', gap:6, background:'#1A2B4A', color:'#fff', borderRadius:999, padding:'6px 14px', fontWeight:800, fontSize:'.95rem' }}>
                  {modalCatObj?.image_url
                    ? <img src={modalCatObj.image_url} alt="" style={{ width:24, height:24, borderRadius:6, objectFit:'cover' }} />
                    : modalEmoji && <span aria-hidden="true">{modalEmoji}</span>}
                  {modalCatLabel}
                </span>
              </div>

              <h3 style={{ margin:'0 0 14px', fontSize:'1.25rem', fontWeight:900, color:'#1A2B4A' }}>
                جَاهِزٌ لِلصَّيْدِ؟ 🎯
              </h3>

              <div style={{ ...S.statsRow, marginBottom:16 }}>
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

              <button style={{ ...S.goldBtn, marginBottom:6 }} onClick={handleStartFromModal}>
                🚀 ابدأ اللعبة
              </button>
              <button
                style={{ background:'none', border:'none', cursor:'pointer', color:'#1A2B4A', fontWeight:800, fontSize:'.95rem', fontFamily:'inherit', minHeight:44, padding:'0 12px' }}
                onClick={() => setPendingCategory(undefined)}
              >
                ← رجوع للمجموعات
              </button>
            </div>
          </div>
        )}

        <div style={{ ...S.sceneColumn, maxWidth: 680 }}>
          <div style={S.glassBar}>
            <Link href="/library" style={S.roundBlueBtn} aria-label="العودة للمكتبة">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
            </Link>
            <div style={S.barTitle}>صَيَّادُ الْحُرُوفِ</div>
            <span style={S.pointsPill}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#E8B84B" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" /></svg>
              {totalPoints.toLocaleString('en-US')}
            </span>
          </div>

          {isTeacher && (
            <button style={S.teacherBtn} onClick={() => setShowCfg(true)}>⚙️ الإعدادات</button>
          )}

          <div style={{ ...S.glassCard, flexDirection: 'row', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
            <img src="/faheem.png" alt="فهيم" style={{ width: 66, height: 80, objectFit: 'contain', flexShrink: 0 }} />
            <div style={{ flex: 1, textAlign: 'right' }}>
              <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#1A2B4A' }}>اِخْتَرْ مَجْمُوعَتَكَ!</h1>
              <p style={{ margin: '4px 0 0', fontSize: '.92rem', fontWeight: 700, color: '#5A3FBF', lineHeight: 1.7 }}>كُلُّ مَجْمُوعَةٍ عَالَمٌ جَدِيدٌ — اِصْطَدِ الْحَرْفَ النَّاقِصَ 🎯</p>
            </div>
          </div>

          {/* ── empty / lock ── */}
          {gameWords.length === 0 ? (
            <div style={{ ...S.glassCard, alignItems: 'center', textAlign: 'center', padding: '28px 20px' }}>
              {isTeacher ? (
                <>
                  <div style={{ fontSize:'3rem' }}>📭</div>
                  <p style={{ color:'#1A2B4A', fontSize:'.97rem', fontWeight:700, lineHeight:1.9, margin:0 }}>
                    عذراً، لا توجد كلمات مضافة.<br />أضف كلمات أولاً من لوحة الإعدادات.
                  </p>
                  <button style={S.whiteBtn} onClick={() => setShowCfg(true)}>⚙️ إضافة كلمات</button>
                </>
              ) : (
                <>
                  <div style={{ fontSize:'3rem' }}>🔒</div>
                  <p style={{ color:'#1A2B4A', fontSize:'.97rem', fontWeight:700, lineHeight:1.9, margin:0 }}>
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
                const allStars = starsOf(allRes);
                return (
                  <button
                    type="button"
                    className="lc-cat lc-anim"
                    style={{ ...S.playAllCard, animation:'lcCatIn .4s cubic-bezier(.34,1.56,.64,1) both' }}
                    onClick={() => setPendingCategory('__all__')}
                  >
                    <span style={S.playAllStar} aria-hidden="true">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="#1A2B4A"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" /></svg>
                    </span>
                    <span style={{ flex:1, textAlign:'right', display:'flex', flexDirection:'column', gap:2 }}>
                      <span style={{ fontSize:'1.1rem', fontWeight:900, color:'#1A2B4A' }}>العب الكل</span>
                      <span style={{ fontSize:'.8rem', fontWeight:700, color:'#4A5A75' }}>{gameWords.length} كلمة من كل العوالم</span>
                      {allRes && (
                        <span style={{ display:'flex', alignItems:'center', gap:8, marginTop:3, flexWrap:'wrap' }}>
                          <span style={{ fontSize:'.85rem', color:'#B07F1E' }}>{'★'.repeat(allStars)}{'☆'.repeat(3 - allStars)}</span>
                          {resultChips(allRes)}
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize:'1.4rem', color:'#1A2B4A', flexShrink:0 }} aria-hidden="true">←</span>
                  </button>
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
                  <div style={S.catGrid}>
                    {sorted.map((cat, idx) => {
                                            const custom   = catMeta[cat];
                      const count    = gameWords.filter(w => w.category === cat).length;
                      const res      = catResults[cat];
                      const stars    = starsOf(res);
                      const unlocked = isTeacher || idx === 0 || !!catResults[sorted[idx - 1]];
                      const prevCat  = sorted[idx - 1];
                      return (
                        <button
                          type="button"
                          key={cat}
                          className={unlocked ? 'lc-cat lc-anim' : 'lc-anim'}
                          aria-disabled={!unlocked}
                          aria-label={unlocked ? cat : `${cat} — مقفلة، أكمل ${prevCat} أولاً`}
                          style={{
                            ...S.catCard,
                            animation: `lcCatIn .45s ${Math.min(idx + 1, 10) * 0.05}s cubic-bezier(.34,1.56,.64,1) both`,
                            cursor: unlocked ? 'pointer' : 'not-allowed',
                          }}
                          onClick={() => unlocked && setPendingCategory(cat)}
                        >
                          <span style={S.catThumb}>
                            <SceneThumb category={cat} />
                            {/* شارة المجموعة: صورة/رمز المعلم أو رمز معروف — لا رموز عشوائية فوق العالم */}
                            {(custom?.image_url || custom?.emoji || CAT_META[cat]) && (
                              <span style={S.catBadge} aria-hidden="true">
                                {custom?.image_url
                                  ? <img src={custom.image_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                  : (custom?.emoji || CAT_META[cat].emoji)}
                              </span>
                            )}
                            {idx === 0 && <span style={S.startHere}>ابدأ هنا ⭐</span>}
                            {/* مقفلة: العالم يظهر خافتاً بقفل — يتشوّق الطفل لما ينتظره */}
                            {!unlocked && <span style={S.lockOverlay} aria-hidden="true">🔒</span>}
                          </span>
                          <span style={S.catName}>{cat}</span>
                          {!unlocked ? (
                            <span style={S.lockedNote}>أكمل «{prevCat}» أولاً</span>
                          ) : res ? (
                            <span style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                              <span style={{ fontSize:'.85rem', color:'#B07F1E', letterSpacing:1 }}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span>
                              {resultChips(res)}
                            </span>
                          ) : (
                            <span style={{ fontSize:'.75rem', color:'#4A5A75', fontWeight:700 }}>{count} كلمة</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          <Link href="/library" style={S.backPill}>← العودة للمكتبة</Link>
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
              onClick={() => { setPhase('start'); setPendingCategory(undefined); setQueue([]); setCur(0); setScore(0); setChosen(null); setCorrect(null); setTried([]); }}
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
  const retrying  = chosen === null && tried.length > 0;
  const buddyText = correct === true ? (tried.length ? 'أَحْسَنْتَ! وَجَدْتَهُ بِنَفْسِكَ!' : 'أَحْسَنْتَ يَا بَطَل!')
    : correct === false ? 'لَا بَأْسَ، تَعَلَّمْنَا حَرْفًا جَدِيدًا!'
    : retrying ? 'جَرِّبْ مَرَّةً أُخْرَى، أَنْتَ قَرِيبٌ!'
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
            onClick={() => { stopWordAudio(); setPhase('start'); setQueue([]); setCur(0); setScore(0); setChosen(null); setCorrect(null); setTried([]); }}
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
                  {tried.length ? '✅ أَحْسَنْتَ! وَجَدْتَهُ 🎉' : '✅ أَحْسَنْتَ! 🎉'}
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
            <div key={`row-${cur}-${tried.length}`} ref={setWordRowEl} style={{ ...S.wordRow, ...(isPhrase ? compactRowStyle : null), animation: tried.length ? 'lcWrongShake .45s cubic-bezier(.36,.07,.19,.97) both' : 'none' }}>
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

          {/* الخطأ بلا أحمر (صفر إحباط): محاولة ثانية أولاً، ثم يظهر الحرف الصحيح بالأخضر */}
          {retrying && (
            <div style={S.gentleFeedback} role="status">
              🔁 قَرِيبٌ! اِسْمَعِ الْكَلِمَةَ وَجَرِّبْ حَرْفًا آخَرَ
            </div>
          )}
          {correct === false && (
            <div style={S.gentleFeedback}>
              💡 قَرِيبٌ! الْحَرْفُ النَّاقِصُ هُوَ «{w.missing_letter}»
            </div>
          )}

          <div style={{ ...S.optRow, gridTemplateColumns: `repeat(${Math.min(opts.length, 5)}, minmax(0, 1fr))` }}>
            {opts.filter(Boolean).map((opt, idx) => {
              const isRight  = stripDia(opt) === stripDia(w.missing_letter);
              const isTried  = tried.includes(opt);
              const revealed = chosen !== null;
              let btn = { ...S.optBtn, borderBottom: `6px solid ${TILE_TINTS[idx % TILE_TINTS.length]}` };
              if (revealed) {
                if (isRight)      btn = { ...btn, ...S.optCorrect };
                else if (isTried) btn = { ...btn, ...S.optTried };
                else              btn = { ...btn, opacity: 0.35 };
              } else if (isTried) btn = { ...btn, ...S.optTried };
              return (
                <button key={`${opt}-${idx}`} style={btn} onClick={() => pick(opt)} disabled={revealed || isTried} aria-label={`الحرف ${opt}`}>
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
  statsRow: {
    display: 'flex', alignItems: 'center', background: '#FAF7F2', borderRadius: 14,
    padding: '14px 20px', width: '100%', justifyContent: 'space-around', boxSizing: 'border-box',
  },
  statBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  statNum: { fontSize: '1.6rem', fontWeight: 900, color: '#1A2B4A' },
  statLbl: { fontSize: '0.85rem', color: '#4A5A75', fontWeight: 700 },
  statDiv: { width: 1, height: 36, background: '#EDE5D8' },
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
  /* ── شاشة اختيار المجموعات: بطاقة لكل عالم ── */
  teacherBtn: {
    alignSelf: 'flex-start', background: 'rgba(255,255,255,0.85)', border: '1.5px solid #EDE5D8', borderRadius: 999,
    padding: '8px 16px', fontSize: '.88rem', fontWeight: 800, color: '#1A2B4A', cursor: 'pointer', fontFamily: 'inherit', minHeight: 40,
  },
  playAllCard: {
    display: 'flex', alignItems: 'center', gap: 14, width: '100%', boxSizing: 'border-box', padding: '14px 16px',
    borderRadius: 22, border: '1.5px solid rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.78)',
    WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)', boxShadow: '0 10px 26px rgba(26,43,74,0.16)',
    fontFamily: 'inherit', textAlign: 'right',
  },
  playAllStar: {
    width: 52, height: 52, borderRadius: '50%', background: '#E8B84B', borderBottom: '4px solid #C99A2E',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxSizing: 'border-box',
  },
  catGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 12 },
  catCard: {
    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
    padding: 6, paddingBottom: 10, borderRadius: 22, border: '2px solid #fff', background: '#fff',
    boxShadow: '0 8px 22px rgba(26,43,74,0.16)', fontFamily: 'inherit', overflow: 'hidden', minHeight: 44,
  },
  catThumb: { position: 'relative', display: 'block', width: '100%', height: 96, borderRadius: 16, overflow: 'hidden' },
  catBadge: {
    position: 'absolute', bottom: 6, right: 6, width: 36, height: 36, borderRadius: '50%', background: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', boxShadow: '0 2px 8px rgba(26,43,74,0.25)',
  },
  startHere: {
    position: 'absolute', top: 6, right: 6, background: '#E8B84B', color: '#1A2B4A', borderRadius: 999,
    padding: '2px 8px', fontSize: '.66rem', fontWeight: 900, boxShadow: '0 2px 6px rgba(26,43,74,0.25)',
  },
  catName: { fontSize: '.85rem', fontWeight: 900, color: '#1A2B4A', lineHeight: 1.35, textAlign: 'center', padding: '0 2px' },
  lockOverlay: {
    position: 'absolute', inset: 0, background: 'rgba(26,43,74,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.9rem',
  },
  lockedNote: {
    fontSize: '.7rem', fontWeight: 800, color: '#4A5A75', background: '#EDE5D8', borderRadius: 999,
    padding: '3px 8px', lineHeight: 1.5, textAlign: 'center',
  },
  chipOk:   { fontSize: '.72rem', background: '#DCF3E8', color: '#17784C', borderRadius: 999, padding: '2px 8px', fontWeight: 800 },
  chipSoft: { fontSize: '.72rem', background: '#EDE5D8', color: '#4A5A75', borderRadius: 999, padding: '2px 8px', fontWeight: 800 },
  backPill: {
    alignSelf: 'center', marginTop: 8, background: 'rgba(255,255,255,0.85)', borderRadius: 999, padding: '10px 18px',
    color: '#1A2B4A', fontWeight: 800, fontSize: '.9rem', textDecoration: 'none',
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
  // مربّع يملأ عموده فقط: لا حدّ أدنى للارتفاع — مع aspectRatio كان يوسّع الزر فيخرج الصف عن البطاقة
  optBtn: {
    width: '100%', maxHeight: 92,
    aspectRatio: '1 / 1',
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
