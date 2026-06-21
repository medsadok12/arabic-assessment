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

/* ── category visual metadata ────────────────────────────────── */
const CAT_META = {
  'الحيوانات': { emoji:'🦁', grad:'linear-gradient(135deg,#f59e0b,#f97316)' },
  'الفواكه':   { emoji:'🍎', grad:'linear-gradient(135deg,#ef4444,#fb923c)' },
  'الغلال':    { emoji:'🍇', grad:'linear-gradient(135deg,#8b5cf6,#a855f7)' },
  'الخضروات':  { emoji:'🥦', grad:'linear-gradient(135deg,#10b981,#34d399)' },
  'الأشكال':   { emoji:'🔷', grad:'linear-gradient(135deg,#3b82f6,#60a5fa)' },
  'الأسرة':    { emoji:'👨‍👩‍👧‍👦', grad:'linear-gradient(135deg,#ec4899,#f472b6)' },
  'الألوان':   { emoji:'🎨', grad:'linear-gradient(135deg,#eab308,#f59e0b)' },
  'المدرسة':   { emoji:'📚', grad:'linear-gradient(135deg,#06b6d4,#0ea5e9)' },
  'الطقس':     { emoji:'⛅', grad:'linear-gradient(135deg,#818cf8,#60a5fa)' },
  'الأرقام':   { emoji:'🔢', grad:'linear-gradient(135deg,#84cc16,#10b981)' },
};
const FALLBACK_CAT_STYLES = [
  { emoji:'🌟', grad:'linear-gradient(135deg,#f59e0b,#f97316)' },
  { emoji:'🎯', grad:'linear-gradient(135deg,#7c3aed,#8b5cf6)' },
  { emoji:'🚀', grad:'linear-gradient(135deg,#3b82f6,#06b6d4)' },
  { emoji:'🌈', grad:'linear-gradient(135deg,#10b981,#84cc16)' },
  { emoji:'🎪', grad:'linear-gradient(135deg,#ec4899,#f43f5e)' },
];
function getCatStyle(cat, idx) {
  return CAT_META[cat] || FALLBACK_CAT_STYLES[idx % FALLBACK_CAT_STYLES.length];
}

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

