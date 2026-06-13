'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

// ══════════════════════════════════════════════════════════════════════
//  ⚙️  إعدادات اللعبة — عدّل هذه القيم وحدها دون لمس بقية الكود
// ══════════════════════════════════════════════════════════════════════
const GAME_CONFIG = {
  /** عدد الأسئلة في الجولة الواحدة */
  ROUND_SIZE: 10,

  /**
   * عدد فقاعات الاختيار (واحدة صحيحة + الباقي مشتتات)
   * القيمة المثلى: 4 للمبتدئين، 6 للمتقدمين
   */
  CHOICES_COUNT: 5,

  /**
   * فلتر الموضوع — null = كل المواضيع
   * القيم المتاحة: 'الحيوانات' | 'النباتات' | 'الروتين اليومي' | 'الأدوات' | 'الأسرة'
   */
  TOPIC_FILTER: null,

  /**
   * فلتر المستوى الدراسي — null = كل المستويات
   * مثال: 2 يعرض كلمات المستوى الثاني فقط
   */
  GRADE_FILTER: null,

  /** الحد الأدنى لعدد حروف الكلمة (بعد حذف الحركات) */
  MIN_WORD_LEN: 3,

  /**
   * الحد الأقصى لعدد حروف الكلمة
   * خفّضه لضمان ظهور الكلمة بالكامل في شاشة الجوال
   */
  MAX_WORD_LEN: 8,
};
// ══════════════════════════════════════════════════════════════════════

// ─── حروف الاختيار المتاحة ────────────────────────────────────────────
const ARABIC_LETTERS = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';

// ─── إيموجي المواضيع (يُستخدم عند غياب الصورة) ────────────────────────
const TOPIC_EMOJI = {
  'الحيوانات':     '🐾',
  'النباتات':      '🌿',
  'الروتين اليومي':'⏰',
  'الأدوات':       '🔧',
  'الأسرة':        '👨‍👩‍👧',
};

const BUBBLE_COLORS = ['#FF6B6B','#4ECDC4','#FFE66D','#A8E6CF','#DDA0DD','#87CEEB','#FFA07A','#98D8C8'];

// ─── دوال مساعدة ──────────────────────────────────────────────────────

/** حذف علامات التشكيل من النص */
function stripHarakat(t) {
  return (t ?? '').replace(/[ؐ-ًؚ-ٰٟ]/g, '');
}

/**
 * تفكيك الكلمة: اختيار حرف عشوائي للإخفاء.
 * تجنب حروف المد (ا و ي ى) لأنها لن تظهر في قائمة الاختيار.
 * @returns {letter, missingIdx, stripped} أو null إذا تعذّر التفكيك
 */
function pickMissing(word) {
  const stripped = stripHarakat(word);
  const avoid = new Set(['ا','و','ي','ى']);
  const candidates = [];
  for (let i = 0; i < stripped.length; i++) {
    if (!avoid.has(stripped[i]) && ARABIC_LETTERS.includes(stripped[i])) {
      candidates.push(i);
    }
  }
  if (!candidates.length) return null;
  const idx = candidates[Math.floor(Math.random() * candidates.length)];
  return { letter: stripped[idx], missingIdx: idx, stripped };
}

