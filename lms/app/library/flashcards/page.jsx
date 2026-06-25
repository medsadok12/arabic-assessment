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
// Client-side SRS intervals (mirrors server)
const SRS_INTERVALS = [1, 1, 3, 7, 14, 30];

function getColor(topic) {
  return TOPIC_COLORS[topic] || TOPIC_COLORS.default;
}

/* ─── Stats Chip ─── */
function StatChip({ label, val, color, bg }) {
  return (
    <div style={{
      background: bg, border: `1.5px solid ${color}33`,
      borderRadius: 20, padding: '4px 12px',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{ fontSize: '.95rem', fontWeight: 900, color }}>{val}</span>
      <span style={{ fontSize: '.7rem', color: '#64748b', fontWeight: 700 }}>{label}</span>
    </div>
  );
}

/* ─── Flip Card ─── */
function FlipCard({ card, onEasy, onHard, onForgot, cardNum, total }) {
  const [flipped, setFlipped] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const c = getColor(card.topic);

  useEffect(() => { setFlipped(false); setLeaving(false); setFeedback(null); }, [card.id]);

  function answer(difficulty, cb) {
    const lvl = card.level ?? 0;
    let emoji, msg, sub, color;

    if (difficulty === 'easy') {
      const newLvl = Math.min(lvl + 1, 5);
      const days   = SRS_INTERVALS[newLvl];
      emoji = '✅';
      if (newLvl === 5) {
        msg = 'محفوظة تماماً! ✨';
        sub = 'أتقنتَ هذه الكلمة';
      } else {
        msg = 'ممتاز!';
        sub = `📅 ستُراجَع بعد ${days} يوم`;
      }
      color = '#059669';
    } else if (difficulty === 'hard') {
      emoji = '⏰';
      msg = 'صعبة بعض الشيء';
      sub = '📅 ستُراجَع غداً';
      color = '#d97706';
    } else {
      emoji = '💪';
      msg = 'لا بأس! التكرار يُرسّخ';
      sub = '🔄 ستُضاف للمراجعة';
      color = '#dc2626';
    }

    setFeedback({ emoji, msg, sub, color });
    setTimeout(() => {
      setLeaving(true);
      setTimeout(cb, 350);
    }, 700);
  }

  return (
    <div style={{ perspective:1200, width:'100%', maxWidth:380, margin:'0 auto' }}>

      {/*
        CRITICAL: animation wrapper is SEPARATE from the flip div.
        position:relative is needed for the feedback overlay.
      */}
      <div style={{
        position: 'relative',
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
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', justifyContent:'center' }}>
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
          borderRadius:28, padding:'20px 20px',
          display:'flex', flexDirection:'column',
          justifyContent:'space-between',
          boxShadow:'0 12px 40px rgba(99,102,241,.35)',
        }}>
          {/* Word echo */}
          <div style={{
            fontSize:'2.5rem', fontWeight:900, color:'#e0e7ff',
            textAlign:'center', fontFamily:"'Cairo','Tajawal',sans-serif",
          }}>{card.word}</div>

          {/* Type + Sentence */}
          <div style={{ textAlign:'center' }}>
            {card.word_type && (
              <span style={{
                display:'inline-block', background:'rgba(255,255,255,.15)',
                color:'#c7d2fe', borderRadius:20, padding:'4px 14px',
                fontSize:'.78rem', fontWeight:700, marginBottom:10,
              }}>{card.word_type}</span>
            )}
            {card.sentence ? (
              <div style={{
                fontSize:'1.05rem', color:'#e0e7ff',
                lineHeight:1.9, fontFamily:"'Cairo','Tajawal',sans-serif",
                fontWeight:500, direction:'rtl',
                background:'rgba(255,255,255,.08)', borderRadius:14,
                padding:'10px 14px',
              }}>
                {card.sentence.split(card.word).map((part, i, arr) => (
                  i < arr.length - 1
                    ? [part, <span key={i} style={{ color:'#fbbf24', fontWeight:900 }}>{card.word}</span>]
                    : part
                ))}
              </div>
            ) : (
              <div style={{ color:'rgba(255,255,255,.4)', fontSize:'.9rem', fontStyle:'italic' }}>
                لا توجد جملة مثال
              </div>
            )}
          </div>

          {/* 3 Answer buttons */}
          <div style={{ display:'flex', gap:7 }}>
            <button onClick={() => answer('forgot', onForgot)} style={{
              flex:1, padding:'11px 6px', borderRadius:14, border:'2px solid rgba(239,68,68,.4)',
              background:'rgba(239,68,68,.15)', color:'#fca5a5',
              fontSize:'.82rem', fontWeight:900, cursor:'pointer',
              fontFamily:"'Cairo','Tajawal',sans-serif", transition:'all .15s',
            }}>
              ❌<br/>لم أحفظ
            </button>
            <button onClick={() => answer('hard', onHard)} style={{
              flex:1, padding:'11px 6px', borderRadius:14, border:'2px solid rgba(251,191,36,.4)',
              background:'rgba(251,191,36,.12)', color:'#fde68a',
              fontSize:'.82rem', fontWeight:900, cursor:'pointer',
              fontFamily:"'Cairo','Tajawal',sans-serif", transition:'all .15s',
            }}>
              ⏰<br/>صعبة
            </button>
            <button onClick={() => answer('easy', onEasy)} style={{
              flex:1, padding:'11px 6px', borderRadius:14, border:'2px solid rgba(16,185,129,.4)',
              background:'rgba(16,185,129,.18)', color:'#6ee7b7',
              fontSize:'.82rem', fontWeight:900, cursor:'pointer',
              fontFamily:"'Cairo','Tajawal',sans-serif", transition:'all .15s',
            }}>
              ✅<br/>حفظتها
            </button>
          </div>
        </div>

        </div>{/* end flip container */}

        {/* ── Feedback overlay ── */}
        {feedback && (
          <div style={{
            position:'absolute', inset:0, borderRadius:28,
            display:'flex', alignItems:'center', justifyContent:'center',
            background:'rgba(15,23,42,.82)', zIndex:20,
            animation:'fcEnter .2s both',
          }}>
            <div style={{
              background:'white', borderRadius:20, padding:'20px 32px',
              textAlign:'center', boxShadow:'0 8px 32px rgba(0,0,0,.4)',
              fontFamily:"'Cairo','Tajawal',sans-serif",
            }}>
              <div style={{ fontSize:'2rem', marginBottom:6 }}>{feedback.emoji}</div>
              <div style={{ fontSize:'1.05rem', fontWeight:900, color:feedback.color }}>{feedback.msg}</div>
              <div style={{ fontSize:'.82rem', color:'#64748b', marginTop:6 }}>{feedback.sub}</div>
            </div>
          </div>
        )}

      </div>{/* end animation wrapper */}
    </div>
  );
}

/* ─── Done Screen ─── */
function DoneScreen({ easy, hard, forgot, stats }) {
  const total = easy + hard + forgot;
  const pct   = total > 0 ? Math.round((easy / total) * 100) : 0;
  const msg   = pct >= 80 ? 'ممتاز! أداء رائع 🏆' : pct >= 50 ? 'جيد! استمر في التدريب 💪' : 'لا بأس! التكرار يُرسّخ الحفظ 🔄';
  return (
    <div style={{
      background:'rgba(255,255,255,.97)', borderRadius:28,
      padding:'36px 24px', textAlign:'center',
      boxShadow:'0 20px 60px rgba(0,0,0,.18)', maxWidth:380, margin:'0 auto',
      animation:'fcEnter .4s cubic-bezier(0,.9,.57,1) both',
      fontFamily:"'Cairo','Tajawal',sans-serif",
    }}>
      <div style={{ fontSize:'3.5rem', marginBottom:10 }}>
        {pct >= 80 ? '🏆' : pct >= 50 ? '⭐' : '💡'}
      </div>
      <h2 style={{ margin:'0 0 4px', fontSize:'1.5rem', fontWeight:900, color:'#1e293b' }}>
        انتهت الجلسة!
      </h2>
      <p style={{ color:'#64748b', fontSize:'.9rem', margin:'0 0 22px' }}>{msg}</p>

      {/* Session stats */}
      <div style={{ display:'flex', gap:0, justifyContent:'center', marginBottom:22, border:'1.5px solid #f1f5f9', borderRadius:18, overflow:'hidden' }}>
        <div style={{ flex:1, padding:'14px 8px', borderLeft:'1.5px solid #f1f5f9' }}>
          <div style={{ fontSize:'2rem', fontWeight:900, color:'#059669' }}>{easy}</div>
          <div style={{ fontSize:'.72rem', color:'#6b7280', fontWeight:700 }}>حفظتها ✅</div>
        </div>
        <div style={{ flex:1, padding:'14px 8px', borderLeft:'1.5px solid #f1f5f9' }}>
          <div style={{ fontSize:'2rem', fontWeight:900, color:'#d97706' }}>{hard}</div>
          <div style={{ fontSize:'.72rem', color:'#6b7280', fontWeight:700 }}>صعبة ⏰</div>
        </div>
        <div style={{ flex:1, padding:'14px 8px' }}>
          <div style={{ fontSize:'2rem', fontWeight:900, color:'#dc2626' }}>{forgot}</div>
          <div style={{ fontSize:'.72rem', color:'#6b7280', fontWeight:700 }}>لم أحفظ ❌</div>
        </div>
      </div>

      {/* Overall mastery */}
      {stats && stats.mastered > 0 && (
        <div style={{
          background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',
          border:'1.5px solid #86efac', borderRadius:16,
          padding:'12px 20px', marginBottom:20,
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        }}>
          <span style={{ fontSize:'1.3rem' }}>✨</span>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:'1.05rem', fontWeight:900, color:'#15803d' }}>{stats.mastered} كلمة محفوظة</div>
            <div style={{ fontSize:'.75rem', color:'#166534' }}>من أصل {stats.total} كلمة في مستواك</div>
          </div>
        </div>
      )}

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
  const [user,         setUser]         = useState(null);
  const [authDone,     setAuthDone]     = useState(false);
  const [phase,        setPhase]        = useState('loading'); // loading|empty|cards|done
  const [deck,         setDeck]         = useState([]);
  const [retries,      setRetries]      = useState({});
  const [easyCount,    setEasyCount]    = useState(0);
  const [hardCount,    setHardCount]    = useState(0);
  const [forgotCount,  setForgotCount]  = useState(0);
  const [cardsDone,    setCardsDone]    = useState(0);
  const [totalCards,   setTotalCards]   = useState(0);
  const [totalPoints,  setTotalPoints]  = useState(0);
  const [ptPopupKey,   setPtPopupKey]   = useState(0);
  const [ptPopupActive,setPtPopupActive]= useState(false);
  const [stats,        setStats]        = useState(null);

  useEffect(() => {
    fetch('/api/points').then(r => r.json()).then(j => setTotalPoints(j.points ?? 0)).catch(() => {});
  }, []);

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
        if (d.stats) setStats(d.stats);
        setPhase('cards');
      })
      .catch(() => setPhase('empty'));
  }, []);

  const callReview = useCallback((wordId, difficulty) => {
    fetch('/api/flashcards/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word_id: wordId, difficulty }),
    }).catch(() => {});
  }, []);

  function handleEasy() {
    const card = deck[0];
    callReview(card.id, 'easy');
    setEasyCount(n => n + 1);
    setCardsDone(n => n + 1);
    setPtPopupKey(k => k + 1);
    setPtPopupActive(true);
    setTimeout(() => setPtPopupActive(false), 1200);
    fetch('/api/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 3, reason: `fc_${card.id}` }),
    }).then(r => r.json()).then(j => { if (j.points != null) setTotalPoints(j.points); }).catch(() => {});
    const next = deck.slice(1);
    if (!next.length) { setPhase('done'); return; }
    setDeck(next);
  }

  function handleHard() {
    const card = deck[0];
    callReview(card.id, 'hard');
    setHardCount(n => n + 1);
    setCardsDone(n => n + 1);
    const next = deck.slice(1);
    if (!next.length) { setPhase('done'); return; }
    setDeck(next);
  }

  function handleForgot() {
    const card = deck[0];
    callReview(card.id, 'forgot');
    setForgotCount(f => f + 1);
    const count = (retries[card.id] || 0) + 1;
    setRetries(r => ({ ...r, [card.id]: count }));

    let next;
    if (count < 2) {
      // Re-add to end of deck for another try
      next = [...deck.slice(1), card];
    } else {
      // Shown twice, move on
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
        @keyframes ptFloatUp {
          0%   { opacity: 1; transform: translateY(0) scale(1.25); }
          70%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-48px) scale(0.9); }
        }
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
            {stats && stats.mastered > 0 && (
              <p style={{ color:'#059669', fontSize:'.9rem', fontWeight:700, marginBottom:16 }}>
                ✨ {stats.mastered} كلمة محفوظة تماماً
              </p>
            )}
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

            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <h1 style={{
                textAlign:'center', color:'white', fontSize:'1.2rem', fontWeight:900,
                margin:0, opacity:.85,
              }}>📚 بطاقات الحفظ</h1>
              <div style={{ position:'relative', display:'inline-flex', alignItems:'center' }}>
                <span style={{ background:'rgba(255,255,255,0.18)', borderRadius:20, padding:'5px 14px', fontSize:'.88rem', fontWeight:800, color:'#fff' }}>⭐ {totalPoints.toLocaleString()}</span>
                {ptPopupActive && (
                  <span key={ptPopupKey} style={{ position:'absolute', top:-28, left:'50%', transform:'translateX(-50%)', color:'#fbbf24', fontWeight:900, fontSize:'1.05rem', pointerEvents:'none', whiteSpace:'nowrap', animation:'ptFloatUp 1.1s ease forwards', textShadow:'0 1px 6px rgba(0,0,0,.5)' }}>+3 ⭐</span>
                )}
              </div>
            </div>

            {/* Stats bar */}
            {stats && (
              <div style={{ display:'flex', gap:6, marginBottom:14, justifyContent:'center', flexWrap:'wrap' }}>
                <StatChip label="محفوظة ✨" val={stats.mastered}    color="#059669" bg="rgba(240,253,244,.18)" />
                <StatChip label="قيد التعلم" val={stats.in_progress} color="#a78bfa" bg="rgba(245,243,255,.18)" />
                <StatChip label="جلسة اليوم" val={`${cardsDone}/${totalCards}`} color="#38bdf8" bg="rgba(240,249,255,.18)" />
              </div>
            )}

            <FlipCard
              card={cur}
              onEasy={handleEasy}
              onHard={handleHard}
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
          <DoneScreen
            easy={easyCount}
            hard={hardCount}
            forgot={forgotCount}
            stats={stats}
            onRestart={() => window.location.reload()}
          />
        )}

      </div>
    </>
  );
}
