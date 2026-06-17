'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';

/* ─────────────────────── helpers ─────────────────────── */
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
  if (audioUrl) {
    const a = new Audio(audioUrl);
    a.play().catch(() => speak(text));
  } else {
    speak(text);
  }
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

const TOPICS = ['الحيوانات', 'الأشكال', 'الأسرة', 'الألوان', 'الفواكه', 'المدرسة', 'الطقس', 'الأرقام', 'المهن', 'الأدوات'];

/* ─────────────────────── recording hook ─────────────────────── */
function useRecorder() {
  const [recording, setRecording]   = useState(false);
  const [recSecs,   setRecSecs]     = useState(0);
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
      setRecording(true);
      setRecSecs(0);
      timerRef.current = setInterval(() => setRecSecs(s => s + 1), 1000);
    } catch {
      alert('تعذّر الوصول إلى الميكروفون');
    }
  }, []);

  const stopRecording = useCallback(() => {
    mrRef.current?.stop();
    clearInterval(timerRef.current);
    setRecording(false);
    setRecSecs(0);
  }, []);

  return { recording, recSecs, startRecording, stopRecording };
}

/* ─────────────────────── pair manager ─────────────────────── */
function PairManager({ allPairs, onRefresh }) {
  const [editId,    setEditId]    = useState(null);
  const [word,      setWord]      = useState('');
  const [topic,     setTopic]     = useState('');
  const [grade,     setGrade]     = useState(0);
  const [imgUrl,    setImgUrl]    = useState('');
  const [imgPrev,   setImgPrev]   = useState('');
  const [audioUrl,  setAudioUrl]  = useState('');
  const [saving,    setSaving]    = useState(false);
  const [msg,       setMsg]       = useState(null);
  const { recording, recSecs, startRecording, stopRecording } = useRecorder();

  const reset = () => {
    setEditId(null); setWord(''); setTopic(''); setGrade(0);
    setImgUrl(''); setImgPrev(''); setAudioUrl(''); setMsg(null);
  };

  const startEdit = (p) => {
    setEditId(p.id); setWord(p.word_text); setTopic(p.topic || '');
    setGrade(p.grade_level || 0); setImgUrl(p.image_url || '');
    setImgPrev(p.image_url || ''); setAudioUrl(p.audio_url || '');
    setMsg(null);
  };

  const handleImgFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setImgUrl(b64); setImgPrev(b64);
  };

  const handleSave = async () => {
    if (!word.trim()) { setMsg({ ok: false, text: 'الكلمة مطلوبة' }); return; }
    if (!imgUrl)      { setMsg({ ok: false, text: 'الصورة مطلوبة' }); return; }
    setSaving(true);
    try {
      const body = { word_text: word.trim(), audio_url: audioUrl || null, image_url: imgUrl, topic: topic || null, grade_level: grade || null };
      const res = editId
        ? await fetch(`/api/games/word-image-match?id=${editId}`, { method: 'PUT',  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/games/word-image-match',               { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setMsg({ ok: true, text: editId ? 'تم التعديل ✅' : 'تمت الإضافة ✅' });
      reset(); onRefresh();
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('حذف هذه الكلمة؟')) return;
    const res = await fetch(`/api/games/word-image-match?id=${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.error) { alert(json.error); return; }
    if (editId === id) reset();
    onRefresh();
  };

  return (
    <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, background: '#fff', overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '12px 16px', fontWeight: 700, color: '#1e40af', fontFamily: 'Cairo, sans-serif' }}>
        📚 إدارة الكلمات والصور
      </div>

      {/* Form */}
      <div style={{ padding: 16, borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={S.label}>الكلمة</label>
            <input value={word} onChange={e => setWord(e.target.value)} placeholder="مثال: أسد" style={S.input} dir="rtl" />
          </div>
          <div>
            <label style={S.label}>الموضوع</label>
            <select value={topic} onChange={e => setTopic(e.target.value)} style={S.input}>
              <option value="">— بدون —</option>
              {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={S.label}>الصف الدراسي</label>
            <select value={grade} onChange={e => setGrade(Number(e.target.value))} style={S.input}>
              <option value={0}>— الكل —</option>
              {[1,2,3,4,5,6,7,8,9].map(g => <option key={g} value={g}>الصف {g}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>الصورة</label>
            <input type="file" accept="image/*" onChange={handleImgFile} style={{ ...S.input, padding: '5px 8px' }} />
          </div>
        </div>

        {imgPrev && (
          <div style={{ marginBottom: 10, textAlign: 'center' }}>
            <img src={imgPrev} alt="preview" style={{ maxHeight: 100, maxWidth: 160, objectFit: 'contain', borderRadius: 8, border: '1px solid #e2e8f0' }} />
          </div>
        )}

        {/* Audio */}
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>الصوت (اختياري)</label>
          {!audioUrl ? (
            <button
              onClick={() => recording ? stopRecording() : startRecording(url => setAudioUrl(url))}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${recording ? '#fca5a5' : '#86efac'}`, background: recording ? '#fee2e2' : '#f0fdf4', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: '.9rem' }}
            >
              {recording ? `⏹️ إيقاف التسجيل (${recSecs}ث)` : '🎙️ تسجيل صوت الكلمة'}
            </button>
          ) : (
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 8, padding: 10 }}>
              <div style={{ fontSize: '.82rem', color: '#15803d', marginBottom: 6 }}>✅ تسجيل جاهز</div>
              <audio src={audioUrl} controls style={{ width: '100%', height: 36 }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => setAudioUrl('')} style={{ ...S.btnSm, background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>🗑️ حذف</button>
                <input type="file" accept="audio/*" onChange={async e => { const f = e.target.files?.[0]; if (f) setAudioUrl(await fileToBase64(f)); }} style={{ fontSize: '.78rem' }} />
              </div>
            </div>
          )}
        </div>

        {msg && (
          <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 10, background: msg.ok ? '#f0fdf4' : '#fef2f2', color: msg.ok ? '#15803d' : '#dc2626', fontSize: '.88rem', fontFamily: 'Cairo, sans-serif' }}>
            {msg.text}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} disabled={saving} style={{ ...S.btnPrimary, flex: 1 }}>
            {saving ? '⏳ جارٍ الحفظ...' : editId ? '💾 حفظ التعديل' : '➕ إضافة'}
          </button>
          {editId && <button onClick={reset} style={{ ...S.btnSm, padding: '9px 14px' }}>إلغاء</button>}
        </div>
      </div>

      {/* List */}
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {allPairs.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontFamily: 'Cairo, sans-serif' }}>لا توجد كلمات بعد</div>
        ) : allPairs.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #f1f5f9', background: editId === p.id ? '#eff6ff' : 'transparent' }}>
            {p.image_url && (
              <img src={p.image_url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, fontFamily: 'Cairo, sans-serif', direction: 'rtl', textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{p.word_text}</div>
              <div style={{ fontSize: '.78rem', color: '#64748b' }}>{[p.topic, p.grade_level ? `ص${p.grade_level}` : '', p.audio_url ? '🔊' : ''].filter(Boolean).join(' · ')}</div>
            </div>
            <button onClick={() => startEdit(p)} style={{ ...S.btnSm, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}>✏️</button>
            <button onClick={() => handleDelete(p.id)} style={{ ...S.btnSm, background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' }}>🗑️</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────── settings panel ─────────────────────── */
function SettingsPanel({ cfg, setCfg }) {
  return (
    <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, background: '#fff', padding: 16, marginBottom: 20 }}>
      <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 12, fontFamily: 'Cairo, sans-serif' }}>⚙️ إعدادات اللعبة</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div>
          <label style={S.label}>الموضوع</label>
          <select value={cfg.topic} onChange={e => setCfg(c => ({ ...c, topic: e.target.value }))} style={S.input}>
            <option value="">— الكل —</option>
            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>الصف</label>
          <select value={cfg.grade} onChange={e => setCfg(c => ({ ...c, grade: Number(e.target.value) }))} style={S.input}>
            <option value={0}>— الكل —</option>
            {[1,2,3,4,5,6,7,8,9].map(g => <option key={g} value={g}>الصف {g}</option>)}
          </select>
        </div>
        <div>
          <label style={S.label}>عدد الأزواج ({cfg.pairsCount})</label>
          <input type="range" min={3} max={10} value={cfg.pairsCount} onChange={e => setCfg(c => ({ ...c, pairsCount: Number(e.target.value) }))} style={{ width: '100%' }} />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── game area ─────────────────────── */
function GameArea({ gamePairs, cfg, isTeacher }) {
  const containerRef  = useRef(null);
  const dragWordIdRef = useRef(null);   // id of word being dragged (ref = no re-render on move)

  const [phase,        setPhase]        = useState('idle');
  const [currentPairs, setCurrentPairs] = useState([]);
  const [wordOrder,    setWordOrder]    = useState([]);
  const [imageOrder,   setImageOrder]   = useState([]);
  const [connections,  setConnections]  = useState([]); // [{wordId, imgId, correct}]
  const [correct,      setCorrect]      = useState(new Set());
  const [shaking,      setShaking]      = useState(null);  // imgId
  const [selectedWord, setSelectedWord] = useState(null);  // wordId (click mode)
  const [dragPos,      setDragPos]      = useState(null);  // {x1,y1,x2,y2} temp line
  const [lines,        setLines]        = useState([]);    // committed SVG lines

  const pairMap = useMemo(() => {
    const m = {};
    currentPairs.forEach(p => { m[p.id] = p; });
    return m;
  }, [currentPairs]);

  /* recalculate SVG line positions from DOM */
  const recalcLines = useCallback(() => {
    if (!containerRef.current || connections.length === 0) { setLines([]); return; }
    const cRect = containerRef.current.getBoundingClientRect();
    const newLines = connections.map(c => {
      const wEl = containerRef.current.querySelector(`[data-word="${c.wordId}"]`);
      const iEl = containerRef.current.querySelector(`[data-img="${c.imgId}"]`);
      if (!wEl || !iEl) return null;
      const wR = wEl.getBoundingClientRect();
      const iR = iEl.getBoundingClientRect();
      // words are on the right (RTL), images on left — connect inner edges
      return {
        id: c.wordId,
        x1: wR.left - cRect.left,
        y1: wR.top  - cRect.top + wR.height / 2,
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

  /* done check */
  useEffect(() => {
    if (phase === 'playing' && currentPairs.length > 0 && correct.size === currentPairs.length) {
      setTimeout(() => setPhase('done'), 600);
    }
  }, [correct.size, currentPairs.length, phase]);

  const startGame = useCallback(() => {
    const count = Math.min(cfg.pairsCount, gamePairs.length);
    const sel   = shuffle(gamePairs).slice(0, count);
    const ids   = sel.map(p => p.id);
    setCurrentPairs(sel);
    setWordOrder(shuffle([...ids]));
    setImageOrder(shuffle([...ids]));
    setConnections([]);
    setCorrect(new Set());
    setSelectedWord(null);
    setDragPos(null);
    setShaking(null);
    dragWordIdRef.current = null;
    setPhase('playing');
  }, [gamePairs, cfg.pairsCount]);

  const attemptConnect = useCallback((wordId, imgId) => {
    if (correct.has(wordId)) return;
    const isCorrect = wordId === imgId;
    setConnections(prev => [
      ...prev.filter(c => c.wordId !== wordId),
      { wordId, imgId, correct: isCorrect },
    ]);
    if (isCorrect) {
      setCorrect(prev => new Set([...prev, wordId]));
      const pair = pairMap[wordId];
      if (pair) setTimeout(() => playAudio(pair.audio_url, pair.word_text), 100);
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

  /* document-level mouse/touch listeners for drag */
  useEffect(() => {
    if (phase !== 'playing') return;
    let rafId = null;

    const onMouseMove = (e) => {
      if (!dragWordIdRef.current || !containerRef.current) return;
      const cRect = containerRef.current.getBoundingClientRect();
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setDragPos(d => d ? { ...d, x2: e.clientX - cRect.left, y2: e.clientY - cRect.top } : null);
      });
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
      rafId = requestAnimationFrame(() => {
        setDragPos(d => d ? { ...d, x2: t.clientX - cRect.left, y2: t.clientY - cRect.top } : null);
      });
    };

    const onTouchEnd = (e) => {
      if (!dragWordIdRef.current) return;
      const t = e.changedTouches[0];
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const imgEl = el?.closest?.('[data-img]');
      if (imgEl) attemptConnect(dragWordIdRef.current, imgEl.dataset.img);
      else { dragWordIdRef.current = null; setDragPos(null); }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend',  onTouchEnd);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend',  onTouchEnd);
    };
  }, [phase, attemptConnect]);

  /* start drag from word item */
  const startDrag = (e, wordId) => {
    if (correct.has(wordId) || !containerRef.current) return;
    if ('touches' in e) { /* touch handled separately */ } else { e.preventDefault(); }
    const cRect = containerRef.current.getBoundingClientRect();
    const wEl   = containerRef.current.querySelector(`[data-word="${wordId}"]`);
    if (!wEl) return;
    const wR = wEl.getBoundingClientRect();
    const x1 = wR.left - cRect.left;
    const y1 = wR.top  - cRect.top + wR.height / 2;
    dragWordIdRef.current = wordId;
    setSelectedWord(null);
    setDragPos({ x1, y1, x2: x1, y2: y1 });
  };

  const startDragTouch = (e, wordId) => {
    if (correct.has(wordId) || !containerRef.current) return;
    const cRect = containerRef.current.getBoundingClientRect();
    const wEl   = containerRef.current.querySelector(`[data-word="${wordId}"]`);
    if (!wEl) return;
    const wR = wEl.getBoundingClientRect();
    dragWordIdRef.current = wordId;
    setSelectedWord(null);
    setDragPos({ x1: wR.left - cRect.left, y1: wR.top - cRect.top + wR.height / 2, x2: e.touches[0].clientX - cRect.left, y2: e.touches[0].clientY - cRect.top });
  };

  const handleWordClick = (wordId) => {
    if (correct.has(wordId) || dragWordIdRef.current) return;
    setSelectedWord(prev => prev === wordId ? null : wordId);
  };

  const handleImageClick = (imgId) => {
    if (dragWordIdRef.current) return;
    if (!selectedWord) return;
    attemptConnect(selectedWord, imgId);
  };

  /* ── idle / done screens ── */
  if (phase === 'idle') {
    const canStart = gamePairs.length >= (isTeacher ? 1 : 3);
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🖼️</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'Cairo, sans-serif', color: '#1e3a5f', marginBottom: 8 }}>
          صِل الكلمة بصورتها
        </div>
        <div style={{ color: '#64748b', fontFamily: 'Cairo, sans-serif', marginBottom: 24, fontSize: '.95rem' }}>
          وصّل كل كلمة بالصورة المناسبة لها
        </div>
        {gamePairs.length === 0 ? (
          <div style={{ background: '#fef9c3', border: '1.5px solid #fde68a', borderRadius: 12, padding: '14px 20px', fontFamily: 'Cairo, sans-serif', color: '#92400e' }}>
            {isTeacher ? '⚠️ لا توجد كلمات بعد — أضف كلمات من لوحة الإدارة أدناه.' : '⚠️ لا توجد كلمات متاحة حاليًا.'}
          </div>
        ) : !canStart ? (
          <div style={{ background: '#fef9c3', border: '1.5px solid #fde68a', borderRadius: 12, padding: '14px 20px', fontFamily: 'Cairo, sans-serif', color: '#92400e' }}>
            يجب إضافة 3 كلمات على الأقل لبدء اللعبة.
          </div>
        ) : (
          <button onClick={startGame} style={{ ...S.btnPrimary, fontSize: '1.05rem', padding: '12px 36px', borderRadius: 12 }}>
            🚀 ابدأ اللعبة
          </button>
        )}
        {gamePairs.length > 0 && (
          <div style={{ color: '#94a3b8', fontSize: '.82rem', marginTop: 10, fontFamily: 'Cairo, sans-serif' }}>
            {gamePairs.length} كلمة متاحة
          </div>
        )}
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'Cairo, sans-serif', color: '#15803d', marginBottom: 8 }}>
          أحسنت! وصّلت كل الكلمات بصورها
        </div>
        <div style={{ color: '#64748b', fontFamily: 'Cairo, sans-serif', marginBottom: 24 }}>
          لقد أجبت على {currentPairs.length} أزواج بشكل صحيح
        </div>
        <button onClick={startGame} style={{ ...S.btnPrimary, fontSize: '1rem', padding: '11px 28px', borderRadius: 12 }}>
          🔄 جولة جديدة
        </button>
      </div>
    );
  }

  /* ── playing ── */
  const imgIsCorrect = (imgId) => connections.some(c => c.imgId === imgId && c.correct);

  return (
    <div>
      {/* progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, fontFamily: 'Cairo, sans-serif', direction: 'rtl' }}>
        <span style={{ fontSize: '.9rem', color: '#64748b' }}>
          ✅ {correct.size} / {currentPairs.length}
        </span>
        <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 9, margin: '0 12px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#22c55e', borderRadius: 9, width: `${(correct.size / currentPairs.length) * 100}%`, transition: 'width .4s' }} />
        </div>
        <button onClick={() => setPhase('idle')} style={{ ...S.btnSm, fontSize: '.78rem' }}>✕ إنهاء</button>
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}15%{transform:translateX(-8px)}30%{transform:translateX(8px)}
          45%{transform:translateX(-6px)}60%{transform:translateX(6px)}75%{transform:translateX(-3px)}90%{transform:translateX(3px)}
        }
        @keyframes popIn {
          0%{transform:scale(.8);opacity:0}100%{transform:scale(1);opacity:1}
        }
      `}</style>

      {/* main two-column layout */}
      <div ref={containerRef} style={{ position: 'relative', minHeight: 200 }}>
        {/* SVG line overlay */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible', zIndex: 5 }}>
          {lines.map(l => (
            <g key={l.id}>
              {/* shadow for contrast */}
              <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#fff" strokeWidth={5} strokeLinecap="round" />
              <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke={l.correct ? '#22c55e' : '#94a3b8'}
                strokeWidth={3} strokeLinecap="round"
              />
            </g>
          ))}
          {dragPos && (
            <g>
              <line x1={dragPos.x1} y1={dragPos.y1} x2={dragPos.x2} y2={dragPos.y2} stroke="#fff" strokeWidth={5} strokeLinecap="round" />
              <line x1={dragPos.x1} y1={dragPos.y1} x2={dragPos.x2} y2={dragPos.y2}
                stroke="#60a5fa" strokeWidth={3} strokeLinecap="round" strokeDasharray="7 4"
              />
            </g>
          )}
        </svg>

        {/* columns — RTL: words right, images left */}
        <div style={{ display: 'flex', direction: 'rtl', gap: 0, alignItems: 'flex-start' }}>

          {/* WORDS column (right in RTL) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
            {wordOrder.map(wordId => {
              const pair      = pairMap[wordId];
              const isCorrect = correct.has(wordId);
              const isSelected = selectedWord === wordId;
              if (!pair) return null;
              return (
                <div
                  key={wordId}
                  data-word={wordId}
                  onMouseDown={e => startDrag(e, wordId)}
                  onTouchStart={e => startDragTouch(e, wordId)}
                  onClick={() => handleWordClick(wordId)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 8, padding: '0 14px', borderRadius: 10,
                    border: `2px solid ${isCorrect ? '#22c55e' : isSelected ? '#3b82f6' : '#d1d5db'}`,
                    background: isCorrect ? '#f0fdf4' : isSelected ? '#eff6ff' : '#fff',
                    cursor: isCorrect ? 'default' : 'grab',
                    userSelect: 'none', touchAction: 'none',
                    fontFamily: 'Cairo, sans-serif', fontSize: '1.1rem', fontWeight: 600,
                    animation: 'popIn .25s',
                    transition: 'border-color .2s, background .2s',
                    height: 90,
                  }}
                >
                  <span>{pair.word_text}</span>
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); playAudio(pair.audio_url, pair.word_text); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '2px 4px', flexShrink: 0, lineHeight: 1 }}
                    title="استمع"
                  >🔊</button>
                </div>
              );
            })}
          </div>

          {/* spacer (where lines pass through) */}
          <div style={{ width: 56, flexShrink: 0 }} />

          {/* IMAGES column (left in RTL) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 4 }}>
            {imageOrder.map(imgId => {
              const pair      = pairMap[imgId];
              const isCor     = imgIsCorrect(imgId);
              const isShake   = shaking === imgId;
              const isSel     = selectedWord !== null && !isCor;
              if (!pair) return null;
              return (
                <div
                  key={imgId}
                  data-img={imgId}
                  onClick={() => handleImageClick(imgId)}
                  style={{
                    borderRadius: 10,
                    border: `2px solid ${isCor ? '#22c55e' : isSel ? '#93c5fd' : '#d1d5db'}`,
                    background: isCor ? '#f0fdf4' : isSel ? '#eff6ff' : '#fff',
                    padding: '6px 8px', cursor: isCor ? 'default' : 'pointer',
                    animation: isShake ? 'shake .55s' : 'popIn .25s',
                    userSelect: 'none', touchAction: 'none',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    height: 90,
                    transition: 'border-color .2s, background .2s',
                  }}
                >
                  {pair.image_url ? (
                    <img
                      src={pair.image_url} alt=""
                      style={{ width: '100%', maxWidth: 110, height: 70, objectFit: 'contain', borderRadius: 6, display: 'block', pointerEvents: 'none' }}
                    />
                  ) : (
                    <div style={{ width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#94a3b8' }}>❓</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* hint for click mode */}
      {selectedWord && (
        <div style={{ textAlign: 'center', marginTop: 12, fontFamily: 'Cairo, sans-serif', fontSize: '.88rem', color: '#3b82f6' }}>
          اختر الصورة المناسبة لـ «{pairMap[selectedWord]?.word_text}»
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── shared styles ─────────────────────── */
const S = {
  label:      { display: 'block', fontSize: '.8rem', fontWeight: 600, color: '#475569', marginBottom: 4, fontFamily: 'Cairo, sans-serif' },
  input:      { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #d1d5db', fontFamily: 'Cairo, sans-serif', fontSize: '.9rem', boxSizing: 'border-box', direction: 'rtl' },
  btnPrimary: { background: '#1e40af', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: '.9rem' },
  btnSm:      { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontFamily: 'Cairo, sans-serif', fontSize: '.82rem' },
};

/* ─────────────────────── main page ─────────────────────── */
export default function WordImageMatchPage() {
  const [isTeacher,  setIsTeacher]  = useState(false);
  const [allPairs,   setAllPairs]   = useState([]);
  const [gamePairs,  setGamePairs]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showMgr,    setShowMgr]    = useState(false);
  const [showCfg,    setShowCfg]    = useState(false);
  const [cfg,        setCfg]        = useState({ topic: '', grade: 0, pairsCount: 6 });

  /* role detection */
  useEffect(() => {
    import('../../../../lib/supabase').then(({ createClient }) => {
      const sb = createClient();
      sb.auth.getUser().then(({ data: { user } }) => {
        const role = user?.user_metadata?.role ?? '';
        setIsTeacher(['super_admin', 'admin', 'teacher'].includes(role));
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  /* load all pairs (teacher only) */
  const loadAllPairs = useCallback(async () => {
    if (!isTeacher) return;
    const res  = await fetch('/api/games/word-image-match');
    const json = await res.json().catch(() => ({ pairs: [] }));
    setAllPairs(json.pairs || []);
  }, [isTeacher]);

  /* load game pairs with filters */
  const loadGamePairs = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (cfg.topic)   p.set('topic', cfg.topic);
    if (cfg.grade > 0) p.set('grade', String(cfg.grade));
    const res  = await fetch(`/api/games/word-image-match?${p}`);
    const json = await res.json().catch(() => ({ pairs: [] }));
    setGamePairs(json.pairs || []);
    setLoading(false);
  }, [cfg.topic, cfg.grade]);

  useEffect(() => { loadAllPairs(); },  [loadAllPairs]);
  useEffect(() => { loadGamePairs(); }, [loadGamePairs]);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { background: #f8fafc; }
        @media (max-width: 540px) {
          .wim-cols { gap: 0 !important; }
          .wim-cols [data-word] { font-size: .95rem !important; height: 72px !important; }
          .wim-cols [data-img]  { height: 72px !important; }
          .wim-spacer { width: 36px !important; }
        }
      `}</style>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 12px', fontFamily: 'Cairo, sans-serif' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, direction: 'rtl' }}>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e3a5f' }}>🖼️ صِل الكلمة بصورتها</div>
            <div style={{ fontSize: '.82rem', color: '#64748b', marginTop: 2 }}>وصّل كل كلمة بالصورة المناسبة لها</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isTeacher && (
              <>
                <button onClick={() => setShowCfg(s => !s)} style={{ ...S.btnSm, color: showCfg ? '#1e40af' : undefined }}>⚙️ إعدادات</button>
                <button onClick={() => setShowMgr(s => !s)} style={{ ...S.btnSm, color: showMgr ? '#1e40af' : undefined }}>📚 إدارة</button>
              </>
            )}
            <Link href="/library" style={{ ...S.btnSm, textDecoration: 'none', color: '#475569' }}>← المكتبة</Link>
          </div>
        </div>

        {isTeacher && showCfg && (
          <SettingsPanel cfg={cfg} setCfg={c => { setCfg(c); }} />
        )}

        {isTeacher && showMgr && (
          <PairManager allPairs={allPairs} onRefresh={() => { loadAllPairs(); loadGamePairs(); }} />
        )}

        {/* game card */}
        <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '20px 16px', boxShadow: '0 2px 12px rgba(0,0,0,.06)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>⏳ جارٍ التحميل...</div>
          ) : (
            <GameArea gamePairs={gamePairs} cfg={cfg} isTeacher={isTeacher} key={`${cfg.topic}-${cfg.grade}-${cfg.pairsCount}`} />
          )}
        </div>
      </div>
    </>
  );
}
