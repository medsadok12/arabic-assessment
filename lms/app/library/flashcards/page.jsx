'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase';
import Navbar from '../../../components/Navbar';

const TOPIC_COLORS = {
  'حيوانات':  { bg:'#f0fdf4', border:'#86efac', badge:'#16a34a', icon:'🦁' },
  'فاكهة':    { bg:'#fef9c3', border:'#fde047', badge:'#ca8a04', icon:'🍎' },
  'خضروات':  { bg:'#ecfdf5', border:'#6ee7b7', badge:'#059669', icon:'🥦' },
  'أدوات':    { bg:'#eff6ff', border:'#93c5fd', badge:'#2563eb', icon:'🔧' },
  'مهن':      { bg:'#fdf4ff', border:'#e879f9', badge:'#9333ea', icon:'👷' },
  'طعام':     { bg:'#fff7ed', border:'#fdba74', badge:'#ea580c', icon:'🍽️' },
  'مدرسة':    { bg:'#f0f9ff', border:'#7dd3fc', badge:'#0284c7', icon:'📚' },
  'طبيعة':    { bg:'#f7fee7', border:'#a3e635', badge:'#65a30d', icon:'🌿' },
  'default':  { bg:'#f8fafc', border:'#cbd5e1', badge:'#475569', icon:'📖' },
};

const LEVEL_LABELS = ['جديدة','مبتدئ','أساسي','متوسط','متقدم','محفوظة ✨'];

function getColor(topic) {
  return TOPIC_COLORS[topic] || TOPIC_COLORS.default;
}

