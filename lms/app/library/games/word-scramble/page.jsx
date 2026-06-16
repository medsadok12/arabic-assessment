'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

/* ────────────────────────── helpers ────────────────────────── */

// Split Arabic word into letter+diacritic chunks so harakat stay with their letter
const DIAC = /[ً-ٰٟ]/;
function splitArabicLetters(word) {
  const chunks = [];
  for (let i = 0; i < word.length; i++) {
    let ch = word[i];
    while (i + 1 < word.length && DIAC.test(word[i + 1])) { i++; ch += word[i]; }
    chunks.push(ch);
  }
  return chunks;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Shuffle chunks — guaranteed to differ from original order
function scramble(chunks) {
  if (chunks.length <= 1) return [...chunks];
  const orig = chunks.map(c => c.ch).join('');
  let res; let tries = 0;
  do { res = shuffle([...chunks]); tries++; }
  while (res.map(c => c.ch).join('') === orig && tries < 60);
  return res;
}

function speak(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ar-SA'; u.rate = 0.82;
  function go() {
    const voices = window.speechSynthesis.getVoices();
    const ar = voices.find(v => v.lang.startsWith('ar'));
    if (ar) u.voice = ar;
    window.speechSynthesis.speak(u);
  }
  if (window.speechSynthesis.getVoices().length > 0) go();
  else { window.speechSynthesis.addEventListener('voiceschanged', go, { once: true }); setTimeout(go, 500); }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const TOPICS = ['الحيوانات', 'الأشكال', 'الأسرة', 'الألوان', 'الفواكه', 'المدرسة', 'الطقس', 'الأرقام'];

/* ────────────────────── image with fallback ─────────────────── */
function WordImage({ imageUrl, emoji }) {
  const [err, setErr] = useState(false);
  if (!imageUrl || err) return <div style={S.emojiBox}>{emoji || '❓'}</div>;
  return <img src={imageUrl} alt="" style={S.wordImg} onError={() => setErr(true)} />;
}

/* ─────────────────── word manager (teacher CRUD) ────────────── */
function WordManager({ dbWords, onRefresh }) {
  const [word,      setWord]      = useState('');
  const [topic,     setTopic]     = useState('');
  const [grade,     setGrade]     = useState(0);
  const [imgFile,   setImgFile]   = useState(null);
  const [imgPrev,   setImgPrev]   = useState(null);
  const [audioUrl,  setAudioUrl]  = useState(null);
  const [recording, setRecording] = useState(false);
  const [recSecs,   setRecSecs]   = useState(0);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(null);
  const [editId,    setEditId]    = useState(null);
  const [msg,       setMsg]       = useState(null);
  const fileRef  = useRef();
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const resetForm = () => {
    setWord(''); setTopic(''); setGrade(0);
    setImgFile(null); setImgPrev(null); setAudioUrl(null);
    setEditId(null); setMsg(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const startEdit = (w) => {
    setEditId(w.id);
    setWord(w.word || '');
    setTopic(w.topic || '');
    setGrade(w.grade_level || 0);
    setImgPrev(w.image_url || null);
    setAudioUrl(w.audio_url || null);
    setImgFile(null); setMsg(null);
  };

  const handleImg = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImgFile(f);
    setImgPrev(URL.createObjectURL(f));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => setAudioUrl(reader.result);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRef.current = mr;
      mr.start();
      setRecording(true); setRecSecs(0);
      timerRef.current = setInterval(() => setRecSecs(s => s + 1), 1000);
    } catch {
      alert('تعذّر الوصول إلى الميكروفون — تأكد من منح الإذن');
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    mediaRef.current?.stop();
    setRecording(false);
  };

  const handleSave = async () => {
    if (!word.trim()) { setMsg({ ok: false, text: 'اكتب الكلمة أولاً' }); return; }
    setSaving(true); setMsg(null);
    try {
      let image_url = (imgPrev && !imgFile) ? imgPrev : null;
      if (imgFile) image_url = await fileToBase64(imgFile);

      const body = {
        word: word.trim(), topic: topic || null,
        grade_level: grade > 0 ? grade : null,
        image_url, audio_url: audioUrl || null, emoji: null,
      };
      const url    = editId ? `/api/games/word-scramble?id=${editId}` : '/api/games/word-scramble';
      const method = editId ? 'PUT' : 'POST';

      const res  = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'فشل الحفظ');
      setMsg({ ok: true, text: editId ? `✅ تم تعديل "${word.trim()}"` : `✅ أُضيفت "${word.trim()}" بنجاح` });
      resetForm(); onRefresh();
    } catch (e) {
      setMsg({ ok: false, text: `❌ ${e.message}` });
    }
    setSaving(false);
  };

  const handleDelete = async (id, w) => {
    if (!confirm(`حذف كلمة "${w}"؟`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/games/word-scramble?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onRefresh();
    } catch { alert('فشل الحذف'); }
    setDeleting(null);
  };

  return (
    <div>
      <div style={{ background: '#f5f3ff', borderRadius: 14, padding: 16, marginBottom: 18, border: '1.5px dashed #7c3aed' }}>
        <div style={{ fontWeight: 800, color: '#7c3aed', marginBottom: 12, fontSize: '.92rem' }}>
          {editId ? '✏️ تعديل الكلمة' : '➕ إضافة كلمة جديدة'}
        </div>

        <input value={word} onChange={e => setWord(e.target.value)}
          placeholder="الكلمة مع التشكيل (مثال: مَدْرَسَة)"
          style={S.input} dir="rtl" />

        <button type="button"
          onClick={() => word.trim() && speak(word.trim())}
          style={{ marginTop: 6, background: '#ede9fe', border: 'none', borderRadius: 10,
            padding: '6px 14px', cursor: 'pointer', fontSize: '.85rem', fontWeight: 700,
            color: '#7c3aed', fontFamily: "'Tajawal', sans-serif" }}>
          🔊 استمع للكلمة
        </button>

        {/* image picker */}
        <div onClick={() => fileRef.current?.click()}
          style={{
            marginTop: 8, borderRadius: 12, border: '2px dashed #c4b5fd', background: '#faf5ff',
            cursor: 'pointer', overflow: 'hidden', display: 'flex', alignItems: 'center',
            justifyContent: 'center', height: imgPrev ? 'auto' : 72, minHeight: 72,
          }}>
          {imgPrev
            ? <img src={imgPrev} alt="preview" style={{ width: '100%', maxHeight: 140, objectFit: 'contain', display: 'block' }} />
            : <span style={{ color: '#a78bfa', fontSize: '.85rem', fontWeight: 700 }}>📷 انقر لاختيار صورة الكلمة</span>
          }
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} style={{ display: 'none' }} />

        {/* audio recorder */}
        <div style={{ marginTop: 8 }}>
          {!audioUrl ? (
            <button type="button" onClick={recording ? stopRecording : startRecording}
              style={{
                width: '100%', border: 'none', borderRadius: 10, padding: '11px',
                fontSize: '.88rem', fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Tajawal', sans-serif",
                background: recording ? '#fee2e2' : '#f0fdf4',
                color:      recording ? '#dc2626' : '#16a34a',
              }}>
              {recording ? `⏹️ إيقاف التسجيل (${recSecs}ث)` : '🎙️ تسجيل صوت الكلمة (اختياري)'}
            </button>
          ) : (
            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 10, border: '1.5px solid #86efac' }}>
              <div style={{ fontSize: '.78rem', color: '#16a34a', fontWeight: 700, marginBottom: 6, textAlign: 'right' }}>
                ✅ التسجيل جاهز — سيُحفظ مع الكلمة
              </div>
              <audio src={audioUrl} controls style={{ width: '100%', height: 36, display: 'block', borderRadius: 6 }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" onClick={recording ? stopRecording : startRecording}
                  style={{ flex: 1, border: 'none', borderRadius: 8, padding: '7px', fontSize: '.8rem',
                    fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif",
                    background: recording ? '#fee2e2' : '#ede9fe',
                    color:      recording ? '#dc2626' : '#7c3aed' }}>
                  {recording ? `⏹️ إيقاف (${recSecs}ث)` : '🔄 إعادة التسجيل'}
                </button>
                <button type="button" onClick={() => setAudioUrl(null)}
                  style={{ border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: '.8rem',
                    fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif",
                    background: '#fee2e2', color: '#dc2626' }}>
                  🗑️ حذف
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <select value={topic} onChange={e => setTopic(e.target.value)}
            style={{ ...S.input, flex: 1, marginTop: 0 }} dir="rtl">
            <option value=''>بدون موضوع</option>
            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={grade} onChange={e => setGrade(Number(e.target.value))}
            style={{ ...S.input, flex: 1, marginTop: 0 }} dir="rtl">
            <option value={0}>كل الصفوف</option>
            {[1,2,3,4,5,6].map(g => <option key={g} value={g}>الصف {g}</option>)}
          </select>
        </div>

        {msg && (
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 8, fontSize: '.85rem', fontWeight: 700,
            background: msg.ok ? '#d4edda' : '#f8d7da',
            color: msg.ok ? '#155724' : '#721c24',
          }}>
            {msg.text}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {editId && (
            <button onClick={resetForm}
              style={{ flex: 1, background: '#f3f4f6', color: '#374151', border: 'none',
                borderRadius: 10, padding: '11px 0', fontSize: '.9rem', fontWeight: 700,
                fontFamily: "'Tajawal', sans-serif", cursor: 'pointer' }}>
              إلغاء
            </button>
          )}
          <button onClick={handleSave} disabled={saving || !word.trim()}
            style={{
              flex: 2, background: 'linear-gradient(135deg,#5b4fc4,#7c3aed)', color: '#fff',
              border: 'none', borderRadius: 10, padding: '11px 0', fontSize: '.9rem', fontWeight: 700,
              cursor: (saving || !word.trim()) ? 'not-allowed' : 'pointer',
              fontFamily: "'Tajawal', sans-serif",
              opacity: (saving || !word.trim()) ? 0.6 : 1,
            }}>
            {saving ? 'جارٍ الحفظ…' : editId ? '✏️ حفظ التعديلات' : '💾 حفظ في قاعدة البيانات'}
          </button>
        </div>
      </div>

      <div style={{ fontWeight: 700, color: '#374151', marginBottom: 8, fontSize: '.88rem' }}>
        📚 الكلمات في قاعدة البيانات ({dbWords.length})
      </div>
      {dbWords.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '16px 0', fontSize: '.88rem' }}>
          لا توجد كلمات بعد — أضف أولى كلماتك أعلاه
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
          {dbWords.map(w => (
            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', borderRadius: 10, padding: '8px 12px', border: '1px solid #e5e7eb' }}>
              {w.image_url && <img src={w.image_url} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />}
              <span style={{ flex: 1, fontWeight: 700, color: '#1f2937', fontSize: '.9rem' }}>{w.word}</span>
              {w.topic && <span style={{ background: '#e0f2fe', color: '#0369a1', borderRadius: 20, padding: '2px 8px', fontSize: '.7rem', fontWeight: 700 }}>{w.topic}</span>}
              {w.grade_level && <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 20, padding: '2px 8px', fontSize: '.7rem', fontWeight: 700 }}>ص{w.grade_level}</span>}
              {w.audio_url && <span title="يحتوي على تسجيل" style={{ fontSize: '.75rem' }}>🎙️</span>}
              <button onClick={() => w.audio_url ? new Audio(w.audio_url).play() : speak(w.word)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '2px 4px', lineHeight: 1 }}>🔊</button>
              <button onClick={() => startEdit(w)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '2px 4px', color: '#7c3aed', lineHeight: 1 }}>✏️</button>
              <button onClick={() => handleDelete(w.id, w.word)} disabled={deleting === w.id}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1.05rem', padding: '2px 4px', lineHeight: 1 }}>
                {deleting === w.id ? '…' : '🗑️'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────── settings panel ─────────────────────────── */
function SettingsPanel({ cfg, onChange, onClose, dbWords, onRefresh }) {
  const [tab, setTab] = useState('settings');
  const tabStyle = (id) => ({
    flex: 1, padding: '9px 0', border: 'none', borderRadius: 10,
    fontFamily: "'Tajawal', sans-serif", fontWeight: 700, fontSize: '.88rem',
    cursor: 'pointer', transition: 'all .15s',
    background: tab === id ? 'linear-gradient(135deg,#5b4fc4,#7c3aed)' : '#f3f4f6',
    color: tab === id ? '#fff' : '#6b7280',
  });

  return (
    <div style={S.settingsOverlay} onClick={onClose}>
      <div style={S.settingsCard} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: '#1f2937', fontSize: '1.1rem' }}>⚙️ إعدادات اللعبة</h3>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          <button style={tabStyle('settings')} onClick={() => setTab('settings')}>⚙️ الإعدادات</button>
          <button style={tabStyle('words')}    onClick={() => setTab('words')}>📖 الكلمات ({dbWords.length})</button>
        </div>

        {tab === 'settings' && (
          <>
            <label style={S.settingsLabel}>
              عدد الأسئلة في الجولة
              <input type="number" min={1} value={cfg.questionsPerRound}
                onChange={e => onChange({ ...cfg, questionsPerRound: Math.max(1, Number(e.target.value) || 1) })}
                style={S.settingsSelect} />
            </label>
            <label style={S.settingsLabel}>
              الموضوع
              <select value={cfg.topic} onChange={e => onChange({ ...cfg, topic: e.target.value })} style={S.settingsSelect}>
                <option value=''>كل المواضيع</option>
                {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label style={S.settingsLabel}>
              الصف الدراسي
              <select value={cfg.grade} onChange={e => onChange({ ...cfg, grade: Number(e.target.value) })} style={S.settingsSelect}>
                <option value={0}>كل الصفوف</option>
                {[1,2,3,4,5,6].map(g => <option key={g} value={g}>الصف {g}</option>)}
              </select>
            </label>
            <label style={S.settingsLabel}>
              طول الكلمة: {cfg.minLen} – {cfg.maxLen} حرفاً
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '.75rem', color: '#9ca3af', marginBottom: 4, textAlign: 'center' }}>أدنى: {cfg.minLen}</div>
                  <input type="range" min={2} max={cfg.maxLen} value={cfg.minLen}
                    onChange={e => onChange({ ...cfg, minLen: Number(e.target.value) })}
                    style={{ width: '100%', accentColor: '#7c3aed' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '.75rem', color: '#9ca3af', marginBottom: 4, textAlign: 'center' }}>أقصى: {cfg.maxLen}</div>
                  <input type="range" min={cfg.minLen} max={12} value={cfg.maxLen}
                    onChange={e => onChange({ ...cfg, maxLen: Number(e.target.value) })}
                    style={{ width: '100%', accentColor: '#7c3aed' }} />
                </div>
              </div>
            </label>
            <button style={S.btnGold} onClick={onClose}>حفظ الإعدادات ✓</button>
          </>
        )}
        {tab === 'words' && <WordManager dbWords={dbWords} onRefresh={onRefresh} />}
      </div>
    </div>
  );
}

/* ═══════════════════════ MAIN COMPONENT ════════════════════════ */
export default function WordScrambleGame() {
  const [phase,     setPhase]     = useState('start');
  const [dbWords,   setDbWords]   = useState([]);
  const [gameWords, setGameWords] = useState([]);
  const [queue,     setQueue]     = useState([]);
  const [cur,       setCur]       = useState(0);
  const [score,     setScore]     = useState(0);
  const [answer,    setAnswer]    = useState([]);    // chunk|null per slot
  const [available, setAvailable] = useState([]);   // remaining chunks
  const [result,    setResult]    = useState(null); // null|'correct'|'wrong'
  const [showCfg,   setShowCfg]   = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [cfg, setCfg] = useState({
    questionsPerRound: 10,
    topic: '',
    grade: 0,
    minLen: 2,
    maxLen: 12,
  });

  // Detect teacher/admin role
  useEffect(() => {
    import('../../../../lib/supabase').then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        const role = user?.user_metadata?.role ?? '';
        setIsTeacher(['super_admin', 'admin', 'teacher'].includes(role));
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const isValid = w => w.word && w.word.length >= 2;

  // Load all words (teacher word manager)
  const loadWords = useCallback(async () => {
    if (!isTeacher) return;
    try {
      const res  = await fetch('/api/games/word-scramble');
      const json = await res.json();
      setDbWords((json.words || []).filter(isValid));
    } catch { setDbWords([]); }
  }, [isTeacher]);

  // Load filtered game words from API
  const loadGameWords = useCallback(async () => {
    try {
      const p = new URLSearchParams();
      if (cfg.topic)    p.set('topic',  cfg.topic);
      if (cfg.grade > 0) p.set('grade', String(cfg.grade));
      p.set('minLen', String(cfg.minLen));
      p.set('maxLen', String(cfg.maxLen));
      const res  = await fetch(`/api/games/word-scramble?${p}`);
      const json = await res.json();
      setGameWords((json.words || []).filter(isValid));
    } catch { setGameWords([]); }
  }, [cfg]);

  useEffect(() => { loadWords();     }, [loadWords]);
  useEffect(() => { loadGameWords(); }, [loadGameWords]);

  // Build round queue: add chunks + scrambled arrays per word
  const buildQueue = useCallback((words, count) => {
    return shuffle(words).slice(0, count).map(w => {
      const chunks   = splitArabicLetters(w.word).map((ch, i) => ({ ch, id: i }));
      const scrambled = scramble(chunks);
      return { ...w, chunks, scrambled };
    });
  }, []);

  // Start game
  const startGame = useCallback(() => {
    if (gameWords.length === 0) return;
    const count = isTeacher ? cfg.questionsPerRound : Math.min(gameWords.length, 20);
    if (gameWords.length < count) return;
    const q = buildQueue(gameWords, count);
    setQueue(q);
    setCur(0);
    setScore(0);
    setAnswer(q[0].chunks.map(() => null));
    setAvailable([...q[0].scrambled]);
    setResult(null);
    setPhase('playing');
  }, [gameWords, buildQueue, cfg, isTeacher]);

  // Click letter in bottom → place in next empty answer slot
  const placeInAnswer = useCallback((availIdx) => {
    if (result !== null) return;
    const chunk      = available[availIdx];
    const firstEmpty = answer.findIndex(a => a === null);
    if (firstEmpty === -1) return;

    const newAnswer    = [...answer];
    newAnswer[firstEmpty] = chunk;
    const newAvailable = available.filter((_, i) => i !== availIdx);

    setAnswer(newAnswer);
    setAvailable(newAvailable);

    if (newAnswer.every(a => a !== null)) {
      const w      = queue[cur];
      const isRight = newAnswer.map(a => a.ch).join('') === w.chunks.map(c => c.ch).join('');
      setResult(isRight ? 'correct' : 'wrong');
      if (isRight) {
        setScore(s => s + 1);
        if (w.audio_url) { try { new Audio(w.audio_url).play(); } catch {} }
        else speak(w.word);
      }
    }
  }, [answer, available, result, queue, cur]);

  // Click placed letter → return to available pool
  const removeFromAnswer = useCallback((slotIdx) => {
    if (result !== null) return;
    const chunk = answer[slotIdx];
    if (!chunk) return;
    const newAnswer = [...answer];
    newAnswer[slotIdx] = null;
    setAnswer(newAnswer);
    setAvailable([...available, chunk]);
  }, [answer, available, result]);

  // Auto-reset after wrong answer
  useEffect(() => {
    if (result !== 'wrong') return;
    const w = queue[cur];
    const t = setTimeout(() => {
      if (w) { setAnswer(w.chunks.map(() => null)); setAvailable([...w.scrambled]); }
      setResult(null);
    }, 1200);
    return () => clearTimeout(t);
  }, [result, queue, cur]);

  // Advance to next word
  const nextWord = useCallback(() => {
    const n = cur + 1;
    if (n >= queue.length) { setPhase('finished'); return; }
    setCur(n);
    setAnswer(queue[n].chunks.map(() => null));
    setAvailable([...queue[n].scrambled]);
    setResult(null);
  }, [cur, queue]);

  const restart = useCallback(() => {
    setPhase('start');
    setQueue([]); setCur(0); setScore(0);
    setAnswer([]); setAvailable([]); setResult(null);
  }, []);

  const notEnough = isTeacher && gameWords.length > 0 && gameWords.length < cfg.questionsPerRound;

  /* ══════ RENDER: START ══════ */
  if (phase === 'start') {
    return (
      <div style={S.page}>
        {isTeacher && showCfg && (
          <SettingsPanel cfg={cfg} onChange={setCfg}
            onClose={() => setShowCfg(false)}
            dbWords={dbWords} onRefresh={loadWords} />
        )}
        <div style={S.centerCard}>
          {isTeacher && (
            <button style={S.cfgBtn} onClick={() => setShowCfg(true)}>⚙️ الإعدادات</button>
          )}
          <div style={{ fontSize: '4.5rem', lineHeight: 1 }}>🔡</div>
          <h1 style={S.mainTitle}>رتّب الكلمة!</h1>
          <p style={S.sub}>
            حروف الكلمة مبعثرة أمامك.<br />
            انقر عليها بالترتيب الصحيح من اليمين لليسار!
          </p>

          {isTeacher ? (
            gameWords.length === 0 ? (
              <div style={S.emptyState}>
                <div style={{ fontSize: '3rem' }}>📭</div>
                <p style={{ color: '#374151', fontSize: '.97rem', fontWeight: 700, lineHeight: 1.9, margin: 0, textAlign: 'center' }}>
                  عذراً، لا توجد كلمات مضافة في قاعدة البيانات تطابق هذه الإعدادات.<br />
                  يرجى إضافة كلمات جديدة أولاً.
                </p>
                <button style={S.btnOutline} onClick={() => setShowCfg(true)}>⚙️ إضافة كلمات أو تعديل الإعدادات</button>
              </div>
            ) : notEnough ? (
              <>
                <div style={S.statsRow}>
                  <div style={S.statBox}><span style={{ ...S.statNum, color: '#e74c3c' }}>{gameWords.length}</span><span style={S.statLbl}>كلمة متاحة</span></div>
                  <div style={S.statDiv} />
                  <div style={S.statBox}><span style={S.statNum}>{cfg.questionsPerRound}</span><span style={S.statLbl}>سؤال مطلوب</span></div>
                </div>
                <div style={S.warningBanner}>
                  عذراً، لا توجد كلمات كافية مضافة في قاعدة البيانات تطابق هذه الإعدادات. يرجى إضافة كلمات جديدة أو تعديل خيارات اللعبة لبدء التحدي.
                </div>
                <button style={{ ...S.btnGold, opacity: 0.4, cursor: 'not-allowed' }} disabled>🚀 ابدأ اللعبة</button>
              </>
            ) : (
              <>
                <div style={S.statsRow}>
                  <div style={S.statBox}><span style={S.statNum}>{gameWords.length}</span><span style={S.statLbl}>كلمة متاحة</span></div>
                  <div style={S.statDiv} />
                  <div style={S.statBox}><span style={S.statNum}>{cfg.questionsPerRound}</span><span style={S.statLbl}>سؤال في الجولة</span></div>
                </div>
                <button style={S.btnGold} onClick={startGame}>🚀 ابدأ اللعبة</button>
              </>
            )
          ) : (
            gameWords.length > 0 ? (
              <>
                <div style={S.statsRow}>
                  <div style={S.statBox}><span style={S.statNum}>{Math.min(gameWords.length, 20)}</span><span style={S.statLbl}>كلمة</span></div>
                </div>
                <button style={S.btnGold} onClick={startGame}>🚀 ابدأ اللعبة</button>
              </>
            ) : (
              <div style={S.emptyState}>
                <div style={{ fontSize: '3rem' }}>🔒</div>
                <p style={{ color: '#374151', fontSize: '.97rem', fontWeight: 700, lineHeight: 1.9, margin: 0, textAlign: 'center' }}>
                  اللعبة غير متاحة حالياً.<br />
                  تواصل مع معلمك لإعداد الكلمات.
                </p>
              </div>
            )
          )}

          <Link href="/library" style={S.backLink}>← العودة للمكتبة</Link>
        </div>
      </div>
    );
  }

  /* ══════ RENDER: FINISHED ══════ */
  if (phase === 'finished') {
    const pct   = Math.round((score / queue.length) * 100);
    const stars = pct >= 80 ? 3 : pct >= 50 ? 2 : 1;
    const msg   = pct >= 80
      ? 'ممتاز! أنت بطل ترتيب الحروف 🏆'
      : pct >= 50 ? 'جيد! تستطيع أن تتحسن أكثر 💪'
      : 'لا تيأس! المحاولة مفتاح النجاح 🌟';
    return (
      <div style={S.page}>
        <div style={S.centerCard}>
          <div style={{ fontSize: '3rem' }}>{'⭐'.repeat(stars)}</div>
          <h2 style={S.mainTitle}>أحسنت!</h2>
          <div style={{ fontSize: '3.5rem', fontWeight: 800, color: '#F5A623' }}>{score} / {queue.length}</div>
          <p style={S.sub}>{msg}</p>
          <button style={S.btnGold} onClick={restart}>🔄 العب مرة أخرى</button>
          <Link href="/library" style={S.backLink}>← العودة للمكتبة</Link>
        </div>
      </div>
    );
  }

  /* ══════ RENDER: PLAYING ══════ */
  const w      = queue[cur];
  const isLast = cur + 1 >= queue.length;

  return (
    <div style={S.page}>
      <div style={S.headerRow}>
        <span style={S.scoreBadge}>✨ {score}</span>
        <div style={S.bar}>
          <div style={{ ...S.barFill, width: `${((cur + 1) / queue.length) * 100}%` }} />
        </div>
        <span style={S.barLabel}>{cur + 1} / {queue.length}</span>
      </div>

      <div style={S.card}>
        <WordImage imageUrl={w.image_url} emoji={w.emoji} />

        {/* Answer slots — RTL: slot[0] is rightmost (first Arabic letter) */}
        <div style={S.answerRow}>
          {answer.map((chunk, i) => (
            <div key={i}
              style={{
                ...S.answerSlot,
                background:  result === 'correct' ? '#d4edda' : result === 'wrong' ? '#f8d7da' : chunk ? '#ede9fe' : '#f5f3ff',
                borderColor: result === 'correct' ? '#27ae60' : result === 'wrong' ? '#e74c3c' : chunk ? '#7c3aed' : '#c4b5fd',
                cursor: chunk && result === null ? 'pointer' : 'default',
              }}
              onClick={() => chunk && result === null && removeFromAnswer(i)}
              title={chunk && result === null ? 'انقر للإزالة' : ''}
            >
              {chunk && (
                <span style={{
                  fontSize: '2.2rem', fontWeight: 800,
                  color: result === 'correct' ? '#1a6b38' : result === 'wrong' ? '#9b1c1c' : '#5b4fc4',
                }}>
                  {chunk.ch}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Feedback */}
        {result !== null && (
          <div style={{
            ...S.feedback,
            color:      result === 'correct' ? '#1a6b38' : '#9b1c1c',
            background: result === 'correct' ? '#d4edda' : '#f8d7da',
          }}>
            {result === 'correct' ? `✅ أحسنت! الكلمة: ${w.word}` : '❌ حاول مرة أخرى! ستتم إعادة الحروف'}
          </div>
        )}

        {/* Available scrambled letters */}
        {result === null && (
          <div style={S.availableRow}>
            {available.map((chunk, i) => (
              <button key={`${chunk.ch}-${chunk.id}`}
                style={S.letterBtn}
                onClick={() => placeInAnswer(i)}>
                {chunk.ch}
              </button>
            ))}
          </div>
        )}

        {/* Hint: tap placed letter to return it */}
        {result === null && answer.some(a => a !== null) && (
          <div style={{ fontSize: '.78rem', color: '#9ca3af', textAlign: 'center' }}>
            انقر على حرف في الإجابة لإعادته
          </div>
        )}

        {/* Next button (correct only — wrong auto-resets) */}
        {result === 'correct' && (
          <button style={S.btnBlue} onClick={nextWord}>
            {isLast ? '🏁 النتيجة النهائية' : 'التالي ←'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════ STYLES ════════════════════════════ */
const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #5b4fc4 0%, #7c3aed 50%, #9c3ec4 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: 20, fontFamily: "'Tajawal', sans-serif", direction: 'rtl',
  },
  centerCard: {
    position: 'relative', background: '#fff', borderRadius: 24, padding: '44px 36px',
    textAlign: 'center', maxWidth: 480, width: '100%',
    boxShadow: '0 24px 64px rgba(0,0,0,0.32)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
  },
  cfgBtn: {
    position: 'absolute', top: 16, left: 16, background: '#f3f4f6', border: 'none',
    borderRadius: 10, padding: '7px 14px', fontSize: '0.85rem', fontWeight: 600,
    cursor: 'pointer', color: '#374151', fontFamily: "'Tajawal', sans-serif",
  },
  mainTitle: { fontSize: '2rem', fontWeight: 800, color: '#1a1a2e', margin: 0 },
  sub: { fontSize: '0.97rem', color: '#6b7280', lineHeight: 1.8, margin: 0 },
  statsRow: {
    display: 'flex', alignItems: 'center', background: '#f9fafb', borderRadius: 14,
    padding: '14px 20px', width: '100%', justifyContent: 'space-around', boxSizing: 'border-box',
  },
  statBox:  { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  statNum:  { fontSize: '1.6rem', fontWeight: 800, color: '#7c3aed' },
  statLbl:  { fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 },
  statDiv:  { width: 1, height: 36, background: '#e5e7eb' },
  warningBanner: {
    background: '#fff7e6', border: '2px solid #f59e0b', borderRadius: 12,
    padding: '12px 16px', color: '#92400e', fontSize: '0.88rem', fontWeight: 600,
    textAlign: 'center', lineHeight: 1.7, width: '100%', boxSizing: 'border-box',
  },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    background: '#f9fafb', border: '2px dashed #d1d5db', borderRadius: 16,
    padding: '28px 20px', width: '100%', boxSizing: 'border-box',
  },
  btnOutline: {
    background: 'transparent', color: '#7c3aed', border: '2px solid #7c3aed',
    borderRadius: 12, padding: '10px 24px', fontSize: '.92rem', fontWeight: 700,
    cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", marginTop: 4,
  },
  btnGold: {
    background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff', border: 'none',
    borderRadius: 14, padding: '14px 0', fontSize: '1.1rem', fontWeight: 700,
    cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", width: '100%',
    boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
  },
  backLink: { color: '#9ca3af', fontSize: '0.87rem', textDecoration: 'none' },
  settingsOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20,
  },
  settingsCard: {
    background: '#fff', borderRadius: 20, padding: '24px 20px', width: '100%', maxWidth: 420,
    display: 'flex', flexDirection: 'column', gap: 0,
    boxShadow: '0 16px 48px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto',
    fontFamily: "'Tajawal', sans-serif",
  },
  settingsLabel: {
    display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.95rem', fontWeight: 600,
    color: '#374151', textAlign: 'right', marginBottom: 16,
  },
  settingsSelect: {
    padding: '10px 14px', borderRadius: 10, border: '2px solid #e5e7eb',
    fontSize: '1rem', fontFamily: "'Tajawal', sans-serif", direction: 'rtl',
    color: '#1a1a2e', cursor: 'pointer',
  },
  input: {
    width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10,
    padding: '9px 12px', fontSize: '1rem', fontFamily: "'Tajawal', sans-serif",
    boxSizing: 'border-box', outline: 'none',
  },
  headerRow: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 560,
    marginBottom: 14, color: '#fff',
  },
  scoreBadge: {
    fontSize: '1rem', fontWeight: 700, flexShrink: 0,
    background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 14px',
  },
  bar:    { flex: 1, height: 8, background: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', background: '#fbbf24', borderRadius: 4, transition: 'width 0.4s' },
  barLabel: { fontSize: '0.88rem', flexShrink: 0, opacity: 0.82 },
  card: {
    background: '#fff', borderRadius: 24, padding: '28px 24px', width: '100%', maxWidth: 560,
    boxShadow: '0 24px 64px rgba(0,0,0,0.32)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
  },
  emojiBox: {
    width: 100, height: 100, background: '#f5f3ff', borderRadius: 18,
    fontSize: '3.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  wordImg:  { width: 100, height: 100, objectFit: 'contain', borderRadius: 14 },
  answerRow: {
    display: 'flex', direction: 'rtl', gap: 6,
    justifyContent: 'center', flexWrap: 'wrap', minHeight: 76,
  },
  answerSlot: {
    width: 64, height: 72, border: '3px dashed', borderRadius: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.25s',
  },
  feedback: {
    padding: '10px 22px', borderRadius: 10, fontSize: '1rem',
    fontWeight: 600, textAlign: 'center', width: '100%',
  },
  availableRow: {
    display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center',
  },
  letterBtn: {
    width: 72, height: 72, borderRadius: 16, border: '2px solid #e5e7eb',
    background: '#f9fafb', fontSize: '2rem', fontWeight: 700, cursor: 'pointer',
    transition: 'all 0.15s', fontFamily: "'Tajawal', sans-serif", color: '#1a1a2e',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  btnBlue: {
    background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 14,
    padding: '13px 0', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer',
    fontFamily: "'Tajawal', sans-serif", width: '100%', maxWidth: 280,
  },
};
