'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '../../../../lib/supabase';
import Navbar from '../../../../components/Navbar';

const OPTION_PRESETS = ['فتحة','ضمة','كسرة','سكون','مد بالألف','مد بالواو','مد بالياء'];
const WIN_SCORE = 5;

function buildOptions(q) {
  const correct = q.correct_option;
  let w1 = q.wrong_option_1?.trim() || '';
  let w2 = q.wrong_option_2?.trim() || '';
  if (!w1 || !w2) {
    const pool = OPTION_PRESETS
      .filter(f => f !== correct && f !== w1 && f !== w2)
      .sort(() => Math.random() - 0.5);
    if (!w1) w1 = pool[0] || 'خيار أ';
    if (!w2) w2 = pool[1] || 'خيار ب';
  }
  return [
    { label: correct, isCorrect: true  },
    { label: w1,      isCorrect: false },
    { label: w2,      isCorrect: false },
  ].sort(() => Math.random() - 0.5);
}

function getPlayerId() {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem('ch_pid');
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem('ch_pid', id); }
  return id;
}

/* ─── small spinner ─── */
function Spinner() {
  return (
    <span style={{
      display:'inline-block', width:16, height:16,
      border:'2.5px solid currentColor', borderTopColor:'transparent',
      borderRadius:'50%', animation:'chSpin 1s linear infinite',
    }} />
  );
}

