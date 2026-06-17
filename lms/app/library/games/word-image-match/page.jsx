'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';

/* ─────────────── helpers ─────────────── */
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
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ar-SA'; u.rate = 0.85;
  const go = () => {
    const voices = window.speechSynthesis.getVoices();
    const ar = voices.find(v => v.lang.startsWith('ar'));
    if (ar) u.voice = ar;
    window.speechSynthesis.speak(u);
  };
  if (window.speechSynthesis.getVoices().length > 0) go();
  else { window.speechSynthesis.addEventListener('voiceschanged', go, { once: true }); setTimeout(go, 500); }
}

function playAudio(audioUrl, text) {
  if (audioUrl) { const a = new Audio(audioUrl); a.play().catch(() => speak(text)); }
  else speak(text);
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

const TOPICS = ['الحيوانات','الأشكال','الأسرة','الألوان','الفواكه','المدرسة','الطقس','الأرقام','المهن','الأدوات'];

/* ─────────────── recording hook ─────────────── */
function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [recSecs,   setRecSecs]   = useState(0);
  const mrRef    = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = useCallback(async (onDone) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => onDone(reader.result);
        reader.readAsDataURL(blob);
      };
      mr.start();
      mrRef.current = mr;
      setRecording(true); setRecSecs(0);
      timerRef.current = setInterval(() => setRecSecs(s => s + 1), 1000);
    } catch { alert('تعذّر الوصول إلى الميكروفون'); }
  }, []);

  const stopRecording = useCallback(() => {
    mrRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false); setRecSecs(0);
  }, []);

  return { recording, recSecs, startRecording, stopRecording };
}

