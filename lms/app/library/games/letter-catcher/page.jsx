'use client';
import useVerifiedTraining from '../../../../lib/use-verified-training';
import VerifiedTrainingStatus from '../../../../components/VerifiedTrainingStatus';
import LetterCatcherProgress from '../../../../components/LetterCatcherProgress';
import LetterCatcherWordFrame from '../../../../components/LetterCatcherWordFrame';
import LetterCatcherFahimOverlay from '../../../../components/LetterCatcherFahimOverlay';
import LetterCatcherWorldPath from './_world-path';

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getRole } from '../../../../lib/auth-role';
import { childFetch, getActiveChildTab } from '../../../../lib/child-fetch';
import { LC_DEFAULT_SETTINGS, LEN_NO_LIMIT, normalizeLcSettings, roundSize, pickRotation } from '../../../../lib/letter-catcher';
import { freshFetch } from '../../../../lib/fresh-fetch';
import { canonicalLcWord, normalizeLcCategory, lcCategoryKey, sortLcCategories, sortLcCategoryWords, pickLcOrderedRound, lcCategoryScene, normalizeLcCategoryResults } from '../../../../lib/letter-catcher-categories';
import { readLcCategorySeen, rememberLcAnsweredWord } from '../../../../lib/letter-catcher-progress-memory';
import { fitTileSize, compactTileStyle, compactRowStyle, compactGroupStyle, useElementWidth } from '../../../../lib/fit-tiles';
import { stripDia, getLetterForm } from '../../../../lib/letter-forms';
import { letterCatcherTiles, contextualTile, extendedChoiceLetter } from '../../../../lib/letter-catcher-tiles';
import { usesAnimalWordFrame, withSeparatedDammatan } from '../../../../lib/letter-catcher-word-frame';
import { playLetterCatcherWord } from '../../../../lib/letter-catcher-audio';
import { preloadLetterCatcherImage, warmLetterCatcherImages } from '../../../../lib/letter-catcher-images';
import { refreshLcRoundImages } from '../../../../lib/letter-catcher-live-images';
import { refreshLcRoundAudio } from '../../../../lib/letter-catcher-live-audio';
import { letterCatcherPictureLayout } from '../../../../lib/letter-catcher-picture';
import { createLetterCatcherAnswerFeedback, letterCatcherAnswerMatches } from '../../../../lib/letter-catcher-answer-feedback';
import { playCelebrationVideo } from '../../../../lib/celebration-video';
import { playAnimalFahimCelebration } from '../../../../lib/letter-catcher-animal-celebration';
import GameScene, { SceneThumb } from '../../../../components/GameScene';
// بطل الطالب من «عالم الأبطال» يحتفل معه في شاشة النهاية — المكوّن خفيف، وthree.js يُحمَّل عند ظهوره فقط
// (استيراد مباشر لا dynamic(): نحتاج ref ليقوم البطل بحركته الخاصة)
import HeroAvatar3D from '../../../../components/HeroAvatar3D';

/* teacher-only panel loads only when the teacher opens it — not in students' bundle */
const SettingsPanel = dynamic(() => import('./_teacher-panel'), { ssr: false, loading: () => null });
const FriendChallenge = dynamic(() => import('../../../../components/LetterCatcherDuel'), { ssr: false, loading: () => <div style={{ padding: 24, textAlign: 'center', color: '#1A2B4A' }}>نستعد للتحدّي…</div> });

/* ────────────────────────── fallback words (instant start) ─── */
const LC_FALLBACK = [
  { id:'f1',  word:'قِطَّةٌ', missing_letter:'ق', options:['ق','ك','ع','ج','ح'], emoji:'🐱', topic:'الحيوانات', grade_level:1, category:'الحيوانات' },
  { id:'f2',  word:'كَلْبٌ',  missing_letter:'ك', options:['ك','ق','ع','غ','ج'], emoji:'🐶', topic:'الحيوانات', grade_level:1, category:'الحيوانات' },
  { id:'f3',  word:'بَيْتٌ',  missing_letter:'ب', options:['ب','ت','ن','ف','ث'], emoji:'🏠', topic:'المنزل',    grade_level:1, category:'المنزل' },
  { id:'f4',  word:'شَمْسٌ',  missing_letter:'ش', options:['ش','س','ص','ض','ز'], emoji:'☀️', topic:'الطبيعة',   grade_level:1, category:'الطبيعة' },
  { id:'f5',  word:'نَجْمٌ',  missing_letter:'ن', options:['ن','م','ب','ت','ي'], emoji:'⭐', topic:'الطبيعة',   grade_level:1, category:'الطبيعة' },
  { id:'f6',  word:'سَمَكٌ',  missing_letter:'س', options:['س','ش','ص','ث','ز'], emoji:'🐟', topic:'الحيوانات', grade_level:1, category:'الحيوانات' },
  { id:'f7',  word:'تُفَّاحٌ', missing_letter:'ت', options:['ت','ث','ن','ب','ف'], emoji:'🍎', topic:'الفواكه', grade_level:1, category:'الفواكه' },
  { id:'f8',  word:'مَاءٌ',   missing_letter:'م', options:['م','ن','ب','ه','و'], emoji:'💧', topic:'الطبيعة',   grade_level:1, category:'الطبيعة' },
  { id:'f9',  word:'كِتَابٌ', missing_letter:'ك', options:['ك','ق','ع','غ','خ'], emoji:'📚', topic:'المدرسة',   grade_level:1, category:'المدرسة' },
  { id:'f10', word:'قَمَرٌ',  missing_letter:'ق', options:['ق','ك','ع','غ','خ'], emoji:'🌙', topic:'الطبيعة',   grade_level:1, category:'الطبيعة' },
];

