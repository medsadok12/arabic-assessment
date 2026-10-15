'use client';
import { useEffect, useRef, useState } from 'react';

/* ════════════════════════════════════════════════════════════════
   زر الاستماع لقراءة الصفحة — للطفل (صوت مستقل لكل صفحة)

   tracks   : أصوات الصفحات الظاهرة الآن بترتيب القراءة [{ page, src }]
              (صفحة واحدة على الجوال، صفحتان متقابلتان على الحاسوب)
   hasNext  : توجد صفحة تالية يمكن قلبها
   onAdvance: يقلب الكتاب للصفحة التالية (لوضع «اقلب الصفحات وحدك»)
   variant  : "bar" شريط كامل | "fab" زر دائري عائم (كتاب الجوال بملء الشاشة)

   سلوك المحاذاة: قلب الصفحة يُوقف الصوت فوراً ويجهّز صوت الصفحة الجديدة.
   على الحاسوب: بعد انتهاء صوت الصفحة اليمنى يُكمل تلقائياً صوت المقابلة.
   وضع «اقلب الصفحات وحدك»: بعد آخر صوت ظاهر يُقلب الكتاب ويبدأ صوت التالية.

   عنصر <audio> واحد يبقى حياً عبر قلب الصفحات (تتغير src فقط) — شرط
   ضروري على آيباد/آيفون: Safari لا يسمح بتشغيل صوت تلقائي إلا لعنصر
   سبق أن شغّله الطفل بلمسة، فإعادة إنشاء العنصر تكسر التشغيل المتواصل.
════════════════════════════════════════════════════════════════ */

const GOLD  = '#E8B84B';
const NAVY  = '#1A2B4A';
const CREAM = '#FAF7F2';
const SAND  = '#EDE5D8';
const AUTO_KEY = 'aarem-story-autoflip';