/* ─── score box ─── */
function ScoreBox({ name, score, isMe }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <div style={{
        width:50, height:50, borderRadius:14,
        background: isMe
          ? 'linear-gradient(135deg,#fbbf24,#f59e0b)'
          : 'linear-gradient(135deg,#818cf8,#6366f1)',
        color: isMe ? '#1e1b4b' : 'white',
        fontWeight:900, fontSize:'1.5rem',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow: isMe ? '0 4px 14px #f59e0b66' : '0 4px 14px #6366f166',
      }}>{score}</div>
      <span style={{ color:'rgba(255,255,255,.8)', fontSize:'.75rem', fontWeight:700, maxWidth:80, textAlign:'center', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
        {name || (isMe ? 'أنت' : 'منافسك')}
      </span>
    </div>
  );
}

export default function ChallengePage() {
  const [user,     setUser]    = useState(null);
  const [authDone, setAuthDone]= useState(false);
  const [phase,    setPhase]   = useState('lobby'); // lobby|waiting|playing|finished
  const [name,     setName]    = useState('');
  const [gameType, setGameType]= useState('vowel-balloon');
  const [joinCode, setJoinCode]= useState('');
  const [room,     setRoom]    = useState(null);
  const [err,      setErr]     = useState('');
  const [busy,     setBusy]    = useState(false);
  const [options,  setOptions] = useState([]);
  const [picked,   setPicked]  = useState(null); // option index
  const [roundState, setRoundState] = useState(null); // 'won_me'|'won_other'|'wrong'|null
  const [copied,    setCopied]    = useState(false);
  const [earnedPts, setEarnedPts] = useState(0);

  const playerIdRef  = useRef('');
  const roomRef      = useRef(null);
  const phaseRef     = useRef('lobby');
  const advanceTimer = useRef(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { roomRef.current  = room;  }, [room]);

  /* auth + player ID */
  useEffect(() => {
    playerIdRef.current = getPlayerId();
    createClient().auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthDone(true);
      if (user?.user_metadata?.full_name && !name)
        setName(user.user_metadata.full_name);
    });
  }, []);

  /* build options when question changes */
  useEffect(() => {
    if (!room?.questions || room.status !== 'playing') return;
    const q = room.questions[room.cur_q_index];
    if (!q) return;
    setOptions(buildOptions(q));
    setPicked(null);
    setRoundState(null);
  }, [room?.cur_q_index, room?.status, room?.id]);

  /* Award points when game finishes */
  useEffect(() => {
    if (phase !== 'finished' || !room || earnedPts > 0 || !user) return;
    const myIsP1 = room.player1_id === playerIdRef.current;
    const p1 = room.player1_score || 0;
    const p2 = room.player2_score || 0;
    const tied  = p1 === p2;
    const myWon = myIsP1 ? p1 > p2 : p2 > p1;
    const amount = myWon ? 15 : tied ? 10 : 5;
    const tag    = myWon ? 'win' : tied ? 'draw' : 'loss';
    setEarnedPts(amount);
    fetch('/api/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: `challenge_${tag}:${room.id}` }),
    }).catch(() => {});
  }, [phase, room, earnedPts, user]);

  /* Realtime subscription */
  useEffect(() => {
    if (!room?.id) return;
    const supabase = createClient();
    const channel = supabase
      .channel('ch:' + room.id)
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'challenge_rooms',
        filter: `id=eq.${room.id}`,
      }, (payload) => {
        const updated = payload.new;
        const prev    = roomRef.current;
        setRoom(updated);

        if (updated.status === 'playing' && phaseRef.current === 'waiting') {
          setPhase('playing');
        }
        if (updated.status === 'finished') {
          setPhase('finished');
          if (advanceTimer.current) clearTimeout(advanceTimer.current);
          return;
        }

        /* round just won — show feedback + schedule advance */
        if (updated.round_winner && !prev?.round_winner) {
          const wonByMe = updated.round_winner === playerIdRef.current;
          setRoundState(wonByMe ? 'won_me' : 'won_other');
          if (advanceTimer.current) clearTimeout(advanceTimer.current);
          advanceTimer.current = setTimeout(async () => {
            await fetch('/api/challenge/advance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ room_id: updated.id, from_q_index: updated.cur_q_index }),
            }).catch(() => {});
          }, 1900);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, [room?.id]);

  /* ── actions ── */
  async function createRoom() {
    if (!name.trim()) { setErr('أدخل اسمك أولاً'); return; }
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/challenge/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_type: gameType, player1_id: playerIdRef.current, player1_name: name.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || 'فشل إنشاء الغرفة'); return; }
      setRoom(d.room);
      setPhase('waiting');
    } catch { setErr('تعذر الاتصال'); }
    finally { setBusy(false); }
  }

  async function joinRoom() {
    if (!name.trim()) { setErr('أدخل اسمك أولاً'); return; }
    if (!joinCode.trim()) { setErr('أدخل كود الغرفة'); return; }
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/challenge/room', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: joinCode.trim().toUpperCase(), player2_id: playerIdRef.current, player2_name: name.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || 'فشل الانضمام'); return; }
      setRoom(d.room);
      setPhase('playing');
      const q = d.room.questions?.[0];
      if (q) setOptions(buildOptions(q));
    } catch { setErr('تعذر الاتصال'); }
    finally { setBusy(false); }
  }

  const pickAnswer = useCallback(async (idx) => {
    if (picked !== null || roundState) return;
    const r = roomRef.current;
    if (!r?.id || r.round_winner) return;
    const q = r.questions?.[r.cur_q_index];
    if (!q || !options[idx]) return;

    setPicked(idx);

    if (!options[idx].isCorrect) {
      setRoundState('wrong');
      setTimeout(() => { setPicked(null); setRoundState(null); }, 700);
      return;
    }

    /* correct — try to claim the round */
    const res = await fetch('/api/challenge/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id:       r.id,
        player_id:     playerIdRef.current,
        q_index:       r.cur_q_index,
        picked_option: options[idx].label,
      }),
    }).catch(() => null);

    if (!res?.ok) { setPicked(null); setRoundState(null); return; }
    const data = await res.json();

    if (!data.won) {
      /* too slow — other player got it first (Realtime will handle feedback) */
      setPicked(null);
    }
    /* if won: Realtime fires → setRoundState('won_me') */
  }, [picked, roundState, options]);

  function resetGame() {
    setPhase('lobby'); setRoom(null); setOptions([]);
    setPicked(null); setRoundState(null); setErr(''); setJoinCode('');
    setEarnedPts(0);
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }

  /* ── derived ── */
  const isP1      = room?.player1_id === playerIdRef.current;
  const myScore   = isP1 ? (room?.player1_score || 0) : (room?.player2_score || 0);
  const theirScore= isP1 ? (room?.player2_score || 0) : (room?.player1_score || 0);
  const myName    = isP1 ? room?.player1_name  : room?.player2_name;
  const theirName = isP1 ? room?.player2_name  : room?.player1_name;
  const curQ      = room?.questions?.[room?.cur_q_index ?? 0];
  const total     = room?.questions?.length || 0;

  const cardStyle = {
    background:'rgba(255,255,255,.97)', borderRadius:28,
    boxShadow:'0 24px 80px rgba(0,0,0,.45)',
    width:'100%', maxWidth:420,
    animation:'chSlideUp .4s both',
  };

  return (
    <>
      {authDone && <Navbar user={user} />}
      <style>{`
        
        * { box-sizing: border-box; }

        @keyframes chSpin     { to{transform:rotate(360deg)} }
        @keyframes chSlideUp  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes chBounce   { 0%{transform:scale(1)} 35%{transform:scale(1.35)} 65%{transform:scale(.88)} 100%{transform:scale(1)} }
        @keyframes chShake    { 0%,100%{transform:translateX(0)} 18%{transform:translateX(-9px)} 36%{transform:translateX(9px)} 54%{transform:translateX(-7px)} 72%{transform:translateX(7px)} }
        @keyframes chPop      { 0%{transform:scale(0.4);opacity:0} 65%{transform:scale(1.15);opacity:1} 100%{transform:scale(1)} }
        @keyframes chFloat    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes chCodeBlink{ 0%,100%{opacity:1} 50%{opacity:.55} }
        @keyframes chPulseRing{ 0%{box-shadow:0 0 0 0 rgba(99,102,241,.5)} 70%{box-shadow:0 0 0 14px rgba(99,102,241,0)} 100%{box-shadow:0 0 0 0 rgba(99,102,241,0)} }

        .ch-inp {
          width:100%; padding:11px 14px; font-size:1rem;
          border:2px solid #e5e7eb; border-radius:12px;
          font-family:'Cairo','Tajawal',sans-serif;
          outline:none; color:#1f2937; transition:border-color .2s;
        }
        .ch-inp:focus { border-color:#6366f1; }

        .ch-opt {
          width:100%; padding:15px 18px; border-radius:16px;
          font-size:1.05rem; font-weight:900; cursor:pointer;
          border:2.5px solid transparent;
          font-family:'Cairo','Tajawal',sans-serif;
          transition:transform .12s, box-shadow .12s, background .15s, border-color .15s;
          user-select:none; -webkit-user-select:none;
        }
        .ch-opt:active:not(:disabled) { transform:scale(.95) !important; }
        .ch-opt-won   { animation:chBounce .55s both; }
        .ch-opt-wrong { animation:chShake .5s both; }
        .ch-opt-dim   { opacity:.45; cursor:default; }
        .ch-pill-active { animation:chPulseRing 1.8s ease-in-out infinite; }
      `}</style>

      <div style={{
        minHeight:'100vh',
        fontFamily:"'Cairo','Tajawal',sans-serif",
        background:'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)',
        display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', padding:'80px 16px 32px',
      }}>

        {/* ══ LOBBY ══ */}
        {phase === 'lobby' && (
          <div style={{ ...cardStyle, padding:'36px 28px' }}>
            <div style={{ textAlign:'center', marginBottom:28 }}>
              <div style={{ fontSize:'3rem', marginBottom:6, animation:'chFloat 2.5s ease-in-out infinite' }}>⚡</div>
              <h1 style={{ margin:0, fontSize:'1.65rem', fontWeight:900, color:'#312e81' }}>وضع التحدي</h1>
              <p style={{ margin:'6px 0 0', color:'#6b7280', fontSize:'.9rem' }}>العب ضد صديقك في الوقت الحقيقي</p>
            </div>

            {/* Name */}
            <div style={{ marginBottom:18 }}>
              <label style={{ display:'block', fontSize:'.85rem', fontWeight:700, color:'#374151', marginBottom:6 }}>اسمك</label>
              <input
                className="ch-inp"
                value={name} onChange={e => setName(e.target.value)}
                placeholder="اكتب اسمك..." dir="rtl"
              />
            </div>

            {/* Game type */}
            <div style={{ marginBottom:24 }}>
              <label style={{ display:'block', fontSize:'.85rem', fontWeight:700, color:'#374151', marginBottom:8 }}>اللعبة</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { key:'vowel-balloon',   label:'🎈 منطاد الحركات'   },
                  { key:'word-smash',      label:'🔨 مطرقة التفكيك'   },
                  { key:'letter-catcher',  label:'🎯 صيّاد الحروف'    },
                  { key:'word-image-match',label:'🖼️ صِل الكلمة بصورتها' },
                ].map(g => (
                  <button key={g.key} onClick={() => setGameType(g.key)} style={{
                    padding:'11px 8px', borderRadius:12,
                    border: gameType === g.key ? '2px solid #6366f1' : '2px solid #e5e7eb',
                    background: gameType === g.key ? '#eef2ff' : 'white',
                    color: gameType === g.key ? '#4338ca' : '#6b7280',
                    fontFamily:"'Cairo','Tajawal',sans-serif",
                    fontSize:'.8rem', fontWeight:700, cursor:'pointer',
                    transition:'all .2s', textAlign:'center',
                  }}>{g.label}</button>
                ))}
              </div>
            </div>

            {/* Create */}
            <button
              onClick={createRoom} disabled={busy}
              style={{
                width:'100%', padding:'13px', borderRadius:14,
                background:'linear-gradient(135deg,#6366f1,#4f46e5)',
                color:'white', fontSize:'1.05rem', fontWeight:900,
                border:'none', cursor: busy ? 'wait' : 'pointer',
                fontFamily:"'Cairo','Tajawal',sans-serif",
                boxShadow:'0 6px 22px rgba(99,102,241,.4)',
                marginBottom:16, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}
            >
              {busy ? <Spinner /> : '✨'} إنشاء غرفة جديدة
            </button>

            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <div style={{ flex:1, height:1, background:'#e5e7eb' }} />
              <span style={{ color:'#9ca3af', fontSize:'.8rem' }}>أو انضم لغرفة موجودة</span>
              <div style={{ flex:1, height:1, background:'#e5e7eb' }} />
            </div>

            {/* Join */}
            <div style={{ display:'flex', gap:10 }}>
              <input
                className="ch-inp"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="كود الغرفة" dir="ltr" maxLength={4}
                style={{ flex:1, letterSpacing:'.22em', textAlign:'center', fontFamily:'monospace', fontSize:'1.15rem', fontWeight:900, color:'#312e81' }}
                onKeyDown={e => e.key === 'Enter' && joinRoom()}
              />
              <button
                onClick={joinRoom} disabled={busy}
                style={{
                  padding:'11px 20px', borderRadius:12,
                  background:'linear-gradient(135deg,#10b981,#059669)',
                  color:'white', fontSize:'.95rem', fontWeight:900,
                  border:'none', cursor: busy ? 'wait' : 'pointer',
                  fontFamily:"'Cairo','Tajawal',sans-serif",
                  boxShadow:'0 4px 14px rgba(16,185,129,.35)',
                  display:'flex', alignItems:'center', gap:6,
                }}
              >{busy ? <Spinner /> : 'انضم'}</button>
            </div>

            {err && (
              <div style={{ marginTop:14, padding:'10px 14px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, color:'#dc2626', fontSize:'.88rem', textAlign:'center' }}>
                {err}
              </div>
            )}
          </div>
        )}

        {/* ══ WAITING ══ */}
        {phase === 'waiting' && room && (
          <div style={{ ...cardStyle, padding:'44px 32px', textAlign:'center' }}>
            <div style={{ fontSize:'2.8rem', marginBottom:14, animation:'chFloat 2s ease-in-out infinite' }}>🎮</div>
            <h2 style={{ margin:'0 0 8px', fontSize:'1.3rem', fontWeight:900, color:'#312e81' }}>أرسل الكود لصديقك!</h2>
            <p style={{ margin:'0 0 26px', color:'#6b7280', fontSize:'.9rem' }}>
              {room.game_type === 'vowel-balloon' ? '🎈 منطاد الحركات' : '🔨 مطرقة التفكيك'}
            </p>

            {/* Code */}
            <div
              onClick={() => { navigator.clipboard?.writeText(room.room_code).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
              className="ch-pill-active"
              style={{
                background:'linear-gradient(135deg,#312e81,#4f46e5)',
                borderRadius:22, padding:'22px 36px', marginBottom:26,
                cursor:'pointer', userSelect:'none',
              }}
            >
              <div style={{ color:'rgba(255,255,255,.65)', fontSize:'.8rem', marginBottom:4 }}>
                {copied ? '✅ تم النسخ!' : 'اضغط للنسخ'}
              </div>
              <div style={{ color:'white', fontSize:'3rem', fontWeight:900, letterSpacing:'.45em', fontFamily:'monospace' }}>
                {room.room_code}
              </div>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'center', color:'#6b7280', fontSize:'.9rem' }}>
              <Spinner />
              في انتظار اللاعب الثاني...
            </div>
          </div>
        )}

        {/* ══ PLAYING ══ */}
        {phase === 'playing' && room && curQ && (
          <div style={{ width:'100%', maxWidth:420, animation:'chSlideUp .3s both' }}>

            {/* Score bar */}
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              background:'rgba(255,255,255,.1)', backdropFilter:'blur(8px)',
              borderRadius:20, padding:'14px 20px', marginBottom:14,
            }}>
              <ScoreBox name={myName} score={myScore} isMe={true} />
              <div style={{ color:'rgba(255,255,255,.5)', fontSize:'1.2rem', fontWeight:900 }}>VS</div>
              <ScoreBox name={theirName} score={theirScore} isMe={false} />
            </div>

            {/* Progress */}
            <div style={{ textAlign:'center', color:'rgba(255,255,255,.5)', fontSize:'.8rem', marginBottom:10 }}>
              سؤال {(room.cur_q_index || 0) + 1} من {total} · أول من يصل {WIN_SCORE} نقاط يفوز
            </div>

            {/* Question card */}
            <div style={{
              background:
                roundState === 'won_me'    ? 'linear-gradient(135deg,#d1fae5,#a7f3d0)'
              : roundState === 'won_other' ? 'linear-gradient(135deg,#fef3c7,#fde68a)'
              : 'rgba(255,255,255,.97)',
              borderRadius:26, padding:'32px 24px 28px',
              boxShadow:'0 16px 60px rgba(0,0,0,.35)',
              transition:'background .25s', marginBottom:12,
              textAlign:'center',
            }}>

              {/* Round feedback banner */}
              {roundState === 'won_me' && (
                <div style={{ fontSize:'1rem', fontWeight:900, color:'#065f46', marginBottom:14, animation:'chPop .4s both' }}>
                  🏆 أحسنت! سبقت!
                </div>
              )}
              {roundState === 'won_other' && (
                <div style={{ fontSize:'1rem', fontWeight:700, color:'#92400e', marginBottom:14, animation:'chPop .4s both' }}>
                  ⚡ {theirName} سبقك!
                </div>
              )}

              {/* Question — image or text */}
              {curQ.question_type === 'image' ? (
                <div style={{ marginBottom:24, display:'flex', justifyContent:'center' }}>
                  <img
                    src={curQ.target_text}
                    alt="؟"
                    style={{
                      maxHeight:140, maxWidth:'100%', borderRadius:16,
                      objectFit:'contain',
                      boxShadow:'0 6px 24px rgba(0,0,0,.18)',
                    }}
                  />
                </div>
              ) : (
                <div style={{
                  fontSize: curQ.target_text?.length > 6 ? '2.8rem' : '4.5rem',
                  fontWeight:900, color:'#312e81',
                  lineHeight:1.3, marginBottom:28,
                  fontFamily:"'Cairo','Tajawal',sans-serif",
                }}>{curQ.target_text}</div>
              )}

              {/* Options */}
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {options.map((opt, i) => {
                  const isPicked = picked === i;
                  const disabled = picked !== null || !!roundState;
                  const isWrong  = isPicked && roundState === 'wrong';
                  const isWon    = isPicked && roundState === 'won_me';

                  return (
                    <button
                      key={i}
                      onClick={() => !disabled && pickAnswer(i)}
                      className={`ch-opt ${isWrong ? 'ch-opt-wrong' : ''} ${isWon ? 'ch-opt-won' : ''} ${disabled && !isPicked ? 'ch-opt-dim' : ''}`}
                      style={{
                        background:
                          isWrong ? '#fee2e2'
                        : isWon   ? '#d1fae5'
                        : isPicked ? '#eef2ff'
                        : '#f1f5f9',
                        color:
                          isWrong ? '#dc2626'
                        : isWon   ? '#065f46'
                        : isPicked ? '#4338ca'
                        : '#1e3a5f',
                        borderColor:
                          isWrong ? '#fca5a5'
                        : isWon   ? '#34d399'
                        : isPicked ? '#818cf8'
                        : 'transparent',
                        boxShadow: isPicked ? 'none' : '0 3px 10px rgba(0,0,0,.07)',
                      }}
                    >{opt.label}</button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══ FINISHED ══ */}
        {phase === 'finished' && room && (
          <div style={{ ...cardStyle, padding:'44px 32px', textAlign:'center' }}>
            {(() => {
              const p1 = room.player1_score || 0;
              const p2 = room.player2_score || 0;
              const tied  = p1 === p2;
              const myWon = isP1 ? p1 > p2 : p2 > p1;
              return (
                <>
                  <div style={{ fontSize:'3.8rem', marginBottom:10, animation:'chBounce .6s both' }}>
                    {tied ? '🤝' : myWon ? '🏆' : '⭐'}
                  </div>
                  <h2 style={{ margin:'0 0 6px', fontSize:'1.6rem', fontWeight:900, color:'#312e81' }}>
                    {tied ? 'تعادل!' : myWon ? 'فزت! 🎉' : `فاز ${theirName || 'المنافس'}!`}
                  </h2>
                  <p style={{ margin:'0 0 16px', color:'#6b7280', fontSize:'.9rem' }}>النتيجة النهائية</p>

                  {earnedPts > 0 && (
                    <div style={{
                      background:'#FEF3C7', border:'1.5px solid #FDE68A',
                      borderRadius:12, padding:'8px 18px',
                      fontSize:'.9rem', fontWeight:800, color:'#D97706',
                      marginBottom:16, animation:'chPop .4s both',
                    }}>
                      ⭐ ربحت {earnedPts} نقطة!
                    </div>
                  )}

                  <div style={{ display:'flex', gap:20, justifyContent:'center', alignItems:'center', marginBottom:30 }}>
                    <div>
                      <div style={{ fontSize:'.78rem', color:'#9ca3af', marginBottom:4 }}>{myName || 'أنت'}</div>
                      <div style={{ fontSize:'3rem', fontWeight:900, color: myWon ? '#059669' : '#374151' }}>
                        {myScore}
                      </div>
                    </div>
                    <div style={{ color:'#d1d5db', fontSize:'1.8rem', fontWeight:300 }}>—</div>
                    <div>
                      <div style={{ fontSize:'.78rem', color:'#9ca3af', marginBottom:4 }}>{theirName || 'المنافس'}</div>
                      <div style={{ fontSize:'3rem', fontWeight:900, color: !myWon && !tied ? '#059669' : '#374151' }}>
                        {theirScore}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={resetGame}
                    style={{
                      width:'100%', padding:'13px', borderRadius:14,
                      background:'linear-gradient(135deg,#6366f1,#4f46e5)',
                      color:'white', fontSize:'1.05rem', fontWeight:900,
                      border:'none', cursor:'pointer',
                      fontFamily:"'Cairo','Tajawal',sans-serif",
                      boxShadow:'0 6px 22px rgba(99,102,241,.4)',
                    }}
                  >🔄 العب مجدداً</button>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </>
  );
}
