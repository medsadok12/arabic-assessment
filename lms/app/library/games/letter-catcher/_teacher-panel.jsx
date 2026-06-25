'use client';

import { useState, useRef } from 'react';

/* ── constants (duplicated here so this chunk loads independently) ── */
const TOPICS = ['الحيوانات', 'الأشكال', 'الأسرة', 'الألوان', 'الفواكه', 'المدرسة', 'الطقس', 'الأرقام'];

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

function speak(text) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ar-SA'; u.rate = 0.82;
  function go() {
    window.speechSynthesis.cancel();
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

/* ── styles used only in this panel ── */
const P = {
  input: {
    width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10,
    padding: '9px 12px', fontSize: '1rem', fontFamily: "'Tajawal', sans-serif",
    boxSizing: 'border-box', outline: 'none',
  },
  addBtn: {
    marginTop: 12, width: '100%', background: 'linear-gradient(135deg,#5b4fc4,#7c3aed)',
    color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0',
    fontSize: '.9rem', fontWeight: 700, fontFamily: "'Tajawal', sans-serif",
  },
  btnGold: {
    background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff', border: 'none',
    borderRadius: 14, padding: '14px 0', fontSize: '1.1rem', fontWeight: 700,
    cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", width: '100%',
    boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
  },
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: 20,
  },
  card: {
    background: '#fff', borderRadius: 20, padding: '24px 20px', width: '100%', maxWidth: 520,
    boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 0,
    boxShadow: '0 16px 48px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto',
    fontFamily: "'Tajawal', sans-serif",
  },
  label: {
    display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.95rem', fontWeight: 600,
    color: '#374151', textAlign: 'right', marginBottom: 16,
  },
  select: {
    padding: '10px 14px', borderRadius: 10, border: '2px solid #e5e7eb',
    fontSize: '1rem', fontFamily: "'Tajawal', sans-serif", direction: 'rtl',
    color: '#1a1a2e', cursor: 'pointer',
  },
};

