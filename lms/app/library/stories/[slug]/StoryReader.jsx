'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const LEVEL_LABELS = { 1: 'مستوى 1', 2: 'مستوى 2', 3: 'مستوى 3' };

export default function StoryReader({ story, alreadyRead, isTeacher }) {
  const [read,       setRead]       = useState(alreadyRead);
  const [loading,    setLoading]    = useState(false);
  const [showCelebr, setShowCelebr] = useState(false);
  const [earnedPts,  setEarnedPts]  = useState(0);
  const [scrollPct,  setScrollPct]  = useState(0);
  const [btnReady,   setBtnReady]   = useState(alreadyRead);
  const contentRef = useRef(null);

  // Track scroll progress
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const pct = scrollHeight <= clientHeight
        ? 100
        : Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
      setScrollPct(pct);
      if (pct >= 80 && !read) setBtnReady(true);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [read]);

  const handleComplete = async () => {
    if (read || loading || isTeacher) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/stories/${story.id}/complete`, { method: 'POST' });
      const json = await res.json();
      if (json.success || json.skipped) {
        setRead(true);
        setEarnedPts(json.earned || 0);
        if (!json.skipped) setShowCelebr(true);
        setTimeout(() => setShowCelebr(false), 4000);
      }
    } catch {}
    setLoading(false);
  };

  const accent = story.accent || '#10b981';
  const bg     = story.bg     || '#ecfdf5';

  return (
    <>
      <style>{`
        @keyframes srFadeIn  { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:none; } }
        @keyframes srCelebIn { from { opacity:0; transform:translateY(-30px) scale(.8); } to { opacity:1; transform:none; } }
        @keyframes srConfetti {
          0%   { transform:translateY(-10px) rotate(0deg); opacity:1; }
          100% { transform:translateY(120px) rotate(720deg); opacity:0; }
        }
        @keyframes srIconBounce {
          0%,100% { transform:scale(1); }
          40%     { transform:scale(1.3) rotate(-8deg); }
          70%     { transform:scale(1.1) rotate(5deg); }
        }
        .sr-wrap {
          direction:rtl; font-family:'Cairo','Tajawal',sans-serif;
          max-width:780px; margin:0 auto; padding:20px 16px 60px;
          animation:srFadeIn .4s ease both;
        }
        .sr-back {
          display:inline-flex; align-items:center; gap:6px;
          color:#64748b; font-size:.82rem; font-weight:700;
          text-decoration:none; margin-bottom:20px;
          padding:6px 14px; border-radius:50px;
          border:1.5px solid #e2e8f0; background:#fff;
          transition:all .18s;
        }
        .sr-back:hover { color:#4f46e5; border-color:#a5b4fc; background:#eef2ff; }
        .sr-header {
          border-radius:22px; padding:28px 24px 22px;
          margin-bottom:24px; position:relative; overflow:hidden;
        }
        .sr-header-deco {
          position:absolute; inset:0; pointer-events:none;
          background:linear-gradient(160deg,rgba(255,255,255,.12) 0%,transparent 60%);
        }
        .sr-icon { font-size:3.8rem; line-height:1; margin-bottom:10px; display:block; }
        .sr-title {
          font-size:1.6rem; font-weight:900; color:#fff;
          margin:0 0 10px; text-shadow:0 2px 8px rgba(0,0,0,.25); line-height:1.3;
        }
        .sr-meta { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .sr-badge {
          background:rgba(255,255,255,.22); border:1.5px solid rgba(255,255,255,.35);
          border-radius:20px; padding:3px 12px;
          font-size:.72rem; font-weight:800; color:#fff;
          backdrop-filter:blur(4px);
        }
        .sr-pts-badge {
          background:rgba(255,255,255,.9); border-radius:20px; padding:3px 12px;
          font-size:.72rem; font-weight:900;
        }
        .sr-progress-bar {
          position:sticky; top:0; z-index:10; height:5px;
          background:rgba(0,0,0,.08); margin-bottom:20px;
        }
        .sr-progress-fill {
          height:100%; border-radius:99px;
          transition:width .2s ease;
        }
        .sr-content-wrap {
          background:#fff; border-radius:20px;
          padding:28px 28px 24px;
          box-shadow:0 4px 24px rgba(0,0,0,.07);
          border:1.5px solid #f1f5f9;
          max-height:60vh; overflow-y:auto;
          font-size:1.12rem; line-height:2.0;
          color:#1e293b; direction:rtl;
          scroll-behavior:smooth;
        }
        .sr-content-wrap::-webkit-scrollbar { width:6px; }
        .sr-content-wrap::-webkit-scrollbar-track { background:#f8fafc; border-radius:99px; }
        .sr-content-wrap::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:99px; }
        .sr-content-wrap h2, .sr-content-wrap h3 {
          color:#1e293b; font-weight:900; margin:1.2em 0 .5em;
        }
        .sr-content-wrap p  { margin:0 0 1em; }
        .sr-content-wrap strong { color:#0f172a; }
        .sr-content-wrap em { font-style:normal; background:rgba(16,185,129,.12); border-radius:4px; padding:0 3px; }

        .sr-footer { margin-top:22px; }
        .sr-hint {
          text-align:center; font-size:.78rem; color:#94a3b8; font-weight:600;
          margin-bottom:14px;
          display:flex; align-items:center; justify-content:center; gap:6px;
        }
        .sr-complete-btn {
          display:flex; align-items:center; justify-content:center; gap:10px;
          width:100%; border:none; border-radius:18px;
          padding:16px 24px; font-size:1.05rem; font-weight:900;
          cursor:pointer; font-family:'Cairo','Tajawal',sans-serif;
          color:#fff; transition:all .22s;
          box-shadow:0 6px 24px rgba(0,0,0,.18);
        }
        .sr-complete-btn:disabled { opacity:.55; cursor:not-allowed; transform:none !important; }
        .sr-complete-btn:not(:disabled):hover { transform:translateY(-3px); box-shadow:0 12px 32px rgba(0,0,0,.24); }

        .sr-done-card {
          display:flex; align-items:center; gap:14px;
          background:#f0fdf4; border:2px solid #86efac; border-radius:18px;
          padding:16px 20px;
        }
        .sr-done-icon { font-size:2.4rem; flex-shrink:0; }
        .sr-done-text h4 { margin:0 0 3px; color:#065f46; font-size:.95rem; font-weight:900; }
        .sr-done-text p  { margin:0; color:#047857; font-size:.78rem; }

        /* الاحتفال */
        .sr-celebr-overlay {
          position:fixed; inset:0; z-index:1000;
          display:flex; align-items:center; justify-content:center;
          pointer-events:none;
        }
        .sr-celebr-card {
          background:#fff; border-radius:28px;
          padding:36px 44px; text-align:center;
          box-shadow:0 20px 60px rgba(0,0,0,.25);
          animation:srCelebIn .5s cubic-bezier(.34,1.56,.64,1) both;
          pointer-events:auto;
        }
        .sr-celebr-icon {
          font-size:4.5rem; display:block; margin-bottom:12px;
          animation:srIconBounce 1s ease infinite;
        }
        .sr-celebr-title { font-size:1.3rem; font-weight:900; color:#1e293b; margin:0 0 6px; }
        .sr-celebr-pts   { font-size:1rem; color:#10b981; font-weight:800; margin:0; }
        .sr-confetti-piece {
          position:absolute; width:10px; height:10px; border-radius:2px;
          animation:srConfetti 2.5s ease forwards;
        }

        @media (max-width:600px) {
          .sr-content-wrap { padding:18px 16px; font-size:1rem; }
          .sr-title { font-size:1.3rem; }
          .sr-header { padding:20px 16px 16px; }
        }
      `}</style>

      <div className="sr-wrap">
        <Link href="/library" className="sr-back">→ العودة للمكتبة</Link>

        {/* Header */}
        <div
          className="sr-header"
          style={{ background: `linear-gradient(135deg, ${accent}dd, ${accent})` }}
        >
          <div className="sr-header-deco" />
          <span className="sr-icon">{story.icon || '📖'}</span>
          <h1 className="sr-title">{story.title}</h1>
          <div className="sr-meta">
            <span className="sr-badge">{LEVEL_LABELS[story.level] || 'مستوى 1'}</span>
            <span className="sr-badge">⏱ {story.length || 'قصيرة'}</span>
            {!isTeacher && (
              <span className="sr-pts-badge" style={{ color: accent }}>
                ⭐ {story.points || 10} نقطة
              </span>
            )}
            {isTeacher && story.status === 'draft' && (
              <span style={{ background:'rgba(251,191,36,.9)', color:'#78350f', borderRadius:20, padding:'3px 12px', fontSize:'.7rem', fontWeight:900 }}>
                ✏️ مسودة — غير منشورة
              </span>
            )}
          </div>
        </div>

        {/* Scroll progress bar */}
        <div className="sr-progress-bar">
          <div
            className="sr-progress-fill"
            style={{ width: `${scrollPct}%`, background: accent }}
          />
        </div>

        {/* Story content */}
        <div className="sr-content-wrap" ref={contentRef}>
          {story.content
            ? <div dangerouslySetInnerHTML={{ __html: story.content }} />
            : (
              <p style={{ color:'#94a3b8', textAlign:'center', padding:'40px 0', fontStyle:'italic' }}>
                محتوى القصة سيضاف قريباً...
              </p>
            )
          }
        </div>

        {/* Footer: complete button or done card */}
        {!isTeacher && (
          <div className="sr-footer">
            {read ? (
              <div className="sr-done-card">
                <span className="sr-done-icon">✅</span>
                <div className="sr-done-text">
                  <h4>أحسنت! لقد أنهيت هذه القصة</h4>
                  <p>يمكنك إعادة قراءتها في أي وقت</p>
                </div>
              </div>
            ) : (
              <>
                {!btnReady && (
                  <p className="sr-hint">
                    <span>📜</span>
                    اقرأ القصة حتى النهاية ثم اضغط على الزر أدناه
                  </p>
                )}
                <button
                  className="sr-complete-btn"
                  onClick={handleComplete}
                  disabled={loading || !btnReady}
                  style={{ background: btnReady ? `linear-gradient(135deg,${accent},${accent}bb)` : '#e2e8f0' }}
                >
                  {loading ? '⏳ جارٍ الحفظ...' : btnReady ? `🎉 أنهيت القصة! احصل على ${story.points || 10} نقطة` : '📜 اقرأ حتى النهاية أولاً'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Celebration overlay */}
      {showCelebr && (
        <div className="sr-celebr-overlay">
          {/* Confetti */}
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="sr-confetti-piece"
              style={{
                left: `${10 + i * 7}%`,
                top: `${20 + (i % 3) * 10}%`,
                background: ['#10b981','#f59e0b','#6366f1','#ec4899','#22d3ee'][i % 5],
                animationDelay: `${i * 0.12}s`,
                width: 8 + (i % 3) * 4,
                height: 8 + (i % 3) * 4,
              }}
            />
          ))}
          <div className="sr-celebr-card">
            <span className="sr-celebr-icon">🎉</span>
            <h3 className="sr-celebr-title">أحسنت! أنهيت القصة</h3>
            <p className="sr-celebr-pts">+{earnedPts} نقطة</p>
          </div>
        </div>
      )}
    </>
  );
}
