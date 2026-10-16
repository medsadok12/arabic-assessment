'use client';
import { useEffect, useRef, useState } from 'react';
import { speechChunks, pickArabicVoice } from '../lib/story-speech';

/* ════════════════════════════════════════════════════════════════
   صوت قراءة القصة — زر مستقل تحت كل صفحة
   • useStoryNarration: عنصر <audio> واحد مشترك لكل الصفحات (تتغيّر src فقط).
     شرط ضروري على آيباد/آيفون: Safari لا يشغّل تلقائياً إلا عنصراً سبق أن
     شغّله الطفل بلمسة، لذا لا يُعاد إنشاء العنصر لكل صفحة، وتُضبط src
     ويُستدعى play() داخل معالج اللمسة نفسه.
   • كل زر يشغّل صوت صفحته فقط — لا قراءة لصفحتين معاً.
   • قلب الصفحة يوقف صوت أي صفحة لم تعد ظاهرة.
   • صفحة بلا تسجيل من المعلم تُقرأ بصوت الجهاز (speechSynthesis) جملةً جملة،
     فيظهر الزر تحت كل صفحة في كل قصة تلقائياً. يختفي فقط إن لم يكن في الجهاز
     صوت عربي (بدل أن يقرأها صوت إنجليزي بلا معنى). lib/story-speech.js
   • «قلب تلقائي» (اختياري، محفوظ في localStorage): بعد انتهاء صوت صفحة يكمل
     التالية، ويقلب الكتاب عند الحاجة، ويتوقف عند صفحة ليس لها ما يُسمَع.
════════════════════════════════════════════════════════════════ */

const AUTO_KEY = 'aarem-story-autoflip';

/* ── أنماط الأزرار ثلاثية الأبعاد (لا تكفي الأنماط المضمَّنة لحالة :active) ── */
const CSS = `
  .snb { position:relative; overflow:hidden; display:inline-flex; align-items:center; justify-content:center; gap:8px;
    min-width:180px; min-height:58px; padding:0 26px 4px; border:none; border-radius:18px;
    background:linear-gradient(180deg,#F2CD6E 0%,#E8B84B 100%); color:#1A2B4A;
    font-family:inherit; font-size:1.12rem; font-weight:900; cursor:pointer; user-select:none;
    box-shadow:0 6px 0 #B8892A, 0 12px 22px rgba(26,43,74,.28);
    transform:translateY(0); transition:transform .08s ease, box-shadow .08s ease;
    -webkit-tap-highlight-color:transparent; }
  .snb:hover { filter:brightness(1.03); }
  .snb:active { transform:translateY(5px); box-shadow:0 1px 0 #B8892A, 0 4px 10px rgba(26,43,74,.25); }
  .snb:focus-visible { outline:3px solid #1A2B4A; outline-offset:4px; }
  .snb.on { background:linear-gradient(180deg,#26406b 0%,#1A2B4A 100%); color:#fff;
    box-shadow:0 6px 0 #0c172b, 0 12px 22px rgba(26,43,74,.35); }
  .snb.on:active { box-shadow:0 1px 0 #0c172b, 0 4px 10px rgba(26,43,74,.3); }
  .snb-bar { position:absolute; right:0; bottom:0; height:6px; background:#1A2B4A; transition:width .25s linear; }
  .snb.on .snb-bar { background:#E8B84B; }
  .snb-round { min-width:0; width:70px; height:70px; min-height:0; padding:0; border-radius:50%; font-size:1.7rem; }
  .snb-ring { position:absolute; inset:3px; pointer-events:none; }
  .snb-hint { margin-top:10px; color:#1A2B4A; font-size:.8rem; font-weight:800; text-align:center; }
  .snb-auto { display:inline-flex; align-items:center; gap:6px; border-radius:20px; padding:5px 12px;
    font-family:inherit; font-size:.74rem; font-weight:900; cursor:pointer; white-space:nowrap;
    border:2px solid #EDE5D8; background:#fff; color:#1A2B4A; -webkit-tap-highlight-color:transparent; }
  .snb-auto.on { border-color:#1A2B4A; background:#1A2B4A; color:#fff; }
`;