/* ════════════════════════ WordManager ════════════════════════ */
function WordManager({ dbWords, onRefresh, catMeta, onCatMetaRefresh }) {
  const [word,      setWord]      = useState('');
  const [missing,   setMissing]   = useState('');
  const [audioUrl,  setAudioUrl]  = useState(null);
  const [recording, setRecording] = useState(false);
  const [recSecs,   setRecSecs]   = useState(0);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(null);
  const [msg,       setMsg]       = useState(null);
  const [category,  setCategory]  = useState('');
  const [imgFile,   setImgFile]   = useState(null);
  const [imgPrev,   setImgPrev]   = useState(null);
  const fileRef   = useRef();
  const catImgRef = useRef();
  const mediaRef  = useRef(null);
  const chunksRef = useRef([]);
  const timerRef  = useRef(null);

  /* inline category icon editor */
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
    } catch { setCatMsg({ ok: false, text: '❌ فشل الحفظ' }); }
    setCatSaving(false);
  };

  const resetCatMeta = async () => {
    setCatSaving(true); setCatMsg(null);
    try {
      await fetch(`/api/games/letter-catcher/categories?name=${encodeURIComponent(editingCat)}`, { method: 'DELETE' });
      setCatMsg({ ok: true, text: '↩️ أُعيد للافتراضي' });
      onCatMetaRefresh?.();
      setTimeout(() => setEditingCat(null), 800);
    } catch { setCatMsg({ ok: false, text: '❌ فشل' }); }
    setCatSaving(false);
  };

  const handleImg = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setImgFile(f); setImgPrev(URL.createObjectURL(f));
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
      mediaRef.current = mr; mr.start();
      setRecording(true); setRecSecs(0);
      timerRef.current = setInterval(() => setRecSecs(s => s + 1), 1000);
    } catch { alert('تعذّر الوصول إلى الميكروفون — تأكد من منح الإذن'); }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    mediaRef.current?.stop();
    setRecording(false);
  };

  const handleAdd = async () => {
    if (!word.trim() || !missing.trim()) { setMsg({ ok: false, text: 'اكتب الكلمة والحرف الناقص أولاً' }); return; }
    if (!word.includes('_')) { setMsg({ ok: false, text: 'ضع رمز _ في مكان الحرف الناقص\nمثال: مَد_رَسة' }); return; }
    setSaving(true); setMsg(null);
    try {
      let image_url = null;
      if (imgFile) image_url = await fileToBase64(imgFile);
      const res = await fetch('/api/games/letter-catcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: word.trim(), missing_letter: missing.trim(), image_url, audio_url: audioUrl || null, topic: category.trim() || null, category: category.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'فشل الحفظ');
      setMsg({ ok: true, text: `✅ أُضيفت "${word.trim().replace('_', missing.trim())}" بنجاح` });
      setWord(''); setMissing(''); setCategory(''); setImgFile(null); setImgPrev(null); setAudioUrl(null);
      if (fileRef.current) fileRef.current.value = '';
      onRefresh();
    } catch (e) { setMsg({ ok: false, text: `❌ ${e.message}` }); }
    setSaving(false);
  };

  const handleDelete = async (id, w) => {
    if (!confirm(`حذف كلمة "${w}"؟`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/games/letter-catcher?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onRefresh();
    } catch { alert('فشل الحذف'); }
    setDeleting(null);
  };

  return (
    <div>
      <div style={{ background:'#f5f3ff', borderRadius:14, padding:16, marginBottom:18, border:'1.5px dashed #7c3aed' }}>
        <div style={{ fontWeight:800, color:'#7c3aed', marginBottom:12, fontSize:'.92rem' }}>➕ إضافة كلمة جديدة</div>

        <input value={word} onChange={e => setWord(e.target.value)}
          placeholder="مثال: مَد_رَسة  (ضع _ مكان الحرف الناقص)"
          style={P.input} dir="rtl" />
        <div style={{ fontSize:'.78rem', color:'#7c3aed', marginTop:3, textAlign:'right', fontWeight:600 }}>
          💡 اكتب الكلمة وضع رمز الشرطة السفلية _ في مكان الحرف الناقص
        </div>

        <div style={{ display:'flex', gap:8, marginTop:8, alignItems:'center' }}>
          <input value={missing} onChange={e => setMissing(e.target.value)}
            placeholder="الحرف الناقص (مثال: ق)"
            style={{ ...P.input, flex:1, marginTop:0 }} dir="rtl" maxLength={2} />
          <button type="button"
            onClick={() => word.trim() && speak(word.includes('_') ? word.replace('_', missing.trim() || '') : word.trim())}
            title="استمع للكلمة"
            style={{ flexShrink:0, background:'#ede9fe', border:'none', borderRadius:10, width:42, height:42, cursor:'pointer', fontSize:'1.2rem' }}>
            🔊
          </button>
        </div>

        {/* image picker */}
        <div onClick={() => fileRef.current?.click()} style={{
          marginTop:8, borderRadius:12, border:'2px dashed #c4b5fd', background:'#faf5ff',
          cursor:'pointer', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center',
          height: imgPrev ? 'auto' : 72, minHeight:72,
        }}>
          {imgPrev
            ? <img src={imgPrev} alt="preview" style={{ width:'100%', maxHeight:140, objectFit:'contain', display:'block' }} />
            : <span style={{ color:'#a78bfa', fontSize:'.85rem', fontWeight:700 }}>📷 انقر لاختيار صورة الكلمة</span>
          }
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} style={{ display:'none' }} />

        {/* audio recorder */}
        <div style={{ marginTop:8 }}>
          {!audioUrl ? (
            <button type="button" onClick={recording ? stopRecording : startRecording} style={{
              width:'100%', border:'none', borderRadius:10, padding:'11px',
              fontSize:'.88rem', fontWeight:700, cursor:'pointer', fontFamily:"'Tajawal', sans-serif",
              background: recording ? '#fee2e2' : '#f0fdf4',
              color: recording ? '#dc2626' : '#16a34a',
            }}>
              {recording ? `⏹️ إيقاف التسجيل (${recSecs}ث)` : '🎙️ تسجيل صوت الكلمة (اختياري)'}
            </button>
          ) : (
            <div style={{ background:'#f0fdf4', borderRadius:10, padding:10, border:'1.5px solid #86efac' }}>
              <div style={{ fontSize:'.78rem', color:'#16a34a', fontWeight:700, marginBottom:6, textAlign:'right' }}>
                ✅ التسجيل جاهز — سيُحفظ مع الكلمة عند الضغط على زر الحفظ
              </div>
              <audio src={audioUrl} controls style={{ width:'100%', height:36, display:'block', borderRadius:6 }} />
              <div style={{ display:'flex', gap:8, marginTop:8 }}>
                <button type="button" onClick={recording ? stopRecording : startRecording} style={{
                  flex:1, border:'none', borderRadius:8, padding:'7px', fontSize:'.8rem',
                  fontWeight:700, cursor:'pointer', fontFamily:"'Tajawal', sans-serif",
                  background: recording ? '#fee2e2' : '#ede9fe',
                  color: recording ? '#dc2626' : '#7c3aed',
                }}>{recording ? `⏹️ إيقاف (${recSecs}ث)` : '🔄 إعادة التسجيل'}</button>
                <button type="button" onClick={() => setAudioUrl(null)} style={{
                  border:'none', borderRadius:8, padding:'7px 14px', fontSize:'.8rem',
                  fontWeight:700, cursor:'pointer', fontFamily:"'Tajawal', sans-serif",
                  background:'#fee2e2', color:'#dc2626',
                }}>🗑️ حذف</button>
              </div>
            </div>
          )}
        </div>

        <input list="lc-cat-list" value={category} onChange={e => setCategory(e.target.value)}
          placeholder="التصنيف التعليمي: الحيوانات، الفواكه... (اختياري)"
          style={{ ...P.input, marginTop:8 }} dir="rtl" />
        <datalist id="lc-cat-list">
          {Object.keys(CAT_META).map(c => <option key={c} value={c} />)}
        </datalist>
        <div style={{ fontSize:'.72rem', color:'#7c3aed', marginTop:3, textAlign:'right', fontWeight:600 }}>
          💡 التصنيف يُظهر الكلمة في دائرة مجموعتها في شاشة الاختيار
        </div>

        {msg && (
          <div style={{ marginTop:10, padding:'8px 12px', borderRadius:8, fontSize:'.85rem', fontWeight:700, background: msg.ok ? '#d4edda' : '#f8d7da', color: msg.ok ? '#155724' : '#721c24' }}>
            {msg.text}
          </div>
        )}

        <button onClick={handleAdd} disabled={saving || !word.trim() || !missing.trim()}
          style={{ ...P.addBtn, opacity:(saving || !word.trim() || !missing.trim()) ? 0.6 : 1, cursor:(saving || !word.trim() || !missing.trim()) ? 'not-allowed' : 'pointer' }}>
          {saving ? 'جارٍ الحفظ…' : '💾 حفظ في قاعدة البيانات'}
        </button>
      </div>

      {dbWords.length > 0 && <div style={{ fontWeight:700, color:'#374151', marginBottom:10, fontSize:'.88rem' }}>📚 الكلمات ({dbWords.length})</div>}
      {dbWords.length === 0 ? (
        <div style={{ textAlign:'center', color:'#9ca3af', padding:'16px 0', fontSize:'.88rem' }}>لا توجد كلمات بعد — أضف أولى كلماتك أعلاه</div>
      ) : (() => {
        const groups = {};
        dbWords.forEach(w => { const key = w.category || '__none__'; (groups[key] = groups[key] || []).push(w); });
        const keys = Object.keys(groups).sort((a, b) => { if (a==='__none__') return 1; if (b==='__none__') return -1; return a.localeCompare(b,'ar'); });
        return (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
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
                  <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:8, marginBottom: isEditing ? 0 : 6, background: accentColor+'12', borderRight:`3px solid ${accentColor}`, borderBottomLeftRadius: isEditing ? 0 : 8, borderBottomRightRadius: isEditing ? 0 : 8 }}>
                    {displayImg ? <img src={displayImg} style={{ width:22, height:22, borderRadius:5, objectFit:'cover', flexShrink:0 }} /> : <span style={{ fontSize:'1rem' }}>{displayEmoji}</span>}
                    <span style={{ fontWeight:800, color:'#1f2937', fontSize:'.86rem' }}>{cat || 'بدون تصنيف'}</span>
                    <span style={{ marginRight:'auto', background:'#f3f4f6', borderRadius:20, padding:'1px 8px', fontSize:'.72rem', color:'#6b7280', fontWeight:700 }}>{words.length}</span>
                    {cat && (
                      <button onClick={() => isEditing ? setEditingCat(null) : openCatEdit(cat, gIdx)}
                        style={{ background: isEditing ? '#fef2f2' : '#f5f3ff', border:'none', borderRadius:6, padding:'3px 7px', cursor:'pointer', fontSize:'.72rem', fontWeight:700, color: isEditing ? '#ef4444' : '#7c3aed', flexShrink:0 }}>
                        {isEditing ? '✕ إغلاق' : '✏️ تعديل الأيقونة'}
                      </button>
                    )}
                  </div>

                  {isEditing && (
                    <div style={{ background:'#faf5ff', border:`1.5px solid ${accentColor}40`, borderTop:'none', borderRadius:'0 0 8px 8px', padding:'10px 12px', marginBottom:6 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <div onClick={() => catImgRef.current?.click()} title="انقر لتغيير الصورة"
                          style={{ width:44, height:44, borderRadius:10, overflow:'hidden', background:cs.grad, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,.18)', flexShrink:0 }}>
                          {catImgVal ? <img src={catImgVal} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <span style={{ fontSize:'1.5rem', lineHeight:1 }}>{catEmojiVal}</span>}
                        </div>
                        <input value={catImgVal ? '' : catEmojiVal} onChange={e => { setCatEmojiVal(e.target.value); setCatImgVal(null); }}
                          placeholder="🔤 أيقونة" disabled={!!catImgVal} maxLength={2}
                          style={{ width:54, textAlign:'center', fontSize:'1.2rem', border:'1.5px solid #ddd6fe', borderRadius:8, padding:'5px', fontFamily:'inherit', background: catImgVal ? '#f3f4f6' : '#fff' }} />
                        <button onClick={() => catImgRef.current?.click()}
                          style={{ background:'#f0fdf4', border:'1.5px solid #86efac', borderRadius:8, padding:'6px 10px', cursor:'pointer', fontSize:'.78rem', fontWeight:700, color:'#15803d' }}>🖼️ صورة</button>
                        <input type="file" accept="image/*" hidden ref={catImgRef}
                          onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const b64 = await fileToBase64(f); setCatImgVal(b64); setCatEmojiVal(''); }} />
                        {catImgVal && <button onClick={() => setCatImgVal(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', fontSize:'.9rem', padding:'2px 4px' }}>✕ مسح</button>}
                        <button onClick={saveCatMeta} disabled={catSaving}
                          style={{ background:'linear-gradient(135deg,#5b4fc4,#7c3aed)', border:'none', borderRadius:8, padding:'6px 14px', color:'#fff', fontSize:'.8rem', fontWeight:700, cursor:'pointer' }}>
                          {catSaving ? '…' : 'حفظ'}
                        </button>
                        {(customMeta?.emoji || customMeta?.image_url) && (
                          <button onClick={resetCatMeta} disabled={catSaving}
                            style={{ background:'none', border:'1.5px solid #e5e7eb', borderRadius:8, padding:'5px 10px', color:'#9ca3af', fontSize:'.75rem', fontWeight:700, cursor:'pointer' }}>
                            ↩️ افتراضي
                          </button>
                        )}
                      </div>
                      {catMsg && <div style={{ marginTop:6, fontSize:'.78rem', fontWeight:700, color: catMsg.ok ? '#15803d' : '#b91c1c' }}>{catMsg.text}</div>}
                    </div>
                  )}

                  <div style={{ display:'flex', flexDirection:'column', gap:4, paddingRight:10 }}>
                    {words.map(w => (
                      <div key={w.id} style={{ display:'flex', alignItems:'center', gap:7, background:'#f9fafb', borderRadius:8, padding:'6px 10px', border:'1px solid #e5e7eb' }}>
                        {w.image_url ? <img src={w.image_url} alt="" style={{ width:26, height:26, objectFit:'cover', borderRadius:5, flexShrink:0 }} /> : w.emoji ? <span style={{ fontSize:'1rem' }}>{w.emoji}</span> : null}
                        <span style={{ flex:1, fontWeight:700, color:'#1f2937', fontSize:'.88rem' }}>{w.word.includes('_') ? w.word.replace('_', w.missing_letter) : w.word}</span>
                        <span style={{ background:'#ede9fe', color:'#7c3aed', borderRadius:20, padding:'1px 7px', fontSize:'.72rem', fontWeight:700 }}>{w.missing_letter}</span>
                        {w.audio_url && <span title="يحتوي على تسجيل" style={{ fontSize:'.7rem' }}>🎙️</span>}
                        <button onClick={() => w.audio_url ? new Audio(w.audio_url).play() : speak(w.word.includes('_') ? w.word.replace('_', w.missing_letter) : w.word)}
                          title="استمع" style={{ background:'none', border:'none', cursor:'pointer', fontSize:'.9rem', padding:'2px 3px', lineHeight:1 }}>🔊</button>
                        <button onClick={() => handleDelete(w.id, w.word)} disabled={deleting === w.id}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', fontSize:'.9rem', padding:'2px 3px', lineHeight:1 }} title="حذف">
                          {deleting === w.id ? '…' : '🗑️'}
                        </button>
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

/* ════════════════════════ SettingsPanel (default export) ════════════════════════ */
export default function SettingsPanel({ cfg, onChange, onClose, dbWords, onRefresh, catMeta, onCatMetaRefresh }) {
  const [cfgOpen, setCfgOpen] = useState(false);

  return (
    <div style={P.overlay} onClick={onClose}>
      <div style={P.card} onClick={e => e.stopPropagation()}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <h3 style={{ margin:0, color:'#1f2937', fontSize:'1.1rem' }}>📖 إدارة الكلمات</h3>
          <button onClick={onClose} style={{ background:'#f3f4f6', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', fontSize:'1rem', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>

        <div style={{ marginBottom:16, borderRadius:12, border:'1.5px solid #e5e7eb', overflow:'hidden' }}>
          <button onClick={() => setCfgOpen(o => !o)} style={{ width:'100%', background: cfgOpen ? '#f5f3ff' : '#f9fafb', border:'none', padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', fontFamily:"'Tajawal', sans-serif" }}>
            <span style={{ fontWeight:700, color:'#5b4fc4', fontSize:'.9rem' }}>⚙️ إعدادات الجولة</span>
            <span style={{ color:'#9ca3af', fontSize:'.78rem' }}>{cfgOpen ? '▲ طي' : '▼ توسيع'}</span>
          </button>
          {cfgOpen && (
            <div style={{ padding:'14px', borderTop:'1px solid #e5e7eb' }}>
              <label style={P.label}>
                عدد الأسئلة في الجولة
                <input type="number" min={1} value={cfg.questionsPerRound}
                  onChange={e => onChange({ ...cfg, questionsPerRound: Math.max(1, Number(e.target.value) || 1) })}
                  style={P.select} />
              </label>
              <label style={P.label}>
                عدد الخيارات لكل سؤال
                <select value={cfg.optionsCount} onChange={e => onChange({ ...cfg, optionsCount: Number(e.target.value) })} style={P.select}>
                  {[3, 4, 5].map(v => <option key={v} value={v}>{v} خيارات</option>)}
                </select>
              </label>
              <label style={P.label}>
                الموضوع
                <select value={cfg.topic} onChange={e => onChange({ ...cfg, topic: e.target.value })} style={P.select}>
                  <option value=''>كل المواضيع</option>
                  {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label style={P.label}>
                الصف الدراسي
                <select value={cfg.grade} onChange={e => onChange({ ...cfg, grade: Number(e.target.value) })} style={P.select}>
                  <option value={0}>كل الصفوف</option>
                  {[1, 2, 3, 4, 5, 6].map(g => <option key={g} value={g}>الصف {g}</option>)}
                </select>
              </label>
              <label style={P.label}>
                طول الكلمة: {cfg.minLen} – {cfg.maxLen} حرفاً
                <div style={{ display:'flex', gap:16, marginTop:4 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'.75rem', color:'#9ca3af', marginBottom:4, textAlign:'center' }}>أدنى: {cfg.minLen}</div>
                    <input type="range" min={2} max={cfg.maxLen} value={cfg.minLen}
                      onChange={e => onChange({ ...cfg, minLen: Number(e.target.value) })}
                      style={{ width:'100%', accentColor:'#7c3aed' }} />
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'.75rem', color:'#9ca3af', marginBottom:4, textAlign:'center' }}>أقصى: {cfg.maxLen}</div>
                    <input type="range" min={cfg.minLen} max={12} value={cfg.maxLen}
                      onChange={e => onChange({ ...cfg, maxLen: Number(e.target.value) })}
                      style={{ width:'100%', accentColor:'#7c3aed' }} />
                  </div>
                </div>
              </label>
              <button style={P.btnGold} onClick={() => { setCfgOpen(false); onClose(); }}>حفظ الإعدادات ✓</button>
            </div>
          )}
        </div>

        <WordManager dbWords={dbWords} onRefresh={onRefresh} catMeta={catMeta} onCatMetaRefresh={onCatMetaRefresh} />
      </div>
    </div>
  );
}
