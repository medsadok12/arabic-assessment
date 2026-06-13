'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ARABIC_LETTERS = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';

function stripHarakat(text) {
  return text.replace(/[ؐ-ًؚ-ٰٟ]/g, '');
}

function pickMissingLetter(word) {
  const stripped = stripHarakat(word);
  const avoid = new Set(['ا', 'و', 'ي', 'ى']);
  const candidates = [];
  for (let i = 0; i < stripped.length; i++) {
    if (!avoid.has(stripped[i]) && ARABIC_LETTERS.includes(stripped[i])) {
      candidates.push(i);
    }
  }
  if (candidates.length === 0) return null;
  const idx = candidates[Math.floor(Math.random() * candidates.length)];
  const letter = stripped[idx];
  const display = stripped.slice(0, idx) + '___' + stripped.slice(idx + 1);
  return { letter, display, idx };
}

function getDistractors(correct, count = 4) {
  const pool = ARABIC_LETTERS.split('').filter(l => l !== correct);
  const result = [];
  const used = new Set();
  while (result.length < count) {
    const l = pool[Math.floor(Math.random() * pool.length)];
    if (!used.has(l)) { used.add(l); result.push(l); }
  }
  return result;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

const BUBBLE_COLORS = ['#FF6B6B','#4ECDC4','#FFE66D','#A8E6CF','#DDA0DD','#87CEEB','#FFA07A','#98D8C8'];
const ROUND_SIZE = 10;

export default function LetterCatcherPage() {
  const router = useRouter();
  const [phase, setPhase] = useState('loading'); // loading | intro | playing | victory
  const [allWords, setAllWords] = useState([]);
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const [choices, setChoices] = useState([]);
  const [answered, setAnswered] = useState(null); // null | 'correct' | 'wrong'
  const [wrongIdx, setWrongIdx] = useState(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [confetti, setConfetti] = useState([]);
  const [shaking, setShaking] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    fetch('/api/student/lexicon')
      .then(r => r.json())
      .then(({ words }) => {
        const valid = (words ?? []).filter(w => {
          const s = stripHarakat(w.word ?? '');
          return s.length >= 3;
        });
        setAllWords(valid);
        setPhase('intro');
      })
      .catch(() => setPhase('intro'));
  }, []);

  const buildRound = useCallback((words) => {
    const pool = [...words].sort(() => Math.random() - 0.5).slice(0, ROUND_SIZE);
    const items = [];
    for (const w of pool) {
      const miss = pickMissingLetter(w.word);
      if (!miss) continue;
      items.push({ word: w.word, sentence: w.sentence, ...miss });
    }
    return items;
  }, []);

  const startGame = () => {
    const q = buildRound(allWords.length >= ROUND_SIZE ? allWords : allWords.concat(allWords).slice(0, ROUND_SIZE * 2));
    setQueue(q);
    setScore(0);
    setRound(0);
    loadQuestion(q, 0);
    setPhase('playing');
  };

  const loadQuestion = (q, idx) => {
    if (idx >= q.length) { setPhase('victory'); return; }
    const item = q[idx];
    const distractors = getDistractors(item.letter, 4);
    setChoices(shuffle([item.letter, ...distractors]));
    setCurrent(item);
    setAnswered(null);
    setWrongIdx(null);
    setRound(idx);
  };

  const handleChoice = (letter, choiceIdx) => {
    if (answered) return;
    if (letter === current.letter) {
      setAnswered('correct');
      setScore(s => s + 1);
      spawnConfetti();
      speak(current.word);
      timerRef.current = setTimeout(() => loadQuestion(queue, round + 1), 1800);
    } else {
      setAnswered('wrong');
      setWrongIdx(choiceIdx);
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      timerRef.current = setTimeout(() => {
        setAnswered(null); setWrongIdx(null);
      }, 900);
    }
  };

  const spawnConfetti = () => {
    const pieces = Array.from({ length: 22 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      color: BUBBLE_COLORS[i % BUBBLE_COLORS.length],
      delay: Math.random() * 0.4,
      size: 8 + Math.random() * 10,
    }));
    setConfetti(pieces);
    setTimeout(() => setConfetti([]), 1800);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (phase === 'loading') {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#667eea,#764ba2)', fontFamily:'Cairo,Tajawal,sans-serif' }}>
        <div style={{ color:'#fff', fontSize:'1.4rem', fontWeight:700 }}>جاري التحميل... ⏳</div>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', fontFamily:'Cairo,Tajawal,sans-serif', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ background:'#fff', borderRadius:24, padding:'40px 32px', maxWidth:460, width:'100%', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
          <div style={{ fontSize:'4rem', marginBottom:8 }}>🦉</div>
          <h1 style={{ fontSize:'1.7rem', fontWeight:800, color:'#2d3748', marginBottom:8 }}>صيّاد الحروف المفقودة!</h1>
          <p style={{ color:'#718096', lineHeight:1.8, marginBottom:24, fontSize:'1rem' }}>
            أنا فهيم، وسأريك كلمة فيها حرف ناقص.<br/>
            اختر الحرف الصحيح لتكملها — لديك ١٠ كلمات لكل جولة!
          </p>
          <div style={{ background:'#F0F4FF', borderRadius:16, padding:'16px 20px', marginBottom:28, textAlign:'right' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <span style={{ fontSize:'1.4rem' }}>✅</span>
              <span style={{ color:'#2d3748', fontSize:'.95rem' }}>الإجابة الصحيحة = نقطة + مفاجأة!</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:'1.4rem' }}>🎯</span>
              <span style={{ color:'#2d3748', fontSize:'.95rem' }}>أكمل الجولة وانظر نتيجتك</span>
            </div>
          </div>
          <button onClick={startGame} style={{ background:'linear-gradient(135deg,#667eea,#764ba2)', color:'#fff', border:'none', borderRadius:50, padding:'14px 48px', fontSize:'1.15rem', fontWeight:800, cursor:'pointer', boxShadow:'0 6px 20px rgba(102,126,234,.5)', transition:'transform .15s' }}
            onMouseEnter={e => e.target.style.transform='scale(1.05)'}
            onMouseLeave={e => e.target.style.transform='scale(1)'}>
            ابدأ اللعبة 🚀
          </button>
          <div style={{ marginTop:20 }}>
            <Link href="/library" style={{ color:'#718096', fontSize:'.9rem', textDecoration:'none' }}>← العودة للمكتبة</Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'victory') {
    const pct = Math.round((score / queue.length) * 100);
    const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : 1;
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#f093fb,#f5576c)', fontFamily:'Cairo,Tajawal,sans-serif', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <style>{`@keyframes popIn{0%{transform:scale(0) rotate(-15deg);opacity:0}70%{transform:scale(1.1) rotate(3deg)}100%{transform:scale(1);opacity:1}}`}</style>
        <div style={{ background:'#fff', borderRadius:24, padding:'40px 32px', maxWidth:460, width:'100%', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,.25)', animation:'popIn .5s ease' }}>
          <div style={{ fontSize:'3.5rem', marginBottom:4 }}>🏆</div>
          <h1 style={{ fontSize:'1.8rem', fontWeight:800, color:'#2d3748', marginBottom:4 }}>أحسنت!</h1>
          <p style={{ color:'#718096', marginBottom:20, fontSize:'1.05rem' }}>انتهت الجولة</p>
          <div style={{ fontSize:'2rem', marginBottom:8 }}>{'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
          <div style={{ fontSize:'3rem', fontWeight:900, color:'#667eea', marginBottom:4 }}>{score}<span style={{ fontSize:'1.2rem', color:'#718096' }}>/{queue.length}</span></div>
          <p style={{ color:'#4a5568', marginBottom:28, fontSize:'1rem' }}>
            {pct >= 90 ? 'ممتاز! أنت بطل الحروف 🥇' : pct >= 60 ? 'جيد جداً! استمر في التدريب 💪' : 'لا تيأس، حاول مرة أخرى! 🎯'}
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={startGame} style={{ background:'linear-gradient(135deg,#667eea,#764ba2)', color:'#fff', border:'none', borderRadius:50, padding:'12px 32px', fontSize:'1rem', fontWeight:700, cursor:'pointer' }}>
              جولة جديدة 🔄
            </button>
            <Link href="/library" style={{ background:'#f7fafc', color:'#4a5568', border:'2px solid #e2e8f0', borderRadius:50, padding:'12px 32px', fontSize:'1rem', fontWeight:700, cursor:'pointer', textDecoration:'none', display:'inline-flex', alignItems:'center' }}>
              المكتبة 📚
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // playing phase
  const progress = queue.length > 0 ? ((round) / queue.length) * 100 : 0;

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', fontFamily:'Cairo,Tajawal,sans-serif', padding:'16px 16px 80px', direction:'rtl', position:'relative', overflow:'hidden' }}>
      <style>{`
        @keyframes floatBubble {
          0%   { transform: translateY(0) scale(1); }
          50%  { transform: translateY(-8px) scale(1.03); }
          100% { transform: translateY(0) scale(1); }
        }
        @keyframes confettiFall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes correctPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.25); }
          100% { transform: scale(1); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-8px); }
          40%     { transform: translateX(8px); }
          60%     { transform: translateX(-6px); }
          80%     { transform: translateX(6px); }
        }
        .bubble-btn {
          border: none; border-radius: 50%; cursor: pointer;
          font-size: 1.8rem; font-weight: 900;
          width: 80px; height: 80px;
          display: flex; align-items: center; justify-content: center;
          animation: floatBubble 2.5s ease-in-out infinite;
          transition: transform .15s, box-shadow .15s;
          box-shadow: 0 6px 20px rgba(0,0,0,.25);
          font-family: Cairo,Tajawal,sans-serif;
        }
        .bubble-btn:hover { transform: scale(1.1) !important; box-shadow: 0 10px 28px rgba(0,0,0,.35); }
      `}</style>

      {/* Confetti */}
      {confetti.map(p => (
        <div key={p.id} style={{
          position:'fixed', top:0, left:`${p.x}%`, zIndex:999, pointerEvents:'none',
          width:p.size, height:p.size, borderRadius:'50%',
          background:p.color,
          animation:`confettiFall 1.6s ${p.delay}s ease-in forwards`,
        }} />
      ))}

      {/* Top bar */}
      <div style={{ maxWidth:540, margin:'0 auto 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Link href="/library" style={{ color:'rgba(255,255,255,.8)', textDecoration:'none', fontSize:'.9rem', fontWeight:600 }}>← مكتبة</Link>
        <span style={{ color:'#fff', fontWeight:800, fontSize:'1rem' }}>صيّاد الحروف 🎯</span>
        <span style={{ background:'rgba(255,255,255,.2)', color:'#fff', borderRadius:50, padding:'4px 14px', fontWeight:700, fontSize:'.9rem' }}>
          {score} ⭐
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ maxWidth:540, margin:'0 auto 24px', background:'rgba(255,255,255,.25)', borderRadius:50, height:10, overflow:'hidden' }}>
        <div style={{ width:`${progress}%`, height:'100%', background:'#FFE66D', borderRadius:50, transition:'width .4s' }} />
      </div>

      {/* Question card */}
      {current && (
        <div style={{ maxWidth:540, margin:'0 auto 32px', background:'#fff', borderRadius:24, padding:'28px 24px', textAlign:'center', boxShadow:'0 12px 40px rgba(0,0,0,.2)', animation: shaking ? 'shake .5s ease' : undefined }}>
          <p style={{ color:'#718096', fontSize:'.88rem', marginBottom:8 }}>
            السؤال {round + 1} من {queue.length}
          </p>
          <div style={{ fontSize:'2.8rem', fontWeight:900, color:'#2d3748', marginBottom:12, letterSpacing:4, direction:'rtl' }}>
            {current.display}
          </div>
          {current.sentence && (
            <div style={{ background:'#F0F4FF', borderRadius:12, padding:'10px 16px', fontSize:'.93rem', color:'#4a5568', lineHeight:1.8 }}>
              {current.sentence}
            </div>
          )}
          {answered === 'correct' && (
            <div style={{ marginTop:14, color:'#38A169', fontWeight:700, fontSize:'1.05rem', animation:'correctPop .4s ease' }}>
              ✅ ممتاز! الكلمة: {stripHarakat(current.word)}
            </div>
          )}
        </div>
      )}

      {/* Bubbles */}
      {current && (
        <div style={{ maxWidth:540, margin:'0 auto', display:'flex', flexWrap:'wrap', gap:18, justifyContent:'center' }}>
          {choices.map((letter, i) => {
            const isCorrect = letter === current.letter;
            const isWrong = answered === 'wrong' && i === wrongIdx;
            const isRight = answered === 'correct' && isCorrect;
            return (
              <button
                key={i}
                className="bubble-btn"
                onClick={() => handleChoice(letter, i)}
                style={{
                  background: isRight ? '#38A169' : isWrong ? '#E53E3E' : BUBBLE_COLORS[i % BUBBLE_COLORS.length],
                  color: '#fff',
                  animationDelay: `${i * 0.18}s`,
                  animationPlayState: answered ? 'paused' : 'running',
                  animation: isRight ? 'correctPop .4s ease' : isWrong ? 'shake .5s ease' : `floatBubble 2.5s ${i * 0.18}s ease-in-out infinite`,
                  opacity: answered && !isRight && !isWrong ? 0.6 : 1,
                }}>
                {letter}
              </button>
            );
          })}
        </div>
      )}

      {/* Fahim owl */}
      <div style={{ position:'fixed', bottom:20, left:20, fontSize:'2.8rem', filter:'drop-shadow(0 4px 8px rgba(0,0,0,.3))', animation:'floatBubble 3s ease-in-out infinite', zIndex:10 }}>
        🦉
      </div>
    </div>
  );
}
