'use client';
import { useEffect, useRef, useState } from 'react';

/* ════════════════════════════════════════════════════════════════
   زر الاستماع لقراءة القصة — للطفل
   variant="bar": شريط كامل (زر ذهبي كبير + شريط تقدّم قابل للنقر)
   variant="fab": زر دائري عائم بحلقة تقدّم (وضع الكتاب بملء الشاشة)
   الصوت لا يُحمَّل إلا عند أول ضغطة (preload="none") توفيراً لباقة الجوال.
════════════════════════════════════════════════════════════════ */

const GOLD  = '#E8B84B';
const NAVY  = '#1A2B4A';
const CREAM = '#FAF7F2';
const SAND  = '#EDE5D8';

export default function StoryAudioPlayer({ src, variant = 'bar', style }) {
  const audioRef = useRef(null);
  const [playing,  setPlaying]  = useState(false);
  const [waiting,  setWaiting]  = useState(false);
  const [progress, setProgress] = useState(0);   // 0..1
  const [ended,    setEnded]    = useState(false);
  const [failed,   setFailed]   = useState(false);

  /* إيقاف الصوت عند مغادرة الصفحة أو تبديل التخطيط */
  useEffect(() => {
    const el = audioRef.current;
    return () => { el?.pause(); };
  }, []);

  const play = async () => {
    const el = audioRef.current;
    if (!el) return;
    setFailed(false);
    setEnded(false);
    setWaiting(true);
    try {
      await el.play();
    } catch (e) {
      if (e?.name !== 'AbortError') setFailed(true);
    }
    setWaiting(false);
  };

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (!el.paused) el.pause();
    else play();
  };

  const restart = () => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    setProgress(0);
    if (el.paused) play();
  };

  /* النقر على شريط التقدّم ينقل الصوت — الشريط يمتلئ من اليمين (اتجاه العربية) */
  const seek = (e) => {
    const el = audioRef.current;
    if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return;
    const rect  = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (rect.right - e.clientX) / rect.width));
    el.currentTime = ratio * el.duration;
    setProgress(ratio);
  };

  const audio = (
    <audio
      ref={audioRef}
      src={src}
      preload="none"
      onPlay={() => { setPlaying(true); setEnded(false); }}
      onPause={() => setPlaying(false)}
      onWaiting={() => setWaiting(true)}
      onPlaying={() => setWaiting(false)}
      onEnded={() => { setPlaying(false); setEnded(true); setProgress(1); }}
      onError={() => { setPlaying(false); setWaiting(false); setFailed(true); }}
      onTimeUpdate={(e) => {
        const { currentTime, duration } = e.currentTarget;
        if (Number.isFinite(duration) && duration > 0) setProgress(currentTime / duration);
      }}
    />
  );

  const label = waiting             ? '⏳ لحظة واحدة...'
              : playing             ? '⏸️ إيقاف مؤقت'
              : ended               ? '🔁 استمع مرة أخرى'
              : progress > 0        ? '▶️ أكمل الاستماع'
              :                       '🔊 استمع إلى القصة';

  /* ── زر دائري عائم ── */
  if (variant === 'fab') {
    const deg = Math.round(progress * 360);
    return (
      <div style={{ ...style, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        {audio}
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? 'إيقاف الصوت مؤقتاً' : 'استمع إلى القصة'}
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
        {failed && (
          <span style={{ background: '#fff', color: NAVY, borderRadius: 12, padding: '4px 10px', fontSize: '.72rem', fontWeight: 800, boxShadow: '0 2px 10px rgba(0,0,0,.12)', maxWidth: 170, textAlign: 'center' }}>
            لم يعمل الصوت هذه المرة — جرّب مرة ثانية 🌟
          </span>
        )}
      </div>
    );
  }

  /* ── شريط كامل ── */
  return (
    <div style={{
      direction: 'rtl', background: CREAM, border: `2px solid ${SAND}`, borderRadius: 20,
      padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: '0 4px 16px rgba(26,43,74,.06)', ...style,
    }}>
      {audio}
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
        {(progress > 0 || playing) && (
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
      </div>

      <div
        onClick={seek}
        role="progressbar"
        aria-label="تقدّم الاستماع"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}
        style={{ height: 12, borderRadius: 99, background: SAND, overflow: 'hidden', cursor: 'pointer' }}
      >
        <div style={{ height: '100%', width: `${progress * 100}%`, background: NAVY, borderRadius: 99, transition: 'width .25s linear' }} />
      </div>

      {failed && (
        <p style={{ margin: 0, color: NAVY, fontSize: '.85rem', fontWeight: 800, textAlign: 'center' }}>
          لم يعمل الصوت هذه المرة — جرّب مرة ثانية بعد قليل، أنت بطل 🌟
        </p>
      )}
    </div>
  );
}