/* ─────────────── pair manager ─────────────── */
function PairManager({ allPairs, onRefresh }) {
  const [editId,   setEditId]   = useState(null);
  const [word,     setWord]     = useState('');
  const [topic,    setTopic]    = useState('');
  const [grade,    setGrade]    = useState(0);
  const [imgUrl,   setImgUrl]   = useState('');
  const [imgPrev,  setImgPrev]  = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState(null);
  const { recording, recSecs, startRecording, stopRecording } = useRecorder();

  const reset = () => { setEditId(null); setWord(''); setTopic(''); setGrade(0); setImgUrl(''); setImgPrev(''); setAudioUrl(''); setMsg(null); };
  const startEdit = (p) => { setEditId(p.id); setWord(p.word_text); setTopic(p.topic||''); setGrade(p.grade_level||0); setImgUrl(p.image_url||''); setImgPrev(p.image_url||''); setAudioUrl(p.audio_url||''); setMsg(null); };
  const handleImgFile = async (e) => { const f = e.target.files?.[0]; if (!f) return; const b = await fileToBase64(f); setImgUrl(b); setImgPrev(b); };

  const handleSave = async () => {
    if (!word.trim()) { setMsg({ ok:false, text:'الكلمة مطلوبة' }); return; }
    if (!imgUrl)      { setMsg({ ok:false, text:'الصورة مطلوبة' }); return; }
    setSaving(true);
    try {
      const body = { word_text: word.trim(), audio_url: audioUrl||null, image_url: imgUrl, topic: topic||null, grade_level: grade||null };
      const res = editId
        ? await fetch(`/api/games/word-image-match?id=${editId}`, { method:'PUT',  headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
        : await fetch('/api/games/word-image-match',               { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setMsg({ ok:true, text: editId ? 'تم التعديل ✅' : 'تمت الإضافة ✅' });
      reset(); onRefresh();
    } catch (e) { setMsg({ ok:false, text: e.message }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('حذف هذه الكلمة؟')) return;
    const res = await fetch(`/api/games/word-image-match?id=${id}`, { method:'DELETE' });
    const json = await res.json();
    if (json.error) { alert(json.error); return; }
    if (editId === id) reset();
    onRefresh();
  };

  return (
    <div style={{ border:'1.5px solid #e2e8f0', borderRadius:12, background:'#fff', overflow:'hidden', marginBottom:16 }}>
      <div style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0', padding:'10px 14px', fontWeight:700, color:'#1e40af', fontFamily:'Cairo,sans-serif', fontSize:'.9rem' }}>📚 إدارة الكلمات والصور</div>
      <div style={{ padding:14, borderBottom:'1px solid #f1f5f9' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
          <div><label style={S.label}>الكلمة</label><input value={word} onChange={e=>setWord(e.target.value)} placeholder="مثال: أسد" style={S.input} dir="rtl" /></div>
          <div><label style={S.label}>الموضوع</label><select value={topic} onChange={e=>setTopic(e.target.value)} style={S.input}><option value="">— بدون —</option>{TOPICS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
          <div><label style={S.label}>الصف</label><select value={grade} onChange={e=>setGrade(Number(e.target.value))} style={S.input}><option value={0}>— الكل —</option>{[1,2,3,4,5,6,7,8,9].map(g=><option key={g} value={g}>الصف {g}</option>)}</select></div>
          <div><label style={S.label}>الصورة</label><input type="file" accept="image/*" onChange={handleImgFile} style={{ ...S.input, padding:'5px 8px' }} /></div>
        </div>
        {imgPrev && <div style={{ marginBottom:8, textAlign:'center' }}><img src={imgPrev} alt="" style={{ maxHeight:90, maxWidth:140, objectFit:'contain', borderRadius:8, border:'1px solid #e2e8f0' }} /></div>}
        <div style={{ marginBottom:10 }}>
          <label style={S.label}>الصوت (اختياري)</label>
          {!audioUrl ? (
            <button onClick={() => recording ? stopRecording() : startRecording(url => setAudioUrl(url))} style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:`1.5px solid ${recording?'#fca5a5':'#86efac'}`, background:recording?'#fee2e2':'#f0fdf4', cursor:'pointer', fontFamily:'Cairo,sans-serif', fontSize:'.88rem' }}>
              {recording ? `⏹️ إيقاف (${recSecs}ث)` : '🎙️ تسجيل صوت'}
            </button>
          ) : (
            <div style={{ background:'#f0fdf4', border:'1.5px solid #86efac', borderRadius:8, padding:8 }}>
              <div style={{ fontSize:'.78rem', color:'#15803d', marginBottom:4 }}>✅ تسجيل جاهز</div>
              <audio src={audioUrl} controls style={{ width:'100%', height:32 }} />
              <div style={{ display:'flex', gap:6, marginTop:6 }}>
                <button onClick={() => setAudioUrl('')} style={{ ...S.btnSm, background:'#fef2f2', color:'#dc2626', border:'1px solid #fca5a5' }}>🗑️ حذف</button>
                <input type="file" accept="audio/*" onChange={async e => { const f=e.target.files?.[0]; if(f) setAudioUrl(await fileToBase64(f)); }} style={{ fontSize:'.75rem' }} />
              </div>
            </div>
          )}
        </div>
        {msg && <div style={{ padding:'7px 10px', borderRadius:7, marginBottom:8, background:msg.ok?'#f0fdf4':'#fef2f2', color:msg.ok?'#15803d':'#dc2626', fontSize:'.85rem', fontFamily:'Cairo,sans-serif' }}>{msg.text}</div>}
        <div style={{ display:'flex', gap:7 }}>
          <button onClick={handleSave} disabled={saving} style={{ ...S.btnPrimary, flex:1 }}>{saving?'⏳ جارٍ الحفظ...':editId?'💾 حفظ التعديل':'➕ إضافة'}</button>
          {editId && <button onClick={reset} style={S.btnSm}>إلغاء</button>}
        </div>
      </div>
      <div style={{ maxHeight:280, overflowY:'auto' }}>
        {allPairs.length === 0 ? (
          <div style={{ padding:20, textAlign:'center', color:'#94a3b8', fontFamily:'Cairo,sans-serif', fontSize:'.88rem' }}>لا توجد كلمات بعد</div>
        ) : allPairs.map(p => (
          <div key={p.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', borderBottom:'1px solid #f1f5f9', background:editId===p.id?'#eff6ff':'transparent' }}>
            {p.image_url && <img src={p.image_url} alt="" style={{ width:42, height:42, objectFit:'cover', borderRadius:6, flexShrink:0 }} />}
            <div style={{ flex:1, fontFamily:'Cairo,sans-serif', direction:'rtl', textAlign:'right' }}>
              <div style={{ fontWeight:700, fontSize:'.95rem' }}>{p.word_text}</div>
              <div style={{ fontSize:'.74rem', color:'#64748b' }}>{[p.topic, p.grade_level?`ص${p.grade_level}`:'', p.audio_url?'🔊':''].filter(Boolean).join(' · ')}</div>
            </div>
            <button onClick={() => startEdit(p)} style={{ ...S.btnSm, background:'#eff6ff', color:'#1e40af', border:'1px solid #bfdbfe' }}>✏️</button>
            <button onClick={() => handleDelete(p.id)} style={{ ...S.btnSm, background:'#fef2f2', color:'#dc2626', border:'1px solid #fca5a5' }}>🗑️</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── settings panel ─────────────── */
function SettingsPanel({ cfg, setCfg }) {
  return (
    <div style={{ border:'1.5px solid #e2e8f0', borderRadius:12, background:'#fff', padding:14, marginBottom:14 }}>
      <div style={{ fontWeight:700, color:'#1e40af', marginBottom:10, fontFamily:'Cairo,sans-serif', fontSize:'.9rem' }}>⚙️ إعدادات اللعبة</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
        <div><label style={S.label}>الموضوع</label><select value={cfg.topic} onChange={e=>setCfg(c=>({...c,topic:e.target.value}))} style={S.input}><option value="">— الكل —</option>{TOPICS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
        <div><label style={S.label}>الصف</label><select value={cfg.grade} onChange={e=>setCfg(c=>({...c,grade:Number(e.target.value)}))} style={S.input}><option value={0}>— الكل —</option>{[1,2,3,4,5,6,7,8,9].map(g=><option key={g} value={g}>الصف {g}</option>)}</select></div>
        <div><label style={S.label}>عدد الأزواج ({cfg.pairsCount})</label><input type="range" min={3} max={10} value={cfg.pairsCount} onChange={e=>setCfg(c=>({...c,pairsCount:Number(e.target.value)}))} style={{ width:'100%', accentColor:'#7c3aed' }} /></div>
      </div>
    </div>
  );
}

/* ─────────────── particle burst ─────────────── */
const BURST_EMOJIS = ['⭐','✨','🌟','💫','⭐','✨'];
const BURST_ANIMS  = ['wimStar1','wimStar2','wimStar3','wimStar4','wimStar5','wimStar6'];
function ParticleBurst() {
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:20 }}>
      {BURST_EMOJIS.map((e, i) => (
        <span key={i} style={{
          position:'absolute', top:'50%', left:'50%',
          fontSize:'1.1rem', marginTop:-9, marginLeft:-9,
          animation:`${BURST_ANIMS[i]} .75s ease-out forwards ${i*0.05}s`,
          opacity:0, display:'inline-block',
        }}>{e}</span>
      ))}
    </div>
  );
}

/* ─────────────── game area ─────────────── */
function GameArea({ gamePairs, cfg, isTeacher }) {
  const containerRef  = useRef(null);
  const dragWordIdRef = useRef(null);

  const [phase,        setPhase]        = useState('idle');
  const [currentPairs, setCurrentPairs] = useState([]);
  const [wordOrder,    setWordOrder]    = useState([]);
  const [imageOrder,   setImageOrder]   = useState([]);
  const [connections,  setConnections]  = useState([]);
  const [correct,      setCorrect]      = useState(new Set());
  const [shaking,      setShaking]      = useState(null);
  const [selectedWord, setSelectedWord] = useState(null);
  const [dragPos,      setDragPos]      = useState(null);
  const [lines,        setLines]        = useState([]);
  const [bursting,     setBursting]     = useState(new Set());
  const [imgBursting,  setImgBursting]  = useState(new Set());

  const pairMap = useMemo(() => {
    const m = {};
    currentPairs.forEach(p => { m[p.id] = p; });
    return m;
  }, [currentPairs]);

  const recalcLines = useCallback(() => {
    if (!containerRef.current || connections.length === 0) { setLines([]); return; }
    const cRect = containerRef.current.getBoundingClientRect();
    const newLines = connections.map(c => {
      const wEl = containerRef.current.querySelector(`[data-word="${c.wordId}"]`);
      const iEl = containerRef.current.querySelector(`[data-img="${c.imgId}"]`);
      if (!wEl || !iEl) return null;
      const wR = wEl.getBoundingClientRect();
      const iR = iEl.getBoundingClientRect();
      return {
        id: c.wordId,
        x1: wR.left  - cRect.left,
        y1: wR.top   - cRect.top + wR.height / 2,
        x2: iR.right - cRect.left,
        y2: iR.top   - cRect.top + iR.height / 2,
        correct: c.correct,
      };
    }).filter(Boolean);
    setLines(newLines);
  }, [connections]);

  useEffect(() => { recalcLines(); }, [recalcLines]);
  useEffect(() => {
    window.addEventListener('resize', recalcLines);
    return () => window.removeEventListener('resize', recalcLines);
  }, [recalcLines]);

  useEffect(() => {
    if (phase === 'playing' && currentPairs.length > 0 && correct.size === currentPairs.length)
      setTimeout(() => setPhase('done'), 800);
  }, [correct.size, currentPairs.length, phase]);

  const startGame = useCallback(() => {
    const count = Math.min(cfg.pairsCount, gamePairs.length);
    const sel   = shuffle(gamePairs).slice(0, count);
    const ids   = sel.map(p => p.id);
    setCurrentPairs(sel);
    setWordOrder(shuffle([...ids]));
    setImageOrder(shuffle([...ids]));
    setConnections([]); setCorrect(new Set()); setSelectedWord(null);
    setDragPos(null); setShaking(null);
    setBursting(new Set()); setImgBursting(new Set());
    dragWordIdRef.current = null;
    setPhase('playing');
  }, [gamePairs, cfg.pairsCount]);

  const attemptConnect = useCallback((wordId, imgId) => {
    if (correct.has(wordId)) return;
    const isCorrect = wordId === imgId;
    setConnections(prev => [...prev.filter(c => c.wordId !== wordId), { wordId, imgId, correct: isCorrect }]);
    if (isCorrect) {
      setCorrect(prev => new Set([...prev, wordId]));
      const pair = pairMap[wordId];
      if (pair) setTimeout(() => playAudio(pair.audio_url, pair.word_text), 150);
      setBursting(prev => new Set([...prev, wordId]));
      setImgBursting(prev => new Set([...prev, imgId]));
      setTimeout(() => {
        setBursting(prev => { const s=new Set(prev); s.delete(wordId); return s; });
        setImgBursting(prev => { const s=new Set(prev); s.delete(imgId); return s; });
      }, 900);
    } else {
      setShaking(imgId);
      setTimeout(() => {
        setConnections(prev => prev.filter(c => !(c.wordId === wordId && !c.correct)));
        setShaking(null);
      }, 650);
    }
    setSelectedWord(null);
    dragWordIdRef.current = null;
    setDragPos(null);
  }, [correct, pairMap]);

  /* drag listeners */
  useEffect(() => {
    if (phase !== 'playing') return;
    let rafId = null;
    const onMouseMove = (e) => {
      if (!dragWordIdRef.current || !containerRef.current) return;
      const cRect = containerRef.current.getBoundingClientRect();
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setDragPos(d => d ? { ...d, x2: e.clientX-cRect.left, y2: e.clientY-cRect.top } : null));
    };
    const onMouseUp = (e) => {
      if (!dragWordIdRef.current) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const imgEl = el?.closest?.('[data-img]');
      if (imgEl) attemptConnect(dragWordIdRef.current, imgEl.dataset.img);
      else { dragWordIdRef.current = null; setDragPos(null); }
    };
    const onTouchMove = (e) => {
      if (!dragWordIdRef.current || !containerRef.current) return;
      e.preventDefault();
      const t = e.touches[0];
      const cRect = containerRef.current.getBoundingClientRect();
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setDragPos(d => d ? { ...d, x2: t.clientX-cRect.left, y2: t.clientY-cRect.top } : null));
    };
    const onTouchEnd = (e) => {
      if (!dragWordIdRef.current) return;
      const t = e.changedTouches[0];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const imgEl = el?.closest?.('[data-img]');
      if (imgEl) attemptConnect(dragWordIdRef.current, imgEl.dataset.img);
      else { dragWordIdRef.current = null; setDragPos(null); }
    };
    document.addEventListener('mousemove',  onMouseMove);
    document.addEventListener('mouseup',    onMouseUp);
    document.addEventListener('touchmove',  onTouchMove, { passive:false });
    document.addEventListener('touchend',   onTouchEnd);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove',  onMouseMove);
      document.removeEventListener('mouseup',    onMouseUp);
      document.removeEventListener('touchmove',  onTouchMove);
      document.removeEventListener('touchend',   onTouchEnd);
    };
  }, [phase, attemptConnect]);

  const startDrag = (e, wordId) => {
    if (correct.has(wordId) || !containerRef.current) return;
    e.preventDefault();
    const cRect = containerRef.current.getBoundingClientRect();
    const wEl   = containerRef.current.querySelector(`[data-word="${wordId}"]`);
    if (!wEl) return;
    const wR = wEl.getBoundingClientRect();
    dragWordIdRef.current = wordId;
    setSelectedWord(null);
    setDragPos({ x1: wR.left-cRect.left, y1: wR.top-cRect.top+wR.height/2, x2: wR.left-cRect.left, y2: wR.top-cRect.top+wR.height/2 });
  };

  const startDragTouch = (e, wordId) => {
    if (correct.has(wordId) || !containerRef.current) return;
    const cRect = containerRef.current.getBoundingClientRect();
    const wEl   = containerRef.current.querySelector(`[data-word="${wordId}"]`);
    if (!wEl) return;
    const wR = wEl.getBoundingClientRect();
    dragWordIdRef.current = wordId;
    setSelectedWord(null);
    setDragPos({ x1: wR.left-cRect.left, y1: wR.top-cRect.top+wR.height/2, x2: e.touches[0].clientX-cRect.left, y2: e.touches[0].clientY-cRect.top });
  };

  const handleWordClick  = (wordId) => { if (correct.has(wordId) || dragWordIdRef.current) return; setSelectedWord(p => p===wordId ? null : wordId); };
  const handleImageClick = (imgId)  => { if (dragWordIdRef.current || !selectedWord) return; attemptConnect(selectedWord, imgId); };

  /* idle */
  if (phase === 'idle') {
    const canStart = gamePairs.length >= (isTeacher ? 1 : 3);
    return (
      <div style={{ textAlign:'center', padding:'44px 20px', fontFamily:"'Cairo',sans-serif" }}>
        <div style={{ fontSize:'4rem', marginBottom:14, lineHeight:1 }}>🖼️</div>
        <h2 style={{ fontSize:'1.5rem', fontWeight:900, color:'#3730a3', margin:'0 0 6px' }}>صِل الكلمة بصورتها</h2>
        <p style={{ color:'#64748b', fontSize:'.95rem', marginBottom:28 }}>وصّل كل كلمة بالصورة المناسبة لها 🎯</p>
        {gamePairs.length === 0 ? (
          <div style={{ background:'#fffbeb', border:'2px solid #fde68a', borderRadius:14, padding:'14px 20px', color:'#92400e', fontWeight:600 }}>
            {isTeacher ? '⚠️ لا توجد كلمات بعد — أضف كلمات من لوحة الإدارة.' : '⚠️ لا توجد كلمات متاحة حاليًا.'}
          </div>
        ) : !canStart ? (
          <div style={{ background:'#fffbeb', border:'2px solid #fde68a', borderRadius:14, padding:'14px 20px', color:'#92400e', fontWeight:600 }}>
            يجب إضافة 3 كلمات على الأقل لبدء اللعبة.
          </div>
        ) : (
          <>
            <button onClick={startGame} style={{ background:'linear-gradient(135deg,#7c3aed,#5b4fc4)', color:'#fff', border:'none', borderBottom:'5px solid #4338ca', padding:'14px 44px', borderRadius:20, cursor:'pointer', fontFamily:"'Cairo',sans-serif", fontWeight:900, fontSize:'1.1rem', boxShadow:'0 8px 24px rgba(124,58,237,.35)' }}>
              🚀 ابدأ اللعبة
            </button>
            <div style={{ color:'#94a3b8', fontSize:'.82rem', marginTop:12 }}>{gamePairs.length} كلمة متاحة</div>
          </>
        )}
      </div>
    );
  }

  /* done */
  if (phase === 'done') {
    return (
      <div style={{ textAlign:'center', padding:'44px 20px', fontFamily:"'Cairo',sans-serif" }}>
        <div style={{ fontSize:'4rem', marginBottom:14 }}>🎉</div>
        <h2 style={{ fontSize:'1.5rem', fontWeight:900, color:'#059669', margin:'0 0 6px' }}>أحسنت! وصّلت كل الكلمات! 🏆</h2>
        <p style={{ color:'#64748b', marginBottom:28 }}>لقد أجبت على {currentPairs.length} أزواج بشكل صحيح</p>
        <button onClick={startGame} style={{ background:'linear-gradient(135deg,#7c3aed,#5b4fc4)', color:'#fff', border:'none', borderBottom:'5px solid #4338ca', padding:'12px 36px', borderRadius:18, cursor:'pointer', fontFamily:"'Cairo',sans-serif", fontWeight:800, fontSize:'1rem', boxShadow:'0 8px 24px rgba(124,58,237,.3)' }}>
          🔄 جولة جديدة
        </button>
      </div>
    );
  }

  /* playing */
  const imgIsCorrect = (imgId) => connections.some(c => c.imgId === imgId && c.correct);

  return (
    <div>
      {/* progress */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, direction:'rtl' }}>
        <span style={{ fontFamily:"'Cairo',sans-serif", fontWeight:800, fontSize:'1rem', color:'#7c3aed', whiteSpace:'nowrap' }}>
          ✅ {correct.size} / {currentPairs.length}
        </span>
        <div style={{ flex:1, height:10, background:'#ede9fe', borderRadius:99, overflow:'hidden' }}>
          <div style={{ height:'100%', background:'linear-gradient(90deg,#7c3aed,#10b981)', borderRadius:99, width:`${(correct.size/currentPairs.length)*100}%`, transition:'width .5s cubic-bezier(.34,1.56,.64,1)' }} />
        </div>
        <button onClick={() => setPhase('idle')} style={{ background:'#fef2f2', color:'#ef4444', border:'1.5px solid #fca5a5', borderRadius:10, padding:'5px 12px', cursor:'pointer', fontFamily:"'Cairo',sans-serif", fontSize:'.8rem', fontWeight:700, whiteSpace:'nowrap' }}>✕ إنهاء</button>
      </div>

      {/* columns */}
      <div ref={containerRef} style={{ position:'relative', minHeight:200 }}>
        {/* SVG lines */}
        <svg style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none', overflow:'visible', zIndex:5 }}>
          {lines.map(l => (
            <g key={l.id}>
              <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#fff" strokeWidth={7} strokeLinecap="round" />
              <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke={l.correct ? '#10b981' : '#94a3b8'}
                strokeWidth={4} strokeLinecap="round"
                strokeDasharray={l.correct ? 'none' : '6 4'}
              />
            </g>
          ))}
          {dragPos && (
            <g>
              <line x1={dragPos.x1} y1={dragPos.y1} x2={dragPos.x2} y2={dragPos.y2} stroke="#fff" strokeWidth={7} strokeLinecap="round" />
              <line x1={dragPos.x1} y1={dragPos.y1} x2={dragPos.x2} y2={dragPos.y2}
                stroke="#a78bfa" strokeWidth={4} strokeLinecap="round" strokeDasharray="8 5" />
            </g>
          )}
        </svg>

        <div className="wim-cols" style={{ display:'flex', direction:'rtl', gap:0, alignItems:'flex-start' }}>

          {/* WORDS column */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:14, paddingRight:4 }}>
            {wordOrder.map(wordId => {
              const pair       = pairMap[wordId];
              const isCorrect  = correct.has(wordId);
              const isSelected = selectedWord === wordId;
              const isBurst    = bursting.has(wordId);
              if (!pair) return null;
              return (
                <div
                  key={wordId}
                  data-word={wordId}
                  className={`wim-word-card${isCorrect?' wim-done':''}`}
                  onMouseDown={e => startDrag(e, wordId)}
                  onTouchStart={e => startDragTouch(e, wordId)}
                  onClick={() => handleWordClick(wordId)}
                  style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    gap:8, padding:'0 16px',
                    borderRadius:22,
                    border:`3px solid ${isCorrect?'#10b981':isSelected?'#f59e0b':'#ddd6fe'}`,
                    borderBottom:`6px solid ${isCorrect?'#059669':isSelected?'#d97706':'#a5b4fc'}`,
                    background: isCorrect
                      ? 'linear-gradient(135deg,#d1fae5,#a7f3d0)'
                      : isSelected
                        ? 'linear-gradient(135deg,#fffbeb,#fef3c7)'
                        : 'linear-gradient(135deg,#faf5ff,#f5f3ff)',
                    cursor: isCorrect?'default':'grab',
                    userSelect:'none', touchAction:'none',
                    fontFamily:"'Cairo',sans-serif", fontSize:'1.15rem', fontWeight:800,
                    height:92, position:'relative', overflow:'hidden',
                    boxShadow: isCorrect
                      ? '0 5px 0 #059669, 0 10px 24px rgba(5,150,105,.18)'
                      : '0 5px 0 #a5b4fc, 0 10px 24px rgba(0,0,0,.1)',
                    animation: 'wimPop .3s ease-out',
                    transition: 'border-color .2s, background .25s',
                  }}
                >
                  {isBurst && <ParticleBurst />}
                  <span style={{ color:isCorrect?'#065f46':isSelected?'#92400e':'#3730a3' }}>
                    {pair.word_text}
                  </span>
                  {isCorrect
                    ? <span style={{ fontSize:'1.4rem', flexShrink:0 }}>✅</span>
                    : (
                      <button
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); playAudio(pair.audio_url, pair.word_text); }}
                        style={{ background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem', padding:'2px 4px', flexShrink:0, lineHeight:1 }}
                        title="استمع"
                      >🔊</button>
                    )
                  }
                </div>
              );
            })}
          </div>

          {/* spacer */}
          <div className="wim-spacer" style={{ width:72, flexShrink:0 }} />

          {/* IMAGES column */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:14, paddingLeft:4 }}>
            {imageOrder.map(imgId => {
              const pair    = pairMap[imgId];
              const isCor   = imgIsCorrect(imgId);
              const isShake = shaking === imgId;
              const isSel   = selectedWord !== null && !isCor;
              const isBurst = imgBursting.has(imgId);
              if (!pair) return null;
              return (
                <div
                  key={imgId}
                  data-img={imgId}
                  className={`wim-img-card${isCor?' wim-done':''}`}
                  onClick={() => handleImageClick(imgId)}
                  style={{
                    borderRadius:22,
                    border:`3px solid ${isCor?'#10b981':isSel?'#93c5fd':'#ddd6fe'}`,
                    borderBottom:`6px solid ${isCor?'#059669':isSel?'#3b82f6':'#a5b4fc'}`,
                    background: isCor
                      ? 'linear-gradient(135deg,#d1fae5,#a7f3d0)'
                      : isSel
                        ? 'linear-gradient(135deg,#eff6ff,#dbeafe)'
                        : 'linear-gradient(135deg,#faf5ff,#f0f9ff)',
                    padding:'10px 8px',
                    cursor: isCor?'default':'pointer',
                    animation: isShake ? 'wimShake .55s' : 'wimPop .3s ease-out',
                    userSelect:'none', touchAction:'none',
                    display:'flex', justifyContent:'center', alignItems:'center',
                    height:92, position:'relative', overflow:'hidden',
                    boxShadow: isCor
                      ? '0 5px 0 #059669, 0 10px 24px rgba(5,150,105,.18)'
                      : '0 5px 0 #a5b4fc, 0 10px 24px rgba(0,0,0,.1)',
                    transition:'border-color .2s, background .25s',
                  }}
                >
                  {isBurst && <ParticleBurst />}
                  {pair.image_url ? (
                    <img src={pair.image_url} alt="" style={{ maxWidth:'100%', maxHeight:68, objectFit:'contain', borderRadius:8, pointerEvents:'none', display:'block' }} />
                  ) : (
                    <div style={{ fontSize:'2.5rem', color:'#c4b5fd' }}>❓</div>
                  )}
                  {isCor && <div style={{ position:'absolute', top:5, right:8, fontSize:'1rem' }}>✅</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedWord && (
        <div style={{ textAlign:'center', marginTop:14, fontFamily:"'Cairo',sans-serif", fontSize:'.9rem', fontWeight:700, color:'#7c3aed', background:'#f5f3ff', borderRadius:10, padding:'8px 16px' }}>
          👆 اختر الصورة المناسبة لـ «{pairMap[selectedWord]?.word_text}»
        </div>
      )}
    </div>
  );
}

/* ─────────────── styles ─────────────── */
const S = {
  label:      { display:'block', fontSize:'.78rem', fontWeight:600, color:'#475569', marginBottom:3, fontFamily:'Cairo,sans-serif' },
  input:      { width:'100%', padding:'7px 10px', borderRadius:8, border:'1.5px solid #d1d5db', fontFamily:'Cairo,sans-serif', fontSize:'.88rem', boxSizing:'border-box', direction:'rtl' },
  btnPrimary: { background:'#1e40af', color:'#fff', border:'none', padding:'10px 20px', borderRadius:8, cursor:'pointer', fontFamily:'Cairo,sans-serif', fontWeight:700, fontSize:'.9rem' },
  btnSm:      { background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:7, padding:'6px 10px', cursor:'pointer', fontFamily:'Cairo,sans-serif', fontSize:'.8rem' },
};

/* ─────────────── main page ─────────────── */
export default function WordImageMatchPage() {
  const [isTeacher, setIsTeacher] = useState(false);
  const [allPairs,  setAllPairs]  = useState([]);
  const [gamePairs, setGamePairs] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showMgr,   setShowMgr]   = useState(false);
  const [showCfg,   setShowCfg]   = useState(false);
  const [cfg,       setCfg]       = useState({ topic:'', grade:0, pairsCount:6 });

  useEffect(() => {
    import('../../../../lib/supabase').then(({ createClient }) => {
      const sb = createClient();
      sb.auth.getUser().then(({ data:{ user } }) => {
        const role = user?.user_metadata?.role ?? '';
        setIsTeacher(['super_admin','admin','teacher'].includes(role));
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const loadAllPairs = useCallback(async () => {
    if (!isTeacher) return;
    const res  = await fetch('/api/games/word-image-match');
    const json = await res.json().catch(() => ({ pairs:[] }));
    setAllPairs(json.pairs || []);
  }, [isTeacher]);

  const loadGamePairs = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (cfg.topic)    p.set('topic', cfg.topic);
    if (cfg.grade > 0) p.set('grade', String(cfg.grade));
    const res  = await fetch(`/api/games/word-image-match?${p}`);
    const json = await res.json().catch(() => ({ pairs:[] }));
    setGamePairs(json.pairs || []);
    setLoading(false);
  }, [cfg.topic, cfg.grade]);

  useEffect(() => { loadAllPairs();  }, [loadAllPairs]);
  useEffect(() => { loadGamePairs(); }, [loadGamePairs]);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { background: #f0edff; }

        @keyframes wimPop {
          0%  { transform:scale(.82) translateY(8px); opacity:0; }
          60% { transform:scale(1.05) translateY(-2px); }
          100%{ transform:scale(1)   translateY(0);    opacity:1; }
        }
        @keyframes wimShake {
          0%,100%{ transform:translateX(0) rotate(0deg); }
          15%    { transform:translateX(-10px) rotate(-2deg); }
          30%    { transform:translateX(10px)  rotate(2deg);  }
          45%    { transform:translateX(-7px); }
          60%    { transform:translateX(7px);  }
          75%    { transform:translateX(-4px); }
          90%    { transform:translateX(4px);  }
        }
        @keyframes wimStar1{ 0%{transform:translate(0,0) scale(1.2);opacity:1} 100%{transform:translate(-44px,-54px) scale(0) rotate(200deg);opacity:0} }
        @keyframes wimStar2{ 0%{transform:translate(0,0) scale(1.2);opacity:1} 100%{transform:translate(44px,-54px)  scale(0) rotate(-200deg);opacity:0} }
        @keyframes wimStar3{ 0%{transform:translate(0,0) scale(1.2);opacity:1} 100%{transform:translate(0,-66px)      scale(0);opacity:0} }
        @keyframes wimStar4{ 0%{transform:translate(0,0) scale(1.2);opacity:1} 100%{transform:translate(-58px,-18px)  scale(0) rotate(90deg);opacity:0} }
        @keyframes wimStar5{ 0%{transform:translate(0,0) scale(1.2);opacity:1} 100%{transform:translate(58px,-18px)   scale(0) rotate(-90deg);opacity:0} }
        @keyframes wimStar6{ 0%{transform:translate(0,0) scale(1.2);opacity:1} 100%{transform:translate(16px,-62px)   scale(0);opacity:0} }

        .wim-word-card { transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .15s; }
        .wim-word-card:not(.wim-done):hover  { transform: scale(1.05) translateY(-3px) !important; box-shadow: 0 14px 32px rgba(92,79,196,.28) !important; }
        .wim-word-card:not(.wim-done):active { transform: scale(.96) translateY(3px) !important; }

        .wim-img-card  { transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .15s; }
        .wim-img-card:not(.wim-done):hover  { transform: scale(1.05) translateY(-3px) !important; box-shadow: 0 14px 32px rgba(92,79,196,.28) !important; }
        .wim-img-card:not(.wim-done):active { transform: scale(.96) translateY(3px) !important; }

        @media (max-width: 520px) {
          .wim-cols .wim-word-card, .wim-cols .wim-img-card { height: 74px !important; font-size: 1rem !important; }
          .wim-spacer { width: 40px !important; }
        }
      `}</style>

      <div style={{ maxWidth:700, margin:'0 auto', padding:'16px 12px', fontFamily:"'Cairo',sans-serif" }}>

        {/* header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, direction:'rtl' }}>
          <div>
            <div style={{ fontSize:'1.3rem', fontWeight:900, color:'#3730a3' }}>🖼️ صِل الكلمة بصورتها</div>
            <div style={{ fontSize:'.82rem', color:'#7c3aed', marginTop:2, fontWeight:600 }}>وصّل كل كلمة بالصورة المناسبة لها</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {isTeacher && (
              <>
                <button onClick={() => setShowCfg(s=>!s)} style={{ background:showCfg?'#ede9fe':'#f5f3ff', color:'#6d28d9', border:'2px solid #ddd6fe', borderRadius:12, padding:'7px 14px', cursor:'pointer', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:'.85rem' }}>⚙️ إعدادات</button>
                <button onClick={() => setShowMgr(s=>!s)} style={{ background:showMgr?'#ede9fe':'#f5f3ff', color:'#6d28d9', border:'2px solid #ddd6fe', borderRadius:12, padding:'7px 14px', cursor:'pointer', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:'.85rem' }}>📚 إدارة</button>
              </>
            )}
            <Link href="/library" style={{ background:'#f5f3ff', color:'#6d28d9', border:'2px solid #ddd6fe', borderRadius:12, padding:'7px 14px', textDecoration:'none', fontFamily:"'Cairo',sans-serif", fontWeight:700, fontSize:'.85rem' }}>← المكتبة</Link>
          </div>
        </div>

        {isTeacher && showCfg && <SettingsPanel cfg={cfg} setCfg={setCfg} />}
        {isTeacher && showMgr && <PairManager allPairs={allPairs} onRefresh={() => { loadAllPairs(); loadGamePairs(); }} />}

        {/* game card */}
        <div style={{ background:'#fff', borderRadius:28, padding:'22px 20px', boxShadow:'0 8px 40px rgba(92,79,196,.15), 0 2px 8px rgba(0,0,0,.06)', border:'2px solid #ede9fe' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'40px 20px', fontFamily:"'Cairo',sans-serif" }}>
              <div style={{ display:'flex', gap:10, justifyContent:'center', marginBottom:12 }}>
                {[0,180,360].map(d => (
                  <div key={d} style={{ width:13, height:13, borderRadius:'50%', background:'#7c3aed', animation:`wsDot 1.3s ${d}ms ease-in-out infinite` }} />
                ))}
              </div>
              <div style={{ color:'#9ca3af', fontWeight:600 }}>جارٍ تحميل اللعبة…</div>
            </div>
          ) : (
            <GameArea gamePairs={gamePairs} cfg={cfg} isTeacher={isTeacher} key={`${cfg.topic}-${cfg.grade}-${cfg.pairsCount}`} />
          )}
        </div>
      </div>
    </>
  );
}
