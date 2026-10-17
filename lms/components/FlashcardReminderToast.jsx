'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const TEN_MINUTES = 10 * 60 * 1000;

export default function FlashcardReminderToast() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setLeaving(false);
      setVisible(true);
    }, TEN_MINUTES);
    return () => clearInterval(id);
  }, []);

  function dismiss() {
    setLeaving(true);
    setTimeout(() => { setVisible(false); setLeaving(false); }, 320);
  }

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes frIn {
          from { opacity:0; transform:translateY(18px) scale(.92); }
          to   { opacity:1; transform:translateY(0)    scale(1);   }
        }
        @keyframes frOut {
          from { opacity:1; transform:translateY(0)    scale(1);   }
          to   { opacity:0; transform:translateY(14px) scale(.92); }
        }
        @keyframes frPulse {
          0%,100% { transform:scale(1) rotate(-3deg); }
          50%     { transform:scale(1.15) rotate(3deg); }
        }
        .fr-card {
          position:fixed; bottom:28px; left:20px; z-index:9990;
          width:min(86vw,270px);
          background:#fff;
          border-radius:18px;
          box-shadow:0 8px 30px rgba(124,58,237,.25), 0 2px 8px rgba(0,0,0,.1);
          overflow:hidden;
          animation:frIn .35s cubic-bezier(0,.9,.57,1) both;
          font-family:'Cairo','Tajawal',sans-serif;
          direction:rtl;
          border-top:4px solid #7c3aed;
        }
        .fr-card.leaving { animation:frOut .32s ease forwards; }
        @media (max-width:768px) {
          .fr-card { bottom:auto; top:76px; left:50%; transform:translateX(-50%); }
          .fr-card.leaving {
            animation:frOut .32s ease forwards;
          }
        }
        .fr-icon { animation:frPulse 1.4s ease-in-out infinite; display:inline-block; }
        @media (prefers-color-scheme:dark) {
          .fr-card { background:#1e1b4b; }
        }
      `}</style>

      <div className={`fr-card${leaving ? ' leaving' : ''}`}>
        {/* X — أعلى يسار البطاقة */}
        <button
          onClick={dismiss}
          aria-label="إغلاق التذكير"
          style={{
            position:'absolute', top:8, left:8,
            background:'none', border:'none',
            cursor:'pointer', color:'#94a3b8',
            fontSize:'1rem', lineHeight:1,
            padding:'2px 5px', borderRadius:4,
            fontFamily:'inherit', zIndex:1,
          }}
        >✕</button>

        <div style={{ padding:'14px 16px 14px 36px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <span className="fr-icon" style={{ fontSize:'1.9rem', lineHeight:1, flexShrink:0 }}>🃏</span>
            <div>
              <div style={{ fontWeight:800, fontSize:'.95rem', color:'#3730a3', lineHeight:1.3 }}>
                راجع كلماتك الآن
              </div>
              <div style={{ fontSize:'.76rem', color:'#7c3aed', fontWeight:600, marginTop:2 }}>
                لا تترك البطاقات تنتظر ✨
              </div>
            </div>
          </div>

          <Link
            href="/library/flashcards"
            onClick={dismiss}
            style={{
              display:'block',
              background:'linear-gradient(135deg,#7c3aed,#a855f7)',
              color:'#fff',
              textDecoration:'none',
              textAlign:'center',
              padding:'8px 14px',
              borderRadius:10,
              fontWeight:700,
              fontSize:'.85rem',
            }}
          >
            ابدأ المراجعة ←
          </Link>
        </div>
      </div>
    </>
  );
}