/** توليد حروف مشتِّتة عشوائية (لن تتطابق مع الحرف الصحيح) */
function makeDistractors(correct, count) {
  const pool = ARABIC_LETTERS.split('').filter(l => l !== correct);
  const out = []; const seen = new Set();
  while (out.length < count) {
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

/** نطق بالصوت عبر Web Speech API مع انتظار تحميل الأصوات */
function speak(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  let fired = false;
  function go() {
    if (fired) return; fired = true;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA'; u.rate = 0.8;
    window.speechSynthesis.speak(u);
  }
  if (window.speechSynthesis.getVoices().length > 0) go();
  else { window.speechSynthesis.addEventListener('voiceschanged', go, { once: true }); setTimeout(go, 600); }
}

/** تشغيل صوت مخزّن كـ base64 في قاعدة البيانات */
function playB64(b64) {
  try { new Audio(`data:audio/mp3;base64,${b64}`).play(); } catch {}
}

// ─── مكوّن عرض الكلمة حرفاً بحرف ─────────────────────────────────────
/**
 * يعرض حروف الكلمة في صناديق منفصلة بالترتيب الصحيح (direction:rtl).
 * بفضل flex + direction:rtl، العنصر ذو المؤشر 0 يظهر دائماً في أقصى اليمين،
 * وهو ما يطابق الترتيب الطبيعي للقراءة العربية.
 */
function WordDisplay({ stripped, missingIdx }) {
  const chars = stripped.split('');
  const sz = Math.max(42, Math.min(60, Math.floor(290 / chars.length)));
  return (
    <div style={{ display:'flex', direction:'rtl', gap:5, justifyContent:'center', alignItems:'center', flexWrap:'nowrap' }}>
      {chars.map((ch, i) =>
        i === missingIdx ? (
          <div key={i} style={{
            width:sz, height:sz+8, borderRadius:10, flexShrink:0,
            border:'3px dashed #667eea', background:'#EEF2FF',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'1rem', color:'#667eea', fontWeight:900,
          }}>؟</div>
        ) : (
          <div key={i} style={{
            width:sz, height:sz+8, borderRadius:10, flexShrink:0,
            border:'2px solid #e2e8f0', background:'#f7fafc',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize: sz > 50 ? '2rem' : '1.65rem', fontWeight:900, color:'#2d3748',
          }}>{ch}</div>
        )
      )}
    </div>
  );
}

// ─── المكوّن الرئيسي ───────────────────────────────────────────────────
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

  // ── جلب قائمة الكلمات وتطبيق فلاتر GAME_CONFIG ──────────────────────
  useEffect(() => {
    fetch('/api/student/lexicon')
      .then(r => r.json())
      .then(({ words }) => {
        const pool = (words ?? []).filter(w => {
          const s = stripHarakat(w.word ?? '');

          // فلتر الطول
          if (s.length < GAME_CONFIG.MIN_WORD_LEN) return false;
          if (s.length > GAME_CONFIG.MAX_WORD_LEN)  return false;

          // فلتر الموضوع (إذا كان مضبوطاً)
          if (GAME_CONFIG.TOPIC_FILTER && w.topic !== GAME_CONFIG.TOPIC_FILTER) return false;

          // فلتر المستوى الدراسي (الكلمة ملائمة إذا كان المستوى ضمن نطاقها)
          if (GAME_CONFIG.GRADE_FILTER) {
            const grade = Number(GAME_CONFIG.GRADE_FILTER);
            const from  = w.grade_from ?? 1;
            const to    = w.grade_to   ?? 7;
            if (grade < from || grade > to) return false;
          }

          return true;
        });

        setAllWords(pool);
        setPhase('intro');
      })
      .catch(() => { setAllWords([]); setPhase('intro'); });
  }, []);

  // ── بناء جولة: اختيار كلمات + جلب صورة وصوت كل كلمة من نفس سجلها ──
  /**
   * كل كائن سؤال يحمل { word, image, audio, stripped, missingIdx, letter }
   * الصورة والصوت مجلوبان من معرّف الكلمة نفسه (item.id)
   * ← يضمن مطابقة 100% بين الكلمة المعروضة وصورتها وصوتها.
   */
  const buildRound = useCallback(async (words) => {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    const base = [];
    for (const w of shuffled) {
      if (base.length >= GAME_CONFIG.ROUND_SIZE) break;
      const miss = pickMissing(w.word);
      if (!miss) continue;
      base.push({ id: w.id, word: w.word, topic: w.topic, has_image: w.has_image, has_audio: w.has_audio, ...miss });
    }

    // جلب الوسائط بالتوازي — كل سؤال يجلب بياناته من سجله الخاص
    const rich = await Promise.all(base.map(async item => {
      if (!item.has_image && !item.has_audio) return { ...item, image: null, audio: null };
      try {
        const res = await fetch(`/api/student/lexicon/${item.id}`);
        if (!res.ok) return { ...item, image: null, audio: null };
        const { image, audio } = await res.json();
        return { ...item, image: image ?? null, audio: audio ?? null };
      } catch {
        return { ...item, image: null, audio: null };
      }
    }));

    return rich;
  }, []);

  // ── نطق كلمة السؤال (صوت مخزّن أو TTS احتياطي) ─────────────────────
  const playItem = useCallback((item) => {
    if (item?.audio) playB64(item.audio);
    else speak(item?.word ?? '');
  }, []);

  // ── تحميل سؤال جديد بإعادة ضبط كاملة للحالة ─────────────────────────
  const loadQ = useCallback((q, idx) => {
    if (idx >= q.length) { setPhase('victory'); return; }
    const item = q[idx];
    // إعادة الضبط الكاملة — لا ترحيل لأي بيانات من السؤال السابق
    setQueue(q);
    setQIdx(idx);
    setCurrent(item);
    setChoices(shuffle([item.letter, ...makeDistractors(item.letter, GAME_CONFIG.CHOICES_COUNT - 1)]));
    setAnswered(null);
    setWrongIdx(null);
    setTimeout(() => playItem(item), 350);
  }, [playItem]);

  // ── بدء اللعبة ────────────────────────────────────────────────────────
  const startGame = useCallback(async () => {
    clearTimeout(timer.current);
    setBuilding(true);
    setScore(0);
    setPhase('playing');
    // مضاعفة القائمة إذا كانت الكلمات أقل من حجم الجولة
    const pool = allWords.length > 0
      ? (allWords.length >= GAME_CONFIG.ROUND_SIZE ? allWords : [...allWords, ...allWords, ...allWords])
      : [];
    const q = await buildRound(pool);
    setBuilding(false);
    if (!q.length) { setPhase('intro'); return; }
    loadQ(q, 0);
  }, [allWords, buildRound, loadQ]);

  // ── اختيار حرف ───────────────────────────────────────────────────────
  const handleChoice = (letter, ci) => {
    if (answered || !current) return;
    clearTimeout(timer.current);

    if (letter === current.letter) {
      setAnswered('correct');
      setScore(s => s + 1);
      boom();
      playItem(current);
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

  // ─── CSS مضمّن ─────────────────────────────────────────────────────────
  const css = `
    @keyframes floatB { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-9px)} }
    @keyframes cfall  { 0%{transform:translateY(-20px) rotate(0);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
    @keyframes cpop   { 0%{transform:scale(1)} 40%{transform:scale(1.28)} 100%{transform:scale(1)} }
    @keyframes shake  { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
    @keyframes popIn  { 0%{transform:scale(0);opacity:0} 80%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
    @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    .bb {
      border:none; border-radius:50%; cursor:pointer;
      font-size:1.85rem; font-weight:900;
      width:80px; height:80px;
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 6px 22px rgba(0,0,0,.28);
      font-family:Cairo,Tajawal,sans-serif; color:#fff;
      transition:transform .15s;
    }
    .bb:hover:not(:disabled) { transform:scale(1.13) !important; }
  `;

  const BG = 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)';
  const base = { minHeight:'100vh', fontFamily:'Cairo,Tajawal,sans-serif' };

  // ── شاشة التحميل ──────────────────────────────────────────────────────
  if (phase === 'loading') return (
    <div style={{ ...base, background:BG, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <style>{css}</style>
      <div style={{ color:'#fff', fontSize:'1.4rem', fontWeight:700 }}>جاري التحميل… ⏳</div>
    </div>
  );

  // ── شاشة المقدمة ──────────────────────────────────────────────────────
  if (phase === 'intro') {
    const topicLabel = GAME_CONFIG.TOPIC_FILTER ? ` (${GAME_CONFIG.TOPIC_FILTER})` : '';
    return (
      <div style={{ ...base, background:BG, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <style>{css}</style>
        <div style={{ background:'#fff', borderRadius:24, padding:'40px 32px', maxWidth:460, width:'100%', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,.25)' }}>
          <div style={{ fontSize:'4rem', marginBottom:8 }}>🦉</div>
          <h1 style={{ fontSize:'1.7rem', fontWeight:800, color:'#2d3748', marginBottom:4 }}>صيّاد الحروف{topicLabel}!</h1>
          <p style={{ color:'#718096', lineHeight:1.9, marginBottom:20 }}>
            سأريك صورة وكلمة فيها حرف ناقص.<br />
            استمع للكلمة، انظر للصورة، ثم اختر الحرف الصحيح!
          </p>

          {/* معلومات الجولة */}
          <div style={{ background:'#F0F4FF', borderRadius:16, padding:'12px 20px', marginBottom:20, fontSize:'.9rem', color:'#4a5568', textAlign:'right' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ color:'#667eea', fontWeight:700 }}>{allWords.length} كلمة متاحة</span>
              <span>📚 بنك الكلمات</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ color:'#667eea', fontWeight:700 }}>{GAME_CONFIG.ROUND_SIZE} سؤال</span>
              <span>🎯 كل جولة</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:'#667eea', fontWeight:700 }}>{GAME_CONFIG.CHOICES_COUNT} خيارات</span>
              <span>🔤 لكل سؤال</span>
            </div>
          </div>

          <div style={{ background:'#F0F4FF', borderRadius:16, padding:'12px 20px', marginBottom:24, textAlign:'right' }}>
            {[['🖼️','الصورة والصوت يُجلبان مباشرة من قاعدة البيانات'],['🔊','الكلمة تُنطق تلقائياً عند كل سؤال'],['🎯','أكمل الجولة وانظر نتيجتك بالنجوم']].map(([ic,tx]) => (
              <div key={ic} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <span style={{ fontSize:'1.3rem' }}>{ic}</span>
                <span style={{ color:'#2d3748', fontSize:'.88rem' }}>{tx}</span>
              </div>
            ))}
          </div>

          <button onClick={startGame} disabled={!allWords.length}
            style={{ background: allWords.length ? BG : '#e2e8f0', color:'#fff', border:'none', borderRadius:50, padding:'14px 48px', fontSize:'1.15rem', fontWeight:800, cursor: allWords.length ? 'pointer' : 'not-allowed', boxShadow: allWords.length ? '0 6px 20px rgba(102,126,234,.5)' : 'none' }}>
            {allWords.length ? 'ابدأ اللعبة 🚀' : 'لا توجد كلمات مطابقة للفلتر'}
          </button>
          <div style={{ marginTop:20 }}>
            <Link href="/library" style={{ color:'#718096', fontSize:'.9rem', textDecoration:'none' }}>← العودة للمكتبة</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── شاشة النجاح ───────────────────────────────────────────────────────
  if (phase === 'victory') {
    const total = queue.length;
    const pct   = total > 0 ? Math.round((score / total) * 100) : 0;
    const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : 1;
    return (
      <div style={{ ...base, background:'linear-gradient(135deg,#f093fb,#f5576c)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <style>{css}</style>
        <div style={{ background:'#fff', borderRadius:24, padding:'40px 32px', maxWidth:460, width:'100%', textAlign:'center', boxShadow:'0 20px 60px rgba(0,0,0,.25)', animation:'popIn .5s ease' }}>
          <div style={{ fontSize:'3.5rem' }}>🏆</div>
          <h1 style={{ fontSize:'1.8rem', fontWeight:800, color:'#2d3748', margin:'8px 0 4px' }}>أحسنت!</h1>
          <p style={{ color:'#718096', marginBottom:8 }}>
            {total} سؤال من بنك يضم {allWords.length} كلمة
          </p>
          <div style={{ fontSize:'2.2rem', margin:'10px 0' }}>{'⭐'.repeat(stars)}{'☆'.repeat(3-stars)}</div>
          <div style={{ fontSize:'3rem', fontWeight:900, color:'#667eea' }}>
            {score}<span style={{ fontSize:'1.2rem', color:'#718096' }}>/{total}</span>
          </div>
          <div style={{ background:'#F0F4FF', borderRadius:12, padding:'10px 16px', margin:'16px 0', fontSize:'.9rem', color:'#4a5568' }}>
            {pct>=90?'ممتاز! أنت بطل الحروف 🥇':pct>=60?'جيد جداً! استمر في التدريب 💪':'لا تيأس، حاول مرة أخرى! 🎯'}
          </div>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={startGame} style={{ background:BG, color:'#fff', border:'none', borderRadius:50, padding:'12px 32px', fontSize:'1rem', fontWeight:700, cursor:'pointer' }}>جولة جديدة 🔄</button>
            <Link href="/library" style={{ background:'#f7fafc', color:'#4a5568', border:'2px solid #e2e8f0', borderRadius:50, padding:'12px 32px', fontSize:'1rem', fontWeight:700, textDecoration:'none', display:'inline-flex', alignItems:'center' }}>المكتبة 📚</Link>
          </div>
        </div>
      </div>
    );
  }

  // ── شاشة اللعب ────────────────────────────────────────────────────────
  const total    = queue.length;
  const progress = total > 0 ? (qIdx / total) * 100 : 0;

  return (
    <div style={{ ...base, background:BG, padding:'16px 16px 90px', direction:'rtl', position:'relative', overflow:'hidden' }}>
      <style>{css}</style>

      {/* ورق الاحتفال */}
      {confetti.map(p => (
        <div key={p.id} style={{ position:'fixed', top:0, left:`${p.x}%`, zIndex:999, pointerEvents:'none', width:p.size, height:p.size, borderRadius:'50%', background:p.color, animation:`cfall 1.7s ${p.delay}s ease-in forwards` }} />
      ))}

      {/* غطاء التحضير */}
      {building && (
        <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(102,126,234,.8)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#fff', gap:12 }}>
          <div style={{ fontSize:'2rem' }}>⏳</div>
          <div style={{ fontSize:'1.2rem', fontWeight:700 }}>جاري تحضير الأسئلة…</div>
          <div style={{ fontSize:'.9rem', opacity:.8 }}>جلب الصور والأصوات من قاعدة البيانات</div>
        </div>
      )}

      {/* شريط علوي */}
      <div style={{ maxWidth:560, margin:'0 auto 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <Link href="/library" style={{ color:'rgba(255,255,255,.8)', textDecoration:'none', fontSize:'.9rem', fontWeight:600 }}>← مكتبة</Link>
        <span style={{ color:'#fff', fontWeight:800 }}>صيّاد الحروف 🎯</span>
        <span style={{ background:'rgba(255,255,255,.2)', color:'#fff', borderRadius:50, padding:'4px 14px', fontWeight:700, fontSize:'.9rem' }}>{score} ⭐</span>
      </div>

      {/* شريط تقدم ديناميكي — يعتمد على عدد الأسئلة الفعلي في الجولة */}
      <div style={{ maxWidth:560, margin:'0 auto 6px', display:'flex', justifyContent:'space-between', color:'rgba(255,255,255,.7)', fontSize:'.82rem' }}>
        <span>السؤال {qIdx + 1}</span>
        <span>من أصل {total}</span>
      </div>
      <div style={{ maxWidth:560, margin:'0 auto 18px', background:'rgba(255,255,255,.25)', borderRadius:50, height:10, overflow:'hidden' }}>
        <div style={{ width:`${progress}%`, height:'100%', background:'#FFE66D', borderRadius:50, transition:'width .4s' }} />
      </div>

      {/* بطاقة السؤال */}
      {current && (
        <div style={{
          maxWidth:560, margin:'0 auto 24px', background:'#fff', borderRadius:24,
          padding:'22px 20px', textAlign:'center',
          boxShadow:'0 12px 40px rgba(0,0,0,.2)',
          animation: shaking ? 'shake .5s ease' : 'fadeIn .35s ease',
        }}>

          {/* الصورة — مجلوبة من نفس سجل الكلمة في قاعدة البيانات */}
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

          {/* صناديق الحروف بالترتيب الصحيح (RTL) */}
          <WordDisplay stripped={current.stripped} missingIdx={current.missingIdx} />

          {/* زر النطق + رقم السؤال */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, marginTop:14 }}>
            <button onClick={() => playItem(current)} title="استمع للكلمة"
              style={{ background:'#EBF4FF', border:'none', borderRadius:'50%', width:40, height:40, cursor:'pointer', fontSize:'1.25rem', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(0,0,0,.1)' }}>
              🔊
            </button>
            <span style={{ color:'#a0aec0', fontSize:'.82rem' }}>{qIdx + 1} / {total}</span>
          </div>

          {/* كشف الكلمة الكاملة عند الإجابة الصحيحة */}
          {answered === 'correct' && (
            <div style={{ marginTop:10, color:'#38A169', fontWeight:700, fontSize:'1.1rem', animation:'cpop .4s ease' }}>
              ✅ {current.word}
            </div>
          )}
        </div>
      )}

      {/* فقاعات الاختيار */}
      {current && (
        <div style={{ maxWidth:560, margin:'0 auto', display:'flex', flexWrap:'wrap', gap:16, justifyContent:'center' }}>
          {choices.map((letter, i) => {
            const isRight = answered === 'correct' && letter === current.letter;
            const isWrong = answered === 'wrong'   && i === wrongIdx;
            return (
              <button key={i} disabled={!!answered} className="bb"
                onClick={() => handleChoice(letter, i)}
                style={{
                  background: isRight ? '#38A169' : isWrong ? '#E53E3E' : BUBBLE_COLORS[i % BUBBLE_COLORS.length],
                  animation: isRight ? 'cpop .4s ease' : isWrong ? 'shake .5s ease' : `floatB 2.5s ${i * 0.18}s ease-in-out infinite`,
                  opacity: answered && !isRight && !isWrong ? 0.5 : 1,
                  cursor: answered ? 'default' : 'pointer',
                }}>
                {letter}
              </button>
            );
          })}
        </div>
      )}

      {/* فهيم الذكاء 🦉 */}
      <div style={{ position:'fixed', bottom:20, left:20, fontSize:'2.8rem', filter:'drop-shadow(0 4px 8px rgba(0,0,0,.3))', animation:'floatB 3s ease-in-out infinite', zIndex:10, userSelect:'none' }}>
        🦉
      </div>
    </div>
  );
}