/* ─── Flip Card ─── */
function FlipCard({ card, onRemembered, onForgot, cardNum, total }) {
  const [flipped, setFlipped] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const c = getColor(card.topic);

  useEffect(() => { setFlipped(false); setLeaving(false); }, [card.id]);

  function answer(remembered) {
    setLeaving(true);
    setTimeout(() => {
      remembered ? onRemembered() : onForgot();
    }, 350);
  }

  return (
    <div style={{ perspective:1200, width:'100%', maxWidth:380, margin:'0 auto' }}>

      {/*
        CRITICAL: animation wrapper is SEPARATE from the flip div.
        When animation has fill-mode:both it holds "transform:none" after finishing,
        which would override the flip's "transform:rotateY(180deg)" if on the same element.
        Keeping them on different elements prevents the CSS property conflict.
      */}
      <div style={{
        animation: leaving
          ? 'fcLeave .35s ease forwards'
          : 'fcEnter .4s cubic-bezier(0,.9,.57,1) both',
      }}>

        {/* Flip container — only rotateY, no animation here */}
        <div style={{
          transformStyle:'preserve-3d',
          transition:'transform .5s cubic-bezier(.4,0,.2,1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          position:'relative', height:340,
        }}>

        {/* ── FRONT ── */}
        <div onClick={() => !flipped && setFlipped(true)} style={{
          backfaceVisibility:'hidden', WebkitBackfaceVisibility:'hidden',
          position:'absolute', inset:0,
          background: `linear-gradient(160deg, ${c.bg} 0%, white 100%)`,
          border: `2.5px solid ${c.border}`,
          borderRadius:28, padding:'28px 24px',
          display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'space-between',
          cursor:'pointer', boxShadow:'0 12px 40px rgba(0,0,0,.1)',
          userSelect:'none',
        }}>
          {/* Progress */}
          <div style={{ width:'100%', display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <div style={{ flex:1, height:6, background:'#f1f5f9', borderRadius:99, overflow:'hidden' }}>
              <div style={{
                height:'100%', borderRadius:99,
                background:`linear-gradient(90deg,${c.badge},${c.border})`,
                width:`${(cardNum / total) * 100}%`, transition:'width .4s',
              }} />
            </div>
            <span style={{ fontSize:'.75rem', fontWeight:700, color:'#94a3b8', flexShrink:0 }}>
              {cardNum}/{total}
            </span>
          </div>

          {/* Topic + level */}
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <span style={{
              background:c.badge, color:'#fff', borderRadius:20,
              padding:'4px 12px', fontSize:'.75rem', fontWeight:800,
            }}>{c.icon} {card.topic || 'عام'}</span>
            {card.level > 0 && (
              <span style={{
                background:'#f1f5f9', color:'#64748b', borderRadius:20,
                padding:'4px 10px', fontSize:'.72rem', fontWeight:700,
              }}>{LEVEL_LABELS[card.level]}</span>
            )}
            {card.is_new && (
              <span style={{
                background:'#fef3c7', color:'#92400e', borderRadius:20,
                padding:'4px 10px', fontSize:'.72rem', fontWeight:700,
              }}>✨ جديدة</span>
            )}
          </div>

          {/* Word */}
          <div style={{
            fontSize:'4rem', fontWeight:900,
            color:'#1e293b', textAlign:'center', lineHeight:1.2,
            fontFamily:"'Cairo','Tajawal',sans-serif",
            letterSpacing:'-.02em',
          }}>{card.word}</div>

          {/* Tap hint */}
          <div style={{
            display:'flex', alignItems:'center', gap:6,
            color:'#94a3b8', fontSize:'.82rem', fontWeight:700,
          }}>
            <span style={{ fontSize:'1.1rem' }}>👆</span>
            اضغط لرؤية المثال
          </div>
        </div>

        {/* ── BACK ── */}
        <div style={{
          backfaceVisibility:'hidden', WebkitBackfaceVisibility:'hidden',
          transform:'rotateY(180deg)',
          position:'absolute', inset:0,
          background:'linear-gradient(160deg,#1e1b4b 0%,#312e81 100%)',
          borderRadius:28, padding:'24px 22px',
          display:'flex', flexDirection:'column',
          justifyContent:'space-between',
          boxShadow:'0 12px 40px rgba(99,102,241,.35)',
        }}>
          {/* Word echo */}
          <div style={{
            fontSize:'2.8rem', fontWeight:900, color:'#e0e7ff',
            textAlign:'center', fontFamily:"'Cairo','Tajawal',sans-serif",
          }}>{card.word}</div>

          {/* Type + Sentence */}
          <div style={{ textAlign:'center' }}>
            {card.word_type && (
              <span style={{
                display:'inline-block', background:'rgba(255,255,255,.15)',
                color:'#c7d2fe', borderRadius:20, padding:'4px 14px',
                fontSize:'.78rem', fontWeight:700, marginBottom:12,
              }}>{card.word_type}</span>
            )}
            {card.sentence ? (
              <div style={{
                fontSize:'1.15rem', color:'#e0e7ff',
                lineHeight:1.9, fontFamily:"'Cairo','Tajawal',sans-serif",
                fontWeight:500, direction:'rtl',
                background:'rgba(255,255,255,.08)', borderRadius:14,
                padding:'12px 16px',
              }}>
                {card.sentence.replace(card.word,
                  `<mark style="background:transparent;color:#fbbf24;font-weight:900">${card.word}</mark>`
                ).split(/(<mark[^>]*>.*?<\/mark>)/g).map((part, i) =>
                  part.startsWith('<mark') ? (
                    <span key={i} style={{ color:'#fbbf24', fontWeight:900 }}>{card.word}</span>
                  ) : part
                )}
              </div>
            ) : (
              <div style={{ color:'rgba(255,255,255,.4)', fontSize:'.9rem', fontStyle:'italic' }}>
                لا توجد جملة مثال
              </div>
            )}
          </div>

          {/* Answer buttons */}
          <div style={{ display:'flex', gap:12 }}>
            <button onClick={() => answer(false)} style={{
              flex:1, padding:'14px', borderRadius:16, border:'none',
              background:'rgba(239,68,68,.18)', color:'#fca5a5',
              fontSize:'1rem', fontWeight:900, cursor:'pointer',
              fontFamily:"'Cairo','Tajawal',sans-serif",
              border:'2px solid rgba(239,68,68,.35)',
              transition:'all .15s',
            }}>
              ❌ لم أحفظ
            </button>
            <button onClick={() => answer(true)} style={{
              flex:1, padding:'14px', borderRadius:16, border:'none',
              background:'rgba(16,185,129,.2)', color:'#6ee7b7',
              fontSize:'1rem', fontWeight:900, cursor:'pointer',
              fontFamily:"'Cairo','Tajawal',sans-serif",
              border:'2px solid rgba(16,185,129,.35)',
              transition:'all .15s',
            }}>
              ✅ حفظتها
            </button>
          </div>
        </div>

        </div>{/* /flip container */}
      </div>{/* /animation wrapper */}
    </div>{/* /perspective */}
  );
}

/* ─── Done Screen ─── */
function DoneScreen({ remembered, forgot, onRestart }) {
  const total = remembered + forgot;
  const pct   = total > 0 ? Math.round((remembered / total) * 100) : 0;
  const msg   = pct >= 80 ? 'ممتاز! أداء رائع 🏆' : pct >= 50 ? 'جيد! استمر في التدريب 💪' : 'لا بأس! التكرار يُرسّخ الحفظ 🔄';
  return (
    <div style={{
      background:'rgba(255,255,255,.97)', borderRadius:28,
      padding:'40px 28px', textAlign:'center',
      boxShadow:'0 20px 60px rgba(0,0,0,.18)', maxWidth:380, margin:'0 auto',
      animation:'fcEnter .4s cubic-bezier(0,.9,.57,1) both',
    }}>
      <div style={{ fontSize:'3.5rem', marginBottom:12 }}>
        {pct >= 80 ? '🏆' : pct >= 50 ? '⭐' : '💡'}
      </div>
      <h2 style={{ margin:'0 0 6px', fontSize:'1.5rem', fontWeight:900, color:'#1e293b' }}>
        انتهت الجلسة!
      </h2>
      <p style={{ color:'#64748b', fontSize:'.9rem', margin:'0 0 24px' }}>{msg}</p>

      {/* Stats */}
      <div style={{ display:'flex', gap:16, justifyContent:'center', marginBottom:28 }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'2.4rem', fontWeight:900, color:'#059669' }}>{remembered}</div>
          <div style={{ fontSize:'.78rem', color:'#6b7280', fontWeight:700 }}>حفظتها</div>
        </div>
        <div style={{ width:1, background:'#e5e7eb' }} />
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'2.4rem', fontWeight:900, color:'#dc2626' }}>{forgot}</div>
          <div style={{ fontSize:'.78rem', color:'#6b7280', fontWeight:700 }}>ستُراجَع غداً</div>
        </div>
        <div style={{ width:1, background:'#e5e7eb' }} />
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'2.4rem', fontWeight:900, color:'#6366f1' }}>{pct}%</div>
          <div style={{ fontSize:'.78rem', color:'#6b7280', fontWeight:700 }}>النسبة</div>
        </div>
      </div>

      <Link href="/library" style={{
        display:'block', padding:'13px', borderRadius:14,
        background:'linear-gradient(135deg,#6366f1,#4f46e5)',
        color:'white', fontSize:'1rem', fontWeight:900,
        textDecoration:'none', marginBottom:10,
        fontFamily:"'Cairo','Tajawal',sans-serif",
        boxShadow:'0 6px 20px rgba(99,102,241,.35)',
      }}>← العودة للمكتبة</Link>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export default function FlashcardsPage() {
  const [user,       setUser]       = useState(null);
  const [authDone,   setAuthDone]   = useState(false);
  const [phase,      setPhase]      = useState('loading'); // loading|empty|cards|done
  const [deck,       setDeck]       = useState([]);
  const [retries,    setRetries]    = useState({});
  const [remembered, setRemembered] = useState(0);
  const [forgot,     setForgot]     = useState(0);
  const [cardsDone,  setCardsDone]  = useState(0);
  const [totalCards, setTotalCards] = useState(0);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      setUser(user); setAuthDone(true);
    });
  }, []);

  useEffect(() => {
    fetch('/api/flashcards')
      .then(r => r.json())
      .then(d => {
        if (!d.cards?.length) { setPhase('empty'); return; }
        setDeck(d.cards);
        setTotalCards(d.cards.length);
        setPhase('cards');
      })
      .catch(() => setPhase('empty'));
  }, []);

  const callReview = useCallback((wordId, rem) => {
    fetch('/api/flashcards/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word_id: wordId, remembered: rem }),
    }).catch(() => {});
  }, []);

  function handleRemembered() {
    callReview(deck[0].id, true);
    setRemembered(r => r + 1);
    setCardsDone(n => n + 1);
    const next = deck.slice(1);
    if (!next.length) { setPhase('done'); return; }
    setDeck(next);
  }

  function handleForgot() {
    callReview(deck[0].id, false);
    setForgot(f => f + 1);
    const cur   = deck[0];
    const count = (retries[cur.id] || 0) + 1;
    setRetries(r => ({ ...r, [cur.id]: count }));

    let next;
    if (count < 2) {
      // Re-add to end
      next = [...deck.slice(1), cur];
    } else {
      // Shown enough times, move on
      setCardsDone(n => n + 1);
      next = deck.slice(1);
    }
    if (!next.length) { setPhase('done'); return; }
    setDeck(next);
  }

  const cur = deck[0];

  return (
    <>
      {authDone && <Navbar user={user} />}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Tajawal:wght@400;700;900&display=swap');
        * { box-sizing:border-box; }
        @keyframes fcEnter  { from{opacity:0;transform:translateY(18px) scale(.96)} to{opacity:1;transform:none} }
        @keyframes fcLeave  { from{opacity:1;transform:none} to{opacity:0;transform:translateY(-14px) scale(.96)} }
        @keyframes fcSpin   { to{transform:rotate(360deg)} }
        @keyframes fcPulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
      `}</style>

      <div style={{
        minHeight:'100vh',
        background:'linear-gradient(160deg,#0f172a 0%,#1e1b4b 50%,#312e81 100%)',
        fontFamily:"'Cairo','Tajawal',sans-serif",
        display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', padding:'80px 16px 32px',
      }}>

        {/* Loading */}
        {phase === 'loading' && (
          <div style={{ color:'rgba(255,255,255,.7)', fontSize:'1rem', display:'flex', gap:10, alignItems:'center' }}>
            <span style={{ display:'inline-block', width:22, height:22, border:'2.5px solid currentColor', borderTopColor:'transparent', borderRadius:'50%', animation:'fcSpin 1s linear infinite' }} />
            جارٍ تحميل البطاقات...
          </div>
        )}

        {/* Empty */}
        {phase === 'empty' && (
          <div style={{
            background:'rgba(255,255,255,.97)', borderRadius:28,
            padding:'48px 32px', textAlign:'center', maxWidth:360,
            boxShadow:'0 20px 60px rgba(0,0,0,.2)', animation:'fcEnter .4s both',
          }}>
            <div style={{ fontSize:'3rem', marginBottom:12 }}>🎉</div>
            <h2 style={{ margin:'0 0 8px', color:'#1e293b', fontSize:'1.4rem', fontWeight:900 }}>
              لا بطاقات اليوم!
            </h2>
            <p style={{ color:'#64748b', fontSize:'.9rem', marginBottom:24 }}>
              أتقنتَ كل الكلمات المجدولة اليوم.<br />
              عُد غداً لمزيد من المراجعة.
            </p>
            <Link href="/library" style={{
              display:'block', padding:'12px', borderRadius:12,
              background:'linear-gradient(135deg,#6366f1,#4f46e5)',
              color:'white', fontSize:'1rem', fontWeight:900,
              textDecoration:'none', fontFamily:"'Cairo','Tajawal',sans-serif",
            }}>← العودة للمكتبة</Link>
          </div>
        )}

        {/* Cards */}
        {phase === 'cards' && cur && (
          <div style={{ width:'100%', maxWidth:400, animation:'fcEnter .35s both' }}>
            <h1 style={{
              textAlign:'center', color:'white', fontSize:'1.2rem', fontWeight:900,
              marginBottom:20, opacity:.85,
            }}>📚 بطاقات الحفظ</h1>

            <FlipCard
              card={cur}
              onRemembered={handleRemembered}
              onForgot={handleForgot}
              cardNum={cardsDone + 1}
              total={totalCards}
            />

            <Link href="/library" style={{
              display:'block', textAlign:'center', marginTop:20,
              color:'rgba(255,255,255,.45)', fontSize:'.82rem', textDecoration:'none',
              fontWeight:700,
            }}>← العودة للمكتبة</Link>
          </div>
        )}

        {/* Done */}
        {phase === 'done' && (
          <DoneScreen remembered={remembered} forgot={forgot} onRestart={() => window.location.reload()} />
        )}

      </div>
    </>
  );
}
