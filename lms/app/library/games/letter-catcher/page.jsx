'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

/* ────────────────────────── helpers ────────────────────────── */
const DIACRITICS = /[ً-ْٰ]/g;
function stripDia(s) { return (s || '').replace(DIACRITICS, ''); }


function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── contextual Arabic letter forms ─────────────────────────── */
const NON_CONNECTORS = new Set('اأإآءوردذزىة');

function getLetterForm(stripped, idx) {
  const letter    = stripped[idx];
  const prev      = idx > 0                   ? stripped[idx - 1] : null;
  const next      = idx < stripped.length - 1 ? stripped[idx + 1] : null;
  const joinsPrev = prev !== null && !NON_CONNECTORS.has(prev);
  const joinsNext = next !== null && !NON_CONNECTORS.has(letter);
  if (joinsPrev && joinsNext) return 'medial';
  if (joinsPrev)              return 'final';
  if (joinsNext)              return 'initial';
  return 'isolated';
}

const ZWJ = '‍'; // U+200D zero-width joiner

function toContextual(letter, form) {
  const base = (letter || '').replace(DIACRITICS, '');
  switch (form) {
    case 'initial': return base + ZWJ;
    case 'medial':  return ZWJ + base + ZWJ;
    case 'final':   return ZWJ + base;
    default:        return base;
  }
}

const TOPICS = ['الحيوانات', 'الأشكال', 'الأسرة', 'الألوان', 'الفواكه', 'المدرسة', 'الطقس', 'الأرقام'];

/* ── Arabic TTS ─────────────────────────────────────────────── */
function speak(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ar-SA';
  u.rate = 0.82;
  function go() {
    window.speechSynthesis.cancel();
    // prefer Arabic voice if available
    const voices = window.speechSynthesis.getVoices();
    const ar = voices.find(v => v.lang.startsWith('ar'));
    if (ar) u.voice = ar;
    window.speechSynthesis.speak(u);
  }
  if (window.speechSynthesis.getVoices().length > 0) go();
  else { window.speechSynthesis.addEventListener('voiceschanged', go, { once: true }); setTimeout(go, 500); }
}