export default function StoryAudioPlayer({ tracks = [], hasNext = false, onAdvance, variant = 'bar', style }) {
  const audioRef = useRef(null);
  const autoRef  = useRef(false); // شغّل تلقائياً بعد تغيّر المسار (صفحة مقابلة أو قلب تلقائي)

  const [idx,      setIdx]      = useState(0);
  const [playing,  setPlaying]  = useState(false);
  const [waiting,  setWaiting]  = useState(false);
  const [progress, setProgress] = useState(0);   // 0..1 للمسار الحالي
  const [ended,    setEnded]    = useState(false);
  const [failed,   setFailed]   = useState(false);
  const [autoFlip, setAutoFlip] = useState(false);

  /* إعادة الضبط عند قلب الصفحة (تغيّر الأصوات الظاهرة) — أثناء العرض لا في effect */
  const tracksKey = tracks.map(t => `${t.page}|${t.src}`).join(',');
  const [prevKey, setPrevKey] = useState(tracksKey);
  if (prevKey !== tracksKey) {
    setPrevKey(tracksKey);
    setIdx(0); setProgress(0); setEnded(false); setFailed(false);
    setPlaying(false); setWaiting(false);
  }

  const current = tracks[idx] || null;

  useEffect(() => {
    try { setAutoFlip(localStorage.getItem(AUTO_KEY) === '1'); } catch {}
  }, []);

  /* إيقاف الصوت عند مغادرة الصفحة أو تبديل التخطيط */
  useEffect(() => {
    const el = audioRef.current;
    return () => { el?.pause(); };
  }, []);

  const play = async () => {
    const el = audioRef.current;
    if (!el || !current) return;
    setFailed(false); setEnded(false); setWaiting(true);
    try {
      await el.play();
    } catch (e) {
      if (e?.name !== 'AbortError') setFailed(true);
    }
    setWaiting(false);
  };

  /* بعد تغيّر src (صفحة جديدة أو الصفحة المقابلة): تشغيل تلقائي إن كان مطلوباً */
  useEffect(() => {
    if (!autoRef.current) return;
    autoRef.current = false;
    if (current) play();
  }, [tracksKey, idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    const el = audioRef.current;
    if (!el || !current) return;
    if (!el.paused) { el.pause(); return; }
    if (ended) {               // إعادة الاستماع من أول صفحة ظاهرة
      setEnded(false);
      setProgress(0);
      if (idx !== 0) { autoRef.current = true; setIdx(0); return; }
      el.currentTime = 0;
    }
    play();
  };

  const restart = () => {
    const el = audioRef.current;
    if (!el || !current) return;
    setEnded(false); setProgress(0);
    if (idx !== 0) { autoRef.current = true; setIdx(0); return; }
    el.currentTime = 0;
    if (el.paused) play();
  };

  const onEnded = () => {
    setPlaying(false);
    if (idx + 1 < tracks.length) {           // الصفحة المقابلة على الحاسوب
      autoRef.current = true;
      setProgress(0);
      setIdx(idx + 1);
    } else if (autoFlip && hasNext && onAdvance) {   // اقلب الصفحة وتابع
      autoRef.current = true;
      onAdvance();
    } else {
      setEnded(true);
      setProgress(1);
    }
  };

  const toggleAuto = () => {
    setAutoFlip(v => {
      try { localStorage.setItem(AUTO_KEY, v ? '0' : '1'); } catch {}
      return !v;
    });
  };

  /* النقر على شريط التقدّم ينقل الصوت — الشريط يمتلئ من اليمين (اتجاه العربية) */
  const seek = (e) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return;
    const rect  = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (rect.right - e.clientX) / rect.width));
    el.currentTime = ratio * el.duration;
    setProgress(ratio);
    setEnded(false);
  };

  const audio = (
    <audio
      ref={audioRef}
      src={current?.src || undefined}
      preload="none"
      onPlay={() => { setPlaying(true); setEnded(false); }}
      onPause={() => setPlaying(false)}
      onEmptied={() => { setPlaying(false); setWaiting(false); }}
      onWaiting={() => setWaiting(true)}
      onPlaying={() => setWaiting(false)}
      onEnded={onEnded}
      onError={() => { if (current) { setPlaying(false); setWaiting(false); setFailed(true); } }}
      onTimeUpdate={(e) => {
        const { currentTime, duration } = e.currentTarget;
        if (Number.isFinite(duration) && duration > 0) setProgress(currentTime / duration);
      }}
    />
  );

  const pageLabel = current ? `الصفحة ${current.page + 1}` : '';
  const many      = tracks.length > 1;

  /* ══ زر دائري عائم ══ */
  if (variant === 'fab') {
    const deg = Math.round(progress * 360);
    return (
      <div style={{ ...style, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        {audio}
        {current && hasNext && onAdvance && (
          <button
            type="button"
            onClick={toggleAuto}
            aria-pressed={autoFlip}
            aria-label="اقلب الصفحات وحدك مع الصوت"
            style={{
              border: `2px solid ${autoFlip ? NAVY : 'rgba(26,43,74,.25)'}`,
              background: autoFlip ? NAVY : 'rgba(255,255,255,.92)',
              color: autoFlip ? '#fff' : NAVY,
              borderRadius: 20, padding: '4px 10px', fontSize: '.68rem', fontWeight: 900,
              fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,.12)', WebkitTapHighlightColor: 'transparent',
            }}
          >
            🔄 {autoFlip ? 'قلب تلقائي ✓' : 'قلب تلقائي'}
          </button>
        )}
        {current && (
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? 'إيقاف الصوت مؤقتاً' : `استمع إلى ${pageLabel}`}
            style={{
              width: 66, height: 66, borderRadius: '50%', border: 'none', padding: 4,
              background: `conic-gradient(${NAVY} ${deg}deg, rgba(26,43,74,.18) ${deg}deg)`,
              boxShadow: '0 6px 20px rgba(26,43,74,.28)', cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', height: '100%', borderRadius: '50%',
              background: GOLD, color: NAVY, fontSize: '1.6rem', lineHeight: 1,
            }}>
              {waiting ? '⏳' : playing ? '⏸️' : ended ? '🔁' : '🔊'}
            </span>
          </button>
        )}
        {current && failed && (
          <span style={{ background: '#fff', color: NAVY, borderRadius: 12, padding: '4px 10px', fontSize: '.72rem', fontWeight: 800, boxShadow: '0 2px 10px rgba(0,0,0,.12)', maxWidth: 170, textAlign: 'center' }}>
            لم يعمل الصوت هذه المرة — جرّب مرة ثانية 🌟
          </span>
        )}
      </div>
    );
  }

  /* ══ شريط كامل ══ */
  const label = waiting      ? '⏳ لحظة واحدة...'
              : playing      ? '⏸️ إيقاف مؤقت'
              : ended        ? '🔁 استمع مرة أخرى'
              : progress > 0 ? '▶️ أكمل الاستماع'
              : many         ? '🔊 استمع إلى الصفحتين'
              :                '🔊 استمع إلى هذه الصفحة';

  return (
    <div style={{
      direction: 'rtl', background: CREAM, border: `2px solid ${SAND}`, borderRadius: 20,
      padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: '0 4px 16px rgba(26,43,74,.06)', ...style,
    }}>
      {audio}

      {!current ? (
        /* صفحة بلا صوت — يبقى الشريط مكانه حتى لا يقفز الكتاب عند قلب الصفحات */
        <div style={{ minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', color: NAVY, fontWeight: 800, fontSize: '1rem', textAlign: 'center' }}>
          📖 هذه الصفحة بلا صوت — اقرأها بنفسك يا بطل 💪
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={toggle}
              style={{
                flex: '1 1 160px', minHeight: 56, border: 'none', borderRadius: 16,
                background: GOLD, color: NAVY, fontFamily: 'inherit',
                fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(232,184,75,.45)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {label}
            </button>
            {(progress > 0 || playing || idx > 0) && (
              <button
                type="button"
                onClick={restart}
                aria-label="الاستماع من البداية"
                style={{
                  minHeight: 56, minWidth: 56, border: `2px solid ${SAND}`, borderRadius: 16,
                  background: '#fff', color: NAVY, fontFamily: 'inherit',
                  fontSize: '.95rem', fontWeight: 800, cursor: 'pointer', padding: '0 16px',
                }}
              >
                ↺ من البداية
              </button>
            )}
            {hasNext && onAdvance && (
              <button
                type="button"
                onClick={toggleAuto}
                aria-pressed={autoFlip}
                title="بعد انتهاء الصوت تُقلب الصفحة وحدها ويبدأ صوت الصفحة التالية"
                style={{
                  minHeight: 56, border: `2px solid ${autoFlip ? NAVY : SAND}`, borderRadius: 16,
                  background: autoFlip ? NAVY : '#fff', color: autoFlip ? '#fff' : NAVY,
                  fontFamily: 'inherit', fontSize: '.9rem', fontWeight: 800,
                  cursor: 'pointer', padding: '0 14px',
                }}
              >
                🔄 {autoFlip ? 'اقلب الصفحات وحدك ✓' : 'اقلب الصفحات وحدك'}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {many && (
              <span style={{ color: NAVY, fontSize: '.8rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                {(playing || progress > 0) ? `🔈 ${pageLabel}` : `${tracks.length} صفحات`}
              </span>
            )}
            <div
              onClick={seek}
              role="progressbar"
              aria-label={`تقدّم الاستماع — ${pageLabel}`}
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}
              style={{ flex: 1, height: 12, borderRadius: 99, background: SAND, overflow: 'hidden', cursor: 'pointer' }}
            >
              <div style={{ height: '100%', width: `${progress * 100}%`, background: NAVY, borderRadius: 99, transition: 'width .25s linear' }} />
            </div>
          </div>

          {ended && hasNext && !autoFlip && (
            <p style={{ margin: 0, color: NAVY, fontSize: '.88rem', fontWeight: 800, textAlign: 'center' }}>
              أحسنت! اقلب الصفحة لتسمع ما بعدها ◀
            </p>
          )}
          {failed && (
            <p style={{ margin: 0, color: NAVY, fontSize: '.85rem', fontWeight: 800, textAlign: 'center' }}>
              لم يعمل الصوت هذه المرة — جرّب مرة ثانية بعد قليل، أنت بطل 🌟
            </p>
          )}
        </>
      )}
    </div>
  );
}
