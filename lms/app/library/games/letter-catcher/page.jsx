'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

const ARABIC_LETTERS = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';
const TOPIC_EMOJI = { 'الحيوانات':'🐾','النباتات':'🌿','الروتين اليومي':'⏰','الأدوات':'🔧','الأسرة':'👨‍👩‍👧' };
const BUBBLE_COLORS = ['#FF6B6B','#4ECDC4','#FFE66D','#A8E6CF','#DDA0DD','#87CEEB','#FFA07A','#98D8C8'];
const ROUND_SIZE = 10;

function stripHarakat(t) {
  return t.replace(/[ؐ-ًؚ-ٰٟ]/g, '');
}

function pickMissing(word) {
  const s = stripHarakat(word);
  if (s.length < 3) return null;
  const avoid = new Set(['ا','و','ي','ى']);
  const cands = [];
  for (let i = 0; i < s.length; i++) {
    if (!avoid.has(s[i]) && ARABIC_LETTERS.includes(s[i])) cands.push(i);
  }
  if (!cands.length) return null;
  const idx = cands[Math.floor(Math.random() * cands.length)];
  return { letter: s[idx], missingIdx: idx, stripped: s };
}

function distractors(correct, n = 4) {
  const pool = ARABIC_LETTERS.split('').filter(l => l !== correct);
  const out = []; const seen = new Set();
  while (out.length < n) {
    const l = pool[Math.floor(Math.random() * pool.length)];
    if (!seen.has(l)) { seen.add(l); out.push(l); }
  }
  return out;
}

function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function speak(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  let done = false;
  function go() {
    if (done) return; done = true;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA'; u.rate = 0.8;
    window.speechSynthesis.speak(u);
  }
  if (window.speechSynthesis.getVoices().length > 0) go();
  else { window.speechSynthesis.addEventListener('voiceschanged', go, { once: true }); setTimeout(go, 600); }
}

function playB64(b64) {
  try { new Audio(`data:audio/mp3;base64,${b64}`).play(); } catch {}
}

// ── Character-box display — direction:rtl makes item[0] appear rightmost ──
function WordDisplay({ stripped, missingIdx }) {
  const chars = stripped.split('');
  const sz = Math.max(44, Math.min(60, Math.floor(300 / chars.length)));
  return (
    <div style={{ display:'flex', direction:'rtl', gap:5, justifyContent:'center', alignItems:'center' }}>
      {chars.map((ch, i) =>
        i === missingIdx
          ? <div key={i} style={{ width:sz, height:sz+8, borderRadius:10, border:'3px dashed #667eea', background:'#EEF2FF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', color:'#667eea', fontWeight:900, flexShrink:0 }}>؟</div>
          : <div key={i} style={{ width:sz, height:sz+8, borderRadius:10, border:'2px solid #e2e8f0', background:'#f7fafc', display:'flex', alignItems:'center', justifyContent:'center', fontSize:sz>50?'2rem':'1.7rem', fontWeight:900, color:'#2d3748', flexShrink:0 }}>{ch}</div>
      )}
    </div>
  );
}

