'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';
import StoryFlipBook from '../../../../components/StoryFlipBook';

const LEVEL_LABELS = { 1: 'مستوى 1', 2: 'مستوى 2', 3: 'مستوى 3' };

export default function StoryReader({ story, alreadyRead, isTeacher }) {
  const pages       = (story.content || '').split('<!-- PAGE -->').map(p => p.trim()).filter(Boolean);
  const isMultiPage = pages.length > 1;

  const [read,       setRead]       = useState(alreadyRead);
  const [loading,    setLoading]    = useState(false);
  const [showCelebr, setShowCelebr] = useState(false);
  const [earnedPts,  setEarnedPts]  = useState(0);
  const [scrollPct,  setScrollPct]  = useState(0);
  const [btnReady,   setBtnReady]   = useState(alreadyRead);
  const [isMobile,   setIsMobile]   = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  /* تتبع التمرير (صفحة واحدة فقط) */
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

  /* ══════════════════════════════════════
     وضع القراءة الكامل — الهاتف فقط
  ══════════════════════════════════════ */
  if (isMobile && isMultiPage) {
    return (
      <>
        <style>{`
          @keyframes srFadeIn { from{opacity:0} to{opacity:1} }
          @keyframes srCelebIn { from{opacity:0;transform:translateY(-30px) scale(.8)} to{opacity:1;transform:none} }
          @keyframes srBounce  { 0%,100%{transform:scale(1)} 40%{transform:scale(1.3) rotate(-8deg)} 70%{transform:scale(1.1) rotate(5deg)} }
          @keyframes srConfetti { 0%{transform:translateY(-10px) rotate(0deg);opacity:1} 100%{transform:translateY(130px) rotate(720deg);opacity:0} }
        `}</style>

        {/* طبقة القراءة الكاملة */}
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: '#f8f4ec',
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Cairo','Tajawal',sans-serif",
          animation: 'srFadeIn .25s ease',
        }}>

          {/* شريط علوي مدمج */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px',
            background: `linear-gradient(135deg,${accent}ee,${accent})`,
            flexShrink: 0,
          }}>
            <Link href="/library" style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'rgba(255,255,255,.22)', border: '1px solid rgba(255,255,255,.3)',
              borderRadius: 30, padding: '5px 12px',
              color: '#fff', fontSize: '.78rem', fontWeight: 800, textDecoration: 'none',
            }}>
              → العودة
            </Link>

            <span style={{
              color: '#fff', fontWeight: 900, fontSize: '.88rem',
              textShadow: '0 1px 4px rgba(0,0,0,.2)',
              maxWidth: '50%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {story.icon} {story.title}
            </span>

            <span style={{
              background: 'rgba(255,255,255,.9)', borderRadius: 20,
              padding: '3px 10px', fontSize: '.7rem', fontWeight: 900,
              color: accent,
            }}>
              {!isTeacher ? `⭐ ${story.points || 10}` : LEVEL_LABELS[story.level] || 'مستوى 1'}
            </span>
          </div>

          {/* منطقة الكتاب — تملأ المتبقي */}
          <div style={{
            flex: 1, overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '12px 0 8px',
          }}>
            <StoryFlipBook
              pages={pages}
              accent={accent}
              onComplete={handleComplete}
              read={read}
              loading={loading}
              isTeacher={isTeacher}
              points={story.points || 10}
              fullScreen
            />
          </div>
        </div>

        {/* احتفال */}
        {showCelebr && <Celebration earnedPts={earnedPts} accent={accent} />}
      </>
    );
  }

  /* ══════════════════════════════════════
     وضع الحاسوب (العادي)
  ══════════════════════════════════════ */
  return (
    <>
      <style>{`
        @keyframes srFadeIn    { from{opacity:0;transform:translateY(18px)}  to{opacity:1;transform:none} }
        @keyframes srCelebIn   { from{opacity:0;transform:translateY(-30px) scale(.8)} to{opacity:1;transform:none} }
        @keyframes srConfetti  { 0%{transform:translateY(-10px) rotate(0deg);opacity:1} 100%{transform:translateY(130px) rotate(720deg);opacity:0} }
        @keyframes srBounce    { 0%,100%{transform:scale(1)} 40%{transform:scale(1.3) rotate(-8deg)} 70%{transform:scale(1.1) rotate(5deg)} }
        @keyframes tapPulse    { 0%,100%{opacity:.35;transform:scale(1)} 50%{opacity:.85;transform:scale(1.12)} }

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
        .sr-prog-bar  { position:sticky; top:0; z-index:10; height:5px; background:rgba(0,0,0,.08); margin-bottom:20px; }
        .sr-prog-fill { height:100%; border-radius:99px; transition:width .2s; }
        .sr-scroll-box {
          background:#fff; border-radius:20px; padding:28px; max-height:60vh; overflow-y:auto;
          box-shadow:0 4px 24px rgba(0,0,0,.07); border:1.5px solid #f1f5f9;
          font-size:1.12rem; line-height:2.0; color:#1e293b; direction:rtl;
        }
        .sr-scroll-box::-webkit-scrollbar { width:6px; }
        .sr-scroll-box::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:99px; }
        .sr-scroll-box p { margin:0 0 1em; }
        .sr-end-btn {
          display:flex; align-items:center; justify-content:center; gap:10px;
          width:100%; border:none; border-radius:18px; padding:16px 24px;
          font-size:1.05rem; font-weight:900; cursor:pointer; color:#fff;
          font-family:inherit; transition:all .22s; box-shadow:0 6px 24px rgba(0,0,0,.18);
          margin-top:18px;
        }
        .sr-end-btn:disabled { opacity:.55; cursor:not-allowed; }
        .sr-end-btn:not(:disabled):hover { transform:translateY(-3px); }
        .sr-done-card {
          display:flex; align-items:center; gap:14px;
          background:#f0fdf4; border:2px solid #86efac; border-radius:18px; padding:16px 20px;
          margin-top:16px;
        }
      `}</style>

      <div className="sr-wrap">
        <Link href="/library" className="sr-back">→ العودة للمكتبة</Link>

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

        {isMultiPage ? (
          <StoryFlipBook
            pages={pages}
            accent={accent}
            onComplete={handleComplete}
            read={read}
            loading={loading}
            isTeacher={isTeacher}
            points={story.points || 10}
          />
        ) : (
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

      {showCelebr && <Celebration earnedPts={earnedPts} accent={accent} />}
    </>
  );
}

/* ── احتفال مشترك ── */
function Celebration({ earnedPts, accent }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
      {[...Array(14)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: 8 + (i % 4) * 4, height: 8 + (i % 4) * 4,
          left: `${8 + i * 6}%`, top: `${15 + (i % 4) * 8}%`,
          borderRadius: 2,
          background: ['#10b981','#f59e0b','#6366f1','#ec4899','#22d3ee','#f97316'][i % 6],
          animation: 'srConfetti 2.5s ease forwards',
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
      <div style={{
        background:'#fff', borderRadius:28, padding:'38px 48px', textAlign:'center',
        boxShadow:'0 20px 60px rgba(0,0,0,.25)',
        animation:'srCelebIn .5s cubic-bezier(.34,1.56,.64,1) both',
        pointerEvents:'auto',
      }}>
        <span style={{ fontSize:'4.5rem', display:'block', marginBottom:12, animation:'srBounce 1.1s ease infinite' }}>🎉</span>
        <h3 style={{ fontSize:'1.3rem', fontWeight:900, color:'#1e293b', margin:'0 0 6px' }}>أحسنت! أنهيت القصة</h3>
        <p style={{ fontSize:'1rem', fontWeight:800, margin:0, color:accent }}>+{earnedPts} نقطة</p>
      </div>
    </div>
  );
}
