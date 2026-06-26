'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';
import StoryFlipBook from '../../../../components/StoryFlipBook';

const LEVEL_LABELS = { 1: 'مستوى 1', 2: 'مستوى 2', 3: 'مستوى 3' };

/* ── صوت قلب الصفحة ── */
function playPageSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const rate = ctx.sampleRate;

    const make = (dur, vol, freq, q) => {
      const buf = ctx.createBuffer(1, Math.floor(rate * dur), rate);
      const d   = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        const t = i / d.length;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.4) * vol;
      }
      const src  = ctx.createBufferSource();
      src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type            = 'bandpass';
      filt.frequency.value = freq;
      filt.Q.value         = q;
      src.connect(filt);
      filt.connect(ctx.destination);
      return src;
    };

    const s1 = make(0.09, 0.22, 4200, 0.4);
    const s2 = make(0.14, 0.16, 2800, 0.3);
    s1.start(ctx.currentTime);
    s2.start(ctx.currentTime + 0.08);
    setTimeout(() => ctx.close(), 800);
  } catch {}
}

export default function StoryReader({ story, alreadyRead, isTeacher }) {
  /* ── تقسيم الصفحات ── */
  const pages      = (story.content || '').split('<!-- PAGE -->').map(p => p.trim()).filter(Boolean);
  const isMultiPage = pages.length > 1;

  const [read,       setRead]       = useState(alreadyRead);
  const [loading,    setLoading]    = useState(false);
  const [showCelebr, setShowCelebr] = useState(false);
  const [earnedPts,  setEarnedPts]  = useState(0);
  const [scrollPct,  setScrollPct]  = useState(0);
  const [btnReady,   setBtnReady]   = useState(alreadyRead);
  const contentRef = useRef(null);

  /* ── تتبع التمرير (صفحة واحدة) ── */
  useEffect(() => {
    if (isMultiPage) return;
    const el = contentRef.current;
    if (!el) return;
    const fn = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const pct = scrollHeight <= clientHeight
        ? 100
        : Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
      setScrollPct(pct);
      if (pct >= 80 && !read) setBtnReady(true);
    };
    el.addEventListener('scroll', fn, { passive: true });
    fn();
    return () => el.removeEventListener('scroll', fn);
  }, [isMultiPage, read]);

  /* ── إنهاء القصة ── */
  const handleComplete = async () => {
    if (read || loading || isTeacher) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/stories/${story.id}/complete`, { method: 'POST' });
      const json = await res.json();
      if (json.success || json.skipped) {
        setRead(true);
        setEarnedPts(json.earned || 0);
        if (!json.skipped) { setShowCelebr(true); setTimeout(() => setShowCelebr(false), 4500); }
      }
    } catch {}
    setLoading(false);
  };

  const accent = story.accent || '#10b981';

  return (
    <>
      <style>{`
        @keyframes srFadeIn    { from{opacity:0;transform:translateY(18px)}  to{opacity:1;transform:none} }
        @keyframes pageForward { from{opacity:0;transform:translateX(-50px) scale(.96)} to{opacity:1;transform:none} }
        @keyframes pageBack    { from{opacity:0;transform:translateX(50px)  scale(.96)} to{opacity:1;transform:none} }
        @keyframes srCelebIn   { from{opacity:0;transform:translateY(-30px) scale(.8)} to{opacity:1;transform:none} }
        @keyframes srConfetti  { 0%{transform:translateY(-10px) rotate(0deg);opacity:1} 100%{transform:translateY(130px) rotate(720deg);opacity:0} }
        @keyframes srBounce    { 0%,100%{transform:scale(1)} 40%{transform:scale(1.3) rotate(-8deg)} 70%{transform:scale(1.1) rotate(5deg)} }
        @keyframes tapPulse    { 0%,100%{opacity:.35;transform:scale(1)} 50%{opacity:.85;transform:scale(1.12)} }
        @keyframes dotPop      { 0%{transform:scale(1)} 50%{transform:scale(1.5)} 100%{transform:scale(1.35)} }

        .sr-wrap {
          direction:rtl; font-family:inherit;
          max-width:760px; margin:0 auto; padding:20px 16px 60px;
          animation:srFadeIn .4s ease both;
        }
        .sr-back {
          display:inline-flex; align-items:center; gap:6px;
          color:#64748b; font-size:.82rem; font-weight:700;
          text-decoration:none; margin-bottom:20px;
          padding:6px 14px; border-radius:50px;
          border:1.5px solid #e2e8f0; background:#fff; transition:all .18s;
        }
        .sr-back:hover { color:#4f46e5; border-color:#a5b4fc; background:#eef2ff; }
        .sr-header {
          border-radius:22px; padding:26px 24px 20px;
          margin-bottom:22px; position:relative; overflow:hidden;
        }
        .sr-header-deco { position:absolute; inset:0; pointer-events:none; background:linear-gradient(160deg,rgba(255,255,255,.12) 0%,transparent 60%); }
        .sr-icon  { font-size:3.5rem; line-height:1; margin-bottom:10px; display:block; }
        .sr-title { font-size:1.55rem; font-weight:900; color:#fff; margin:0 0 10px; text-shadow:0 2px 8px rgba(0,0,0,.25); line-height:1.3; }
        .sr-meta  { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .sr-badge { background:rgba(255,255,255,.22); border:1.5px solid rgba(255,255,255,.35); border-radius:20px; padding:3px 12px; font-size:.72rem; font-weight:800; color:#fff; }
        .sr-pts-badge { background:rgba(255,255,255,.9); border-radius:20px; padding:3px 12px; font-size:.72rem; font-weight:900; }

        /* ══ كتاب ══ */
        .sr-book-wrap { position:relative; }
        .sr-book-area {
          position:relative; cursor:pointer;
          user-select:none; -webkit-user-select:none;
          -webkit-tap-highlight-color:transparent;
        }

        /* الصفحة */
        .sr-page {
          background:#fffdf5;
          border-radius:18px;
          padding:34px 32px 28px;
          min-height:340px;
          font-size:1.15rem; line-height:2.1; color:#2d1f0e;
          direction:rtl; position:relative;
          box-shadow:
            4px 4px 0 #e8d9b8,
            8px 8px 0 #ddd0a8,
            0 12px 32px rgba(0,0,0,.14);
          border:1px solid #e2d3a8;
        }
        .sr-page.forward { animation:pageForward .3s cubic-bezier(.25,.46,.45,.94) both; }
        .sr-page.back    { animation:pageBack    .3s cubic-bezier(.25,.46,.45,.94) both; }
        .sr-page h2      { color:#5c3a00; font-weight:900; font-size:1.25rem; margin:0 0 .6em; text-align:center; }
        .sr-page p       { margin:0 0 .9em; }
        .sr-page strong  { color:#7c3a00; }
        .sr-page em      { font-style:normal; background:rgba(245,158,11,.15); border-radius:4px; padding:0 4px; }
        .sr-page .illus  { text-align:center; font-size:5rem; display:block; margin:4px 0 14px; line-height:1.1; }
        .sr-page .quote  { border-right:4px solid ${accent}; padding-right:14px; color:#5c3a00; font-style:italic; margin:12px 0; }

        /* رقم الصفحة */
        .sr-page-num {
          position:absolute; bottom:12px; left:50%; transform:translateX(-50%);
          font-size:.65rem; color:#c4a96d; font-weight:700; letter-spacing:.05em;
        }

        /* سهم ضغط */
        .sr-tap-hint {
          position:absolute; bottom:-34px; left:50%; transform:translateX(-50%);
          font-size:.72rem; color:#94a3b8; font-weight:700; white-space:nowrap;
          animation:tapPulse 2.2s ease-in-out infinite; pointer-events:none;
        }

        /* مناطق النقر اليمين/يسار */
        .sr-zone-r, .sr-zone-l {
          position:absolute; top:0; bottom:0; width:22%;
          display:flex; align-items:center; justify-content:center;
          opacity:0; transition:opacity .2s;
          pointer-events:none;
        }
        .sr-zone-r { right:0; }
        .sr-zone-l { left:0; }
        .sr-book-area:hover .sr-zone-r,
        .sr-book-area:hover .sr-zone-l { opacity:1; }
        .sr-zone-icon { font-size:1.4rem; filter:drop-shadow(0 2px 4px rgba(0,0,0,.2)); }

        /* نقاط الصفحات */
        .sr-dots { display:flex; justify-content:center; gap:9px; margin:20px 0 10px; }
        .sr-dot  { width:10px; height:10px; border-radius:50%; background:#e2e8f0; transition:all .28s; cursor:pointer; }
        .sr-dot.done   { background:${accent}55; }
        .sr-dot.active { background:${accent}; transform:scale(1.4); animation:dotPop .3s ease both; }

        /* أزرار تنقل */
        .sr-nav { display:flex; align-items:center; justify-content:space-between; margin-top:14px; gap:10px; }
        .sr-nav-btn {
          display:inline-flex; align-items:center; gap:6px;
          border:none; border-radius:50px; padding:10px 22px;
          font-size:.88rem; font-weight:800; cursor:pointer;
          font-family:inherit; transition:all .18s;
        }
        .sr-nav-btn:disabled { opacity:.28; cursor:default; }
        .sr-nav-btn.prev { background:#f1f5f9; color:#64748b; }
        .sr-nav-btn.prev:not(:disabled):hover { background:#e2e8f0; }
        .sr-nav-btn.next { color:#fff; box-shadow:0 4px 16px rgba(0,0,0,.2); }
        .sr-nav-btn.next:not(:disabled):hover { transform:scale(1.06); }
        .sr-page-label { color:#94a3b8; font-size:.82rem; font-weight:700; }

        /* ── صفحة واحدة (قديم) ── */
        .sr-prog-bar  { position:sticky; top:0; z-index:10; height:5px; background:rgba(0,0,0,.08); margin-bottom:20px; }
        .sr-prog-fill { height:100%; border-radius:99px; transition:width .2s; }
        .sr-scroll-box {
          background:#fff; border-radius:20px; padding:28px; max-height:60vh; overflow-y:auto;
          box-shadow:0 4px 24px rgba(0,0,0,.07); border:1.5px solid #f1f5f9;
          font-size:1.12rem; line-height:2.0; color:#1e293b; direction:rtl;
        }
        .sr-scroll-box::-webkit-scrollbar { width:6px; }
        .sr-scroll-box::-webkit-scrollbar-track { background:#f8fafc; border-radius:99px; }
        .sr-scroll-box::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:99px; }
        .sr-scroll-box p { margin:0 0 1em; }

        /* زر الإنهاء */
        .sr-end-btn {
          display:flex; align-items:center; justify-content:center; gap:10px;
          width:100%; border:none; border-radius:18px; padding:16px 24px;
          font-size:1.05rem; font-weight:900; cursor:pointer; color:#fff;
          font-family:inherit;
          transition:all .22s; box-shadow:0 6px 24px rgba(0,0,0,.18);
          margin-top:18px;
        }
        .sr-end-btn:disabled { opacity:.55; cursor:not-allowed; }
        .sr-end-btn:not(:disabled):hover { transform:translateY(-3px); box-shadow:0 12px 32px rgba(0,0,0,.24); }
        .sr-done-card {
          display:flex; align-items:center; gap:14px;
          background:#f0fdf4; border:2px solid #86efac; border-radius:18px; padding:16px 20px;
          margin-top:16px;
        }

        /* احتفال */
        .sr-celebr-wrap { position:fixed; inset:0; z-index:1000; display:flex; align-items:center; justify-content:center; pointer-events:none; }
        .sr-celebr-box {
          background:#fff; border-radius:28px; padding:38px 48px; text-align:center;
          box-shadow:0 20px 60px rgba(0,0,0,.25);
          animation:srCelebIn .5s cubic-bezier(.34,1.56,.64,1) both; pointer-events:auto;
        }
        .sr-celebr-icon  { font-size:4.5rem; display:block; margin-bottom:12px; animation:srBounce 1.1s ease infinite; }
        .sr-celebr-title { font-size:1.3rem; font-weight:900; color:#1e293b; margin:0 0 6px; }
        .sr-celebr-pts   { font-size:1rem; font-weight:800; margin:0; }
        .sr-confetti     { position:absolute; border-radius:2px; animation:srConfetti 2.5s ease forwards; }

        @media(max-width:600px) {
          .sr-page { padding:20px 16px 18px; font-size:1rem; min-height:280px; }
          .sr-title { font-size:1.25rem; }
          .sr-header { padding:18px 14px 16px; }
        }
      `}</style>

      <div className="sr-wrap">
        <Link href="/library" className="sr-back">→ العودة للمكتبة</Link>

        {/* رأس القصة */}
        <div className="sr-header" style={{ background:`linear-gradient(135deg,${accent}ee,${accent})` }}>
          <div className="sr-header-deco" />
          <span className="sr-icon">{story.icon || '📖'}</span>
          <h1 className="sr-title">{story.title}</h1>
          <div className="sr-meta">
            <span className="sr-badge">{LEVEL_LABELS[story.level] || 'مستوى 1'}</span>
            <span className="sr-badge">⏱ {story.length || 'قصيرة'}</span>
            {isMultiPage && <span className="sr-badge">📄 {pages.length} صفحات</span>}
            {!isTeacher && <span className="sr-pts-badge" style={{ color:accent }}>⭐ {story.points || 10} نقطة</span>}
            {isTeacher && story.status === 'draft' && (
              <span style={{ background:'rgba(251,191,36,.9)', color:'#78350f', borderRadius:20, padding:'3px 12px', fontSize:'.7rem', fontWeight:900 }}>✏️ مسودة</span>
            )}
          </div>
        </div>

        {/* ══ وضع الكتاب (متعدد الصفحات) — HTMLFlipBook ══ */}
        {isMultiPage ? (
          <div className="sr-book-wrap">
            <StoryFlipBook
              pages={pages}
              accent={accent}
              onComplete={handleComplete}
              read={read}
              loading={loading}
              isTeacher={isTeacher}
              points={story.points || 10}
            />
          </div>

        ) : (
          /* ══ وضع التمرير (صفحة واحدة) ══ */
          <>
            <div className="sr-prog-bar">
              <div className="sr-prog-fill" style={{ width:`${scrollPct}%`, background:accent }} />
            </div>
            <div className="sr-scroll-box" ref={contentRef}>
              {story.content
                ? <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(story.content) }} />
                : <p style={{ color:'#94a3b8', textAlign:'center', padding:'40px 0' }}>محتوى القصة سيضاف قريباً...</p>
              }
            </div>
            {!isTeacher && (
              read ? (
                <div className="sr-done-card">
                  <span style={{ fontSize:'2.4rem' }}>✅</span>
                  <div>
                    <h4 style={{ margin:'0 0 3px', color:'#065f46', fontSize:'.95rem', fontWeight:900 }}>أحسنت! لقد أنهيت هذه القصة</h4>
                    <p style={{ margin:0, color:'#047857', fontSize:'.78rem' }}>يمكنك إعادة قراءتها في أي وقت</p>
                  </div>
                </div>
              ) : (
                <>
                  {!btnReady && (
                    <p style={{ textAlign:'center', color:'#94a3b8', fontSize:'.78rem', fontWeight:600, margin:'14px 0' }}>
                      📜 اقرأ القصة حتى النهاية ثم اضغط الزر
                    </p>
                  )}
                  <button
                    className="sr-end-btn"
                    onClick={handleComplete}
                    disabled={loading || !btnReady}
                    style={{ background: btnReady ? `linear-gradient(135deg,${accent},${accent}bb)` : '#e2e8f0', color: btnReady ? '#fff' : '#94a3b8' }}
                  >
                    {loading ? '⏳ جارٍ الحفظ...' : btnReady ? `🎉 أنهيت القصة! +${story.points || 10} نقطة` : '📜 اقرأ حتى النهاية أولاً'}
                  </button>
                </>
              )
            )}
          </>
        )}
      </div>

      {/* احتفال */}
      {showCelebr && (
        <div className="sr-celebr-wrap">
          {[...Array(14)].map((_, i) => (
            <div key={i} className="sr-confetti" style={{
              width: 8 + (i % 4) * 4, height: 8 + (i % 4) * 4,
              left: `${8 + i * 6}%`, top: `${15 + (i % 4) * 8}%`,
              background: ['#10b981','#f59e0b','#6366f1','#ec4899','#22d3ee','#f97316'][i % 6],
              animationDelay: `${i * 0.1}s`,
            }} />
          ))}
          <div className="sr-celebr-box">
            <span className="sr-celebr-icon">🎉</span>
            <h3 className="sr-celebr-title">أحسنت! أنهيت القصة</h3>
            <p className="sr-celebr-pts" style={{ color:accent }}>+{earnedPts} نقطة</p>
          </div>
        </div>
      )}
    </>
  );
}