/* ────────────────── word manager in settings ────────────────── */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function WordManager({ dbWords, onRefresh }) {
  const [word,      setWord]      = useState('');
  const [missing,   setMissing]   = useState('');
  const [topic,     setTopic]     = useState('');
  const [imgFile,   setImgFile]   = useState(null);
  const [imgPrev,   setImgPrev]   = useState(null);
  const [audioUrl,  setAudioUrl]  = useState(null);  // recorded audio (base64 data URL)
  const [recording, setRecording] = useState(false);
  const [recSecs,   setRecSecs]   = useState(0);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(null);
  const [msg,       setMsg]       = useState(null);
  const fileRef   = useRef();
  const mediaRef  = useRef(null);   // MediaRecorder
  const chunksRef = useRef([]);
  const timerRef  = useRef(null);

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

  const handleAdd = async () => {
    if (!word.trim() || !missing.trim()) {
      setMsg({ ok: false, text: 'اكتب الكلمة والحرف الناقص أولاً' });
      return;
    }
    if (!word.includes('_')) {
      setMsg({ ok: false, text: 'ضع رمز _ في مكان الحرف الناقص\nمثال: مَد_رَسة' });
      return;
    }
    setSaving(true); setMsg(null);
    try {
      let image_url = null;
      if (imgFile) image_url = await fileToBase64(imgFile);

      const res = await fetch('/api/games/letter-catcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: word.trim(),
          missing_letter: missing.trim(),
          image_url,
          audio_url: audioUrl || null,
          topic: topic || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'فشل الحفظ');
      const fullW = word.trim().replace('_', missing.trim());
      setMsg({ ok: true, text: `✅ أُضيفت "${fullW}" بنجاح` });
      setWord(''); setMissing(''); setTopic('');
      setImgFile(null); setImgPrev(null); setAudioUrl(null);
      if (fileRef.current) fileRef.current.value = '';
      onRefresh();
    } catch (e) {
      setMsg({ ok: false, text: `❌ ${e.message}` });
    }
    setSaving(false);
  };

  const handleDelete = async (id, w) => {
    if (!confirm(`حذف كلمة "${w}"؟`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/games/letter-catcher?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onRefresh();
    } catch {
      alert('فشل الحذف');
    }
    setDeleting(null);
  };

  return (
    <div>
      <div style={{ background: '#f5f3ff', borderRadius: 14, padding: 16, marginBottom: 18, border: '1.5px dashed #7c3aed' }}>
        <div style={{ fontWeight: 800, color: '#7c3aed', marginBottom: 12, fontSize: '.92rem' }}>➕ إضافة كلمة جديدة</div>

        <input
          value={word}
          onChange={e => setWord(e.target.value)}
          placeholder="مثال: مَد_رَسة  (ضع _ مكان الحرف الناقص)"
          style={S.input}
          dir="rtl"
        />
        <div style={{ fontSize: '.78rem', color: '#7c3aed', marginTop: 3, textAlign: 'right', fontWeight: 600 }}>
          💡 اكتب الكلمة وضع رمز الشرطة السفلية _ في مكان الحرف الناقص
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
          <input
            value={missing}
            onChange={e => setMissing(e.target.value)}
            placeholder="الحرف الناقص (مثال: ق)"
            style={{ ...S.input, flex: 1, marginTop: 0 }}
            dir="rtl"
            maxLength={2}
          />
          <button
            type="button"
            onClick={() => word.trim() && speak(word.includes('_') ? word.replace('_', missing.trim() || '') : word.trim())}
            title="استمع للكلمة"
            style={{ flexShrink: 0, background: '#ede9fe', border: 'none', borderRadius: 10, width: 42, height: 42, cursor: 'pointer', fontSize: '1.2rem' }}
          >🔊</button>
        </div>

        {/* image picker */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            marginTop: 8, borderRadius: 12, border: '2px dashed #c4b5fd',
            background: '#faf5ff', cursor: 'pointer', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: imgPrev ? 'auto' : 72, minHeight: 72,
          }}
        >
          {imgPrev
            ? <img src={imgPrev} alt="preview" style={{ width: '100%', maxHeight: 140, objectFit: 'contain', display: 'block' }} />
            : <span style={{ color: '#a78bfa', fontSize: '.85rem', fontWeight: 700 }}>📷 انقر لاختيار صورة الكلمة</span>
          }
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} style={{ display: 'none' }} />

        {/* audio recorder */}
        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            style={{
              flexShrink: 0, border: 'none', borderRadius: 10, padding: '9px 14px',
              fontSize: '.85rem', fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Tajawal', sans-serif",
              background: recording ? '#fee2e2' : '#f0fdf4',
              color: recording ? '#dc2626' : '#16a34a',
            }}
          >
            {recording ? `⏹️ إيقاف (${recSecs}ث)` : '🎙️ تسجيل صوت المعلم'}
          </button>
          {audioUrl && !recording && (
            <>
              <audio src={audioUrl} controls style={{ flex: 1, minWidth: 120, height: 32 }} />
              <button type="button" onClick={() => setAudioUrl(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '1rem' }}>✕</button>
            </>
          )}
        </div>

        <select
          value={topic}
          onChange={e => setTopic(e.target.value)}
          style={{ ...S.input, marginTop: 8 }}
          dir="rtl"
        >
          <option value=''>بدون موضوع</option>
          {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {msg && (
          <div style={{
            marginTop: 10, padding: '8px 12px', borderRadius: 8, fontSize: '.85rem', fontWeight: 700,
            background: msg.ok ? '#d4edda' : '#f8d7da',
            color: msg.ok ? '#155724' : '#721c24',
          }}>
            {msg.text}
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={saving || !word.trim() || !missing.trim()}
          style={{
            ...S.addBtn,
            opacity: (saving || !word.trim() || !missing.trim()) ? 0.6 : 1,
            cursor:  (saving || !word.trim() || !missing.trim()) ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'جارٍ الحفظ…' : '💾 حفظ في قاعدة البيانات'}
        </button>
      </div>

      <div style={{ fontWeight: 700, color: '#374151', marginBottom: 8, fontSize: '.88rem' }}>
        📚 الكلمات في قاعدة البيانات ({dbWords.length})
      </div>
      {dbWords.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '16px 0', fontSize: '.88rem' }}>
          لا توجد كلمات بعد — أضف أولى كلماتك أعلاه
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
          {dbWords.map(w => (
            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', borderRadius: 10, padding: '8px 12px', border: '1px solid #e5e7eb' }}>
              {w.image_url
                ? <img src={w.image_url} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                : w.emoji ? <span style={{ fontSize: '1.2rem' }}>{w.emoji}</span> : null
              }
              <span style={{ flex: 1, fontWeight: 700, color: '#1f2937', fontSize: '.9rem' }}>
                {w.word.includes('_') ? w.word.replace('_', w.missing_letter) : w.word}
              </span>
              {w.topic && <span style={{ background: '#e0f2fe', color: '#0369a1', borderRadius: 20, padding: '2px 8px', fontSize: '.7rem', fontWeight: 700 }}>{w.topic}</span>}
              <span style={{ background: '#ede9fe', color: '#7c3aed', borderRadius: 20, padding: '2px 8px', fontSize: '.75rem', fontWeight: 700 }}>{w.missing_letter}</span>
              {w.audio_url && <span title="يحتوي على تسجيل" style={{ fontSize: '.75rem' }}>🎙️</span>}
              <button onClick={() => w.audio_url ? new Audio(w.audio_url).play() : speak(w.word)} title="استمع" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '2px 4px', lineHeight: 1 }}>🔊</button>
              <button
                onClick={() => handleDelete(w.id, w.word)}
                disabled={deleting === w.id}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1.05rem', padding: '2px 4px', lineHeight: 1 }}
                title="حذف"
              >
                {deleting === w.id ? '…' : '🗑️'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────── settings panel (modal) ─────────────────── */
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
          <button style={tabStyle('words')} onClick={() => setTab('words')}>📖 الكلمات ({dbWords.length})</button>
        </div>

        {tab === 'settings' && (
          <>
            <label style={S.settingsLabel}>
              عدد الأسئلة في الجولة
              <input
                type="number"
                min={1}
                value={cfg.questionsPerRound}
                onChange={e => onChange({ ...cfg, questionsPerRound: Math.max(1, Number(e.target.value) || 1) })}
                style={S.settingsSelect}
              />
            </label>

            <label style={S.settingsLabel}>
              عدد الخيارات لكل سؤال
              <select value={cfg.optionsCount} onChange={e => onChange({ ...cfg, optionsCount: Number(e.target.value) })} style={S.settingsSelect}>
                {[3, 4, 5].map(v => <option key={v} value={v}>{v} خيارات</option>)}
              </select>
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
                {[1, 2, 3, 4, 5, 6].map(g => <option key={g} value={g}>الصف {g}</option>)}
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

        {tab === 'words' && (
          <WordManager dbWords={dbWords} onRefresh={onRefresh} />
        )}
      </div>
    </div>
  );
}

/* ────────────────────── image with fallback ─────────────────── */
function WordImage({ imageUrl, emoji }) {
  const [err, setErr] = useState(false);
  if (!imageUrl || err) return <div style={S.emojiBox}>{emoji || '❓'}</div>;
  return <img src={imageUrl} alt="" style={S.wordImg} onError={() => setErr(true)} />;
}

/* ═══════════════════════ MAIN COMPONENT ════════════════════════ */
export default function LetterCatcherGame() {
  const [phase,    setPhase]    = useState('start');
  const [dbWords,  setDbWords]  = useState([]);     // all words from DB (for word manager)
  const [gameWords, setGameWords] = useState([]);   // words matching active filters (for game)
  const [queue,    setQueue]    = useState([]);
  const [cur,      setCur]      = useState(0);
  const [score,    setScore]    = useState(0);
  const [chosen,   setChosen]   = useState(null);
  const [correct,  setCorrect]  = useState(null);
  const [showCfg,  setShowCfg]  = useState(false);
  const [cfg, setCfg] = useState({
    questionsPerRound: 10,
    optionsCount: 5,
    topic: '',
    grade: 0,
    minLen: 2,
    maxLen: 12,
  });

  const isValid = w => w.word && w.missing_letter && Array.isArray(w.options) && w.options.filter(Boolean).length >= 2;

  /* ── load ALL words (for word manager, no filters) ── */
  const loadWords = useCallback(async () => {
    try {
      const res  = await fetch('/api/games/letter-catcher');
      const json = await res.json();
      setDbWords((json.words || []).filter(isValid));
    } catch {
      setDbWords([]);
    }
  }, []);

  /* ── load game words with active filters from API ── */
  const loadGameWords = useCallback(async () => {
    try {
      const p = new URLSearchParams();
      if (cfg.topic)    p.set('topic',  cfg.topic);
      if (cfg.grade > 0) p.set('grade', String(cfg.grade));
      p.set('minLen', String(cfg.minLen));
      p.set('maxLen', String(cfg.maxLen));
      const res  = await fetch(`/api/games/letter-catcher?${p}`);
      const json = await res.json();
      setGameWords((json.words || []).filter(isValid));
    } catch {
      setGameWords([]);
    }
  }, [cfg]);

  useEffect(() => { loadWords(); }, [loadWords]);
  useEffect(() => { loadGameWords(); }, [loadGameWords]);

  /* ── build round queue ── */
  const buildQueue = useCallback((words, count, optCount) => {
    return shuffle(words).slice(0, count).map(w => {
      const correctLetter = stripDia(w.missing_letter);
      const strippedW     = stripDia(w.word);
      const missingIdx    = strippedW.indexOf(correctLetter);
      const form          = missingIdx >= 0 ? getLetterForm(strippedW, missingIdx) : 'isolated';
      const pool2         = (w.options || []).filter(Boolean).filter(o => stripDia(o) !== correctLetter);
      const distractors   = shuffle(pool2).slice(0, optCount - 1);
      const opts          = shuffle([w.missing_letter, ...distractors]);
      return { ...w, _opts: opts, _form: form };
    });
  }, []);

  /* ── start game — only if enough matching words ── */
  const startGame = useCallback(() => {
    if (gameWords.length < cfg.questionsPerRound) return;
    setQueue(buildQueue(gameWords, cfg.questionsPerRound, cfg.optionsCount));
    setCur(0); setScore(0); setChosen(null); setCorrect(null);
    setPhase('playing');
  }, [gameWords, buildQueue, cfg]);

  const pick = useCallback((opt) => {
    if (chosen !== null) return;
    const w       = queue[cur];
    const isRight = stripDia(opt) === stripDia(w.missing_letter);
    setChosen(opt); setCorrect(isRight);
    if (isRight) {
      setScore(s => s + 1);
      if (w.audio_url) { try { new Audio(w.audio_url).play(); } catch {} }
      else speak(w.word);
    }
  }, [chosen, cur, queue]);

  const next = useCallback(() => {
    const n = cur + 1;
    if (n >= queue.length) setPhase('finished');
    else { setCur(n); setChosen(null); setCorrect(null); }
  }, [cur, queue.length]);

  const restart = useCallback(() => {
    setPhase('start'); setQueue([]); setCur(0);
    setScore(0); setChosen(null); setCorrect(null);
  }, []);

  const notEnough = gameWords.length > 0 && gameWords.length < cfg.questionsPerRound;

  /* ══════════════════════ RENDER: START ══════════════════════ */
  if (phase === 'start') {
    return (
      <div style={S.page}>
        {showCfg && (
          <SettingsPanel
            cfg={cfg}
            onChange={setCfg}
            onClose={() => setShowCfg(false)}
            dbWords={dbWords}
            onRefresh={loadWords}
          />
        )}

        <div style={S.centerCard}>
          <button style={S.cfgBtn} onClick={() => setShowCfg(true)}>⚙️ الإعدادات</button>

          <div style={{ fontSize: '4.5rem', lineHeight: 1 }}>🦉</div>
          <h1 style={S.mainTitle}>صيّاد الحروف!</h1>
          <p style={S.sub}>
            سأريك صورة وكلمة فيها حرف ناقص.<br />
            انظر للصورة، ثم اختر الحرف الصحيح!
          </p>

          {gameWords.length === 0 ? (
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
                <div style={S.statBox}>
                  <span style={{ ...S.statNum, color: '#e74c3c' }}>{gameWords.length}</span>
                  <span style={S.statLbl}>كلمة متاحة</span>
                </div>
                <div style={S.statDiv} />
                <div style={S.statBox}>
                  <span style={S.statNum}>{cfg.questionsPerRound}</span>
                  <span style={S.statLbl}>سؤال مطلوب</span>
                </div>
              </div>
              <div style={S.warningBanner}>
                ⚠️ الكلمات المتاحة ({gameWords.length}) أقل من عدد الأسئلة المطلوبة ({cfg.questionsPerRound}). أضف المزيد من الكلمات أو قلّل عدد الأسئلة في الإعدادات.
              </div>
              <button style={{ ...S.btnGold, opacity: 0.4, cursor: 'not-allowed' }} disabled>🚀 ابدأ اللعبة</button>
            </>
          ) : (
            <>
              <div style={S.statsRow}>
                <div style={S.statBox}>
                  <span style={S.statNum}>{gameWords.length}</span>
                  <span style={S.statLbl}>كلمة متاحة</span>
                </div>
                <div style={S.statDiv} />
                <div style={S.statBox}>
                  <span style={S.statNum}>{cfg.questionsPerRound}</span>
                  <span style={S.statLbl}>سؤال في الجولة</span>
                </div>
                <div style={S.statDiv} />
                <div style={S.statBox}>
                  <span style={S.statNum}>{cfg.optionsCount}</span>
                  <span style={S.statLbl}>خيارات</span>
                </div>
              </div>
              <button style={S.btnGold} onClick={startGame}>🚀 ابدأ اللعبة</button>
            </>
          )}

          <Link href="/library" style={S.backLink}>← العودة للمكتبة</Link>
        </div>
      </div>
    );
  }

  /* ══════════════════════ RENDER: FINISHED ══════════════════════ */
  if (phase === 'finished') {
    const pct   = Math.round((score / queue.length) * 100);
    const stars = pct >= 80 ? 3 : pct >= 50 ? 2 : 1;
    const msg   = pct >= 80
      ? 'ممتاز! أنت صياد حروف بارع 🏆'
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

  /* ══════════════════════ RENDER: PLAYING ══════════════════════ */
  const w    = queue[cur];
  const opts = w._opts || [];

  // Resolve blank position: use explicit '_' marker if present, else fall back to indexOf
  let sw, mi;
  if ((w.word || '').includes('_')) {
    const [bef, aft] = w.word.split('_');
    const bs = stripDia(bef  || '');
    const as = stripDia(aft  || '');
    sw = bs + stripDia(w.missing_letter) + as;
    mi = bs.length;
  } else {
    sw = stripDia(w.word);
    mi = sw.indexOf(stripDia(w.missing_letter));
  }
  const isLast        = cur + 1 >= queue.length;

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

        <div style={S.wordRow}>
          {mi < 0 ? (
            <>
              <span style={S.wordLetterBox}>{w.word}</span>
              <span style={{ ...S.blank, background: '#eef3fc', borderColor: '#7c3aed', color: '#7c3aed' }}>؟</span>
            </>
          ) : sw.split('').map((ch, i) => {
            const form = getLetterForm(sw, i);
            if (i === mi) {
              return (
                <span key={i} style={{
                  ...S.blank,
                  background:  correct === null ? '#eef3fc' : correct ? '#d4edda' : '#f8d7da',
                  borderColor: correct === null ? '#7c3aed'  : correct ? '#27ae60' : '#e74c3c',
                  color:       correct === null ? '#7c3aed'  : correct ? '#27ae60' : '#e74c3c',
                }}>
                  {correct !== null ? toContextual(w.missing_letter, form) : '؟'}
                </span>
              );
            }
            return (
              <span key={i} style={S.wordLetterBox}>
                {toContextual(ch, form)}
              </span>
            );
          })}
        </div>

        {correct !== null && (
          <div style={{ ...S.feedback, color: correct ? '#1a6b38' : '#9b1c1c', background: correct ? '#d4edda' : '#f8d7da' }}>
            {correct ? '✅ أحسنت! إجابة صحيحة' : `❌ الصحيح: ${w.missing_letter}`}
          </div>
        )}

        <div style={{ ...S.optRow, gridTemplateColumns: `repeat(${Math.min(opts.length, 5)}, 1fr)` }}>
          {opts.filter(Boolean).map((opt, idx) => {
            const isRight  = stripDia(opt) === stripDia(w.missing_letter);
            const picked   = chosen === opt;
            const revealed = chosen !== null;
            let btn = { ...S.optBtn };
            if (revealed) {
              if (isRight)     btn = { ...btn, ...S.optCorrect };
              else if (picked) btn = { ...btn, ...S.optWrong };
              else             btn = { ...btn, opacity: 0.32 };
            }
            return (
              <button key={`${opt}-${idx}`} style={btn} onClick={() => pick(opt)} disabled={revealed}>
                {toContextual(opt, w._form || 'isolated')}
              </button>
            );
          })}
        </div>

        {chosen !== null && (
          <button style={S.btnBlue} onClick={next}>
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
    textAlign: 'center', maxWidth: 440, width: '100%',
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
  statBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  statNum: { fontSize: '1.6rem', fontWeight: 800, color: '#7c3aed' },
  statLbl: { fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 },
  statDiv: { width: 1, height: 36, background: '#e5e7eb' },
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
  addBtn: {
    marginTop: 12, width: '100%', background: 'linear-gradient(135deg,#5b4fc4,#7c3aed)',
    color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0',
    fontSize: '.9rem', fontWeight: 700, fontFamily: "'Tajawal', sans-serif",
  },
  input: {
    width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10,
    padding: '9px 12px', fontSize: '1rem', fontFamily: "'Tajawal', sans-serif",
    boxSizing: 'border-box', outline: 'none',
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
  headerRow: {
    display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 540,
    marginBottom: 14, color: '#fff',
  },
  scoreBadge: {
    fontSize: '1rem', fontWeight: 700, flexShrink: 0,
    background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 14px',
  },
  bar: { flex: 1, height: 8, background: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', background: '#fbbf24', borderRadius: 4, transition: 'width 0.4s' },
  barLabel: { fontSize: '0.88rem', flexShrink: 0, opacity: 0.82 },
  card: {
    background: '#fff', borderRadius: 24, padding: '32px 28px', width: '100%', maxWidth: 540,
    boxShadow: '0 24px 64px rgba(0,0,0,0.32)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
  },
  emojiBox: {
    width: 110, height: 110, background: '#f5f3ff', borderRadius: 18,
    fontSize: '3.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  wordImg: { width: 110, height: 110, objectFit: 'contain', borderRadius: 14 },
  wordRow: {
    display: 'flex', alignItems: 'center', gap: 6,
    flexWrap: 'wrap', justifyContent: 'center', direction: 'rtl',
  },
  wordLetterBox: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 54, height: 66, borderRadius: 12,
    background: '#f5f3ff', border: '2px solid #ede9fe',
    fontSize: '2.4rem', fontWeight: 700, color: '#1a1a2e', padding: '0 8px',
  },
  blank: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 58, height: 66, border: '3px dashed', borderRadius: 12,
    fontSize: '2.4rem', fontWeight: 700, transition: 'all 0.3s', padding: '0 8px',
  },
  feedback: {
    padding: '10px 22px', borderRadius: 10, fontSize: '1rem',
    fontWeight: 600, textAlign: 'center', width: '100%',
  },
  optRow: { display: 'grid', gap: 12, width: '100%', justifyItems: 'center' },
  optBtn: {
    width: 76, height: 76, borderRadius: 16, border: '2px solid #e5e7eb',
    background: '#f9fafb', fontSize: '1.9rem', fontWeight: 700, cursor: 'pointer',
    transition: 'all 0.18s', fontFamily: "'Tajawal', sans-serif", color: '#1a1a2e',
  },
  optCorrect: { background: '#d4edda', borderColor: '#27ae60', color: '#1a6b38' },
  optWrong:   { background: '#f8d7da', borderColor: '#e74c3c', color: '#9b1c1c' },
  btnBlue: {
    background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 14,
    padding: '13px 0', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer',
    fontFamily: "'Tajawal', sans-serif", width: '100%', maxWidth: 280,
  },
};