export function useStoryNarration({ pageAudio = [], pageTexts = [], visiblePages = [], hasNext = false, onAdvance }) {
  const audioRef = useRef(null);
  const pageRef  = useRef(null);  // الصفحة المحمَّلة الآن (متزامن فوراً بلا انتظار رسم)
  const autoRef  = useRef(false); // شغّل أول صفحة ظاهرة تلقائياً بعد القلب
  const modeRef  = useRef(null);  // 'audio' تسجيل المعلم | 'tts' صوت الجهاز
  const ttsRef   = useRef({ token: 0, chunks: [], idx: 0, timer: null });
  const finishRef = useRef(null); // أحدث نسخة من finishPage لاستدعاءات صوت الجهاز

  const [page,      setPage]      = useState(null);
  const [playing,   setPlaying]   = useState(false);
  const [waiting,   setWaiting]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [endedPage, setEndedPage] = useState(null);
  const [failedPage,setFailedPage]= useState(null);
  const [autoFlip,  setAutoFlip]  = useState(false);
  const [voice,     setVoice]     = useState(null); // صوت عربي في الجهاز (null = لا يوجد)

  /* للصفحة ما يُسمَع: تسجيل المعلم، أو نصها مع صوت عربي في الجهاز */
  const canPlay  = (p) => !!pageAudio[p] || (!!voice && !!pageTexts[p]);
  const count    = Math.max(pageAudio.length, pageTexts.length);
  const hasAudio = Array.from({ length: count }, (_, i) => i).some(canPlay);

  useEffect(() => {
    try { setAutoFlip(localStorage.getItem(AUTO_KEY) === '1'); } catch {}
  }, []);

  /* الأصوات تُحمَّل متأخرة في بعض المتصفحات — نعيد الاختيار عند وصولها */
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const pick = () => setVoice(pickArabicVoice(synth.getVoices()));
    pick();
    synth.addEventListener?.('voiceschanged', pick);
    return () => synth.removeEventListener?.('voiceschanged', pick);
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    return () => { el?.pause(); stopTts(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* إيقاف صوت الجهاز: رقم جديد يُسكت كل الاستدعاءات القديمة قبل cancel() */
  function stopTts() {
    const t = ttsRef.current;
    t.token += 1;
    clearTimeout(t.timer);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  /* قراءة صفحة بصوت الجهاز من الجملة idx — كل الجمل تُضاف لطابور القراءة
     داخل اللمسة نفسها (شرط سفاري على آيفون وآيباد) */
  function speakPage(p, idx) {
    const synth = window.speechSynthesis;
    const t = ttsRef.current;
    if (pageRef.current !== p || !t.chunks.length) t.chunks = speechChunks(pageTexts[p]);
    const chunks = t.chunks;
    if (!chunks.length || idx >= chunks.length) { finishRef.current?.(p); return; }
    const token = t.token;
    const n = chunks.length;
    let started = false;
    t.idx = idx;
    synth.resume(); // كروم يعلق أحياناً في حالة «إيقاف مؤقت» فيبتلع القراءة
    for (let i = idx; i < n; i++) {
      const u = new SpeechSynthesisUtterance(chunks[i]);
      u.lang  = voice?.lang || 'ar-SA';
      if (voice) u.voice = voice;
      u.rate  = 0.85;
      u.onstart = () => {
        if (ttsRef.current.token !== token) return;
        started = true;
        clearTimeout(ttsRef.current.timer);
        ttsRef.current.idx = i;
        setWaiting(false); setPlaying(true);
        setProgress(i / n);
      };
      u.onboundary = (e) => {
        if (ttsRef.current.token !== token || typeof e.charIndex !== 'number') return;
        setProgress((i + Math.min(1, e.charIndex / chunks[i].length)) / n);
      };
      u.onend = () => {
        if (ttsRef.current.token !== token) return;
        ttsRef.current.idx = i + 1;
        setProgress((i + 1) / n);
        if (i === n - 1) finishRef.current?.(p);
      };
      u.onerror = (e) => {
        if (ttsRef.current.token !== token || e?.error === 'interrupted' || e?.error === 'canceled') return;
        stopTts();
        setPlaying(false); setWaiting(false); setFailedPage(p);
      };
      synth.speak(u);
    }
    /* متصفح منع القراءة بصمت (بلا خطأ ولا بداية) ← رسالة «جرّب مرة ثانية» لا انتظار أبدي */
    t.timer = setTimeout(() => {
      if (ttsRef.current.token !== token || started) return;
      stopTts();
      setPlaying(false); setWaiting(false); setFailedPage(p);
    }, 8000);
  }

  /* تشغيل صفحة — يُستدعى مباشرة داخل معالج اللمسة (أو بعد انتهاء صفحة سابقة) */
  const start = (p, fromStart) => {
    const el  = audioRef.current;
    const src = pageAudio[p];
    if (!canPlay(p)) return;
    const changed = pageRef.current !== p;
    if (changed) {
      pageRef.current = p;
      ttsRef.current.chunks = [];
      setPage(p);
      setProgress(0);
    } else if (fromStart) {
      setProgress(0);
    }
    setEndedPage(null);
    setFailedPage(null);
    setWaiting(true);

    if (src) {
      if (!el) return;
      stopTts();
      modeRef.current = 'audio';
      if (changed || el.getAttribute('src') !== src) el.src = src;
      else if (fromStart) el.currentTime = 0;
      el.play()
        .then(() => setWaiting(false))
        .catch((e) => { setWaiting(false); if (e?.name !== 'AbortError') setFailedPage(p); });
      return;
    }

    modeRef.current = 'tts';
    el?.pause();
    const resumeAt = changed || fromStart ? 0 : ttsRef.current.idx;
    stopTts();
    speakPage(p, resumeAt);
  };

  const toggle = (p) => {
    autoRef.current = false;
    const el = audioRef.current;
    if (pageRef.current === p && modeRef.current === 'audio' && el && !el.paused) { el.pause(); return; }
    if (pageRef.current === p && modeRef.current === 'tts' && (playing || waiting)) {
      stopTts(); setPlaying(false); setWaiting(false);   // «أكمل الاستماع» يبدأ من نفس الجملة
      return;
    }
    start(p, endedPage === p || failedPage === p);
  };

  const stop = () => {
    audioRef.current?.pause();
    stopTts();
    pageRef.current = null;
    modeRef.current = null;
    setPage(null); setPlaying(false); setWaiting(false); setProgress(0);
    setEndedPage(null); setFailedPage(null);
  };

  /* قلب الصفحة: أوقف صوت أي صفحة لم تعد ظاهرة، أو أكمل تلقائياً بعد قلب آلي */
  const visKey = visiblePages.join(',');
  useEffect(() => {
    if (autoRef.current) {
      autoRef.current = false;
      const first = visiblePages[0];
      if (first !== undefined && canPlay(first)) { start(first, true); return; }
    }
    if (pageRef.current !== null && !visiblePages.includes(pageRef.current)) stop();
  }, [visKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /* انتهت قراءة صفحة (تسجيلاً أو بصوت الجهاز) */
  const finishPage = (p) => {
    setPlaying(false);
    setWaiting(false);
    setProgress(1);
    if (autoFlip && p !== null) {
      const next = p + 1;
      if (next < count && canPlay(next)) {
        if (visiblePages.includes(next)) { start(next, true); return; }  // الصفحة المقابلة
        if (hasNext && onAdvance) { autoRef.current = true; onAdvance(); return; }
      }
    }
    setEndedPage(p);
  };
  useEffect(() => { finishRef.current = finishPage; });

  const toggleAuto = () => {
    setAutoFlip(v => {
      try { localStorage.setItem(AUTO_KEY, v ? '0' : '1'); } catch {}
      return !v;
    });
  };

  /* أحداث عنصر الصوت تخص تسجيل المعلم فقط — تُهمَل أثناء القراءة بصوت الجهاز */
  const onAudio = (fn) => (e) => { if (modeRef.current === 'audio') fn(e); };

  // عنصر الصوت المشترك + أنماط الأزرار (مرة واحدة) — يُرسَم مرة واحدة بجانب الأزرار
  const audioElement = hasAudio ? (
    <>
    <style dangerouslySetInnerHTML={{ __html: CSS }} />
    <audio
      ref={audioRef}
      preload="none"
      onPlay={onAudio(() => { setPlaying(true); setEndedPage(null); })}
      onPause={onAudio(() => setPlaying(false))}
      onEmptied={onAudio(() => setPlaying(false))}
      onWaiting={onAudio(() => setWaiting(true))}
      onPlaying={onAudio(() => setWaiting(false))}
      onEnded={onAudio(() => finishPage(pageRef.current))}
      onError={onAudio(() => { if (pageRef.current !== null) { setPlaying(false); setWaiting(false); setFailedPage(pageRef.current); } })}
      onTimeUpdate={onAudio((e) => {
        const { currentTime, duration } = e.currentTarget;
        if (Number.isFinite(duration) && duration > 0) setProgress(currentTime / duration);
      })}
    />
    </>
  ) : null;

  /* حالة زر صفحة بعينها — hasAudio: للصفحة ما يُسمَع (تسجيل أو صوت الجهاز) */
  const stateOf = (p) => {
    const active = page === p;
    return {
      hasAudio: canPlay(p),
      playing:  active && playing,
      waiting:  active && waiting,
      progress: active ? progress : 0,
      ended:    endedPage === p,
      failed:   failedPage === p,
    };
  };

  return { audioElement, hasAudio, stateOf, toggle, autoFlip, toggleAuto };
}


/* زر الاستماع لصفحة واحدة — variant: "pill" (تحت الصفحة) | "round" (عائم على الجوال) */
export function PageListenButton({ state, onClick, pageNumber, variant = 'pill' }) {
  if (!state.hasAudio) return null;
  const { playing, waiting, progress, ended, failed } = state;
  const icon  = waiting ? '⏳' : playing ? '⏸️' : ended ? '🔁' : '🔊';
  const label = waiting ? 'لحظة...'
              : playing ? 'إيقاف مؤقت'
              : ended   ? 'استمع مرة أخرى'
              : progress > 0 ? 'أكمل الاستماع'
              : 'استمع';
  const aria = playing ? `إيقاف صوت الصفحة ${pageNumber}` : `استمع إلى الصفحة ${pageNumber}`;

  if (variant === 'round') {
    const C = 2 * Math.PI * 30;
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
        <button type="button" className={`snb snb-round${playing ? ' on' : ''}`} onClick={onClick} aria-label={aria}>
          <svg className="snb-ring" viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="30" fill="none" stroke={playing ? '#E8B84B' : '#1A2B4A'} strokeWidth="4"
              strokeDasharray={C} strokeDashoffset={C * (1 - progress)} strokeLinecap="round"
              transform="rotate(-90 32 32)" style={{ transition:'stroke-dashoffset .25s linear' }} />
          </svg>
          <span aria-hidden="true">{icon}</span>
        </button>
        {failed && <div className="snb-hint" style={{ background:'#fff', borderRadius:10, padding:'3px 8px' }}>جرّب مرة ثانية 🌟</div>}
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
      <button type="button" className={`snb${playing ? ' on' : ''}`} onClick={onClick} aria-label={aria}>
        <span aria-hidden="true">{icon}</span>
        <span>{label}</span>
        <span className="snb-bar" style={{ width:`${progress * 100}%` }} aria-hidden="true" />
      </button>
      {failed && <div className="snb-hint">لم يعمل الصوت هذه المرة — جرّب مرة ثانية 🌟</div>}
    </div>
  );
}

/* مفتاح «قلب تلقائي» الصغير */
export function AutoFlipToggle({ on, onToggle, label = 'قلب تلقائي' }) {
  return (
    <>
      <button
        type="button"
        className={`snb-auto${on ? ' on' : ''}`}
        onClick={onToggle}
        aria-pressed={on}
        title="بعد انتهاء صوت الصفحة يكمل الصفحة التالية ويقلب الكتاب وحده"
      >
        🔄 {label}{on ? ' ✓' : ''}
      </button>
    </>
  );
}
