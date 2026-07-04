'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ORDINALS = ['','الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر'];
function ordinal(n) {
  if (n <= 10) return ORDINALS[n];
  if (n <= 20) return `الـ ${n}`;
  return `الـ ${n}`;
}

export default function StreakLogger() {
  const [streak, setStreak] = useState(null);
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/streak', { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.streak > 0) {
          setStreak(d.streak);
          setVisible(true);
          // أعد تحميل بيانات Server Component ليعكس اليوم المسجَّل للتو
          router.refresh();
          // بعد 7 ثوانٍ تبدأ رسوم الخروج
          const t1 = setTimeout(() => setLeaving(true), 7000);
          // بعد 7.5 ثانية تختفي كلياً
          const t2 = setTimeout(() => setVisible(false), 7500);
          return () => { clearTimeout(t1); clearTimeout(t2); };
        }
      })
      .catch(() => {});
  }, []);

  function dismiss() {
    setLeaving(true);
    setTimeout(() => setVisible(false), 400);
  }

  if (!visible || streak === null) return null;

  const flames = streak >= 10 ? '🔥🔥🔥' : streak >= 5 ? '🔥🔥' : '🔥';

  return (
    <>
      <style>{`
        /* translateX(-50%) مُدمج في كل keyframe لأن animation تستبدل transform الأساسي */
        @keyframes stSlideUp {
          from { opacity:0; transform:translateX(-50%) translateY(40px) scale(.92); }
          to   { opacity:1; transform:translateX(-50%) translateY(0)    scale(1);   }
        }
        @keyframes stSlideDown {
          from { opacity:1; transform:translateX(-50%) translateY(0)    scale(1);   }
          to   { opacity:0; transform:translateX(-50%) translateY(30px) scale(.94); }
        }
        @keyframes stSlideFromTop {
          from { opacity:0; transform:translateX(-50%) translateY(-30px) scale(.92); }
          to   { opacity:1; transform:translateX(-50%) translateY(0)     scale(1);   }
        }
        @keyframes stSlideToTop {
          from { opacity:1; transform:translateX(-50%) translateY(0)     scale(1);   }
          to   { opacity:0; transform:translateX(-50%) translateY(-20px) scale(.94); }
        }
        @keyframes stFlame {
          0%,100% { transform:scale(1) rotate(-4deg); }
          50%     { transform:scale(1.18) rotate(4deg); }
        }
        @keyframes stShine {
          0%   { background-position:200% center; }
          100% { background-position:-200% center; }
        }
        @keyframes stBar {
          from { width:100%; }
          to   { width:0%;   }
        }
        @keyframes stStarPop {
          0%   { transform:scale(0) rotate(-20deg); opacity:0; }
          60%  { transform:scale(1.3) rotate(8deg); opacity:1; }
          100% { transform:scale(1)  rotate(0deg);  opacity:1; }
        }
        .st-card {
          position:fixed; bottom:28px; left:50%; transform:translateX(-50%);
          z-index:9999; width:min(92vw,380px);
          background:linear-gradient(135deg,#92400e 0%,#b45309 40%,#d97706 100%);
          border-radius:22px; overflow:hidden;
          box-shadow:0 12px 40px rgba(180,83,9,.55), 0 4px 12px rgba(0,0,0,.25);
          animation:stSlideUp .45s cubic-bezier(0,.9,.57,1) both;
          font-family:'Cairo','Tajawal',sans-serif;
          cursor:pointer; user-select:none;
        }
        .st-card.leaving { animation:stSlideDown .4s ease forwards; }
        /* موبايل: أعلى المنتصف أسفل الهيدر مباشرة، بعيداً عن شريط التنقل السفلي */
        @media (max-width:768px) {
          .st-card {
            bottom:auto; top:74px;
            width:min(90vw,440px);
            animation:stSlideFromTop .45s cubic-bezier(0,.9,.57,1) both;
          }
          .st-card.leaving { animation:stSlideToTop .4s ease forwards; }
        }
        .st-inner {
          padding:18px 20px 14px;
          display:flex; align-items:center; gap:14px;
        }
        .st-flame {
          font-size:2.6rem; line-height:1; flex-shrink:0;
          animation:stFlame 1.1s ease-in-out infinite;
        }
        .st-body { flex:1; }
        .st-title {
          font-size:1.05rem; font-weight:900; color:#fff;
          line-height:1.3; margin-bottom:3px;
          background:linear-gradient(90deg,#fff 0%,#fef3c7 40%,#fff 60%,#fef3c7 80%,#fff 100%);
          background-size:200% auto;
          -webkit-background-clip:text; -webkit-text-fill-color:transparent;
          animation:stShine 2.5s linear infinite;
        }
        .st-sub {
          font-size:.82rem; color:rgba(255,255,255,.8); font-weight:700;
        }
        .st-stars {
          display:flex; gap:3px; margin-top:6px;
        }
        .st-star {
          font-size:.85rem;
          animation:stStarPop .4s both;
        }
        .st-close {
          flex-shrink:0; color:rgba(255,255,255,.55);
          font-size:1.1rem; line-height:1; padding:4px;
        }
        .st-bar-track {
          height:4px; background:rgba(0,0,0,.2);
        }
        .st-bar-fill {
          height:4px;
          background:linear-gradient(90deg,#fef3c7,#fbbf24);
          animation:stBar 7s linear forwards;
        }
      `}</style>

      <div className={`st-card ${leaving ? 'leaving' : ''}`} onClick={dismiss}>
        <div className="st-inner">
          <div className="st-flame">{flames}</div>
          <div className="st-body">
            <div className="st-title">
              {streak === 1 ? 'يومك الأول — أحسنت! 🎉' : `يومك ${ordinal(streak)} متتالياً`}
            </div>
            <div className="st-sub">
              {streak === 1 ? 'عُد غداً لتحقيق السلسلة ⚡' : `سلسلة ${streak} أيام نشطة 🏅`}
            </div>
            <div className="st-stars">
              {Array.from({ length: Math.min(streak, 7) }, (_, i) => (
                <span key={i} className="st-star" style={{ animationDelay:`${i*80}ms` }}>★</span>
              ))}
              {streak > 7 && <span className="st-sub">+{streak - 7}</span>}
            </div>
          </div>
          <div className="st-close">✕</div>
        </div>
        <div className="st-bar-track">
          <div className="st-bar-fill" />
        </div>
      </div>
    </>
  );
}