const LC_CACHE_KEY = 'lc_words_cache_v3';
const LC_CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCachedWords() {
  try {
    const raw = localStorage.getItem(LC_CACHE_KEY);
    if (!raw) return null;
    const { words, ts } = JSON.parse(raw);
    if (Date.now() - ts > LC_CACHE_TTL) return null;
    return Array.isArray(words) ? words.map(canonicalLcWord) : null;
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
function readCategorySeen(userId, category) {
  return readLcCategorySeen(userId, getActiveChildTab(), category);
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
  'الأعداد':   { emoji:'🔢' },
  'الجوّ والفصول': { emoji:'⛅' },
  'المزرعة': { emoji:'🌾' },
  'المهن': { emoji:'🧑‍🔧' },
  'الرياضة والألعاب': { emoji:'⚽' },
  'الملابس والزينة': { emoji:'👕' },
  'أماكن من حولنا': { emoji:'🏙️' },
  'بلدان ومدن': { emoji:'🌍' },
  'الطبيعة': { emoji:'🏞️' },
};

/* ────────────────────── image with fallback ─────────────────── */
function preloadQuestionPicture(word) {
  return Promise.all([
    preloadLetterCatcherImage(word?.image_url),
    usesAnimalWordFrame(word)
      ? preloadLetterCatcherImage('/media/fahim-cheer-frames.webp')
      : Promise.resolve(),
  ]);
}

function WordImage({ imageUrl, emoji, size = 150 }) {
  const [err, setErr] = useState(false);
  const [ready, setReady] = useState(false);
  const [ratio, setRatio] = useState(1);
  const imageRef = useRef(null);
  const loaded = () => {
    const image = imageRef.current;
    if (!image?.naturalWidth || !image.naturalHeight) return;
    setRatio(image.naturalWidth / image.naturalHeight);
    setReady(true);
  };
  useIsoLayoutEffect(() => {
    // A warmed image is already decoded before the new question's first paint.
    if (imageRef.current?.complete) loaded();
  }, [imageUrl]);
  if (!imageUrl || err) return <div style={{ ...S.emojiBox, width: size, height: size, minWidth: 0, fontSize: size * 0.5 }}>{emoji || '❓'}</div>;
  return <div style={{ position: 'relative', height: size, width: Math.min(size * 1.2, size * ratio), maxWidth: '100%', minWidth: 0 }}>
    {!ready && <div style={{ ...S.emojiBox, position: 'absolute', inset: 0, width: '100%', height: '100%', fontSize: size * .45 }}>{emoji || '❓'}</div>}
    <img ref={imageRef} src={imageUrl} alt="" decoding="async" onLoad={loaded} onError={() => setErr(true)} style={{ display: 'block', height: '100%', width: '100%', objectFit: 'contain', borderRadius: 16, opacity: ready ? 1 : 0 }} />
  </div>;
}

/* سطح الفيديو ثابت المقاس حتى وهو مخفي. الصورة تنزاح بتحويل بصري فقط؛
   لا يتغير عرض الفيديو ولا يعاد توزيع البطاقة في كل إطار من حركة الدخول. */
function CelebrationPicture({ word, size, cheer, videoRef }) {
  const [pictureEl, setPictureEl] = useState(null);
  const [imageEl, setImageEl] = useState(null);
  const pictureWidth = useElementWidth(pictureEl);
  const imageWidth = useElementWidth(imageEl);
  const available = Math.max(0, pictureWidth - 20);
  const { videoWidth, imageScale, imageOffset, videoOffset } = letterCatcherPictureLayout({ available, size, imageWidth });
  const shown = cheer === 'in' || cheer === 'out';
  return (
    <div ref={setPictureEl} style={{ ...S.pictureCard, height: size + 20 }}>
      <div data-cheer={cheer || ''} aria-hidden={!shown} style={{
        ...S.cheerBox, width: videoWidth, height: videoWidth,
        opacity: cheer === 'in' ? 1 : 0,
        transform: `translate3d(calc(-50% + ${videoOffset + (shown ? 0 : 12)}px), -50%, 0)`,
      }}>
        <video ref={videoRef} poster="/media/elephant-poster.jpg" playsInline preload="auto" style={S.cheerVideo}>
          <source src="/media/elephant.mp4" type="video/mp4" />
          <source src="/media/elephant.webm" type="video/webm" />
        </video>
      </div>
      <div ref={setImageEl} style={{ ...S.wordPicture, transform: shown ? `translate3d(-${imageOffset}px, 0, 0) scale(${imageScale})` : 'translate3d(0, 0, 0) scale(1)' }}>
        <WordImage key={word.image_url || word.id} imageUrl={word.image_url} emoji={word.emoji} size={size} />
      </div>
    </div>
  );
}

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

// Keep the existing button and usual letter size; fit only an extended choice
// when its two-sided arms would overflow a narrow phone button. Shorten only
// the outer tips of those arms, without squeezing or resizing the letter body.
function AnswerChoiceLetter({ letter, form, baseSize }) {
  const text = extendedChoiceLetter(letter, form);
  const ref = useRef(null);
  const [fit, setFit] = useState(null);
  useIsoLayoutEffect(() => {
    const button = ref.current?.parentElement;
    if (!button) return;
    let active = true;
    const context = document.createElement('canvas').getContext('2d');
    const measure = () => {
      if (!active || !context || !button.clientWidth) return;
      const style = window.getComputedStyle(button);
      const size = parseFloat(style.fontSize);
      const available = Math.max(1, button.clientWidth - parseFloat(style.paddingLeft || 0) - parseFloat(style.paddingRight || 0) - 4);
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      context.direction = 'rtl';
      const metrics = context.measureText(text);
      const width = Math.max(1, metrics.width, (metrics.actualBoundingBoxLeft || 0) + (metrics.actualBoundingBoxRight || 0));
      const fitted = size * Math.min(1, available / width);
      const trim = context.measureText('ــ').width * (fitted / size) * .18;
      const nextFit = {
        size: fitted,
        right: text.startsWith('ــ') ? trim : 0,
        left: text.endsWith('ــ') ? trim : 0,
      };
      setFit(previous => previous && Object.keys(nextFit).every(key => Math.abs(previous[key] - nextFit[key]) < .1) ? previous : nextFit);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(button);
    document.fonts?.ready.then(measure);
    document.fonts?.addEventListener?.('loadingdone', measure);
    return () => { active = false; observer?.disconnect(); document.fonts?.removeEventListener?.('loadingdone', measure); };
  }, [text, baseSize]);
  return <span ref={ref} style={{ display: 'inline-block', minWidth: 0, maxWidth: '100%', fontSize: fit?.size ?? undefined, lineHeight: 1.4, whiteSpace: 'nowrap', direction: 'rtl', unicodeBidi: 'isolate', clipPath: fit && (fit.right || fit.left) ? `inset(-100% ${fit.right ? `${fit.right}px` : '-100%'} -100% ${fit.left ? `${fit.left}px` : '-100%'})` : undefined, transform: fit ? `translateX(${(fit.right - fit.left) / 2}px)` : undefined }}>{text}</span>;
}

/* مساحة الحركات جزء من الكلمة. نقيس خط النسخ نفسه بعد تحميله، لا عدد محارف Unicode،
   ثم نوسّط الرسم الفعلي (بما فيه الشدة والتنوين) داخل الإطار من دون فصل الحروف. */
function CompletedWord({ text, compact, children, separateTanwin = false }) {
  const displayText = separateTanwin ? withSeparatedDammatan(text) : text;
  const rowRef = useRef(null);
  const [fit, setFit] = useState(null);
  useIsoLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    let active = true;
    const context = document.createElement('canvas').getContext('2d');
    const measure = () => {
      if (!active || !context || !row.clientWidth) return;
      const style = window.getComputedStyle(row);
      const base = parseFloat(style.fontSize);
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      context.direction = 'rtl';
      context.textAlign = 'center';
      const metrics = context.measureText(displayText.replace(/\s+/g, ' ').trim());
      const inkWidth = (metrics.actualBoundingBoxLeft || 0) + (metrics.actualBoundingBoxRight || 0);
      const scale = Math.min(1, Math.max(1, row.clientWidth - 52) / Math.max(1, metrics.width, inkWidth));
      const hasBounds = Number.isFinite(metrics.fontBoundingBoxAscent) && Number.isFinite(metrics.fontBoundingBoxDescent);
      const nextFit = {
        size: base * scale,
        x: ((metrics.actualBoundingBoxLeft || 0) - (metrics.actualBoundingBoxRight || 0)) * scale / 2,
        y: hasBounds ? (metrics.fontBoundingBoxDescent - metrics.fontBoundingBoxAscent + metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) * scale / 2 : 0,
      };
      setFit(prev => prev && Math.abs(prev.size - nextFit.size) < 0.1 && Math.abs(prev.x - nextFit.x) < 0.1 && Math.abs(prev.y - nextFit.y) < 0.1 ? prev : nextFit);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(row);
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure);
    document.fonts?.addEventListener('loadingdone', measure);
    return () => {
      active = false;
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      document.fonts?.removeEventListener('loadingdone', measure);
    };
  }, [displayText, compact]);

  const height = compact ? 76 : 92;
  return (
    <div ref={rowRef} style={{ ...S.completedWordRow, minHeight: height, fontSize: compact ? '2.1rem' : '2.7rem' }}>
      {children}
      <div style={{ ...S.completedWordFrame, minHeight: height }}>
        <span dir="rtl" aria-label={separateTanwin ? text : undefined} style={{ ...S.completedWordText, fontSize: fit ? fit.size : 'inherit', transform: fit ? `translate(${fit.x}px, ${fit.y}px)` : undefined }}>{displayText}</span>
      </div>
    </div>
  );
}

/* ارتفاع الشاشة المرئي فعلاً (يتغير مع شريط المتصفح) — يختار أحجاماً أصغر للشاشات القصيرة */
function useViewportHeight() {
  const [h, setH] = useState(800);
  useEffect(() => {
    const on = () => setH(Math.round(window.visualViewport?.height || window.innerHeight));
    on();
    window.addEventListener('resize', on);
    window.visualViewport?.addEventListener('resize', on);
    return () => {
      window.removeEventListener('resize', on);
      window.visualViewport?.removeEventListener('resize', on);
    };
  }, []);
  return h;
}

/* ── تصميم «عوالم المجموعات» (2026-10-21): خلفية مرسومة لكل مجموعة (components/GameScene)،
   شرائط وبطاقة زجاجية، وألوان الهوية — لكل زر حرف حافة سفلية بدرجة من ألوانها، ولا أحمر عند الخطأ ── */
const TILE_TINTS = ['#E8B84B', '#A48BE6', '#8798B3', '#6CCFA0', '#D9CCB6'];
const MAX_TRIES  = 2; // محاولتان لكل كلمة قبل كشف الحرف
const CHEER_MS   = 3000; // نحافظ على جملة فهيم كاملة؛ لا يؤخر المقطع زر «التالي»
const CHEER_FADE = 400;  // اختفاء ناعم في آخر المقطع
const WORD_PAUSE = 120;  // استراحة قصيرة بعد نطق الكلمة، دون انتظار إضافي للانتقال

const fullWordOf = (wd) => (wd.word.includes('_') ? wd.word.replace('_', wd.missing_letter) : wd.word);
const ttsUrl     = (text) => `/api/faheem/tts?c=1&t=${encodeURIComponent(text)}`;

/* فهيم واقف في المشهد أسفل الشاشة مع كلمة تشجيع (أو زر «التالي» بجانبه) — ارتفاع ثابت */
function FaheemBuddy({ text, action, size = 66, hideMascot = false }) {
  return (
    <div style={{ ...S.buddy, height: size }}>
      <img src="/faheem-sm.webp" alt="فهيم" style={{ width: size * 0.82, height: size, objectFit: 'contain', flexShrink: 0, visibility: hideMascot ? 'hidden' : 'visible' }} />
      {action || <div style={S.buddyBubble} aria-live="polite">{text}</div>}
    </div>
  );
}

/* ═══════════════════════ MAIN COMPONENT ════════════════════════ */
export default function LetterCatcherGame() {
  const [phase,      setPhase]      = useState('start');
  const [dbWords,    setDbWords]    = useState([]);
  const [gameWords,  setGameWords]  = useState(() => {
    return LC_FALLBACK.map(canonicalLcWord).filter(
      w => w.word && w.missing_letter && Array.isArray(w.options) && w.options.filter(Boolean).length >= 2
    );
  });
  const [queue,      setQueue]      = useState([]);
  const [cur,        setCur]        = useState(0);
  const [score,      setScore]      = useState(0);
  const [chosen,     setChosen]     = useState(null);
  const [correct,    setCorrect]    = useState(null);
  const [wordFinished, setWordFinished] = useState(false);
  const [preparingPicture, setPreparingPicture] = useState(false);
  const pictureTransition = useRef(0);
  const nextInFlight = useRef(false);
  const answerFeedback = useRef(null);
  if (!answerFeedback.current) answerFeedback.current = createLetterCatcherAnswerFeedback();
  const confirmedAnswer = useRef(false);
  const [answerConfirmed, setAnswerConfirmed] = useState(false);
  const resetAnswerFeedback = useCallback(() => {
    answerFeedback.current.invalidate();
    confirmedAnswer.current = false;
    setAnswerConfirmed(false);
  }, []);
  /* محاولة ثانية (صفر إحباط): الحرف الخطأ الأول يبهت ويجرّب الطفل مرة أخرى قبل كشف الجواب.
     النقاط والنتيجة للمحاولة الأولى فقط — فتبقى نتائج المجموعة صادقة */
  const [tried,      setTried]      = useState([]);
  const [showCfg,    setShowCfg]    = useState(false);
  const [catMeta,    setCatMeta]    = useState({});
  const [isTeacher,        setIsTeacher]        = useState(false);
  const [contentSource,setContentSource]=useState('cached');
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
  const [settings, setSettings] = useState(() => normalizeLcSettings(LC_DEFAULT_SETTINGS));
  // Restore browser caches after hydration so the first render matches the server.
  useEffect(() => {
    const cached = getCachedWords();
    if (cached?.length) setGameWords(cached.map(canonicalLcWord).filter(
      w => w.word && w.missing_letter && Array.isArray(w.options) && w.options.filter(Boolean).length >= 2
    ));
    setSettings(getCachedSettings());
  }, []);
  const roundRef = useRef({ key: null, ids: [] });
  const [totalPoints,   setTotalPoints]   = useState(0);
  const [ptPopupKey,    setPtPopupKey]    = useState(0);
  const [ptPopupActive, setPtPopupActive] = useState(false);
  const [ptPopupAmount, setPtPopupAmount] = useState(0);
  const [catResults,    setCatResults]    = useState({});  // category → {correct,wrong,total}
  const [currentUser,   setCurrentUser]   = useState(null);
  const [duelProfile, setDuelProfile] = useState(null);
  const duelProfileOwner = useRef();
  /* عرض صف مربعات الكلمة — لتصغير مربعات الاسم المكوّن من كلمتين ليسع سطراً واحداً */
  const [wordRowEl, setWordRowEl] = useState(null);
  const wordRowWidth = useElementWidth(wordRowEl);
  const [wordControlsEl, setWordControlsEl] = useState(null);
  const wordControlsWidth = useElementWidth(wordControlsEl);
  const vh = useViewportHeight();

  /* شاشة اللعب بلا تمرير: الصورة وحدها تكبر وتصغر لتملأ ما بقي من الشاشة. نقيس الفراغ الفعلي
     بعد الرسم (يشمل حواف الشاشة الآمنة في التطبيق المثبّت وشريط المتصفح) ثم نعدّل الصورة بقدره */
  const stageRef  = useRef(null);
  const columnRef = useRef(null);
  const middleRef = useRef(null);
  const cardRef   = useRef(null);
  const [imgH, setImgH] = useState(150);
  const imgMax = vh >= 1000 ? 340 : 230; // الصورة أكبر بنحو 20% حين تسمح مساحة الشاشة
  useIsoLayoutEffect(() => {
    if (phase !== 'playing') return;
    const fit = () => {
      const st = stageRef.current, md = middleRef.current, cd = cardRef.current;
      if (!st || !md || !cd) return;
      const spare = (md.clientHeight - cd.offsetHeight) - (st.scrollHeight - st.clientHeight);
      setImgH(h => {
        const n = Math.max(64, Math.min(imgMax, Math.round(h + spare)));
        return Math.abs(n - h) < 2 ? h : n;
      });
    };
    fit();
    const ro = new ResizeObserver(fit);
    [stageRef.current, columnRef.current, middleRef.current, cardRef.current].forEach(el => el && ro.observe(el));
    return () => ro.disconnect();
  }, [phase, imgMax]);

  /* الصفحة نفسها لا ترتدّ ولا تتحرك تحت اللعبة — كل شاشة «مسرح» ثابت بحجم الشاشة */
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.overscrollBehavior;
    root.style.overscrollBehavior = 'none';
    return () => { root.style.overscrollBehavior = prev; };
  }, []);

  /* «اسمع الكلمة»: تسجيل المعلم إن وُجد، وإلا صوت فهيم البشري (مخزَّن لكل الطلاب c=1)،
     وصوت الجهاز احتياطاً. يُستدعى داخل اللمسة نفسها (شرط سفاري) */
  const wordPlayback = useRef(null);
  const stopWordAudio = useCallback(() => {
    wordPlayback.current?.();
    wordPlayback.current = null;
  }, []);
  const playWord = useCallback((wd) => {
    const text = fullWordOf(wd);
    stopWordAudio();
    wordPlayback.current = playLetterCatcherWord({ text, url: wd.audio_url || ttsUrl(text) });
  }, [stopWordAudio]);
  useEffect(() => stopWordAudio, [stopWordAudio]);

  /* يسمع الطفل الكلمة أولاً، ثم يظهر زر «التالي» دون انتظار انتهاء احتفال فهيم.
     يحتفظ فهيم بمقطعه وصوته الحاليين؛ يمكن للطفل متابعة القراءة أو الانتقال بنفسه.
     الكلمة كاملة ظاهرة طوال الوقت. صوت فهيم مدموج في مقطعه فيبقيان متزامنين.
     سفاري لا يسمح بصوت يبدأ بعد اللمسة بثوانٍ، فيُفتح صوت المقطع داخل اللمسة نفسها (تشغيل صامت
     ثم إيقاف فوري)، وإن مُنع رغم ذلك يظهر المقطع صامتاً */
  const cheerVidRef = useRef(null);
  const cheerTimers = useRef([]);
  const cheerRun    = useRef(0);   // كل احتفال برقم — ما يصل متأخراً من احتفال أُلغي يُهمل
  const fahimOn     = useRef(false);
  const cheerPlayback = useRef(null);
  const cheerPreparation = useRef(null);
  const animalCheer = useRef(false);
  const [cheer, setCheer] = useState(null); // null | 'word' | 'loading' | 'in' | 'out'
  const clearCheerTimers = () => { cheerTimers.current.forEach(clearTimeout); cheerTimers.current = []; };
  const clearCheer = useCallback(() => {
    cheerRun.current += 1;
    clearCheerTimers();
    cheerPreparation.current = null;
    cheerPlayback.current?.();
    cheerPlayback.current = null;
    fahimOn.current = false;
    try { cheerVidRef.current?.pause(); } catch {}
    setCheer(null);
  }, []);
  const startFahim = useCallback((run) => {
    if (run !== cheerRun.current || fahimOn.current) return;
    clearCheerTimers();
    stopWordAudio();
    fahimOn.current = true;
    cheerPreparation.current = null;
    const v = cheerVidRef.current;
    if (!v) { clearCheer(); return; }
    if (animalCheer.current) {
      cheerPlayback.current = playAnimalFahimCelebration(v, {
        isCurrent: () => run === cheerRun.current,
        onReady: () => setCheer('in'),
        onFade: () => setCheer('out'),
        onFinish: clearCheer,
      });
      return;
    }
    setCheer('loading');
    cheerPlayback.current = playCelebrationVideo(v, {
      isCurrent: () => run === cheerRun.current,
      onReady: () => setCheer('in'),
      onFade: () => setCheer('out'),
      onFinish: clearCheer,
      durationMs: CHEER_MS,
      fadeMs: CHEER_FADE,
    });
  }, [clearCheer, stopWordAudio]);
  const celebrate = useCallback((wd) => {
    const run = ++cheerRun.current;
    animalCheer.current = usesAnimalWordFrame(wd);
    const text = fullWordOf(wd);
    stopWordAudio();
    clearCheerTimers();
    fahimOn.current = false;
    setWordFinished(false);
    setCheer('word');
    let done = false;
    const afterWord = () => {
      if (done || run !== cheerRun.current || fahimOn.current) return;
      done = true;
      clearCheerTimers();
      setWordFinished(true);
      setCheer(null);
      cheerTimers.current = [setTimeout(() => startFahim(run), WORD_PAUSE)];
    };
    wordPlayback.current = playLetterCatcherWord({
      text, url: wd.audio_url || ttsUrl(text),
      onEnd: afterWord,
    });
  }, [stopWordAudio, startFahim]);
  useEffect(() => clearCheer, [clearCheer]);
  useEffect(() => { if (phase !== 'playing') clearCheer(); }, [phase, clearCheer]);
  // تجهيز البداية بينما السؤال ظاهر، بعيداً عن لحظة دخول فهيم.
  useEffect(() => {
    if (phase !== 'playing') return;
    const video = cheerVidRef.current;
    if (video) { video.pause(); try { video.currentTime = 0; } catch {} }
  }, [phase, cur]);
  /* صوت الكلمة يُجهَّز مع ظهور السؤال — فيُسمع فور الإجابة الصحيحة (يُخزَّن في المتصفح يوماً) */
  useEffect(() => {
    const wd = phase === 'playing' ? queue[cur] : null;
    if (wd && !wd.audio_url) fetch(ttsUrl(fullWordOf(wd))).catch(() => {});
    if (wd) {
      preloadLetterCatcherImage(wd.image_url);
      warmLetterCatcherImages(queue, cur);
    }
  }, [phase, cur, queue]);
  useEffect(() => () => {
    pictureTransition.current += 1; nextInFlight.current = false;
    answerFeedback.current.invalidate(); confirmedAnswer.current = false;
  }, []);

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
              setCatResults(normalizeLcCategoryResults(j.results ?? []));
            })
            .catch(() => {});
        }
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  // Read the photo of this tab's verified player, including a selected child.
  // Recheck on return so an account-photo edit appears without a new sign-in.
  useEffect(() => {
    if (!['start', 'duel'].includes(phase) || !settings.duel.enabled) return;
    const controller = new AbortController();
    let version = 0;
    const refreshProfile = async () => {
      if (document.hidden) return;
      const child = getActiveChildTab();
      if (duelProfileOwner.current !== child) {
        duelProfileOwner.current = child;
        setDuelProfile(null);
      }
      const requestVersion = ++version;
      try {
        const response = await childFetch('/api/games/letter-catcher/duel?profile=1', { cache: 'no-store', signal: controller.signal });
        const data = response.ok ? await response.json() : null;
        if (!controller.signal.aborted && requestVersion === version && getActiveChildTab() === child) setDuelProfile(data?.player || null);
      } catch {}
    };
    refreshProfile();
    window.addEventListener('focus', refreshProfile);
    window.addEventListener('pageshow', refreshProfile);
    document.addEventListener('visibilitychange', refreshProfile);
    return () => {
      controller.abort();
      window.removeEventListener('focus', refreshProfile);
      window.removeEventListener('pageshow', refreshProfile);
      document.removeEventListener('visibilitychange', refreshProfile);
    };
  }, [phase, settings.duel.enabled]);

  const isValid = w => w.word && w.missing_letter && Array.isArray(w.options) && w.options.filter(Boolean).length >= 2;

  /* ── load ALL words — teachers only (for word manager) ── */
  const loadWords = useCallback(async () => {
    if (!isTeacher) return;
    try {
      const res  = await freshFetch('/api/games/letter-catcher');
      const json = await res.json();
      setDbWords((json.words || []).filter(isValid).map(canonicalLcWord));
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
      setContentSource(json.source||'cached');
      if (json.settings) {
        const st = normalizeLcSettings(json.settings);
        setSettings(st);
        try { localStorage.setItem(LC_SETTINGS_KEY, JSON.stringify(st)); } catch {}
      }
      const fresh = (json.words || []).filter(isValid).map(canonicalLcWord);
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
      (json.categories || []).forEach(c => {
        const name = normalizeLcCategory(c.name);
        // Prefer a teacher's existing image over an old placeholder emoji.
        if (!m[name] || (c.image_url && !m[name].image_url) || (Boolean(c.image_url) === Boolean(m[name].image_url) && c.name === name)) {
          m[name] = { ...c, name };
        }
      });
      setCatMeta(m);
    } catch {}
  }, []);

  useEffect(() => { loadWords(); }, [loadWords]);
  useEffect(() => { loadGameWords(); }, [loadGameWords]);
  useEffect(() => { loadCatMeta(); }, [loadCatMeta]);

  // Fresh media also reaches an unfinished round without resetting it.
  useEffect(() => {
    setQueue(items => refreshLcRoundAudio(refreshLcRoundImages(items, gameWords), gameWords));
  }, [gameWords, queue]);

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

  // النتيجة تُكتب من الجولة المدقّقة؛ هذا الطلب قراءة للتقرير فقط.
  useEffect(() => {
    if (phase !== 'finished' || !currentUser) return;
    childFetch('/api/game-results?game=letter_catcher').then(r => {if(!r.ok)throw new Error();return r.json();}).then(j => {
      setCatResults(normalizeLcCategoryResults(j.results || []));
    }).catch(() => {});
  }, [phase, currentUser]);

  /* بطل الطالب (إن صنعه) — يُجلب مرة واحدة عند أول نهاية جولة، في عالم الاستوديو الشفاف */
  const [hero, setHero] = useState(null);
  const heroRef = useRef(null);
  const heroAsked = useRef(false);
  useEffect(() => {
    if (phase !== 'finished' || !currentUser || heroAsked.current) return;
    heroAsked.current = true;
    childFetch('/api/hero-config')
      .then(r => r.json())
      .then(d => { if (d?.look) setHero({ look: { ...d.look, world: 'studio' }, level: d.level ?? 0, letters: d.letters ?? [] }); })
      .catch(() => {});
  }, [phase, currentUser]);

  /* ── build round queue ── */
  const buildQueue = useCallback((words, optCount) => {
    return refreshLcRoundAudio(refreshLcRoundImages(words, gameWords), gameWords).map(w => {
      const correctLetter = stripDia(w.missing_letter);
      const form          = letterCatcherTiles(w).missingForm;
      const pool2         = (w.options || []).filter(Boolean).filter(o => stripDia(o) !== correctLetter);
      const distractors   = shuffle(pool2).slice(0, optCount - 1);
      const opts          = shuffle([w.missing_letter, ...distractors]);
      return { ...w, _opts: opts, _form: form };
    });
  }, [gameWords]);

  /* ── كلمات الجولة بالتدوير: ما لم يُجب عنه الطفل بعد في هذه المجموعة أولاً ── */
  const pickRoundWords = useCallback((words, catKey) => {
    const ordered = sortLcCategoryWords(words, catKey);
    const ids = ordered.map(w => String(w.id));
    const { key, ids: seen } = readCategorySeen(currentUser?.id, catKey);
    // Numbers stay in numeric order, including across shorter teacher-set rounds.
    const pickRound = lcCategoryKey(catKey) === 'numbers' ? pickLcOrderedRound : pickRotation;
    const { picked } = pickRound(ids, seen, roundSize(ordered.length, settings.words_per_round));
    roundRef.current = { key, ids, category: catKey };
    const byId = new Map(ordered.map(w => [String(w.id), w]));
    return picked.map(id => byId.get(id));
  }, [currentUser, settings.words_per_round]);

  const verified = useVerifiedTraining('letter_catcher', {
    onPoints: setTotalPoints,
    onIdentityChange: () => {
      resetAnswerFeedback();
      pictureTransition.current += 1; nextInFlight.current = false;
      setPreparingPicture(false); setWordFinished(false); stopWordAudio(); clearCheer();
      setPhase('start'); setQueue([]); setScore(0); setCatResults({});
    },
    onStart: async j => {
      resetAnswerFeedback();
      const transition = ++pictureTransition.current;
      // A resumed round keeps its exact question order and cursor.
      const category = j.category === '__all__' ? '__all__' : normalizeLcCategory(j.category);
      const nextQueue = buildQueue(j.items.map(canonicalLcWord), settings.options_count);
      const pool = category === '__all__' ? gameWords : gameWords.filter(w => normalizeLcCategory(w.category) === category);
      const { key } = readCategorySeen(currentUser?.id, category);
      roundRef.current = { key, ids: (pool.length ? pool : j.items).map(w => String(w.id)), category };
      const cursor = Math.max(0, j.summary.cursor);
      setPreparingPicture(true);
      if (!j.summary.complete) await preloadQuestionPicture(nextQueue[cursor]);
      if (transition !== pictureTransition.current) return;
      nextInFlight.current = false; setPreparingPicture(false); setWordFinished(false);
      setPendingCategory(undefined);
      setSelectedCategory(j.category === '__all__' ? null : j.category);
      setQueue(nextQueue); setCur(cursor); setScore(j.summary.correct);
      setChosen(null); setCorrect(null); setTried(j.snapshot.events.filter(e=>e.action==='answer'&&e.command.index===j.summary.cursor&&!e.right).map(e=>e.command.value)); setPhase(j.summary.complete ? 'finished' : 'playing');
    },
  });
  const startGame = catFilter => {
    if (preparingPicture || nextInFlight.current) return;
    const filtered = catFilter === null ? gameWords : gameWords.filter(w => w.category === catFilter);
    if (!filtered.length) return;
    const picked = pickRoundWords(filtered, catFilter ?? '__all__');
    if(contentSource==='fallback')verified.demo(picked,catFilter??'__all__');else verified.start(picked.map(w => w.id), catFilter ?? '__all__', cfg);
  };

  const pick = useCallback((opt) => {
    if (chosen !== null || tried.includes(opt) || answerFeedback.current.isPending() || !verified.canAct()) return;
    const w = queue[cur];
    answerFeedback.current.begin({ word: w, index: cur, option: opt, tried }, {
      // Feedback is part of the tap itself. Saving the answer is not a paint/audio gate.
      onPreview: attempt => {
        confirmedAnswer.current = false; setAnswerConfirmed(false);
        if (attempt.localRight) {
          const video = cheerVidRef.current;
          if (video) {
            try {
              const preparation = {};
              cheerPreparation.current = preparation;
              video.muted = true;
              video.play()?.then(() => {
                if (cheerPreparation.current !== preparation || fahimOn.current) return;
                video.pause();
                try { if (video.currentTime > 0) video.currentTime = 0; } catch {}
              }).catch(() => {});
            } catch { /* Optional video preparation must not block the word or saving. */ }
          }
          setChosen(opt); setCorrect(true);
          // Start the actual word once, inside the original gesture (also on Safari).
          celebrate(w);
        } else {
          const nextTried = [...attempt.priorTried, opt];
          setTried(nextTried);
          if (nextTried.length >= MAX_TRIES) { setChosen(opt); setCorrect(false); setWordFinished(true); }
        }
      },
      submit: (index, option, settle) => verified.answer(index, option, settle),
      onConfirmed: (j, attempt) => {
        confirmedAnswer.current = true; setAnswerConfirmed(true);
        const firstTry = attempt.priorTried.length === 0;
        const fullWord = fullWordOf(w);
        // Persistent results, progress and points remain server-authoritative.
        if (firstTry) {
          rememberLcAnsweredWord({
            userId: currentUser?.id, childId: getActiveChildTab(), word: w, round: roundRef.current,
          });
        }
        if (j.right) {
          setChosen(opt); setCorrect(true); setTried(attempt.priorTried);
          if (firstTry) {
            setScore(j.summary.correct);
            if (j.awarded > 0) { setPtPopupAmount(j.awarded); setPtPopupKey(k => k + 1); setPtPopupActive(true); }
            setTimeout(() => setPtPopupActive(false), 1200);
          }
          // A retry/confirmation must not repeat the word or the celebration.
          if (!attempt.localRight) celebrate(w);
          return;
        }
        if (attempt.localRight) { stopWordAudio(); clearCheer(); }
        if (firstTry) {
          childFetch('/api/flashcards/mistake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word_text: fullWord, topic: w.topic, grade_level: w.grade_level }) }).catch(() => {});
        }
        const nextTried = [...attempt.priorTried, opt];
        setTried(nextTried);
        const done = j.questionDone || nextTried.length >= MAX_TRIES;
        setChosen(done ? opt : null); setCorrect(done ? false : null); setWordFinished(Boolean(done));
      },
    });
  }, [chosen, tried, cur, queue, currentUser, celebrate, stopWordAudio, clearCheer, verified]);

  const next = useCallback(async () => {
    if (chosen === null || !wordFinished || !confirmedAnswer.current || nextInFlight.current || verified.busy || verified.pending) return;
    nextInFlight.current = true;
    const transition = ++pictureTransition.current;
    stopWordAudio();
    clearCheer();
    const n = cur + 1;
    setPreparingPicture(true);
    if (n < queue.length) await preloadQuestionPicture(queue[n]);
    if (transition !== pictureTransition.current) return;
    resetAnswerFeedback();
    nextInFlight.current = false; setPreparingPicture(false); setWordFinished(false);
    stopWordAudio();
    if (n >= queue.length) setPhase('finished');
    else { setCur(n); setChosen(null); setCorrect(null); setTried([]); }
  }, [cur, queue, chosen, wordFinished, stopWordAudio, clearCheer, resetAnswerFeedback, verified]);

  const restart = () => {
    // A legacy mixed Places round may finish after its content was split.
    // Its saved report stays intact; the next game starts from the new groups.
    const category = selectedCategory == null ? null : normalizeLcCategory(selectedCategory);
    if (category && !gameWords.some(w => w.category === category)) {
      setPhase('start'); setPendingCategory(undefined); setQueue([]); setCur(0);
      return;
    }
    startGame(category);
  };

  if (phase === 'duel') return <FriendChallenge settings={settings.duel} currentPlayer={duelProfile} onExit={() => {
    setPhase('start'); loadGameWords({ quiet: true });
    childFetch('/api/points').then(r => r.json()).then(j => setTotalPoints(j.points ?? 0)).catch(() => {});
  }} />;

  /* ══════════════════════ RENDER: START ══════════════════════ */
  if (phase === 'start') {
    const categories = sortLcCategories(gameWords.map(w => w.category).filter(Boolean));

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
      startGame(catArg);
    };

    return (
      <div key="start" style={S.stage}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <VerifiedTrainingStatus training={preparingPicture ? { ...verified, busy: true, note: 'لَحْظَةٌ… نَسْتَعِدُّ لِلَّعِبِ' } : verified} />
        </div>
        {/* non-blocking progress strip */}
        {loadProgress > 0 && loadProgress < 100 && (
          <div style={{ position:'fixed', top:0, left:0, right:0, height:3, zIndex:9999, background:'#EDE5D8' }}>
            <div style={{ height:'100%', width:`${loadProgress}%`, background:'#E8B84B', transition:'width .4s ease' }} />
          </div>
        )}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes lcModalIn {
            from { opacity:0; transform:scale(.88) translateY(24px); }
            to { opacity:1; transform:scale(1) translateY(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-lc-start-modal] { animation:none !important; }
          }
        ` }} />

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
            onClick={(e) => { if (e.target === e.currentTarget && !preparingPicture && !verified.busy) setPendingCategory(undefined); }}
          >
            <div data-lc-start-modal="" role="dialog" aria-modal="true" aria-label={`ابدأ ${modalCatLabel}`} style={{
              background:'#fff', borderRadius:28, padding:14, maxWidth:360, width:'100%',
              textAlign:'center', boxShadow:'0 24px 64px rgba(26,43,74,.4)',
              animation:'lcModalIn .28s cubic-bezier(.34,1.56,.64,1) both',
            }}>
              <div style={{ position:'relative', height:150, borderRadius:20, overflow:'hidden', marginBottom:16 }}>
                {pendingCategory === '__all__'
                  ? <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', height:'100%' }}>
                      {categories.slice(0, 3).map(c => <SceneThumb key={c} category={c} scene={lcCategoryScene(c)} />)}
                    </div>
                  : <SceneThumb category={pendingCategory} scene={lcCategoryScene(pendingCategory)} />}
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

              <button style={{ ...S.goldBtn, marginBottom:6 }} onClick={handleStartFromModal} disabled={preparingPicture || verified.busy || verified.pending} aria-busy={preparingPicture || verified.busy}>
                {preparingPicture || verified.busy ? 'لَحْظَةٌ… نَسْتَعِدُّ لِلَّعِبِ' : '🚀 ابدأ اللعبة'}
              </button>
              <button
                style={{ background:'none', border:'none', cursor:'pointer', color:'#1A2B4A', fontWeight:800, fontSize:'.95rem', fontFamily:'inherit', minHeight:44, padding:'0 12px' }}
                onClick={() => setPendingCategory(undefined)}
                disabled={preparingPicture || verified.busy}
              >
                ← رجوع للمجموعات
              </button>
            </div>
          </div>
        )}

        <LetterCatcherWorldPath
          categories={categories}
          gameWords={gameWords}
          catMeta={catMeta}
          categoryIcons={CAT_META}
          catResults={catResults}
          isTeacher={isTeacher}
          totalPoints={totalPoints}
          duelSettings={settings.duel}
          currentPlayer={duelProfile}
          onCategorySelect={setPendingCategory}
          onDuel={() => { stopWordAudio(); clearCheer(); setPendingCategory(undefined); setPhase('duel'); }}
          onSettings={() => setShowCfg(true)}
        />
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
      <div key="finished" style={S.stage}>
        <GameScene category={selectedCategory} scene={lcCategoryScene(selectedCategory)} />
        <div style={S.stageColumn}>
          <VerifiedTrainingStatus training={verified} />
          <div style={S.stageMiddle}>
            <div style={{ ...S.glassCard, alignItems: 'center', textAlign: 'center', gap: 14, padding: '26px 20px' }}>
              {hero && (
                <div style={{ width: '100%', height: vh < 600 ? 130 : 180, position: 'relative', margin: '-10px 0 -6px' }}>
                  <HeroAvatar3D ref={heroRef} look={hero.look} level={hero.level} letters={hero.letters} interactive={false}
                    label="بَطَلُكَ يَحْتَفِلُ مَعَكَ — الْمِسْهُ!"
                    onReady={() => setTimeout(() => (pct >= 50 ? heroRef.current?.special() : heroRef.current?.emote('clap')), 400)}
                    onTap={() => heroRef.current?.special()}
                    style={{ position: 'absolute', inset: 0 }} />
                </div>
              )}
              <div style={{ fontSize: '3rem', lineHeight: 1 }}>{'⭐'.repeat(stars)}</div>
              <h2 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, color: '#1A2B4A' }}>أَحْسَنْتَ!</h2>
              <div style={{ fontSize: '3.2rem', fontWeight: 900, color: '#1A2B4A', direction: 'ltr' }}>{score} / {queue.length}</div>
              <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#4A5A75', lineHeight: 1.8 }}>{msg}</p>
              <button style={S.goldBtn} onClick={restart} disabled={preparingPicture || verified.busy || verified.pending}>{preparingPicture ? 'لَحْظَةٌ…' : '🔄 العب مرة أخرى'}</button>
              <button
                style={S.whiteBtn}
                onClick={() => {
                  resetAnswerFeedback();
                  pictureTransition.current += 1; nextInFlight.current = false;
                  setPreparingPicture(false); setWordFinished(false); stopWordAudio(); clearCheer();
                  setPhase('start'); setPendingCategory(undefined); setQueue([]); setCur(0); setScore(0); setChosen(null); setCorrect(null); setTried([]);
                }}
              >🏠 اختر مجموعة أخرى</button>
              <Link href="/library" style={{ ...S.backLink, color: '#4A5A75', fontWeight: 700 }}>← العودة للمكتبة</Link>
            </div>
          </div>
          <FaheemBuddy text={pct >= 50 ? 'أَنْتَ صَيَّادُ حُرُوفٍ بَارِعٌ!' : 'كُلُّ مُحَاوَلَةٍ تَجْعَلُكَ أَقْوَى!'} />
        </div>
      </div>
    );
  }

  /* ══════════════════════ RENDER: PLAYING ══════════════════════ */
  const w    = queue[cur];
  const opts = w._opts || [];

  // الحركات تبقى مع حرفها داخل مربّع واحد؛ موضع الفراغ وأشكال الوصل تُحسب بالحروف فقط.
  const { displayLetters: letters, baseLetters, missingIndex: mi, letterGroups, displayWord: fullWordDisplay } = letterCatcherTiles(w);
  // Animal words alone use the approved whole-word frame, including in mixed rounds.
  const animalWordFrame = usesAnimalWordFrame(w);
  const isLast        = cur + 1 >= queue.length;

  // عبارة من كلمتين أو أكثر (مثل «حمار وحشي»): كل كلمة مجموعة مربعات مستقلة
  // وبينها مسافة — لا مربع فارغ للمسافة يبدو كأنه حرف ناقص، ولا تنكسر الكلمة
  // الواحدة على سطرين
  // اسم من كلمتين فأكثر: مربعات أصغر في سطر واحد (lib/fit-tiles.js). الكلمة الواحدة كما هي.
  const isPhrase = mi >= 0 && letterGroups.length > 1;
  const tileCount = letterGroups.reduce((n, g) => n + g.length, 0);
  const naturalTilesWidth = tileCount * 46 + (mi >= 0 ? 4 : 0) + Math.max(0, tileCount - letterGroups.length) * 6 + Math.max(0, letterGroups.length - 1) * 26;
  // Mirror the left control when space allows, so short words keep their exact
  // center. Longer words can use the empty right gutter rather than wrap or clip.
  const balanceListenRow = animalWordFrame || wordControlsWidth >= naturalTilesWidth + 112;
  const fitWordTiles = isPhrase || (wordRowWidth > 0 && naturalTilesWidth > wordRowWidth);
  const tightWordGaps = fitWordTiles && tileCount * 12 + Math.max(0, tileCount - letterGroups.length) * 4 + Math.max(0, letterGroups.length - 1) * 14 > wordRowWidth;
  const tileSize = fitWordTiles ? fitTileSize(wordRowWidth, tileCount, letterGroups.length, { max: isPhrase ? 40 : 46, ...(tightWordGaps ? { tileGap: 2, wordGap: 8 } : null) }) : null;
  const tile = fitWordTiles
    ? { ...compactTileStyle(tileSize), ...(!isPhrase ? { fontSize: `${2.35 * tileSize / 46}rem` } : null) }
    : null;

  const catLabel = selectedCategory ?? w.category ?? '';
  const retrying  = chosen === null && tried.length > 0;
  const fahimShown = cheer === 'in' || cheer === 'out';
  const buddyText = cheer === 'word' ? `🔊 ${fullWordDisplay}`
    : retrying ? 'جَرِّبْ مَرَّةً أُخْرَى، أَنْتَ قَرِيبٌ!' : 'هَيَّا يَا بَطَل، أَنْتَ تَسْتَطِيعُ!';

  /* شاشة ثابتة بلا تمرير (طلب الأستاذ محمد: «ثابتاً… وكل شيء موسّطاً وفي مكانه»):
     أحجام ثابتة لكل عنصر، وأصغر قليلاً في الشاشات القصيرة — والصورة تملأ الباقي (imgH) */
  const compact = vh < 600;
  const sz = compact
    ? { word: 46, opt: 54, pill: 38, foot: 56, pad: 10, gap: 8 }
    : { word: 58, opt: 70, pill: 46, foot: 72, pad: 14, gap: 10 };

  // سطر الحالة أعلى البطاقة: السؤال، أو «جرّب حرفاً آخر»، أو «أحسنت»، أو الحرف الصحيح
  // «أحسنت» تظهر مع فهيم وصوته معاً — أثناء نطق الكلمة يقول السطر «اسمع الكلمة» فقط
  const pill = correct === true
    ? fahimShown
      ? { text: animalWordFrame ? 'أَحْسَنْتَ!' : tried.length ? '✅ أَحْسَنْتَ! وَجَدْتَهُ 🎉' : '✅ أَحْسَنْتَ! 🎉', style: S.pillOk }
      : cheer === 'word' || cheer === 'loading'
        ? { text: '🔊 اِسْمَعِ الْكَلِمَةَ', style: null }
        : { text: 'اِقْرَأِ الْكَلِمَةَ', style: S.pillOk }
    : correct === false
      ? { text: `💡 قَرِيبٌ! الْحَرْفُ النَّاقِصُ هُوَ «${w.missing_letter}»`, style: S.pillSoft }
      : retrying
        ? { text: '🔁 قَرِيبٌ! جَرِّبْ حَرْفًا آخَرَ', style: S.pillSoft }
        : { text: 'اِخْتَرِ الْحَرْفَ النَّاقِصَ', style: null };

  return (
    <div key="playing" ref={stageRef} style={S.stage}>
      <style>{`
        @keyframes ptFloatUp {
          0%   { opacity: 1; transform: translateY(0) scale(1.25); }
          70%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-48px) scale(0.9); }
        }
        @keyframes lcWordReveal {
          0%   { opacity:0; transform:scale(.94); }
          100% { opacity:1; transform:scale(1); }
        }
        @keyframes lcWordFloat {
          0%,100% { transform:translateY(0px); }
          50%     { transform:translateY(-6px); }
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
      <GameScene category={catLabel} scene={lcCategoryScene(catLabel)} />

      <div ref={columnRef} style={S.stageColumn}>
        {animalWordFrame ? (
          // Reserve both the save message and final summary, so the last answer
          // cannot push the scene down when its second status line appears.
          <div style={{ minHeight: 'calc(2.34rem + 12px)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <VerifiedTrainingStatus training={verified} compact />
          </div>
        ) : <VerifiedTrainingStatus training={verified} compact />}
        <LetterCatcherProgress
          category={catLabel}
          totalPoints={totalPoints}
          score={score}
          completed={Math.min(queue.length, cur + (chosen !== null && answerConfirmed ? 1 : 0))}
          total={queue.length}
          motionEnabled={settings.progress_motion}
          pointsPopupKey={ptPopupKey}
          showPointsPopup={ptPopupActive}
          pointsAward={ptPopupAmount}
          onBack={() => {
            resetAnswerFeedback();
            pictureTransition.current += 1; nextInFlight.current = false;
            setPreparingPicture(false); setWordFinished(false);
            stopWordAudio(); clearCheer(); setPhase('start'); setQueue([]); setCur(0); setScore(0); setChosen(null); setCorrect(null); setTried([]);
          }}
        />

        {/* البطاقة في وسط المساحة المتبقية */}
        <div ref={middleRef} style={S.stageMiddle}>
          <div ref={cardRef} style={{ ...S.glassCard, padding: sz.pad, gap: sz.gap }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <h1 aria-live="polite" style={{ ...S.questionPill, ...pill.style, minHeight: sz.pill, fontSize: compact ? '1.12rem' : '1.25rem' }}>{pill.text}</h1>
              {animalWordFrame && <LetterCatcherFahimOverlay cheer={cheer} mediaRef={cheerVidRef} wordKey={w.id || cur} compact={compact} />}
            </div>

            {animalWordFrame ? (
              <div data-lc-animal-picture="" style={{ ...S.pictureCard, height: imgH + 20 }}>
                <WordImage key={w.image_url || w.id} imageUrl={w.image_url} emoji={w.emoji} size={imgH} />
              </div>
            ) : <CelebrationPicture word={w} size={imgH} cheer={cheer} videoRef={cheerVidRef} />}

            {/* ── ارتفاع محجوز للحركات قبل الإجابة وبعدها، حتى لا تقفز الصورة أو الأزرار ── */}
            <div ref={setWordControlsEl} style={{ ...S.wordControls, gridTemplateColumns: balanceListenRow ? '48px minmax(0, 1fr) 48px' : '48px minmax(0, 1fr)' }}>
              <button type="button" style={{ ...S.wordListenBtn, opacity: preparingPicture ? .55 : 1 }}
                disabled={preparingPicture || cheer === 'word' || cheer === 'loading'}
                onClick={() => { if (nextInFlight.current) return; clearCheer(); playWord(w); }}
                aria-label="اسمع الكلمة" title="اسمع الكلمة">
                <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></svg>
              </button>
              <div style={{ minWidth: 0, width: '100%', direction: 'rtl' }}>
            {correct === true ? (
              <CompletedWord key={cur} text={fullWordDisplay} compact={compact} separateTanwin={animalWordFrame}>
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
              </CompletedWord>
            ) : animalWordFrame ? (
              <LetterCatcherWordFrame key={cur} word={w} compact={compact} revealed={correct !== null} retryKey={tried.length} />
            ) : (
              <div key={`row-${cur}-${tried.length}`} ref={setWordRowEl} style={{ ...S.wordRow, ...(fitWordTiles ? compactRowStyle : null), ...(tightWordGaps ? { gap: 8 } : null), minHeight: compact ? 76 : 92, animation: tried.length ? 'lcWrongShake .45s cubic-bezier(.36,.07,.19,.97) both' : 'none' }}>
                {mi < 0 ? (
                  <>
                    <span style={{ ...S.wordLetterBox, height: sz.word }}>{fullWordDisplay}</span>
                    <span style={{ ...S.blank, ...S.blankOpen, height: sz.word }}>؟</span>
                  </>
                ) : letterGroups.map((group, gi) => (
                  <span key={gi} style={fitWordTiles ? { ...S.wordGroup, ...compactGroupStyle, ...(tightWordGaps ? { gap: 2 } : null) } : S.wordGroup}>
                    {group.map(i => {
                      const form = getLetterForm(baseLetters, i);
                      if (i === mi) {
                        return (
                          <span key={i} style={{ ...S.blank, height: sz.word, ...tile, ...(correct === null ? S.blankOpen : S.blankShown) }}>
                            {correct !== null ? contextualTile(letters[i], form) : '؟'}
                          </span>
                        );
                      }
                      return (
                        <span key={i} style={tile ? { ...S.wordLetterBox, height: sz.word, ...tile } : { ...S.wordLetterBox, height: sz.word }}>
                          {contextualTile(letters[i], form)}
                        </span>
                      );
                    })}
                  </span>
                ))}
              </div>
            )}
              </div>
              {balanceListenRow && <span aria-hidden="true" />}
            </div>

            <div style={{ ...S.optRow, gridTemplateColumns: `repeat(${Math.min(opts.length, 5)}, minmax(0, 1fr))` }}>
              {opts.filter(Boolean).map((opt, idx) => {
                const isRight  = letterCatcherAnswerMatches(opt, w.missing_letter);
                const isTried  = tried.includes(opt);
                const revealed = chosen !== null;
                let btn = { ...S.optBtn, maxHeight: sz.opt, fontSize: compact ? '1.95rem' : '2.3rem', borderBottom: `6px solid ${TILE_TINTS[idx % TILE_TINTS.length]}` };
                if (revealed) {
                  if (isRight)      btn = { ...btn, ...S.optCorrect };
                  else if (isTried) btn = { ...btn, ...S.optTried };
                  else              btn = { ...btn, opacity: 0.35 };
                } else if (isTried) btn = { ...btn, ...S.optTried };
                return (
                  <button key={`${cur}-${opt}-${idx}`} style={btn} onClick={() => pick(opt)} disabled={revealed || isTried || answerFeedback.current.isPending() || verified.busy || verified.pending} aria-label={`الحرف ${opt}`}>
                    <AnswerChoiceLetter letter={opt} form={w._form || 'isolated'} baseSize={compact ? '1.95rem' : '2.3rem'} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* الأسفل ثابت: فهيم يشجّع، وبعد الإجابة زر «التالي» بجانبه — لا شيء يدفع البطاقة */}
        <FaheemBuddy
          size={sz.foot}
          hideMascot={animalWordFrame || fahimShown}
          text={buddyText}
          action={chosen !== null && wordFinished && (
            <button style={{ ...S.goldBtn, minHeight: compact ? 50 : 56, flex: 1, opacity: preparingPicture ? .7 : 1 }} onClick={next} disabled={!answerConfirmed || preparingPicture || verified.busy || verified.pending} aria-busy={preparingPicture || !answerConfirmed}>
              {preparingPicture ? 'لَحْظَةٌ…' : isLast ? '🏁 النَّتِيجَةُ النِّهَائِيَّةُ' : 'التَّالِي ←'}
            </button>
          )}
        />
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
  backLink: { color: '#9ca3af', fontSize: '0.87rem', textDecoration: 'none', padding: '12px 0' }, // منطقة لمس ~44px دون تحريك ما حوله
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
  /* ── شاشة اللعب بعوالم المجموعات ──
     «مسرح» ثابت بحجم الشاشة: الصفحة خلفه لا تتحرك (حشوة body السفلية للجوال لا تضيف فراغاً)،
     ويمرّر داخله فقط ما يطول فعلاً — قائمة المجموعات، أو شاشة أفقية قصيرة جداً */
  stage: {
    position: 'fixed', inset: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'none',
    background: '#F4EFE6', direction: 'rtl', fontFamily: 'inherit',
  },
  stageColumn: {
    position: 'relative', zIndex: 1, width: '100%', maxWidth: 560, minHeight: '100%', margin: '0 auto',
    boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 8,
    padding: 'max(12px, env(safe-area-inset-top)) 12px max(10px, env(safe-area-inset-bottom))',
  },
  // المساحة بين الترويسة وفهيم: البطاقة في وسطها تماماً
  stageMiddle: { flex: '1 0 auto', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  glassHeader: {
    display: 'flex', flexDirection: 'column', gap: 6, padding: '6px 6px 8px', borderRadius: 26,
    background: 'rgba(255,255,255,0.62)', WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)',
    border: '1.5px solid rgba(255,255,255,0.85)', boxShadow: '0 8px 24px rgba(26,43,74,0.14)',
  },
  qCount: { fontSize: '.8rem', fontWeight: 800, color: '#1A2B4A', whiteSpace: 'nowrap' },
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
    flex: 1, minWidth: 0, textAlign: 'center', fontSize: '1.05rem', fontWeight: 900, color: '#1A2B4A',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  pointsPill: {
    display: 'inline-flex', alignItems: 'center', gap: 5, background: '#1A2B4A', color: '#fff',
    borderRadius: 999, padding: '8px 12px', fontWeight: 800, fontSize: '.95rem', whiteSpace: 'nowrap',
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
  // سطر الحالة: السؤال، ثم «أحسنت» أخضر أو تلميح ذهبي — في المكان نفسه فلا يتحرك شيء
  questionPill: {
    margin: 0, background: 'rgba(255,255,255,0.9)', borderRadius: 999, padding: '6px 12px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
    textAlign: 'center', fontSize: '1.15rem', fontWeight: 900, color: '#1A2B4A', lineHeight: 1.4,
  },
  pillOk:   { background: '#DCF3E8', color: '#17784C' },
  pillSoft: { background: '#FBF3DF', color: '#8A6212' },
  pictureCard: {
    position: 'relative', background: '#fff', borderRadius: 22, padding: 10, boxSizing: 'border-box',
    boxShadow: '0 4px 14px rgba(26,43,74,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    isolation: 'isolate',
  },
  wordPicture: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', maxWidth: '100%', minWidth: 0,
    transition: 'transform .28s ease-out', willChange: 'transform',
  },
  // زر الاستماع يسار الكلمة، خارج إطارها وبعيداً عن الصورة.
  wordControls: {
    display: 'grid', direction: 'ltr', gap: 8, alignItems: 'center', width: '100%', minWidth: 0,
  },
  wordListenBtn: {
    width: 48, height: 48, minWidth: 48, borderRadius: '50%', padding: 0,
    border: 'none', borderBottom: '4px solid #C99A2E', background: '#E8B84B', color: '#1A2B4A',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
    boxShadow: '0 4px 10px rgba(26,43,74,0.12)', cursor: 'pointer', touchAction: 'manipulation',
  },
  emojiBox: {
    width: 150, height: 150, background: '#FAF7F2', borderRadius: 20,
    fontSize: '4.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  completedWordRow: {
    position: 'relative', width: '100%', minWidth: 0, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible',
    fontFamily: 'inherit', fontWeight: 700,
  },
  completedWordFrame: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 'max-content', minWidth: 'min(132px, 100%)', maxWidth: '100%', boxSizing: 'border-box',
    padding: '4px 20px', borderRadius: 22, border: '2.5px solid #6CCFA0',
    background: 'linear-gradient(135deg,#F2FBF6,#DCF3E8)', overflow: 'visible',
    animation: 'lcGlowPulse 1.8s .4s ease-in-out infinite, lcWordReveal .4s ease-out both',
  },
  completedWordText: {
    display: 'block', flexShrink: 0, fontFamily: 'inherit', fontWeight: 700,
    color: '#1A2B4A', lineHeight: 1.8, whiteSpace: 'nowrap', textAlign: 'center',
    letterSpacing: 'normal', wordSpacing: 'normal', unicodeBidi: 'isolate', overflow: 'visible',
  },
  wordRow: {
    width: '100%',
    display: 'flex', alignItems: 'center', gap: '10px 26px',
    flexWrap: 'wrap', justifyContent: 'center', direction: 'rtl',
  },
  wordGroup: {
    display: 'flex', alignItems: 'center', gap: 6,
    flexWrap: 'wrap', justifyContent: 'center', direction: 'rtl', maxWidth: '100%',
  },
  // خط النسخ المدرسي (.game-font) يبدو أصغر من الكوفي بالحجم نفسه — الحروف أكبر قليلاً
  wordLetterBox: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 46, height: 58, borderRadius: 14, boxSizing: 'border-box',
    background: '#fff', border: '2px solid #EDE5D8',
    fontSize: '2.35rem', fontWeight: 800, color: '#1A2B4A', padding: '0 6px',
  },
  blank: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
    minWidth: 50, height: 58, borderRadius: 14,
    fontSize: '2.35rem', fontWeight: 800, transition: 'all 0.3s', padding: '0 6px',
  },
  blankOpen:  { background: '#FBF3DF', border: '3px dashed #E8B84B', color: '#B07F1E' },
  blankShown: { background: '#DCF3E8', border: '3px solid #2ABB7A', color: '#17784C' },
  optRow: { display: 'grid', gap: 9, width: '100%', boxSizing: 'border-box' },
  // مربّع يملأ عموده فقط: لا حدّ أدنى للارتفاع — مع aspectRatio كان يوسّع الزر فيخرج الصف عن البطاقة
  optBtn: {
    touchAction: 'manipulation',
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
  buddy: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', flexShrink: 0 },
  // مقطع فهيم بخلفية بيضاء داخل بطاقة الصورة البيضاء — لا إطار ظاهر للفيديو، وتنزاح الصورة بجانبه
  cheerBox: {
    position: 'absolute', top: '50%', left: '50%', overflow: 'hidden', borderRadius: 16,
    transition: 'transform .28s ease-out, opacity .25s ease-out', willChange: 'transform, opacity',
    contain: 'layout paint', pointerEvents: 'none',
  },
  cheerVideo: { display: 'block', width: '100%', height: '100%', objectFit: 'contain', background: '#fff' },
  buddyBubble: {
    maxWidth: 260, background: '#fff', color: '#5A3FBF', borderRadius: '18px 18px 18px 6px',
    padding: '9px 13px', fontSize: '1.02rem', fontWeight: 800, boxShadow: '0 6px 16px rgba(26,43,74,0.16)',
  },
};
