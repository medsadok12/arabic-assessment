'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '../../../../lib/supabase';

/* ─── Constants ─────────────────────────────────────────────────────────── */
const STRIP_RE = /[ً-ْٰـ]/g;
const ARABIC_RE = /^[ء-ي]+$/;

const LEVEL_COLORS = {
  1: { bg: '#f0fdf4', border: '#86efac', accent: '#16a34a' },
  2: { bg: '#fefce8', border: '#fde047', accent: '#ca8a04' },
  3: { bg: '#fff7ed', border: '#fdba74', accent: '#ea580c' },
  4: { bg: '#fef2f2', border: '#fca5a5', accent: '#dc2626' },
};

/* ─── Pure helpers ───────────────────────────────────────────────────────── */
function strip(w) { return w.replace(STRIP_RE, ''); }
function isArabic(w) { return ARABIC_RE.test(w); }
function letterCounts(w) { const c={}; for(const ch of w) c[ch]=(c[ch]||0)+1; return c; }
function canFormFrom(word, wc) {
  const m = letterCounts(word);
  for(const [ch,n] of Object.entries(m)) if((wc[ch]||0)<n) return false;
  return true;
}
function calcScore(word, allLetters) {
  const len = word.length;
  const base = len>=7?12:len===6?8:len===5?4:len===4?2:1;
  const unique = [...new Set(allLetters)];
  return unique.every(ch=>word.includes(ch)) ? base*2 : base;
}
function speak(text) {
  if(typeof window==='undefined'||!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang='ar-SA'; u.rate=0.82;
  function go() {
    const ar = window.speechSynthesis.getVoices().find(v=>v.lang.startsWith('ar'));
    if(ar) u.voice=ar;
    window.speechSynthesis.speak(u);
  }
  if(window.speechSynthesis.getVoices().length>0) go();
  else { window.speechSynthesis.addEventListener('voiceschanged',go,{once:true}); setTimeout(go,500); }
}

/* ─── Progress helpers ───────────────────────────────────────────────────── */
const PROG_KEY = 'ww_progress';
function loadProgress() {
  try { const r=localStorage.getItem(PROG_KEY); return r?JSON.parse(r):{}; } catch { return {}; }
}
function saveProgress(prog) {
  try { localStorage.setItem(PROG_KEY, JSON.stringify(prog)); } catch {}
}
function wheelKey(lvl, idx) { return `${lvl}_${idx}`; }
function getWheelStars(lvl, idx, prog) { return prog[wheelKey(lvl,idx)] ?? 0; }
function getTotalDone(prog) {
  let n=0;
  for(let l=1;l<=4;l++) for(let i=0;i<5;i++) if(getWheelStars(l,i,prog)>0) n++;
  return n;
}
function getLevelSummary(lvl, prog) {
  const stars = [0,1,2,3,4].map(i=>getWheelStars(lvl,i,prog));
  const done  = stars.filter(s=>s>0).length;
  const total = stars.reduce((a,b)=>a+b,0);
  return { done, total, maxTotal: 15 };
}
function Stars({ count, size=18 }) {
  return (
    <span style={{fontSize:size,lineHeight:1}}>
      {'⭐'.repeat(count)}{'☆'.repeat(3-count)}
    </span>
  );
}

/* ─── WheelSVG ──────────────────────────────────────────────────────────── */
function WheelSVG({ letters, center, selectedLetters, onLetterClick }) {
  const cx=160, cy=160, outerR=105, circleR=28, centerR=46;
  const n=letters.length;
  return (
    <svg viewBox="0 0 320 320" width="100%" style={{maxWidth:320,userSelect:'none'}}>
      <defs>
        <radialGradient id="ww-gold" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FDE68A"/>
          <stop offset="100%" stopColor="#D97706"/>
        </radialGradient>
        <radialGradient id="ww-center" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FEF3C7"/>
          <stop offset="100%" stopColor="#F59E0B"/>
        </radialGradient>
        <filter id="ww-shadow"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.18"/></filter>
      </defs>
      {letters.map((_,i)=>{
        const angle=i*(2*Math.PI/n)-Math.PI/2;
        const ox=cx+outerR*Math.cos(angle), oy=cy+outerR*Math.sin(angle);
        return <line key={`l${i}`} x1={cx} y1={cy} x2={ox} y2={oy} stroke="#FDE68A" strokeWidth="1.5" opacity="0.6"/>;
      })}
      {letters.map((letter,i)=>{
        const angle=i*(2*Math.PI/n)-Math.PI/2;
        const ox=cx+outerR*Math.cos(angle), oy=cy+outerR*Math.sin(angle);
        const used=selectedLetters.filter(l=>l===letter).length;
        const total=letters.filter(l=>l===letter).length;
        const usedUp=used>=total;
        return (
          <g key={`o${i}`} onClick={()=>!usedUp&&onLetterClick(letter)} style={{cursor:usedUp?'not-allowed':'pointer'}}>
            <circle cx={ox} cy={oy} r={circleR+4} fill="transparent"/>
            <circle cx={ox} cy={oy} r={circleR} fill={usedUp?'#E5E7EB':'url(#ww-gold)'} stroke={usedUp?'#D1D5DB':'#F59E0B'} strokeWidth="2" filter="url(#ww-shadow)" style={{transition:'all 0.15s'}}/>
            <text x={ox} y={oy+1} textAnchor="middle" dominantBaseline="middle" fontSize="18" fontWeight="800" fill={usedUp?'#9CA3AF':'#92400E'} fontFamily="'Cairo','Tajawal',sans-serif" style={{pointerEvents:'none'}}>{letter}</text>
          </g>
        );
      })}
      <g onClick={()=>onLetterClick(center)} style={{cursor:'pointer'}}>
        <circle cx={cx} cy={cy} r={centerR+6} fill="transparent"/>
        <circle cx={cx} cy={cy} r={centerR} fill="url(#ww-center)" stroke="#D97706" strokeWidth="3" filter="url(#ww-shadow)"/>
        <text x={cx} y={cy+2} textAnchor="middle" dominantBaseline="middle" fontSize="26" fontWeight="900" fill="#78350F" fontFamily="'Cairo','Tajawal',sans-serif" style={{pointerEvents:'none'}}>{center}</text>
        <text x={cx} y={cy+centerR-10} textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight="700" fill="#B45309" opacity="0.75" fontFamily="'Cairo','Tajawal',sans-serif" style={{pointerEvents:'none'}}>إلزامي</text>
      </g>
    </svg>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function WordWheelGame() {
  const [phase,          setPhase]          = useState('lobby');
  const [levelsData,     setLevelsData]     = useState([]);
  const [currentLevel,   setCurrentLevel]   = useState(1);
  const [currentIndex,   setCurrentIndex]   = useState(0);
  const [totalWheels,    setTotalWheels]    = useState(5);
  const [letters,        setLetters]        = useState([]);
  const [center,         setCenter]         = useState('');
  const [gameTime,       setGameTime]       = useState(120);
  const [selected,       setSelected]       = useState([]);
  const [inputText,      setInputText]      = useState('');
  const [foundWords,     setFoundWords]     = useState([]);
  const [score,          setScore]          = useState(0);
  const [timeLeft,       setTimeLeft]       = useState(120);
  const [feedback,       setFeedback]       = useState(null);
  const [shaking,        setShaking]        = useState(false);
  const [flashing,       setFlashing]       = useState(false);
  const [flyWord,        setFlyWord]        = useState(null);
  const [customConfigs,  setCustomConfigs]  = useState([]);
  const [customConfig,   setCustomConfig]   = useState(null);
  const [wheelValidWords,setWheelValidWords]= useState([]);
  const [totalPoints,    setTotalPoints]    = useState(0);
  const [wordImagePopup, setWordImagePopup] = useState(null);
  const [userRole,       setUserRole]       = useState(null);
  // ── Progress tracking ──
  const [progress,   setProgress]   = useState({});
  const [gameStars,  setGameStars]  = useState(0);
  const [allDoneNew, setAllDoneNew] = useState(false);

  const timerRef   = useRef(null);
  const feedbackRef= useRef(null);
  const progSaved  = useRef(false);

  /* ── Load progress from localStorage ──────────────────────────────────── */
  useEffect(() => { setProgress(loadProgress()); }, []);

  /* ── Load levels + configs + user role ────────────────────────────────── */
  useEffect(() => {
    fetch('/api/word-wheel?level=1&index=0')
      .then(r=>r.json())
      .then(j=>{ if(j.levels?.length) setLevelsData(j.levels); })
      .catch(()=>{});
    fetch('/api/word-wheel/configs')
      .then(r=>r.json())
      .then(j=>setCustomConfigs(j.configs||[]))
      .catch(()=>{});
    createClient().auth.getUser()
      .then(({data})=>setUserRole(data?.user?.user_metadata?.role||null))
      .catch(()=>{});
    fetch('/api/points').then(r=>r.json()).then(j=>setTotalPoints(j.points??0)).catch(()=>{});
  }, []);

  /* ── Save progress when game finishes ─────────────────────────────────── */
  useEffect(() => {
    if(phase!=='finished'||customConfig||progSaved.current) return;
    progSaved.current = true;
    const stars = score>=20?3:score>=10?2:score>0?1:0;
    setGameStars(stars);
    const key = wheelKey(currentLevel, currentIndex);
    setProgress(prev=>{
      const next={...prev};
      if((next[key]??0)<stars) next[key]=stars;
      saveProgress(next);
      return next;
    });
  }, [phase]);

  /* ── Reset progSaved on new game ───────────────────────────────────────── */
  useEffect(() => { if(phase==='playing') progSaved.current=false; }, [phase]);

  /* ── Custom config play ────────────────────────────────────────────────── */
  const playCustomConfig = useCallback((config) => {
    setCustomConfig(config);
    setLetters(config.outer_letters||[]);
    setCenter(config.center_letter||'');
    setGameTime(config.time_seconds||90);
    setCurrentIndex(0); setTotalWheels(1);
    setWheelValidWords([]);
    setPhase('start');
  }, []);

  /* ── Fetch wheel ───────────────────────────────────────────────────────── */
  const fetchWheel = useCallback(async (level, index) => {
    setCustomConfig(null); setPhase('loading');
    try {
      const res = await fetch(`/api/word-wheel?level=${level}&index=${index}`);
      const j   = await res.json();
      if(j.levels?.length) setLevelsData(j.levels);
      setLetters(j.letters||[]); setCenter(j.center||'');
      setGameTime(j.time||90); setTotalWheels(j.total||5);
      setWheelValidWords(j.valid_words||[]);
      setPhase('start');
    } catch { setPhase('lobby'); }
  }, []);

  /* ── Start game ────────────────────────────────────────────────────────── */
  const startGame = useCallback(() => {
    setSelected([]); setInputText(''); setFoundWords([]);
    setScore(0); setTimeLeft(gameTime); setFeedback(null);
    setShaking(false); setFlashing(false); setFlyWord(null);
    setGameStars(0);
    setPhase('playing');
  }, [gameTime]);

  /* ── Timer ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if(phase!=='playing') return;
    timerRef.current = setInterval(()=>{
      setTimeLeft(t=>{ if(t<=1){ clearInterval(timerRef.current); setPhase('finished'); return 0; } return t-1; });
    },1000);
    return ()=>clearInterval(timerRef.current);
  }, [phase]);


  const allLetters  = [...letters,center];
  const wheelCounts = letterCounts(allLetters.join(''));

  /* ── Letter click ──────────────────────────────────────────────────────── */
  const handleLetterClick = useCallback((letter)=>{
    if(phase!=='playing') return;
    setSelected(p=>[...p,letter]); setInputText(p=>p+letter);
  },[phase]);

  const handleBackspace = useCallback(()=>{ setSelected(p=>p.slice(0,-1)); setInputText(p=>p.slice(0,-1)); },[]);
  const handleClear     = useCallback(()=>{ setSelected([]); setInputText(''); },[]);

  /* ── Feedback ──────────────────────────────────────────────────────────── */
  const showFeedback = useCallback((msg,type)=>{
    clearTimeout(feedbackRef.current);
    setFeedback({msg,type});
    feedbackRef.current=setTimeout(()=>setFeedback(null),1800);
  },[]);

  /* ── Submit ────────────────────────────────────────────────────────────── */
  const handleSubmit = useCallback(()=>{
    if(phase!=='playing') return;
    const word=strip(inputText.trim());
    if(word.length<3){ setShaking(true); setTimeout(()=>setShaking(false),500); showFeedback('الكلمة قصيرة جداً — 3 حروف على الأقل','error'); return; }
    if(!isArabic(word)){ setShaking(true); setTimeout(()=>setShaking(false),500); showFeedback('حروف غير صالحة','error'); return; }
    if(!word.includes(center)){ setShaking(true); setTimeout(()=>setShaking(false),500); showFeedback(`الحرف "${center}" إلزامي في كل كلمة`,'error'); return; }
    if(!canFormFrom(word,wheelCounts)){ setShaking(true); setTimeout(()=>setShaking(false),500); showFeedback('الكلمة تحتوي على حروف خارج العجلة','error'); return; }
    // Validate against the curated word list for standard wheels
    if(!customConfig && wheelValidWords.length>0 && !wheelValidWords.includes(word)){
      setShaking(true); setTimeout(()=>setShaking(false),500);
      showFeedback('الكلمة غير مدرجة في القائمة — جرّب غيرها 💡','error');
      return;
    }
    if(customConfig&&(customConfig.valid_words||[]).length>0){
      const entry=(customConfig.valid_words||[]).find(vw=>vw.word===word);
      if(!entry){ setShaking(true); setTimeout(()=>setShaking(false),500); showFeedback('الكلمة غير موجودة في قائمة هذه العجلة','error'); return; }
    }
    if(foundWords.includes(word)){ setShaking(true); setTimeout(()=>setShaking(false),500); showFeedback('وجدت هذه الكلمة من قبل!','warn'); return; }
    const pts=calcScore(word,allLetters);
    setScore(s=>s+pts); setFoundWords(p=>[word,...p]);
    setFlyWord(word); setFlashing(true);
    setTimeout(()=>{ setFlashing(false); setFlyWord(null); },900);
    speak(word);
    showFeedback(`+${pts} نقطة — ممتاز! ✨`,'success');
    fetch('/api/points',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:pts,reason:'word_wheel'})}).then(r=>r.json()).then(j=>{if(j.points)setTotalPoints(j.points);}).catch(()=>{});
    setSelected([]); setInputText('');
    if(customConfig){
      const entry=(customConfig.valid_words||[]).find(vw=>vw.word===word);
      if(entry?.image){ setWordImagePopup({word,image:entry.image}); setTimeout(()=>setWordImagePopup(null),2500); }
    }
  },[phase,inputText,center,wheelCounts,foundWords,allLetters,showFeedback,customConfig,wheelValidWords]);

  /* ── Keyboard ──────────────────────────────────────────────────────────── */
  useEffect(()=>{
    const fn=(e)=>{
      if(phase!=='playing') return;
      if(e.key==='Enter') handleSubmit();
      else if(e.key==='Backspace') handleBackspace();
      else if(e.key==='Escape') handleClear();
    };
    window.addEventListener('keydown',fn);
    return ()=>window.removeEventListener('keydown',fn);
  },[phase,handleSubmit,handleBackspace,handleClear]);

  /* ── Navigation ────────────────────────────────────────────────────────── */
  function handleNextWheel() {
    if(customConfig){ setCustomConfig(null); setPhase('lobby'); return; }
    const nextIndex=currentIndex+1;
    if(nextIndex<totalWheels){
      setCurrentIndex(nextIndex); fetchWheel(currentLevel,nextIndex);
    } else if(currentLevel<4){
      const nl=currentLevel+1; setCurrentLevel(nl); setCurrentIndex(0); fetchWheel(nl,0);
    } else {
      const prog=loadProgress();
      const done=getTotalDone(prog);
      setAllDoneNew(done>=20);
      setPhase('allDone');
      fetch('/api/game-results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game_id: 'word_wheel', category: 'عام', correct: done, wrong: 0, total: done }) }).catch(() => {});
    }
  }
  function handleRetryWheel() {
    if(customConfig){ playCustomConfig(customConfig); return; }
    fetchWheel(currentLevel,currentIndex);
  }

  /* ── Derived ───────────────────────────────────────────────────────────── */
  const timerPct   = (timeLeft/gameTime)*100;
  const timerColor = timeLeft>30?'#10B981':timeLeft>10?'#F59E0B':'#EF4444';
  const bestWord   = foundWords.length>0
    ? foundWords.reduce((b,w)=>calcScore(w,allLetters)>=calcScore(b,allLetters)?w:b,foundWords[0])
    : null;
  const currentLevelInfo = levelsData.find(l=>l.id===currentLevel)||null;
  const levelLabel = customConfig
    ? `🎡 ${customConfig.name}`
    : currentLevelInfo
    ? `${currentLevelInfo.icon} ${currentLevelInfo.label} — ${currentIndex+1}/${totalWheels}`
    : `العجلة ${currentIndex+1}/${totalWheels}`;
  const isLastWheel=currentIndex+1>=totalWheels;
  const isLastLevel=currentLevel>=4;
  const totalDone=getTotalDone(progress);

  /* ════════════════════════════════════════════════════════════════════════
     PHASE: ALL DONE 🏆
  ════════════════════════════════════════════════════════════════════════ */
  if(phase==='allDone') {
    const totalStars=[1,2,3,4].reduce((s,l)=>s+getLevelSummary(l,progress).total,0);
    const maxStars=60;
    return (
      <div style={S.page}>
        <style>{CSS_KEYFRAMES}</style>
        <div style={{...S.centerCard, gap:20, padding:'40px 24px'}}>
          <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,overflow:'hidden'}}>
            {Array.from({length:40},(_,i)=>(
              <div key={i} style={{
                position:'absolute',
                left:`${(i*2.5)%100}%`,top:'-10px',
                width:i%3===0?10:7,height:i%3===0?10:7,
                borderRadius:i%2===0?'50%':3,
                background:['#F59E0B','#8B5CF6','#EF4444','#10B981','#3B82F6','#EC4899'][i%6],
                animation:`ww-confetti ${2+i*0.1}s ${i*0.08}s linear infinite`,
              }}/>
            ))}
          </div>
          <div style={{position:'relative',zIndex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:20,width:'100%'}}>
            <div style={{fontSize:'5rem',animation:'ww-pop 0.7s cubic-bezier(0.175,0.885,0.32,1.275) forwards'}}>🏆</div>
            <div>
              <h2 style={{...S.mainTitle,color:'#D97706',fontSize:'1.8rem',margin:0,textAlign:'center'}}>أحسنت يا بطل! 🎉</h2>
              <p style={{color:'#6B7280',textAlign:'center',margin:'6px 0 0',fontSize:'.92rem'}}>أتممت جميع مراحل عجلة الكلمات!</p>
            </div>
            <div style={{background:'#FFFBEB',border:'2px solid #FDE68A',borderRadius:18,padding:'16px 24px',textAlign:'center',width:'100%',boxSizing:'border-box'}}>
              <div style={{fontSize:'2rem',marginBottom:6}}>{'⭐'.repeat(Math.min(5,Math.round(totalStars/12)))}</div>
              <div style={{fontSize:'1.6rem',fontWeight:900,color:'#D97706'}}>{totalStars} / {maxStars}</div>
              <div style={{color:'#92400E',fontSize:'.8rem',fontWeight:700,marginTop:2}}>إجمالي النجوم عبر كل العجلات</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,width:'100%'}}>
              {[1,2,3,4].map(lvl=>{
                const {done,total,maxTotal}=getLevelSummary(lvl,progress);
                const info=levelsData.find(l=>l.id===lvl)||{icon:['🟢','🟡','🟠','🔴'][lvl-1],label:['مبتدئ','متوسط','متقدم','أسطوري'][lvl-1]};
                const c=LEVEL_COLORS[lvl];
                return (
                  <div key={lvl} style={{background:c.bg,border:`1.5px solid ${c.border}`,borderRadius:12,padding:'10px 12px',textAlign:'center'}}>
                    <div style={{fontSize:'1.4rem'}}>{info.icon}</div>
                    <div style={{fontWeight:800,color:c.accent,fontSize:'.82rem',marginTop:2}}>{info.label}</div>
                    <div style={{color:'#374151',fontSize:'.75rem',marginTop:4}}>{done}/5 عجلة</div>
                    <div style={{fontSize:14,marginTop:2}}>{'⭐'.repeat(Math.round(total/5))}{'☆'.repeat(3-Math.round(total/5))}</div>
                  </div>
                );
              })}
            </div>
            <button style={S.btnGold} onClick={()=>{
              localStorage.removeItem(PROG_KEY);
              setProgress({});
              setPhase('lobby');
            }}>🔄 العب من جديد</button>
            <Link href="/library" style={S.backLink}>← المكتبة</Link>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════════
     PHASE: LOBBY
  ════════════════════════════════════════════════════════════════════════ */
  if(phase==='lobby') {
    const defaultLevels=[
      {id:1,label:'مبتدئ',icon:'🟢',desc:'حروف شائعة — 120 ثانية'},
      {id:2,label:'متوسط',icon:'🟡',desc:'حروف أصعب — 90 ثانية'},
      {id:3,label:'متقدم',icon:'🟠',desc:'حروف نادرة — 75 ثانية'},
      {id:4,label:'أسطوري',icon:'🔴',desc:'التحدي الأقصى — 60 ثانية'},
    ];
    const displayLevels=levelsData.length?levelsData:defaultLevels;
    const pct=Math.round((totalDone/20)*100);
    return (
      <div style={S.page}>
        <style>{CSS_KEYFRAMES}</style>
        <div style={S.lobbyWrap}>
          <div style={S.lobbyHeader}>
            <Link href="/library" style={S.topBackLink}>← المكتبة</Link>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'3.5rem',animation:'ww-wheelSpin 10s linear infinite',display:'inline-block'}}>🎡</div>
              <h1 style={S.mainTitle}>عجلة الكلمات</h1>
              <p style={{color:'rgba(255,255,255,0.75)',margin:0,fontSize:'.93rem'}}>اختر مرحلتك وابدأ التحدي!</p>
            </div>
          </div>
          <div style={{background:'rgba(255,255,255,0.12)',borderRadius:16,padding:'14px 16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{color:'rgba(255,255,255,0.85)',fontWeight:800,fontSize:'.88rem'}}>🏆 تقدمك الكلي</span>
              <span style={{color:'#FCD34D',fontWeight:900,fontSize:'.9rem'}}>{totalDone} / 20 عجلة</span>
            </div>
            <div style={{height:12,background:'rgba(255,255,255,0.2)',borderRadius:8,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#FCD34D,#F59E0B)',borderRadius:8,transition:'width 0.6s ease'}} />
            </div>
            <div style={{textAlign:'center',marginTop:6,color:'rgba(255,255,255,0.6)',fontSize:'.75rem'}}>
              {totalDone===0?'ابدأ رحلتك!':totalDone===20?'🌟 أتممت جميع العجلات!':pct+'% أنجزت'}
            </div>
          </div>
          <div style={S.lobbyGrid}>
            {displayLevels.map(lvl=>{
              const colors=LEVEL_COLORS[lvl.id]||LEVEL_COLORS[1];
              const {done,total}=getLevelSummary(lvl.id,progress);
              const allDone=done>=5;
              return (
                <button key={lvl.id}
                  onClick={()=>{ setCurrentLevel(lvl.id); setCurrentIndex(0); fetchWheel(lvl.id,0); }}
                  style={{...S.levelCard,background:colors.bg,borderColor:colors.border,position:'relative'}}
                  onMouseEnter={e=>{ e.currentTarget.style.transform='scale(1.04)'; e.currentTarget.style.boxShadow=`0 8px 24px ${colors.border}80`; }}
                  onMouseLeave={e=>{ e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='none'; }}>
                  {allDone&&(
                    <div style={{position:'absolute',top:8,left:8,background:'#22c55e',color:'white',borderRadius:20,padding:'2px 8px',fontSize:10,fontWeight:800}}>✓ مكتمل</div>
                  )}
                  <div style={{fontSize:'2.4rem'}}>{lvl.icon}</div>
                  <div style={{fontSize:'1.1rem',fontWeight:900,color:colors.accent}}>{lvl.label}</div>
                  <div style={{fontSize:'.78rem',color:'#6B7280',lineHeight:1.5}}>{lvl.desc}</div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2,width:'100%'}}>
                    <div style={{fontSize:16}}>{'⭐'.repeat(Math.round(total/5))}{'☆'.repeat(3-Math.round(total/5))}</div>
                    <div style={{height:4,background:'#E5E7EB',borderRadius:4,width:'80%',overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${(done/5)*100}%`,background:colors.accent,borderRadius:4,transition:'width .4s'}} />
                    </div>
                    <div style={{fontSize:10,color:colors.accent,fontWeight:700}}>{done}/5 عجلة</div>
                  </div>
                </button>
              );
            })}
          </div>
          {customConfigs.length>0&&(()=>{
            const isTeacher=['teacher','admin','super_admin'].includes(userRole);
            const studentConfigs=customConfigs.filter(c=>(c.valid_words||[]).length>0);
            if(!isTeacher&&studentConfigs.length===0) return null;
            return isTeacher?(
              <div style={{background:'rgba(255,255,255,0.12)',borderRadius:18,padding:'16px 14px'}}>
                <div style={{fontSize:'.8rem',fontWeight:800,color:'rgba(255,255,255,0.7)',marginBottom:10}}>عجلات مخصصة</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {customConfigs.map(cfg=>(
                    <button key={cfg.id} onClick={()=>playCustomConfig(cfg)}
                      style={{background:'#fff',border:'none',borderRadius:14,padding:'12px 16px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',textAlign:'right',fontFamily:"'Cairo','Tajawal',sans-serif",direction:'rtl',transition:'transform .12s'}}
                      onMouseEnter={e=>e.currentTarget.style.transform='scale(1.02)'}
                      onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
                      <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,#F59E0B,#D97706)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem',fontWeight:900,color:'#fff',flexShrink:0}}>{cfg.center_letter}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:800,color:'#1F2937',fontSize:'1rem'}}>{cfg.name}</div>
                        <div style={{fontSize:'.76rem',color:'#6B7280',marginTop:2}}>{(cfg.outer_letters||[]).length} حرفاً • {(cfg.valid_words||[]).length} كلمة • {cfg.time_seconds}ث</div>
                      </div>
                      <div style={{fontSize:'1.2rem',color:'#D97706'}}>←</div>
                    </button>
                  ))}
                </div>
              </div>
            ):(
              <div>
                <div style={{textAlign:'center',color:'rgba(255,255,255,0.65)',fontSize:'.8rem',fontWeight:700,marginBottom:10}}>⭐ تحديات المعلم</div>
                <div style={S.lobbyGrid}>
                  {studentConfigs.map((cfg,i)=>{
                    const palettes=[{bg:'#f0fdf4',border:'#86efac',accent:'#16a34a'},{bg:'#fefce8',border:'#fde047',accent:'#ca8a04'},{bg:'#fff7ed',border:'#fdba74',accent:'#ea580c'},{bg:'#fdf2ff',border:'#e9d5ff',accent:'#9333ea'},{bg:'#eff6ff',border:'#bfdbfe',accent:'#2563eb'},{bg:'#fef2f2',border:'#fca5a5',accent:'#dc2626'}];
                    const col=palettes[i%palettes.length];
                    return (
                      <button key={cfg.id} onClick={()=>playCustomConfig(cfg)}
                        style={{...S.levelCard,background:col.bg,borderColor:col.border}}
                        onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.04)';e.currentTarget.style.boxShadow=`0 8px 24px ${col.border}80`;}}
                        onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow='none';}}>
                        <div style={{fontSize:'2rem',fontWeight:900,color:col.accent,background:`${col.border}60`,borderRadius:'50%',width:52,height:52,display:'flex',alignItems:'center',justifyContent:'center'}}>{cfg.center_letter}</div>
                        <div style={{fontSize:'1.05rem',fontWeight:900,color:col.accent}}>{cfg.name}</div>
                        <div style={{fontSize:'.75rem',color:'#6B7280'}}>{(cfg.valid_words||[]).length} كلمة</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          {['teacher','admin','super_admin'].includes(userRole)&&(
            <Link href="/library/games/word-wheel/settings" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'rgba(255,255,255,0.15)',color:'rgba(255,255,255,0.9)',borderRadius:14,padding:'12px 20px',textDecoration:'none',fontFamily:"'Cairo','Tajawal',sans-serif",fontWeight:700,fontSize:'.9rem',border:'1.5px solid rgba(255,255,255,0.25)'}}>
              ⚙️ إدارة العجلات المخصصة
            </Link>
          )}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════════
     PHASE: LOADING
  ════════════════════════════════════════════════════════════════════════ */
  if(phase==='loading') return (
    <div style={S.page}><style>{CSS_KEYFRAMES}</style>
      <div style={S.centerCard}>
        <div style={{fontSize:'4rem',animation:'ww-spin 2.5s linear infinite',display:'inline-block'}}>🎡</div>
        <h2 style={S.mainTitle}>عجلة الكلمات</h2>
        <p style={{color:'#D97706',fontWeight:700,margin:0}}>جارٍ تجهيز العجلة…</p>
        <div style={{display:'flex',gap:10}}>
          {[0,200,400].map(d=>(<div key={d} style={{width:12,height:12,borderRadius:'50%',background:'#F59E0B',animation:`ww-pulse 1.2s ${d}ms ease-in-out infinite`}}/>))}
        </div>
      </div>
    </div>
  );

  /* ════════════════════════════════════════════════════════════════════════
     PHASE: START
  ════════════════════════════════════════════════════════════════════════ */
  if(phase==='start') {
    const colors=LEVEL_COLORS[currentLevel]||LEVEL_COLORS[1];
    const prevStars=getWheelStars(currentLevel,currentIndex,progress);
    return (
      <div style={S.page}><style>{CSS_KEYFRAMES}</style>
        <div style={{...S.centerCard,animation:'ww-floatin 0.5s ease-out',padding:'28px 22px',gap:18}}>
          <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
            {customConfig?(
              <span style={{background:'#FFFBEB',border:'1.5px solid #FDE68A',color:'#92400E',borderRadius:20,padding:'4px 14px',fontSize:'.85rem',fontWeight:800}}>🎡 {customConfig.name}</span>
            ):(<>
              <span style={{background:colors.bg,border:`1.5px solid ${colors.border}`,color:colors.accent,borderRadius:20,padding:'4px 14px',fontSize:'.85rem',fontWeight:800}}>
                {currentLevelInfo?`${currentLevelInfo.icon} ${currentLevelInfo.label}`:`المرحلة ${currentLevel}`}
              </span>
              <span style={{background:'#FFFBEB',border:'1.5px solid #FDE68A',color:'#92400E',borderRadius:20,padding:'4px 14px',fontSize:'.85rem',fontWeight:700}}>العجلة {currentIndex+1}/{totalWheels}</span>
            </>)}
            <span style={{background:'#EFF6FF',border:'1.5px solid #BAE6FD',color:'#0369A1',borderRadius:20,padding:'4px 14px',fontSize:'.85rem',fontWeight:700}}>⏱ {gameTime} ثانية</span>
          </div>
          {prevStars>0&&!customConfig&&(
            <div style={{background:'#FFFBEB',border:'1.5px solid #FDE68A',borderRadius:12,padding:'6px 16px',display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:'.8rem',color:'#92400E',fontWeight:700}}>أفضل نتيجة سابقة:</span>
              <span style={{fontSize:18}}>{'⭐'.repeat(prevStars)}{'☆'.repeat(3-prevStars)}</span>
            </div>
          )}
          <div style={{width:'100%',maxWidth:260}}>
            <WheelSVG letters={letters} center={center} selectedLetters={[]} onLetterClick={()=>{}}/>
          </div>
          <div style={S.rulesGrid}>
            {[['3 حروف','1 نقطة'],['4 حروف','2 نقطة'],['5 حروف','4 نقاط'],['6 حروف','8 نقاط'],['7+ حروف','12 نقطة'],['كل الحروف','×2 مضاعف']].map(([l,p])=>(
              <div key={l} style={S.ruleBox}><span style={{fontWeight:800,color:'#92400E',fontSize:'.82rem'}}>{l}</span><span style={{color:'#D97706',fontWeight:700,fontSize:'.8rem'}}>{p}</span></div>
            ))}
          </div>
          <p style={{color:'#6B7280',fontSize:'.88rem',margin:0,textAlign:'center',lineHeight:1.8}}>الحرف الأوسط <strong style={{color:'#D97706'}}>إلزامي</strong> في كل كلمة — الكلمة الأطول = نقاط أكثر!</p>
          <button style={S.btnGold} onClick={startGame}>ابدأ اللعب ←</button>
          <button style={S.btnOutline} onClick={()=>setPhase('lobby')}>تغيير المرحلة</button>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════════
     PHASE: FINISHED
  ════════════════════════════════════════════════════════════════════════ */
  if(phase==='finished') {
    const nextBtnLabel=customConfig
      ? '← العودة للقائمة'
      : isLastWheel
        ? isLastLevel?'🏅 نتائج المسابقة':'المرحلة التالية 🎯'
        : 'العجلة التالية ←';
    const starMsg=gameStars===3?'🏆 رائع! أداء مثالي!':gameStars===2?'👍 جيد جداً! استمر 💪':gameStars===1?'🔥 هيا 🔥 تمرّن أكثر!':'💡 لا بأس! حاول مرة أخرى';
    return (
      <div style={S.page}><style>{CSS_KEYFRAMES}</style>
        <div style={{...S.centerCard,gap:16}}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:'3rem',animation:'ww-pop 0.6s cubic-bezier(0.175,0.885,0.32,1.275) forwards'}}>
              {gameStars===3?'🏆':gameStars===2?'🥈':gameStars===1?'🥉':'🎡'}
            </div>
            <div style={{fontSize:28,margin:'6px 0 2px'}}>{'⭐'.repeat(gameStars)}{'☆'.repeat(3-gameStars)}</div>
            <div style={{color:'#6B7280',fontSize:'.85rem',fontWeight:600}}>{starMsg}</div>
          </div>
          <div style={{display:'flex',gap:16,justifyContent:'center',alignItems:'stretch'}}>
            <div style={S.statBox}><span style={{...S.statNum,color:'#D97706'}}>{score}</span><span style={S.statLbl}>نقطة</span></div>
            <div style={S.statDiv}/>
            <div style={S.statBox}><span style={{...S.statNum,color:'#059669'}}>{foundWords.length}</span><span style={S.statLbl}>كلمة</span></div>
            <div style={S.statDiv}/>
            <div style={S.statBox}>
              <span style={{...S.statNum,color:'#6366F1'}}>{wheelValidWords.length>0?Math.round((foundWords.length/wheelValidWords.length)*100):letters.length>0?Math.min(100,Math.round((foundWords.length/Math.max(1,Math.ceil(letters.length*1.5)))*100)):0}%</span>
              <span style={S.statLbl}>اكتشفت</span>
            </div>
          </div>
          {bestWord&&(
            <div style={{background:'#FFFBEB',border:'2px solid #FDE68A',borderRadius:14,padding:'10px 18px',textAlign:'center',width:'100%',boxSizing:'border-box'}}>
              <div style={{fontSize:'.76rem',color:'#92400E',fontWeight:700,marginBottom:4}}>أفضل كلمة وجدتها</div>
              <div style={{fontSize:'1.6rem',fontWeight:900,color:'#D97706'}}>{bestWord}</div>
              <div style={{fontSize:'.78rem',color:'#B45309'}}>+{calcScore(bestWord,allLetters)} نقطة</div>
            </div>
          )}
          {foundWords.length>0&&(
            <div style={{width:'100%',background:'#F9FAFB',borderRadius:14,padding:'10px 14px',maxHeight:140,overflowY:'auto',boxSizing:'border-box'}}>
              <div style={{fontSize:'.76rem',color:'#6B7280',fontWeight:700,marginBottom:6}}>الكلمات التي وجدتها:</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6,direction:'rtl'}}>
                {foundWords.map(w=>(<span key={w} style={{background:'#FEF3C7',color:'#92400E',borderRadius:20,padding:'3px 10px',fontSize:'.86rem',fontWeight:700}}>{w}</span>))}
              </div>
            </div>
          )}
          {!customConfig&&(
            <div style={{background:LEVEL_COLORS[currentLevel].bg,border:`1.5px solid ${LEVEL_COLORS[currentLevel].border}`,borderRadius:12,padding:'8px 14px',width:'100%',boxSizing:'border-box'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:'.8rem',color:LEVEL_COLORS[currentLevel].accent,fontWeight:700}}>المرحلة الحالية</span>
                <span style={{fontSize:'.8rem',color:'#374151',fontWeight:700}}>{getLevelSummary(currentLevel,progress).done}/5 عجلة</span>
              </div>
              <div style={{display:'flex',gap:4,marginTop:6}}>
                {[0,1,2,3,4].map(i=>{
                  const s=getWheelStars(currentLevel,i,progress);
                  return <div key={i} style={{flex:1,height:6,borderRadius:4,background:s>0?LEVEL_COLORS[currentLevel].accent:'#E5E7EB'}}/>;
                })}
              </div>
            </div>
          )}
          <button style={S.btnGold} onClick={handleNextWheel}>{nextBtnLabel}</button>
          <button style={S.btnOutline} onClick={handleRetryWheel}>أعد هذه العجلة 🔄</button>
          <button style={{...S.btnOutline,borderColor:'#9CA3AF',color:'#6B7280'}} onClick={()=>setPhase('lobby')}>تغيير المرحلة</button>
          <Link href="/library" style={S.backLink}>← المكتبة</Link>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════════
     PHASE: PLAYING
  ════════════════════════════════════════════════════════════════════════ */
  return (
    <div style={S.page}>
      <style>{CSS_KEYFRAMES}</style>
      {wordImagePopup&&(
        <div style={{position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
          <div style={{background:'#fff',borderRadius:20,padding:'20px 24px',boxShadow:'0 16px 48px rgba(0,0,0,0.4)',display:'flex',flexDirection:'column',alignItems:'center',gap:12,animation:'ww-floatin 0.3s ease-out, ww-pop 0.4s ease-out',maxWidth:240}}>
            <img src={wordImagePopup.image} alt={wordImagePopup.word} style={{width:150,height:150,objectFit:'cover',borderRadius:14,border:'3px solid #F59E0B'}}/>
            <div style={{fontSize:'1.5rem',fontWeight:900,color:'#D97706',fontFamily:"'Cairo','Tajawal',sans-serif"}}>{wordImagePopup.word}</div>
          </div>
        </div>
      )}
      <div style={S.topBar}>
        <Link href="/library" style={{color:'rgba(255,255,255,0.75)',fontSize:'.85rem',textDecoration:'none',whiteSpace:'nowrap'}}>← المكتبة</Link>
        <div style={{fontSize:'.82rem',fontWeight:800,color:'rgba(255,255,255,0.9)',textAlign:'center',flex:1,padding:'0 8px'}}>{levelLabel}</div>
        <div style={S.scorePill}>✨ {score}</div>
        <div style={{fontSize:'.9rem',fontWeight:800,minWidth:44,textAlign:'center',color:timeLeft<=10?'#FCA5A5':'rgba(255,255,255,0.85)',animation:timeLeft<=10?'ww-timerpulse 0.7s ease-in-out infinite':'none'}}>{timeLeft}ث</div>
      </div>
      <div style={{width:'100%',maxWidth:680,padding:'0 12px',boxSizing:'border-box'}}>
        <div style={{height:6,background:'rgba(255,255,255,0.2)',borderRadius:4,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${timerPct}%`,background:timerColor,borderRadius:4,transition:'width 1s linear, background 0.5s'}}/>
        </div>
      </div>
      <div style={S.gameLayout}>
        <div style={S.wheelCol}>
          <div style={{position:'relative',width:'100%'}}>
            {flyWord&&(<div style={{position:'absolute',top:'40%',left:'50%',transform:'translate(-50%,-50%)',fontSize:'1.6rem',fontWeight:900,color:'#059669',zIndex:10,pointerEvents:'none',animation:'ww-fly 0.85s ease-out forwards',whiteSpace:'nowrap'}}>{flyWord}</div>)}
            <WheelSVG letters={letters} center={center} selectedLetters={selected} onLetterClick={handleLetterClick}/>
          </div>
          <div style={{...S.inputDisplay,animation:flashing?'ww-flash 0.8s ease-out':shaking?'ww-shake 0.4s ease-in-out':'none'}}>
            <span style={{flex:1,fontSize:'1.8rem',fontWeight:900,letterSpacing:4,textAlign:'center',color:inputText?'#92400E':'#D1D5DB'}}>{inputText||'…'}</span>
          </div>
          {feedback&&(<div style={{...S.feedbackBubble,background:feedback.type==='success'?'#D1FAE5':feedback.type==='warn'?'#FEF3C7':'#FEE2E2',color:feedback.type==='success'?'#065F46':feedback.type==='warn'?'#92400E':'#991B1B',animation:'ww-fadeIn 0.2s ease-out'}}>{feedback.msg}</div>)}
          <div style={S.tileRow}>
            {letters.map((letter,i)=>{
              const u=selected.filter(l=>l===letter).length,t=letters.filter(l=>l===letter).length,usedUp=u>=t;
              return (<button key={`t${i}`} onClick={()=>!usedUp&&handleLetterClick(letter)} disabled={usedUp} style={{...S.tile,background:usedUp?'#F3F4F6':'linear-gradient(135deg,#FEF3C7,#FDE68A)',color:usedUp?'#D1D5DB':'#92400E',border:usedUp?'2px solid #E5E7EB':'2px solid #F59E0B',cursor:usedUp?'not-allowed':'pointer'}}>{letter}</button>);
            })}
            <button onClick={()=>handleLetterClick(center)} style={{...S.tile,background:'linear-gradient(135deg,#FEF3C7,#F59E0B)',color:'#78350F',border:'2.5px solid #D97706',fontWeight:900,fontSize:'1.3rem'}}>{center}</button>
          </div>
          <div style={S.controlRow}>
            <button onClick={handleBackspace} style={S.ctrlBtn}>⌫ حذف</button>
            <button onClick={handleSubmit} style={{...S.ctrlBtn,...S.submitBtn}}>تأكيد ✓</button>
            <button onClick={handleClear} style={S.ctrlBtn}>مسح ✕</button>
          </div>
        </div>
        <div style={S.foundCol}>
          <div style={S.foundHeader}>
            <span style={{fontWeight:800,color:'#92400E',fontSize:'.9rem'}}>الكلمات المكتشفة</span>
            <span style={{background:'#FEF3C7',color:'#D97706',borderRadius:20,padding:'2px 10px',fontSize:'.8rem',fontWeight:700}}>{foundWords.length}{wheelValidWords.length>0?`/${wheelValidWords.length}`:''}</span>
          </div>
          <div style={S.foundList}>
            {foundWords.length===0?(<div style={{textAlign:'center',color:'#D1D5DB',padding:'24px 0',fontSize:'.86rem'}}>ابدأ بكتابة كلمة!</div>)
            :foundWords.map((w,i)=>(<div key={w} style={{...S.foundItem,animation:i===0?'ww-fadeIn 0.3s ease-out':'none'}}><span style={{flex:1,fontWeight:700,color:'#1F2937',fontSize:'.95rem'}}>{w}</span><span style={{color:'#F59E0B',fontWeight:800,fontSize:'.82rem'}}>+{calcScore(w,allLetters)}</span></div>))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── CSS ────────────────────────────────────────────────────────────────── */
const CSS_KEYFRAMES = `
  @keyframes ww-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
  @keyframes ww-flash { 0%{background:rgba(16,185,129,0.3)} 100%{background:#fff} }
  @keyframes ww-fly   { 0%{opacity:1;transform:translate(-50%,-50%) scale(1)} 100%{opacity:0;transform:translate(-50%,-110%) scale(1.4)} }
  @keyframes ww-fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ww-timerpulse { 0%,100%{opacity:1} 50%{opacity:0.55} }
  @keyframes ww-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes ww-pop    { 0%{transform:scale(0);opacity:0} 70%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
  @keyframes ww-floatin{ from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ww-wheelSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes ww-pulse  { 0%,100%{opacity:.4;transform:scale(.8)} 50%{opacity:1;transform:scale(1.1)} }
  @keyframes ww-confetti { 0%{transform:translateY(-10px) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }
`;

const S = {
  page:{ minHeight:'100vh',width:'100%',boxSizing:'border-box',overflowX:'hidden',background:'linear-gradient(135deg,#92400E 0%,#B45309 40%,#D97706 100%)',display:'flex',flexDirection:'column',alignItems:'center',padding:'12px 12px 40px',fontFamily:"'Cairo','Tajawal',sans-serif",direction:'rtl',gap:10 },
  lobbyWrap:{ width:'100%',maxWidth:520,display:'flex',flexDirection:'column',gap:20 },
  lobbyHeader:{ display:'flex',flexDirection:'column',alignItems:'center',gap:4,position:'relative' },
  topBackLink:{ color:'rgba(255,255,255,0.75)',fontSize:'.85rem',textDecoration:'none',alignSelf:'flex-start' },
  lobbyGrid:{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:14,width:'100%' },
  levelCard:{ borderRadius:18,padding:'20px 14px',textAlign:'center',cursor:'pointer',border:'2px solid',transition:'transform .15s, box-shadow .15s',display:'flex',flexDirection:'column',alignItems:'center',gap:8,fontFamily:"'Cairo','Tajawal',sans-serif",direction:'rtl' },
  centerCard:{ background:'#fff',borderRadius:24,padding:'32px 22px',textAlign:'center',maxWidth:520,width:'100%',boxSizing:'border-box',boxShadow:'0 24px 64px rgba(0,0,0,0.32)',display:'flex',flexDirection:'column',alignItems:'center',gap:20 },
  mainTitle:{ fontSize:'2rem',fontWeight:900,color:'#1a1a2e',margin:0 },
  rulesGrid:{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,width:'100%' },
  ruleBox:{ background:'#FFFBEB',border:'1.5px solid #FDE68A',borderRadius:10,padding:'8px 6px',display:'flex',flexDirection:'column',alignItems:'center',gap:2 },
  btnGold:{ background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'#fff',border:'none',borderRadius:14,padding:'14px 0',fontSize:'1.05rem',fontWeight:700,cursor:'pointer',fontFamily:"'Cairo','Tajawal',sans-serif",width:'100%',boxShadow:'0 4px 16px rgba(245,158,11,0.4)' },
  btnOutline:{ background:'transparent',color:'#D97706',border:'2px solid #D97706',borderRadius:12,padding:'10px 0',fontSize:'.93rem',fontWeight:700,cursor:'pointer',fontFamily:"'Cairo','Tajawal',sans-serif",width:'100%' },
  backLink:{ color:'#9CA3AF',fontSize:'.87rem',textDecoration:'none' },
  statBox:{ display:'flex',flexDirection:'column',alignItems:'center',gap:2 },
  statNum:{ fontSize:'2rem',fontWeight:900 },
  statLbl:{ fontSize:'.78rem',color:'#9CA3AF',fontWeight:500 },
  statDiv:{ width:1,background:'#E5E7EB',alignSelf:'stretch',margin:'4px 0' },
  topBar:{ width:'100%',maxWidth:680,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 4px',boxSizing:'border-box',gap:6 },
  scorePill:{ background:'rgba(255,255,255,0.2)',color:'#fff',borderRadius:20,padding:'4px 12px',fontWeight:800,fontSize:'.9rem',whiteSpace:'nowrap' },
  gameLayout:{ display:'flex',gap:14,width:'100%',maxWidth:680,alignItems:'flex-start',boxSizing:'border-box',flexWrap:'wrap' },
  wheelCol:{ flex:'1 1 300px',display:'flex',flexDirection:'column',alignItems:'center',gap:10,background:'#fff',borderRadius:20,padding:'14px 12px',boxShadow:'0 8px 32px rgba(0,0,0,0.22)',boxSizing:'border-box' },
  inputDisplay:{ width:'100%',minHeight:58,background:'#FFF',border:'2.5px solid #FDE68A',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',padding:'6px 12px',boxSizing:'border-box' },
  feedbackBubble:{ width:'100%',borderRadius:10,padding:'7px 12px',fontSize:'.86rem',fontWeight:700,textAlign:'center',boxSizing:'border-box' },
  tileRow:{ display:'flex',flexWrap:'wrap',gap:7,justifyContent:'center' },
  tile:{ width:44,height:44,borderRadius:11,fontSize:'1.1rem',fontWeight:800,fontFamily:"'Cairo','Tajawal',sans-serif",display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.12s',boxShadow:'0 2px 6px rgba(0,0,0,0.09)',padding:0 },
  controlRow:{ display:'flex',gap:8,width:'100%' },
  ctrlBtn:{ flex:1,padding:'9px 4px',border:'1.5px solid #E5E7EB',borderRadius:10,background:'#F9FAFB',color:'#374151',fontSize:'.86rem',fontWeight:700,cursor:'pointer',fontFamily:"'Cairo','Tajawal',sans-serif" },
  submitBtn:{ flex:2,background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'#fff',border:'none' },
  foundCol:{ flex:'0 1 190px',minWidth:160,background:'#fff',borderRadius:20,padding:'12px 10px',boxShadow:'0 8px 32px rgba(0,0,0,0.22)',boxSizing:'border-box',display:'flex',flexDirection:'column',gap:8,maxHeight:520 },
  foundHeader:{ display:'flex',alignItems:'center',justifyContent:'space-between' },
  foundList:{ display:'flex',flexDirection:'column',gap:5,overflowY:'auto',flex:1 },
  foundItem:{ display:'flex',alignItems:'center',gap:6,background:'#FFFBEB',border:'1.5px solid #FDE68A',borderRadius:9,padding:'6px 8px' },
};