export default function LetterCatcherPage() {
  const [phase,    setPhase]    = useState('loading');
  const [allWords, setAllWords] = useState([]);
  const [queue,    setQueue]    = useState([]);
  const [qIdx,     setQIdx]     = useState(0);
  const [current,  setCurrent]  = useState(null);
  const [choices,  setChoices]  = useState([]);
  const [answered, setAnswered] = useState(null);
  const [wrongIdx, setWrongIdx] = useState(null);
  const [score,    setScore]    = useState(0);
  const [confetti, setConfetti] = useState([]);
  const [shaking,  setShaking]  = useState(false);
  const [building, setBuilding] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    fetch('/api/student/lexicon')
      .then(r => r.json())
      .then(({ words }) => {
        const valid = (words ?? []).filter(w => {
          const s = stripHarakat(w.word ?? '');
          return s.length >= 3 && s.length <= 8;
        });
        setAllWords(valid);
        setPhase('intro');
      })
      .catch(() => setPhase('intro'));
  }, []);

  // Each question object carries its OWN image+audio from the same DB row.
  // No separate cache — this prevents any word↔image mismatch.
  const buildRound = useCallback(async (words) => {
    const pool = [...words].sort(() => Math.random() - 0.5);
    const base = [];
    for (const w of pool) {
      if (base.length >= ROUND_SIZE) break;
      const miss = pickMissing(w.word);
      if (!miss) continue;
      base.push({ id: w.id, word: w.word, topic: w.topic, has_image: w.has_image, has_audio: w.has_audio, ...miss });
    }

    // Fetch image + audio from the SAME DB row as the word text (by matching id).
    const rich = await Promise.all(base.map(async item => {
      if (!item.has_image && !item.has_audio) return { ...item, image: null, audio: null };
      try {
        const res = await fetch(`/api/student/lexicon/${item.id}`);
        if (!res.ok) return { ...item, image: null, audio: null };
        const { image, audio } = await res.json();
        // image and audio come from item.id row — guaranteed to match item.word
        return { ...item, image: image ?? null, audio: audio ?? null };
      } catch {
        return { ...item, image: null, audio: null };
      }
    }));

    return rich;
  }, []);

  const playItem = useCallback((item) => {
    if (item?.audio) playB64(item.audio);
    else speak(item?.word ?? '');
  }, []);

  const loadQ = useCallback((q, idx) => {
    if (idx >= q.length) { setPhase('victory'); return; }
    const item = q[idx];
    // Reset ALL question state atomically — no carryover from previous question
    setQueue(q);
    setQIdx(idx);
    setCurrent(item);          // image/audio live inside item; no external cache
    setChoices(shuffle([item.letter, ...distractors(item.letter, 4)]));
    setAnswered(null);
    setWrongIdx(null);
    setTimeout(() => playItem(item), 350);
  }, [playItem]);

  const startGame = useCallback(async () => {
    clearTimeout(timer.current);
    setBuilding(true);
    setScore(0);
    setPhase('playing');
    const pool = allWords.length >= ROUND_SIZE ? allWords : [...allWords, ...allWords];
    const q = await buildRound(pool);
    setBuilding(false);
    loadQ(q, 0);
  }, [allWords, buildRound, loadQ]);

  const handleChoice = (letter, ci) => {
    if (answered || !current) return;
    clearTimeout(timer.current);

    if (letter === current.letter) {
      setAnswered('correct');
      setScore(s => s + 1);
      boom();
      playItem(current);
      // Capture queue+qIdx NOW (before state updates) via closure params
      const nextIdx = qIdx + 1;
      const q = queue;
      timer.current = setTimeout(() => loadQ(q, nextIdx), 1900);
    } else {
      setAnswered('wrong');
      setWrongIdx(ci);
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      timer.current = setTimeout(() => { setAnswered(null); setWrongIdx(null); }, 950);
    }
  };

  const boom = () => {
    const p = Array.from({ length: 24 }, (_, i) => ({
      id: Date.now() + i, x: Math.random() * 100,
      color: BUBBLE_COLORS[i % BUBBLE_COLORS.length],
      delay: Math.random() * 0.4, size: 8 + Math.random() * 10,
    }));
    setConfetti(p);
    setTimeout(() => setConfetti([]), 2000);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  const css = `
    @keyframes floatB  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
    @keyframes cfall   { 0%{transform:translateY(-20px) rotate(0);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
    @keyframes cpop    { 0%{transform:scale(1)} 40%{transform:scale(1.28)} 100%{transform:scale(1)} }
    @keyframes shake   { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
    @keyframes popIn   { 0%{transform:scale(0);opacity:0} 80%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
    @keyframes fadeIn  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    .bb { border:none; border-radius:50%; cursor:pointer; font-size:1.85rem; font-weight:900; width:80px; height:80px; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 22px rgba(0,0,0,.28); font-family:Cairo,Tajawal,sans-serif; color:#fff; transition:transform .15s; }
    .bb:hover:not(:disabled) { transform:scale(1.13) !important; }
  `;

  const BG = 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)';
  const common = { minHeight:'100vh', fontFamily:'Cairo,Tajawal,sans-serif' };

  if (phase === 'loading') return (
    <div style={{ ...common, background:BG, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <style>{css}</style>
      <div style={{ color:'#fff', fontSize:'1.4rem', fontWeight:700 }}>جاري التحميل… ⏳</div>
    </div>
  );

  if (phase === 'intro') return (
    <div style={{ ...common, background:BG, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <style>{css}</style>
      <div style={{ background:'#fff', borderRadius:24, padding:'40px 32px', maxWidth:460, width:'100%', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ fontSize:'4rem', marginBottom:8 }}>🦉</div>
        <h1 style={{ fontSize:'1.7rem', fontWeight:800, color:'#2d3748', marginBottom:8 }}>صيّاد الحروف المفقودة!</h1>
        <p style={{ color:'#718096', lineHeight:1.9, marginBottom:24 }}>
          سأريك صورة وكلمة فيها حرف ناقص.<br />
          استمع للكلمة، انظر للصورة، ثم اختر الحرف الصحيح!
        </p>
        <div style={{ background:'#F0F4FF', borderRadius:16, padding:'16px 20px', marginBottom:28, textAlign:'right' }}>
          {[['🖼️','صورة الكلمة تساعدك على الفهم'],['🔊','الكلمة تُنطق تلقائياً'],['🎯','أكمل ١٠ كلمات وانظر نتيجتك']].map(([ic,tx]) => (
            <div key={ic} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <span style={{ fontSize:'1.4rem' }}>{ic}</span>
              <span style={{ color:'#2d3748', fontSize:'.95rem' }}>{tx}</span>
            </div>
          ))}
        </div>
        <button onClick={startGame} style={{ background:BG, color:'#fff', border:'none', borderRadius:50, padding:'14px 48px', fontSize:'1.15rem', fontWeight:800, cursor:'pointer', boxShadow:'0 6px 20px rgba(102,126,234,.5)' }}>
          ابدأ اللعبة 🚀
        </button>
        <div style={{ marginTop:20 }}>
          <Link href="/library" style={{ color:'#718096', fontSize:'.9rem', textDecoration:'none' }}>← العودة للمكتبة</Link>
        </div>
      </div>
    </div>
  );

  if (phase === 'victory') {
    const pct = queue.length > 0 ? Math.round((score / queue.length) * 100) : 0;
    const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : 1;
    return (
      <div style={{ ...common, background:'linear-gradient(135deg,#f093fb,#f5576c)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <style>{css}</style>
        <div style={{ background:'#fff', borderRadius:24, padding:'40px 32px', maxWidth:460, width:'100%', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,.25)', animation:'popIn .5s ease' }}>
          <div style={{ fontSize:'3.5rem' }}>🏆</div>
          <h1 style={{ fontSize:'1.8rem', fontWeight:800, color:'#2d3748', margin:'8px 0 4px' }}>أحسنت!</h1>
          <div style={{ fontSize:'2.2rem', margin:'10px 0' }}>{'⭐'.repeat(stars)}{'☆'.repeat(3-stars)}</div>
          <div style={{ fontSize:'3rem', fontWeight:900, color:'#667eea' }}>
            {score}<span style={{ fontSize:'1.2rem', color:'#718096' }}>/{queue.length}</span>
          </div>
          <p style={{ color:'#4a5568', margin:'12px 0 28px' }}>
            {pct>=90?'ممتاز! أنت بطل الحروف 🥇':pct>=60?'جيد جداً! استمر 💪':'لا تيأس، حاول مجدداً! 🎯'}
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={startGame} style={{ background:BG, color:'#fff', border:'none', borderRadius:50, padding:'12px 32px', fontSize:'1rem', fontWeight:700, cursor:'pointer' }}>جولة جديدة 🔄</button>
            <Link href="/library" style={{ background:'#f7fafc', color:'#4a5568', border:'2px solid #e2e8f0', borderRadius:50, padding:'12px 32px', fontSize:'1rem', fontWeight:700, textDecoration:'none', display:'inline-flex', alignItems:'center' }}>المكتبة 📚</Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── PLAYING ───────────────────────────────────────────────
  const progress = queue.length > 0 ? (qIdx / queue.length) * 100 : 0;

  return (
    <div style={{ ...common, background:BG, padding:'16px 16px 90px', direction:'rtl', position:'relative', overflow:'hidden' }}>
      <style>{css}</style>

      {confetti.map(p => (
        <div key={p.id} style={{ position:'fixed', top:0, left:`${p.x}%`, zIndex:999, pointerEvents:'none', width:p.size, height:p.size, borderRadius:'50%', background:p.color, animation:`cfall 1.7s ${p.delay}s ease-in forwards` }} />
      ))}

      {building && (
        <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(102,126,234,.75)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'1.3rem', fontWeight:700 }}>
          ⏳ جاري تحضير الأسئلة…
        </div>
      )}

      <div style={{ maxWidth:560, margin:'0 auto 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Link href="/library" style={{ color:'rgba(255,255,255,.8)', textDecoration:'none', fontSize:'.9rem', fontWeight:600 }}>← مكتبة</Link>
        <span style={{ color:'#fff', fontWeight:800 }}>صيّاد الحروف 🎯</span>
        <span style={{ background:'rgba(255,255,255,.2)', color:'#fff', borderRadius:50, padding:'4px 14px', fontWeight:700, fontSize:'.9rem' }}>{score} ⭐</span>
      </div>

      <div style={{ maxWidth:560, margin:'0 auto 20px', background:'rgba(255,255,255,.25)', borderRadius:50, height:10, overflow:'hidden' }}>
        <div style={{ width:`${progress}%`, height:'100%', background:'#FFE66D', borderRadius:50, transition:'width .4s' }} />
      </div>

      {current && (
        <div style={{
          maxWidth:560, margin:'0 auto 26px', background:'#fff', borderRadius:24, padding:'22px 20px', textAlign:'center',
          boxShadow:'0 12px 40px rgba(0,0,0,.2)',
          animation: shaking ? 'shake .5s ease' : 'fadeIn .35s ease',
        }}>
          {/* Image — comes directly from current.image (same DB row as current.word) */}
          <div style={{ marginBottom:16 }}>
            {current.image ? (
              <img
                src={`data:image/jpeg;base64,${current.image}`}
                alt={current.word}
                style={{ width:120, height:120, objectFit:'cover', borderRadius:16, boxShadow:'0 4px 16px rgba(0,0,0,.15)' }}
              />
            ) : (
              <div style={{ width:120, height:120, borderRadius:16, background:'linear-gradient(135deg,#f0f4ff,#e8eeff)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'3.8rem', boxShadow:'0 4px 12px rgba(0,0,0,.1)' }}>
                {TOPIC_EMOJI[current.topic] ?? '📖'}
              </div>
            )}
          </div>

          {/* Letter boxes — RTL flex guarantees position 0 = rightmost box */}
          <WordDisplay stripped={current.stripped} missingIdx={current.missingIdx} />

          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginTop:14 }}>
            <button onClick={() => playItem(current)} title="استمع"
              style={{ background:'#EBF4FF', border:'none', borderRadius:'50%', width:40, height:40, cursor:'pointer', fontSize:'1.25rem', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(0,0,0,.1)' }}>
              🔊
            </button>
            <span style={{ color:'#a0aec0', fontSize:'.82rem' }}>{qIdx + 1} / {queue.length}</span>
          </div>

          {answered === 'correct' && (
            <div style={{ marginTop:10, color:'#38A169', fontWeight:700, fontSize:'1.1rem', animation:'cpop .4s ease' }}>
              ✅ {current.word}
            </div>
          )}
        </div>
      )}

      {current && (
        <div style={{ maxWidth:560, margin:'0 auto', display:'flex', flexWrap:'wrap', gap:18, justifyContent:'center' }}>
          {choices.map((letter, i) => {
            const isRight = answered === 'correct' && letter === current.letter;
            const isWrong = answered === 'wrong'   && i === wrongIdx;
            return (
              <button key={i} disabled={!!answered} className="bb"
                onClick={() => handleChoice(letter, i)}
                style={{
                  background: isRight ? '#38A169' : isWrong ? '#E53E3E' : BUBBLE_COLORS[i % BUBBLE_COLORS.length],
                  animation: isRight ? 'cpop .4s ease' : isWrong ? 'shake .5s ease' : `floatB 2.5s ${i*0.18}s ease-in-out infinite`,
                  opacity: answered && !isRight && !isWrong ? 0.55 : 1,
                  cursor: answered ? 'default' : 'pointer',
                }}>
                {letter}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ position:'fixed', bottom:20, left:20, fontSize:'2.8rem', filter:'drop-shadow(0 4px 8px rgba(0,0,0,.3))', animation:'floatB 3s ease-in-out infinite', zIndex:10, userSelect:'none' }}>
        🦉
      </div>
    </div>
  );
}