function WordManager({ dbWords, onRefresh, catMeta, onCatMetaRefresh }) {
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
  const [category,  setCategory]  = useState('');
  const fileRef    = useRef();
  const catImgRef  = useRef();
  const mediaRef   = useRef(null);
  const chunksRef  = useRef([]);
  const timerRef   = useRef(null);

  /* ── inline category icon editor ── */
  const [editingCat,  setEditingCat]  = useState(null);
  const [catEmojiVal, setCatEmojiVal] = useState('');
  const [catImgVal,   setCatImgVal]   = useState(null);
  const [catSaving,   setCatSaving]   = useState(false);
  const [catMsg,      setCatMsg]      = useState(null);

  const openCatEdit = (cat, idx) => {
    setEditingCat(cat);
    setCatEmojiVal(catMeta?.[cat]?.emoji ?? getCatStyle(cat, idx).emoji);
    setCatImgVal(catMeta?.[cat]?.image_url ?? null);
    setCatMsg(null);
  };

  const saveCatMeta = async () => {
    setCatSaving(true); setCatMsg(null);
    try {
      const res = await fetch('/api/games/letter-catcher/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingCat, emoji: catImgVal ? null : catEmojiVal, image_url: catImgVal || null }),
      });
      if (!res.ok) throw new Error();
      setCatMsg({ ok: true, text: '✅ تم الحفظ' });
      onCatMetaRefresh?.();
      setTimeout(() => setEditingCat(null), 800);
    } catch {
      setCatMsg({ ok: false, text: '❌ فشل الحفظ' });
    }
    setCatSaving(false);
  };

  const resetCatMeta = async () => {
    setCatSaving(true); setCatMsg(null);
    try {
      await fetch(`/api/games/letter-catcher/categories?name=${encodeURIComponent(editingCat)}`, { method: 'DELETE' });
      setCatMsg({ ok: true, text: '↩️ أُعيد للافتراضي' });
      onCatMetaRefresh?.();
      setTimeout(() => setEditingCat(null), 800);
    } catch {
      setCatMsg({ ok: false, text: '❌ فشل' });
    }
    setCatSaving(false);
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
          topic: category.trim() || null,
          category: category.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'فشل الحفظ');
      const fullW = word.trim().replace('_', missing.trim());
      setMsg({ ok: true, text: `✅ أُضيفت "${fullW}" بنجاح` });
      setWord(''); setMissing(''); setTopic(''); setCategory('');
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
        <div style={{ marginTop: 8 }}>
          {!audioUrl ? (
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              style={{
                width: '100%', border: 'none', borderRadius: 10, padding: '11px',
                fontSize: '.88rem', fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Tajawal', sans-serif",
                background: recording ? '#fee2e2' : '#f0fdf4',
                color: recording ? '#dc2626' : '#16a34a',
              }}
            >
              {recording ? `⏹️ إيقاف التسجيل (${recSecs}ث)` : '🎙️ تسجيل صوت الكلمة (اختياري)'}
            </button>
          ) : (
            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 10, border: '1.5px solid #86efac' }}>
              <div style={{ fontSize: '.78rem', color: '#16a34a', fontWeight: 700, marginBottom: 6, textAlign: 'right' }}>
                ✅ التسجيل جاهز — سيُحفظ مع الكلمة عند الضغط على زر الحفظ
              </div>
              <audio src={audioUrl} controls style={{ width: '100%', height: 36, display: 'block', borderRadius: 6 }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" onClick={recording ? stopRecording : startRecording}
                  style={{
                    flex: 1, border: 'none', borderRadius: 8, padding: '7px', fontSize: '.8rem',
                    fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif",
                    background: recording ? '#fee2e2' : '#ede9fe',
                    color: recording ? '#dc2626' : '#7c3aed',
                  }}>
                  {recording ? `⏹️ إيقاف (${recSecs}ث)` : '🔄 إعادة التسجيل'}
                </button>
                <button type="button" onClick={() => setAudioUrl(null)}
                  style={{
                    border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: '.8rem',
                    fontWeight: 700, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif",
                    background: '#fee2e2', color: '#dc2626',
                  }}>
                  🗑️ حذف
                </button>
              </div>
            </div>
          )}
        </div>

        <input
          list="lc-cat-list"
          value={category}
          onChange={e => setCategory(e.target.value)}
          placeholder="التصنيف التعليمي: الحيوانات، الفواكه، الخضروات... (اختياري)"
          style={{ ...S.input, marginTop: 8 }}
          dir="rtl"
        />
        <datalist id="lc-cat-list">
          {Object.keys(CAT_META).map(c => <option key={c} value={c} />)}
        </datalist>
        <div style={{ fontSize: '.72rem', color: '#7c3aed', marginTop: 3, textAlign: 'right', fontWeight: 600 }}>
          💡 التصنيف يُظهر الكلمة في دائرة مجموعتها في شاشة الاختيار
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

      {dbWords.length > 0 && (
        <div style={{ fontWeight: 700, color: '#374151', marginBottom: 10, fontSize: '.88rem' }}>
          📚 الكلمات ({dbWords.length})
        </div>
      )}
      {dbWords.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '16px 0', fontSize: '.88rem' }}>
          لا توجد كلمات بعد — أضف أولى كلماتك أعلاه
        </div>
      ) : (() => {
        const groups = {};
        dbWords.forEach(w => {
          const key = w.category || '__none__';
          (groups[key] = groups[key] || []).push(w);
        });
        const keys = Object.keys(groups).sort((a, b) => {
          if (a === '__none__') return 1;
          if (b === '__none__') return -1;
          return a.localeCompare(b, 'ar');
        });
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {keys.map((key, gIdx) => {
              const cat = key === '__none__' ? null : key;
              const words = groups[key];
              const cs = getCatStyle(cat, gIdx);
              const customMeta = catMeta?.[cat];
              const displayEmoji = customMeta?.emoji || cs.emoji;
              const displayImg   = customMeta?.image_url || null;
              const accentColor  = cs.grad.match(/#[0-9a-fA-F]{3,6}/g)?.[0] || '#7c3aed';
              const isEditing    = editingCat === cat;
              return (
                <div key={key}>
                  {/* category header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px', borderRadius: 8, marginBottom: isEditing ? 0 : 6,
                    background: accentColor + '12',
                    borderRight: `3px solid ${accentColor}`,
                    borderBottomLeftRadius: isEditing ? 0 : 8,
                    borderBottomRightRadius: isEditing ? 0 : 8,
                  }}>
                    {displayImg
                      ? <img src={displayImg} style={{ width:22, height:22, borderRadius:5, objectFit:'cover', flexShrink:0 }} />
                      : <span style={{ fontSize: '1rem' }}>{displayEmoji}</span>
                    }
                    <span style={{ fontWeight: 800, color: '#1f2937', fontSize: '.86rem' }}>{cat || 'بدون تصنيف'}</span>
                    <span style={{ marginRight: 'auto', background: '#f3f4f6', borderRadius: 20, padding: '1px 8px', fontSize: '.72rem', color: '#6b7280', fontWeight: 700 }}>{words.length}</span>
                    {cat && (
                      <button
                        onClick={() => isEditing ? setEditingCat(null) : openCatEdit(cat, gIdx)}
                        style={{ background: isEditing ? '#fef2f2' : '#f5f3ff', border: 'none', borderRadius: 6, padding: '3px 7px', cursor: 'pointer', fontSize: '.72rem', fontWeight: 700, color: isEditing ? '#ef4444' : '#7c3aed', flexShrink: 0 }}
                      >{isEditing ? '✕ إغلاق' : '✏️ تعديل الأيقونة'}</button>
                    )}
                  </div>

                  {/* inline category icon editor */}
                  {isEditing && (
                    <div style={{ background: '#faf5ff', border: `1.5px solid ${accentColor}40`, borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '10px 12px', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {/* preview */}
                        <div
                          onClick={() => catImgRef.current?.click()}
                          title="انقر لتغيير الصورة"
                          style={{ width:44, height:44, borderRadius:10, overflow:'hidden', background:cs.grad, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,.18)', flexShrink:0 }}
                        >
                          {catImgVal
                            ? <img src={catImgVal} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                            : <span style={{ fontSize:'1.5rem', lineHeight:1 }}>{catEmojiVal}</span>
                          }
                        </div>

                        {/* emoji input */}
                        <input
                          value={catImgVal ? '' : catEmojiVal}
                          onChange={e => { setCatEmojiVal(e.target.value); setCatImgVal(null); }}
                          placeholder="🔤 أيقونة"
                          disabled={!!catImgVal}
                          maxLength={2}
                          style={{ width:54, textAlign:'center', fontSize:'1.2rem', border:'1.5px solid #ddd6fe', borderRadius:8, padding:'5px', fontFamily:'inherit', background: catImgVal ? '#f3f4f6' : '#fff' }}
                        />

                        {/* upload image */}
                        <button onClick={() => catImgRef.current?.click()}
                          style={{ background:'#f0fdf4', border:'1.5px solid #86efac', borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:'.78rem', fontWeight:700, color:'#15803d' }}
                        >🖼️ صورة</button>
                        <input type="file" accept="image/*" hidden ref={catImgRef}
                          onChange={async e => {
                            const f = e.target.files?.[0]; if (!f) return;
                            const b64 = await fileToBase64(f);
                            setCatImgVal(b64); setCatEmojiVal('');
                          }}
                        />

                        {/* clear image */}
                        {catImgVal && (
                          <button onClick={() => setCatImgVal(null)}
                            style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', fontSize:'.9rem', padding:'2px 4px' }}
                          >✕ مسح</button>
                        )}

                        {/* save */}
                        <button onClick={saveCatMeta} disabled={catSaving}
                          style={{ background:'linear-gradient(135deg,#5b4fc4,#7c3aed)', border:'none', borderRadius:8, padding:'6px 14px', color:'#fff', fontSize:'.8rem', fontWeight:700, cursor:'pointer' }}
                        >{catSaving ? '…' : 'حفظ'}</button>

                        {/* reset */}
                        {(customMeta?.emoji || customMeta?.image_url) && (
                          <button onClick={resetCatMeta} disabled={catSaving}
                            style={{ background:'none', border:'1.5px solid #e5e7eb', borderRadius:8, padding:'5px 10px', color:'#9ca3af', fontSize:'.75rem', fontWeight:700, cursor:'pointer' }}
                          >↩️ افتراضي</button>
                        )}
                      </div>
                      {catMsg && (
                        <div style={{ marginTop:6, fontSize:'.78rem', fontWeight:700, color: catMsg.ok ? '#15803d' : '#b91c1c' }}>{catMsg.text}</div>
                      )}
                    </div>
                  )}
                  {/* words under this category */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 10 }}>
                    {words.map(w => (
                      <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#f9fafb', borderRadius: 8, padding: '6px 10px', border: '1px solid #e5e7eb' }}>
                        {w.image_url
                          ? <img src={w.image_url} alt="" style={{ width: 26, height: 26, objectFit: 'cover', borderRadius: 5, flexShrink: 0 }} />
                          : w.emoji ? <span style={{ fontSize: '1rem' }}>{w.emoji}</span> : null
                        }
                        <span style={{ flex: 1, fontWeight: 700, color: '#1f2937', fontSize: '.88rem' }}>
                          {w.word.includes('_') ? w.word.replace('_', w.missing_letter) : w.word}
                        </span>
                        <span style={{ background: '#ede9fe', color: '#7c3aed', borderRadius: 20, padding: '1px 7px', fontSize: '.72rem', fontWeight: 700 }}>{w.missing_letter}</span>
                        {w.audio_url && <span title="يحتوي على تسجيل" style={{ fontSize: '.7rem' }}>🎙️</span>}
                        <button
                          onClick={() => w.audio_url ? new Audio(w.audio_url).play() : speak(w.word.includes('_') ? w.word.replace('_', w.missing_letter) : w.word)}
                          title="استمع"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.9rem', padding: '2px 3px', lineHeight: 1 }}
                        >🔊</button>
                        <button
                          onClick={() => handleDelete(w.id, w.word)}
                          disabled={deleting === w.id}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '.9rem', padding: '2px 3px', lineHeight: 1 }}
                          title="حذف"
                        >{deleting === w.id ? '…' : '🗑️'}</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

/* ─────────────────── settings panel (modal) ─────────────────── */
function SettingsPanel({ cfg, onChange, onClose, dbWords, onRefresh, catMeta, onCatMetaRefresh }) {
  const [cfgOpen, setCfgOpen] = useState(false);

  return (
    <div style={S.settingsOverlay} onClick={onClose}>
      <div style={S.settingsCard} onClick={e => e.stopPropagation()}>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: '#1f2937', fontSize: '1.1rem' }}>📖 إدارة الكلمات</h3>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* collapsible settings accordion */}
        <div style={{ marginBottom: 16, borderRadius: 12, border: '1.5px solid #e5e7eb', overflow: 'hidden' }}>
          <button
            onClick={() => setCfgOpen(o => !o)}
            style={{
              width: '100%', background: cfgOpen ? '#f5f3ff' : '#f9fafb',
              border: 'none', padding: '10px 14px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', cursor: 'pointer',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            <span style={{ fontWeight: 700, color: '#5b4fc4', fontSize: '.9rem' }}>⚙️ إعدادات الجولة</span>
            <span style={{ color: '#9ca3af', fontSize: '.78rem' }}>{cfgOpen ? '▲ طي' : '▼ توسيع'}</span>
          </button>
          {cfgOpen && (
            <div style={{ padding: '14px', borderTop: '1px solid #e5e7eb' }}>
              <label style={S.settingsLabel}>
                عدد الأسئلة في الجولة
                <input type="number" min={1} value={cfg.questionsPerRound}
                  onChange={e => onChange({ ...cfg, questionsPerRound: Math.max(1, Number(e.target.value) || 1) })}
                  style={S.settingsSelect} />
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
              <button style={S.btnGold} onClick={() => { setCfgOpen(false); onClose(); }}>حفظ الإعدادات ✓</button>
            </div>
          )}
        </div>

        <WordManager dbWords={dbWords} onRefresh={onRefresh} catMeta={catMeta} onCatMetaRefresh={onCatMetaRefresh} />
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
  const [phase,      setPhase]      = useState('start');
  const [dbWords,    setDbWords]    = useState([]);
  const [gameWords,  setGameWords]  = useState([]);
  const [queue,      setQueue]      = useState([]);
  const [cur,        setCur]        = useState(0);
  const [score,      setScore]      = useState(0);
  const [chosen,     setChosen]     = useState(null);
  const [correct,    setCorrect]    = useState(null);
  const [showCfg,    setShowCfg]    = useState(false);
  const [catMeta,    setCatMeta]    = useState({});
  const [isTeacher,        setIsTeacher]        = useState(false);
  const [isLoading,        setIsLoading]        = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cfg, setCfg] = useState({
    questionsPerRound: 10,
    optionsCount: 5,
    topic: '',
    grade: 0,
    minLen: 2,
    maxLen: 12,
  });
  const [totalPoints,   setTotalPoints]   = useState(0);
  const [ptPopupKey,    setPtPopupKey]    = useState(0);
  const [ptPopupActive, setPtPopupActive] = useState(false);
  const [catResults,    setCatResults]    = useState({});  // category → {correct,wrong,total}
  const [currentUser,   setCurrentUser]   = useState(null);

  /* ── detect teacher/admin role + load user + load past results ── */
  useEffect(() => {
    fetch('/api/points').then(r => r.json()).then(j => setTotalPoints(j.points ?? 0)).catch(() => {});
    import('../../../../lib/supabase').then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        const role = user?.user_metadata?.role ?? '';
        setIsTeacher(['super_admin', 'admin', 'teacher'].includes(role));
        if (user) {
          setCurrentUser(user);
          fetch('/api/game-results?game=letter_catcher')
            .then(r => r.json())
            .then(j => {
              const map = {};
              (j.results ?? []).forEach(r => { map[r.category] = r; });
              setCatResults(map);
            })
            .catch(() => {});
        }
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const isValid = w => w.word && w.missing_letter && Array.isArray(w.options) && w.options.filter(Boolean).length >= 2;

  /* ── load ALL words — teachers only (for word manager) ── */
  const loadWords = useCallback(async () => {
    if (!isTeacher) return;
    try {
      const res  = await fetch('/api/games/letter-catcher');
      const json = await res.json();
      setDbWords((json.words || []).filter(isValid));
    } catch {
      setDbWords([]);
    }
  }, [isTeacher]);

  /* ── load game words with active filters from API ── */
  const loadGameWords = useCallback(async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }, [cfg.topic, cfg.grade, cfg.minLen, cfg.maxLen]);

  const loadCatMeta = useCallback(async () => {
    try {
      const res  = await fetch('/api/games/letter-catcher/categories');
      const json = await res.json();
      const m = {};
      (json.categories || []).forEach(c => { m[c.name] = c; });
      setCatMeta(m);
    } catch {}
  }, []);

  useEffect(() => { loadWords(); }, [loadWords]);
  useEffect(() => { loadGameWords(); }, [loadGameWords]);
  useEffect(() => { loadCatMeta(); }, [loadCatMeta]);

  /* ── save result when game finishes ── */
  const savedResultRef = useRef(false);
  useEffect(() => {
    if (phase !== 'finished' || !currentUser || savedResultRef.current) return;
    savedResultRef.current = true;
    const wrong    = queue.length - score;
    const catKey   = selectedCategory ?? '__all__';
    fetch('/api/game-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_id:  'letter_catcher',
        category: catKey,
        correct:  score,
        wrong,
        total:    queue.length,
      }),
    })
      .then(() => fetch('/api/game-results?game=letter_catcher'))
      .then(r  => r.json())
      .then(j  => {
        const map = {};
        (j.results ?? []).forEach(r => { map[r.category] = r; });
        setCatResults(map);
      })
      .catch(() => {});
  }, [phase, currentUser, score, queue.length, selectedCategory]);

  /* reset save guard when a new game starts */
  useEffect(() => {
    if (phase === 'playing') savedResultRef.current = false;
  }, [phase]);

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

  /* ── start game (catFilter = null → all words) ── */
  const startGame = useCallback((catFilter) => {
    const filtered = catFilter === null
      ? gameWords
      : gameWords.filter(w => w.category === catFilter);
    if (filtered.length === 0) return;
    const count = isTeacher
      ? Math.min(filtered.length, cfg.questionsPerRound)
      : Math.min(filtered.length, 20);
    setSelectedCategory(catFilter);
    setQueue(buildQueue(filtered, count, cfg.optionsCount));
    setCur(0); setScore(0); setChosen(null); setCorrect(null);
    setPhase('playing');
  }, [gameWords, buildQueue, cfg, isTeacher]);

  const pick = useCallback((opt) => {
    if (chosen !== null) return;
    const w       = queue[cur];
    const isRight = stripDia(opt) === stripDia(w.missing_letter);
    setChosen(opt); setCorrect(isRight);
    if (isRight) {
      setScore(s => s + 1);
      setPtPopupKey(k => k + 1);
      setPtPopupActive(true);
      setTimeout(() => setPtPopupActive(false), 1200);
      fetch('/api/points', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 5, reason: 'letter_catcher' }) }).then(r => r.json()).then(j => { if (j.points) setTotalPoints(j.points); }).catch(() => {});
      if (w.audio_url) { try { new Audio(w.audio_url).play(); } catch {} }
      else speak(w.word.includes('_') ? w.word.replace('_', w.missing_letter) : w.word);
    }
  }, [chosen, cur, queue]);

  const next = useCallback(() => {
    const n = cur + 1;
    if (n >= queue.length) setPhase('finished');
    else { setCur(n); setChosen(null); setCorrect(null); }
  }, [cur, queue.length]);

  const restart = useCallback(() => {
    const filtered = selectedCategory === null
      ? gameWords
      : gameWords.filter(w => w.category === selectedCategory);
    const count = isTeacher
      ? Math.min(filtered.length, cfg.questionsPerRound)
      : Math.min(filtered.length, 20);
    setQueue(buildQueue(filtered, count, cfg.optionsCount));
    setCur(0); setScore(0); setChosen(null); setCorrect(null);
    setPhase('playing');
  }, [selectedCategory, gameWords, buildQueue, cfg, isTeacher]);

  const notEnough = isTeacher && gameWords.length > 0 && gameWords.length < cfg.questionsPerRound;

  /* ══════════════════════ RENDER: LOADING ══════════════════════ */
  if (phase === 'start' && isLoading) {
    return (
      <div style={S.page}>
        <style>{`
          @keyframes lcOwlBob {
            0%,100% { transform: translateY(0px) rotate(-4deg); }
            50%      { transform: translateY(-16px) rotate(4deg); }
          }
          @keyframes lcDot {
            0%,80%,100% { opacity: .2; transform: scale(.65); }
            40%         { opacity: 1;  transform: scale(1.2);  }
          }
        `}</style>
        <div style={S.centerCard}>
          <div style={{ fontSize:'4.8rem', lineHeight:1, animation:'lcOwlBob 1.6s ease-in-out infinite', display:'inline-block' }}>🦉</div>
          <h1 style={S.mainTitle}>صيّاد الحروف!</h1>
          <p style={{ ...S.sub, color:'#7c3aed', fontWeight:700, margin:0 }}>
            انتظر، فهيم يُجهّز اللعبة... 🎈
          </p>
          <div style={{ display:'flex', gap:10 }}>
            {[0, 180, 360].map(delay => (
              <div key={delay} style={{
                width:13, height:13, borderRadius:'50%', background:'#7c3aed',
                animation:`lcDot 1.3s ${delay}ms ease-in-out infinite`,
              }} />
            ))}
          </div>
          <Link href="/library" style={S.backLink}>← العودة للمكتبة</Link>
        </div>
      </div>
    );
  }

  /* ══════════════════════ RENDER: START ══════════════════════ */
  if (phase === 'start') {
    const categories = [...new Set(gameWords.map(w => w.category).filter(Boolean))];

    return (
      <div style={{ ...S.page, justifyContent: 'flex-start', paddingTop: 36, paddingBottom: 44 }}>
        <style>{`
          @keyframes lcCatIn {
            0%  { opacity:0; transform:scale(.28) rotate(-10deg); }
            55% { transform:scale(1.14) rotate(2deg); }
            100%{ opacity:1; transform:scale(1) rotate(0deg); }
          }
          .lc-cat {
            cursor:pointer;
            transition: transform .2s cubic-bezier(.34,1.56,.64,1), box-shadow .2s ease;
          }
          .lc-cat:hover  { transform:scale(1.11) !important; box-shadow:0 22px 48px rgba(0,0,0,.32) !important; }
          .lc-cat:active { transform:scale(0.94) !important; }
        `}</style>

        {isTeacher && showCfg && (
          <SettingsPanel cfg={cfg} onChange={setCfg} onClose={() => setShowCfg(false)} dbWords={dbWords} onRefresh={loadWords} catMeta={catMeta} onCatMetaRefresh={loadCatMeta} />
        )}

        <div style={{ width:'100%', maxWidth:580, boxSizing:'border-box', textAlign:'center', position:'relative' }}>

          {/* settings button */}
          {isTeacher && (
            <div style={{ textAlign:'left', marginBottom:8 }}>
              <button style={{ ...S.cfgBtn, position:'static' }} onClick={() => setShowCfg(true)}>⚙️ الإعدادات</button>
            </div>
          )}

          {/* header */}
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:'4rem', lineHeight:1 }}>🦉</div>
            <h1 style={{ fontSize:'1.9rem', fontWeight:900, color:'#fff', margin:'8px 0 4px', textShadow:'0 2px 14px rgba(0,0,0,.35)' }}>
              صيّاد الحروف!
            </h1>
            {gameWords.length > 0 && (
              <p style={{ fontSize:'.9rem', color:'rgba(255,255,255,.8)', margin:0 }}>
                اختر مجموعتك وابدأ الصيد 🎯
              </p>
            )}
          </div>

          {/* ── empty / lock ── */}
          {gameWords.length === 0 ? (
            <div style={{ ...S.centerCard, padding:'32px 24px' }}>
              {isTeacher ? (
                <>
                  <div style={{ fontSize:'3rem' }}>📭</div>
                  <p style={{ color:'#374151', fontSize:'.97rem', fontWeight:700, lineHeight:1.9, margin:0, textAlign:'center' }}>
                    عذراً، لا توجد كلمات مضافة.<br />أضف كلمات أولاً من لوحة الإعدادات.
                  </p>
                  <button style={S.btnOutline} onClick={() => setShowCfg(true)}>⚙️ إضافة كلمات</button>
                </>
              ) : (
                <>
                  <div style={{ fontSize:'3rem' }}>🔒</div>
                  <p style={{ color:'#374151', fontSize:'.97rem', fontWeight:700, lineHeight:1.9, margin:0, textAlign:'center' }}>
                    اللعبة غير متاحة حالياً.<br />تواصل مع معلمك لإعداد الكلمات.
                  </p>
                </>
              )}
            </div>

          ) : categories.length === 0 ? (
            /* ── no categories yet — simple start ── */
            <div style={{ ...S.centerCard, padding:'28px 20px' }}>
              <div style={S.statsRow}>
                <div style={S.statBox}>
                  <span style={S.statNum}>{Math.min(gameWords.length, isTeacher ? cfg.questionsPerRound : 20)}</span>
                  <span style={S.statLbl}>سؤال</span>
                </div>
                <div style={S.statDiv} />
                <div style={S.statBox}>
                  <span style={S.statNum}>{cfg.optionsCount}</span>
                  <span style={S.statLbl}>خيارات</span>
                </div>
              </div>
              <button style={S.btnGold} onClick={() => startGame(null)}>🚀 ابدأ اللعبة</button>
            </div>

          ) : (
            /* ── category grid ── */
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

              {/* play-all card */}
              {(() => {
                const allRes = catResults['__all__'];
                const allPct = allRes ? Math.round((allRes.correct / allRes.total) * 100) : null;
                const allStars = allPct === null ? 0 : allPct >= 80 ? 3 : allPct >= 50 ? 2 : 1;
                return (
                  <div
                    className="lc-cat"
                    style={{
                      background:'rgba(255,255,255,.18)', backdropFilter:'blur(10px)',
                      border:'2px solid rgba(255,255,255,.3)', borderRadius:18,
                      padding:'16px 20px', display:'flex', alignItems:'center', gap:14,
                      boxShadow:'0 6px 22px rgba(0,0,0,.2)',
                      animation:'lcCatIn .4s cubic-bezier(.34,1.56,.64,1) both',
                    }}
                    onClick={() => startGame(null)}
                  >
                    <span style={{ fontSize:'2.2rem', lineHeight:1, flexShrink:0 }}>🌟</span>
                    <div style={{ flex:1, textAlign:'right' }}>
                      <div style={{ fontSize:'1.08rem', fontWeight:800, color:'#fff', textShadow:'0 1px 6px rgba(0,0,0,.25)' }}>العب الكل</div>
                      <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.75)', marginTop:2 }}>{gameWords.length} كلمة من كل المجموعات</div>
                      {allRes && (
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:5, flexWrap:'wrap' }}>
                          <span style={{ fontSize:'.8rem', color:'#86efac', fontWeight:700 }}>{'⭐'.repeat(allStars)}{'☆'.repeat(3 - allStars)}</span>
                          <span style={{ fontSize:'.76rem', background:'#16a34a', color:'#fff', borderRadius:30, padding:'2px 10px', fontWeight:800, boxShadow:'0 2px 6px rgba(0,0,0,.25)' }}>✓ {allRes.correct}</span>
                          <span style={{ fontSize:'.76rem', background:'#dc2626', color:'#fff', borderRadius:30, padding:'2px 10px', fontWeight:800, boxShadow:'0 2px 6px rgba(0,0,0,.25)' }}>✗ {allRes.wrong}</span>
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize:'1.4rem', color:'rgba(255,255,255,.65)', flexShrink:0 }}>←</span>
                  </div>
                );
              })()}

              {/* category circles */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14 }}>
                {categories.map((cat, idx) => {
                  const cs      = getCatStyle(cat, idx);
                  const custom  = catMeta[cat];
                  const bgGrad  = custom?.gradient || cs.grad;
                  const count   = gameWords.filter(w => w.category === cat).length;
                  const res     = catResults[cat];
                  const pct     = res ? Math.round((res.correct / res.total) * 100) : null;
                  const stars   = pct === null ? 0 : pct >= 80 ? 3 : pct >= 50 ? 2 : 1;
                  return (
                    <div
                      key={cat}
                      className="lc-cat"
                      style={{
                        background: bgGrad,
                        borderRadius: 22,
                        padding: '18px 8px 14px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        boxShadow: '0 8px 28px rgba(0,0,0,.26)',
                        animation: `lcCatIn .45s ${(idx + 1) * 0.07}s cubic-bezier(.34,1.56,.64,1) both`,
                        position: 'relative',
                      }}
                      onClick={() => startGame(cat)}
                    >
                      {custom?.image_url
                        ? <img src={custom.image_url} style={{ width:56, height:56, borderRadius:14, objectFit:'cover', boxShadow:'0 2px 8px rgba(0,0,0,.22)' }} />
                        : <span style={{ fontSize:'2.4rem', lineHeight:1 }}>{custom?.emoji || cs.emoji}</span>
                      }
                      <span style={{
                        fontSize:'.78rem', fontWeight:800, color:'#fff',
                        textShadow:'0 1px 4px rgba(0,0,0,.3)', lineHeight:1.3,
                        textAlign:'center', padding:'0 4px',
                      }}>
                        {cat}
                      </span>
                      {res ? (
                        <>
                          <span style={{ fontSize:'.72rem', letterSpacing:1, color:'rgba(255,255,255,.95)' }}>
                            {'⭐'.repeat(stars)}{'☆'.repeat(3 - stars)}
                          </span>
                          <div style={{ display:'flex', gap:5 }}>
                            <span style={{ fontSize:'.7rem', background:'#16a34a', color:'#fff', borderRadius:20, padding:'2px 9px', fontWeight:800, boxShadow:'0 2px 6px rgba(0,0,0,.3)' }}>✓ {res.correct}</span>
                            <span style={{ fontSize:'.7rem', background:'#dc2626', color:'#fff', borderRadius:20, padding:'2px 9px', fontWeight:800, boxShadow:'0 2px 6px rgba(0,0,0,.3)' }}>✗ {res.wrong}</span>
                          </div>
                        </>
                      ) : (
                        <span style={{ fontSize:'.65rem', color:'rgba(255,255,255,.7)', fontWeight:600 }}>
                          {count} كلمة
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Link href="/library" style={{ ...S.backLink, color:'rgba(255,255,255,.6)', display:'block', marginTop:28 }}>
            ← العودة للمكتبة
          </Link>
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
          <button
            style={{ ...S.btnGold, background:'linear-gradient(135deg,#5b4fc4,#7c3aed)', marginTop:-8 }}
            onClick={() => { setPhase('start'); setQueue([]); setCur(0); setScore(0); setChosen(null); setCorrect(null); }}
          >🏠 اختر مجموعة أخرى</button>
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
  const fullWordDisplay = w.word.includes('_') ? w.word.replace('_', w.missing_letter) : w.word;

  return (
    <div style={S.page}>
      <style>{`
        @keyframes ptFloatUp {
          0%   { opacity: 1; transform: translateY(0) scale(1.25); }
          70%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-48px) scale(0.9); }
        }
        @keyframes lcWordReveal {
          0%   { opacity:0; transform:scale(.15) rotate(-10deg); filter:blur(12px); }
          55%  { transform:scale(1.18) rotate(2deg);  filter:blur(0); }
          75%  { transform:scale(.95)  rotate(-1deg); }
          100% { opacity:1; transform:scale(1)   rotate(0); }
        }
        @keyframes lcWordFloat {
          0%,100% { transform:translateY(0px); }
          50%     { transform:translateY(-6px); }
        }
        @keyframes lcWordShimmer {
          0%   { background-position: 200% center; }
          100% { background-position:-200% center; }
        }
        @keyframes lcWrongShake {
          0%,100%{ transform:translateX(0); }
          20%   { transform:translateX(-7px); }
          40%   { transform:translateX(7px); }
          60%   { transform:translateX(-5px); }
          80%   { transform:translateX(5px); }
        }
        @keyframes lcSpark0 { 0%{opacity:0;transform:translate(0,0) scale(0)} 50%{opacity:1;transform:translate(-58px,-38px) scale(1.4)} 100%{opacity:0;transform:translate(-80px,-60px) scale(0)} }
        @keyframes lcSpark1 { 0%{opacity:0;transform:translate(0,0) scale(0)} 50%{opacity:1;transform:translate(55px,-46px) scale(1.4)} 100%{opacity:0;transform:translate(78px,-68px) scale(0)} }
        @keyframes lcSpark2 { 0%{opacity:0;transform:translate(0,0) scale(0)} 50%{opacity:1;transform:translate(-45px,44px) scale(1.2)} 100%{opacity:0;transform:translate(-64px,66px) scale(0)} }
        @keyframes lcSpark3 { 0%{opacity:0;transform:translate(0,0) scale(0)} 50%{opacity:1;transform:translate(58px,40px) scale(1.3)} 100%{opacity:0;transform:translate(80px,62px) scale(0)} }
        @keyframes lcSpark4 { 0%{opacity:0;transform:translate(0,0) scale(0)} 50%{opacity:1;transform:translate(0,-68px) scale(1.5)} 100%{opacity:0;transform:translate(0,-95px) scale(0)} }
        @keyframes lcSpark5 { 0%{opacity:0;transform:translate(0,0) scale(0)} 50%{opacity:1;transform:translate(-30px,58px) scale(1.2)} 100%{opacity:0;transform:translate(-44px,80px) scale(0)} }
        @keyframes lcSpark6 { 0%{opacity:0;transform:translate(0,0) scale(0)} 50%{opacity:1;transform:translate(36px,62px) scale(1.3)} 100%{opacity:0;transform:translate(52px,88px) scale(0)} }
        @keyframes lcGlowPulse {
          0%,100% { box-shadow:0 0 18px 2px rgba(34,197,94,.22), 0 6px 28px rgba(0,0,0,.1); }
          50%     { box-shadow:0 0 36px 8px rgba(34,197,94,.38), 0 8px 32px rgba(0,0,0,.12); }
        }
      `}</style>

      <div style={S.headerRow}>
        <button
          onClick={() => { setPhase('start'); setQueue([]); setCur(0); setScore(0); setChosen(null); setCorrect(null); }}
          style={{ flexShrink:0, background:'rgba(255,255,255,.18)', border:'none', borderRadius:10, padding:'5px 12px', color:'#fff', cursor:'pointer', fontSize:'.82rem', fontWeight:700, fontFamily:"'Tajawal', sans-serif" }}
        >← رجوع</button>
        <span style={S.scoreBadge}>✨ {score}</span>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <span style={{ background: 'rgba(245,158,11,0.28)', borderRadius: 20, padding: '4px 12px', fontSize: '.88rem', fontWeight: 800, color: '#fff' }}>⭐ {totalPoints.toLocaleString()}</span>
          {ptPopupActive && (
            <span key={ptPopupKey} style={{ position: 'absolute', top: -28, left: '50%', transform: 'translateX(-50%)', color: '#fbbf24', fontWeight: 900, fontSize: '1.05rem', pointerEvents: 'none', whiteSpace: 'nowrap', animation: 'ptFloatUp 1.1s ease forwards', textShadow: '0 1px 6px rgba(0,0,0,.45)' }}>+5 ⭐</span>
          )}
        </div>
        <div style={S.bar}>
          <div style={{ ...S.barFill, width: `${((cur + 1) / queue.length) * 100}%` }} />
        </div>
        <span style={S.barLabel}>{cur + 1} / {queue.length}</span>
      </div>

      <div style={S.card}>
        <WordImage imageUrl={w.image_url} emoji={w.emoji} />

        {/* ── word display area ── */}
        {correct === true ? (
          /* ── correct: beautiful full-word reveal ── */
          <div style={{ position:'relative', padding:'10px 0 14px', textAlign:'center', overflow:'visible' }}>
            {/* sparkle particles */}
            {[
              { em:'✨', an:'lcSpark0', delay:'0ms',   fs:'1.3rem' },
              { em:'⭐', an:'lcSpark1', delay:'80ms',  fs:'1.1rem' },
              { em:'💫', an:'lcSpark2', delay:'50ms',  fs:'1.2rem' },
              { em:'🌟', an:'lcSpark3', delay:'130ms', fs:'1.1rem' },
              { em:'✨', an:'lcSpark4', delay:'30ms',  fs:'1.4rem' },
              { em:'⭐', an:'lcSpark5', delay:'100ms', fs:'1rem'   },
              { em:'💫', an:'lcSpark6', delay:'60ms',  fs:'1.1rem' },
            ].map((p, i) => (
              <span key={i} style={{
                position:'absolute', top:'50%', left:'50%',
                fontSize: p.fs, lineHeight:1, pointerEvents:'none',
                animation: `${p.an} .9s ${p.delay} cubic-bezier(.25,.46,.45,.94) both`,
              }}>{p.em}</span>
            ))}

            {/* reveal container */}
            <div style={{
              display:'inline-flex', flexDirection:'column', alignItems:'center',
              background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',
              borderRadius:28, padding:'10px 28px 14px',
              border:'2.5px solid #86efac',
              animation:'lcGlowPulse 1.8s .4s ease-in-out infinite, lcWordReveal .55s cubic-bezier(.34,1.56,.64,1) both',
            }}>
              <div style={{ fontSize:'.8rem', fontWeight:800, color:'#15803d', marginBottom:3, letterSpacing:'.02em' }}>
                ✅ أحسنت! 🎉
              </div>
              <div style={{
                fontSize: fullWordDisplay.length > 6 ? '2.1rem' : '2.7rem',
                fontWeight:900,
                fontFamily:"'Cairo','Tajawal',sans-serif",
                direction:'rtl',
                background:'linear-gradient(90deg,#f59e0b,#10b981,#3b82f6,#8b5cf6,#f59e0b)',
                backgroundSize:'300% auto',
                WebkitBackgroundClip:'text',
                WebkitTextFillColor:'transparent',
                backgroundClip:'text',
                lineHeight:1.45,
                animation:'lcWordShimmer 2.5s .55s linear infinite, lcWordFloat 2.8s .55s ease-in-out infinite',
                willChange:'transform',
              }}>
                {fullWordDisplay}
              </div>
            </div>
          </div>
        ) : (
          /* ── unanswered / wrong: segmented letter boxes ── */
          <div style={{ ...S.wordRow, animation: correct === false ? 'lcWrongShake .45s cubic-bezier(.36,.07,.19,.97) both' : 'none' }}>
            {mi < 0 ? (
              <>
                <span style={S.wordLetterBox}>{w.word}</span>
                <span style={{ ...S.blank, background:'#eef3fc', borderColor:'#7c3aed', color:'#7c3aed' }}>؟</span>
              </>
            ) : sw.split('').map((ch, i) => {
              const form = getLetterForm(sw, i);
              if (i === mi) {
                return (
                  <span key={i} style={{
                    ...S.blank,
                    background:  correct === null ? '#eef3fc' : '#f8d7da',
                    borderColor: correct === null ? '#7c3aed'  : '#e74c3c',
                    color:       correct === null ? '#7c3aed'  : '#e74c3c',
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
        )}

        {/* feedback for wrong answer only */}
        {correct === false && (
          <div style={{ ...S.feedback, color:'#9b1c1c', background:'#f8d7da' }}>
            {`❌ الصحيح: ${w.missing_letter}`}
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
    width: '100%',
    boxSizing: 'border-box',
    overflowX: 'hidden',
    background: 'linear-gradient(135deg, #5b4fc4 0%, #7c3aed 50%, #9c3ec4 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '16px 12px', fontFamily: "'Tajawal', sans-serif", direction: 'rtl',
  },
  centerCard: {
    position: 'relative', background: '#fff', borderRadius: 24, padding: '32px 22px',
    textAlign: 'center', maxWidth: 580, width: '100%',
    boxSizing: 'border-box',
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
    background: '#fff', borderRadius: 20, padding: '24px 20px', width: '100%', maxWidth: 520,
    boxSizing: 'border-box',
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
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', maxWidth: 640,
    boxSizing: 'border-box',
    marginBottom: 12, color: '#fff',
  },
  scoreBadge: {
    fontSize: '1rem', fontWeight: 700, flexShrink: 0,
    background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '4px 14px',
  },
  bar: { flex: 1, height: 8, background: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', background: '#fbbf24', borderRadius: 4, transition: 'width 0.4s' },
  barLabel: { fontSize: '0.88rem', flexShrink: 0, opacity: 0.82 },
  card: {
    background: '#fff', borderRadius: 24, padding: '24px 18px', width: '100%', maxWidth: 640,
    boxSizing: 'border-box',
    boxShadow: '0 24px 64px rgba(0,0,0,0.32)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
  },
  emojiBox: {
    width: 140, height: 140, background: '#f5f3ff', borderRadius: 20,
    fontSize: '4.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  wordImg: { width: 140, height: 140, objectFit: 'contain', borderRadius: 16 },
  wordRow: {
    display: 'flex', alignItems: 'center', gap: 6,
    flexWrap: 'wrap', justifyContent: 'center', direction: 'rtl',
  },
  wordLetterBox: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 44, height: 56, borderRadius: 10,
    background: '#f5f3ff', border: '2px solid #ede9fe',
    fontSize: '2rem', fontWeight: 700, color: '#1a1a2e', padding: '0 6px',
  },
  blank: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 48, height: 56, border: '3px dashed', borderRadius: 10,
    fontSize: '2rem', fontWeight: 700, transition: 'all 0.3s', padding: '0 6px',
  },
  feedback: {
    padding: '10px 22px', borderRadius: 10, fontSize: '1rem',
    fontWeight: 600, textAlign: 'center', width: '100%',
  },
  optRow: { display: 'grid', gap: 10, width: '100%', boxSizing: 'border-box' },
  optBtn: {
    width: '100%',
    aspectRatio: '1',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, border: '2px solid #e5e7eb',
    background: '#f9fafb', fontSize: '1.8rem', fontWeight: 700, cursor: 'pointer',
    transition: 'all 0.18s', fontFamily: "'Tajawal', sans-serif", color: '#1a1a2e',
    boxSizing: 'border-box',
  },
  optCorrect: { background: '#d4edda', borderColor: '#27ae60', color: '#1a6b38' },
  optWrong:   { background: '#f8d7da', borderColor: '#e74c3c', color: '#9b1c1c' },
  btnBlue: {
    background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 14,
    padding: '13px 0', fontSize: '1.05rem', fontWeight: 700, cursor: 'pointer',
    fontFamily: "'Tajawal', sans-serif", width: '100%', maxWidth: 420,
  },
};
