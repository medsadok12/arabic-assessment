'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import { createClient } from '../../../lib/supabase';

const WORD_TYPES = ['اسم', 'فعل', 'صفة', 'ظرف', 'حرف', 'ضمير'];
const TOPICS     = ['الحيوانات', 'الطبيعة', 'الأسرة', 'المدرسة', 'الطعام', 'الجسم', 'الألوان', 'الأعداد', 'المهن', 'الزمن', 'أخرى'];
const GRADE_OPTS = [1, 2, 3, 4, 5, 6, 7];
const EMPTY_FORM = { word: '', word_type: 'اسم', sentence: '', topic: 'أخرى', grade_from: 1, grade_to: 7, syllables: '', root: '' };

function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result); // full data URI
    r.onerror = () => reject(new Error('فشل قراءة الملف'));
    r.readAsDataURL(file);
  });
}

export default function LexiconAdminPage() {
  const supabase = createClient();

  const [user, setUser]     = useState(null);
  const [role, setRole]     = useState('');
  const [words, setWords]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]     = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType,  setFilterType]  = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState(null);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // Media upload state
  const [imageFile, setImageFile]               = useState(null);
  const [imageData, setImageData]               = useState(null); // new data URI
  const [audioFile, setAudioFile]               = useState(null);
  const [audioData, setAudioData]               = useState(null); // new data URI
  const [existingImg, setExistingImg]           = useState(null); // existing (edit)
  const [existingAudio, setExistingAudio]       = useState(null); // existing (edit)
  const [clearImage, setClearImage]             = useState(false);
  const [clearAudio, setClearAudio]             = useState(false);
  const imageRef = useRef();
  const audioRef = useRef();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) { setUser(u); setRole(u.user_metadata?.role ?? ''); }
    });
    loadWords();
  }, []);

  async function loadWords() {
    setLoading(true);
    const res  = await fetch('/api/bogga/lexicon');
    const data = await res.json();
    setWords(data.words ?? []);
    setLoading(false);
  }

  const set = k => v => setForm(p => ({ ...p, [k]: v.target ? v.target.value : v }));

  function resetMedia() {
    setImageFile(null); setImageData(null);
    setAudioFile(null); setAudioData(null);
    setExistingImg(null); setExistingAudio(null);
    setClearImage(false); setClearAudio(false);
    if (imageRef.current) imageRef.current.value = '';
    if (audioRef.current) audioRef.current.value = '';
  }

  async function pickImage(e) {
    const f = e.target.files[0]; if (!f) return;
    if (!f.type.startsWith('image/')) { setMsg({ type: 'error', text: 'يُقبل ملف صورة فقط (JPG/PNG/WebP)' }); return; }
    if (f.size > 500 * 1024)          { setMsg({ type: 'error', text: 'حجم الصورة يجب أن يكون أقل من 500 كيلوبايت' }); return; }
    const uri = await readFile(f).catch(() => null);
    if (!uri) return;
    setImageFile(f); setImageData(uri); setClearImage(false); setMsg(null);
  }

  async function pickAudio(e) {
    const f = e.target.files[0]; if (!f) return;
    if (!f.type.startsWith('audio/')) { setMsg({ type: 'error', text: 'يُقبل ملف صوتي فقط (MP3/WAV/OGG)' }); return; }
    if (f.size > 1 * 1024 * 1024)    { setMsg({ type: 'error', text: 'حجم الصوت يجب أن يكون أقل من 1 ميغابايت' }); return; }
    const uri = await readFile(f).catch(() => null);
    if (!uri) return;
    setAudioFile(f); setAudioData(uri); setClearAudio(false); setMsg(null);
  }

  function removeImage() {
    setClearImage(true); setImageFile(null); setImageData(null); setExistingImg(null);
    if (imageRef.current) imageRef.current.value = '';
  }

  function removeAudio() {
    setClearAudio(true); setAudioFile(null); setAudioData(null); setExistingAudio(null);
    if (audioRef.current) audioRef.current.value = '';
  }

  async function startEdit(w) {
    setForm({
      word: w.word, word_type: w.word_type, sentence: w.sentence ?? '',
      topic: w.topic ?? 'أخرى', grade_from: w.grade_from, grade_to: w.grade_to,
      syllables: w.syllables ?? '', root: w.root ?? '',
    });
    setEditId(w.id);
    resetMedia();

    // Load existing media only if flags indicate presence
    if (w.has_image || w.has_audio) {
      setLoadingMedia(true);
      try {
        const res  = await fetch(`/api/bogga/lexicon/${w.id}`);
        const data = await res.json();
        if (data.word) {
          setExistingImg(data.word.image_base64 ?? null);
          setExistingAudio(data.word.audio_base64 ?? null);
        }
      } catch {}
      setLoadingMedia(false);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.word.trim()) return;
    setSaving(true);

    const body = {
      ...form,
      word:      form.word.trim(),
      sentence:  form.sentence.trim(),
      syllables: form.syllables.trim(),
      root:      form.root.trim(),
      grade_from: +form.grade_from,
      grade_to:   +form.grade_to,
    };

    // Include media changes
    if (imageData)    body.image_data  = imageData;
    else if (clearImage) body.clear_image = true;
    if (audioData)    body.audio_data  = audioData;
    else if (clearAudio) body.clear_audio = true;

    const url    = editId ? `/api/bogga/lexicon/${editId}` : '/api/bogga/lexicon';
    const method = editId ? 'PATCH' : 'POST';

    const res  = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      setMsg({ type: 'error', text: data.error });
    } else {
      let text = editId ? '✅ تم التعديل بنجاح' : '✅ تمت الإضافة بنجاح';
      if (data.media_skipped) {
        text = '⚠️ تم حفظ الكلمة لكن الوسائط لم تُحفظ — شغّل SQL التهيئة المحدّث من /bogga ← إعداد';
      }
      setMsg({ type: data.media_skipped ? 'error' : 'success', text });
      setForm(EMPTY_FORM); setEditId(null); resetMedia();
      await loadWords();
    }
    setSaving(false);
    setTimeout(() => setMsg(null), 6000);
  }

  async function handleDelete(id) {
    if (role !== 'super_admin') { setMsg({ type: 'error', text: 'لا تملك صلاحية الحذف' }); return; }
    if (!confirm('هل تريد حذف هذه الكلمة نهائياً؟')) return;
    await fetch(`/api/bogga/lexicon/${id}`, { method: 'DELETE' });
    setWords(p => p.filter(w => w.id !== id));
  }

  const filtered = words.filter(w =>
    (!search     || w.word.includes(search) || (w.sentence ?? '').includes(search)) &&
    (!filterType  || w.word_type === filterType) &&
    (!filterTopic || w.topic === filterTopic)
  );

  const isSuperAdmin  = role === 'super_admin';
  const showSyllables = +form.grade_from <= 4 || +form.grade_to <= 4;
  const showRoot      = +form.grade_to >= 5;
  const curImg        = imageData  ?? (clearImage  ? null : existingImg);
  const curAudio      = audioData  ?? (clearAudio  ? null : existingAudio);

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap" dir="rtl">
        <div className="container">

          <div style={{ marginBottom: 20 }}>
            <Link href="/bogga" style={{ color: 'var(--primary)', fontSize: '.88rem', textDecoration: 'none' }}>
              ← حصن الإدارة
            </Link>
          </div>

          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>

            {/* ══ Form (left) ══ */}
            <div style={{ flex: '0 0 340px', minWidth: 0 }}>
              <div className="card" style={{ position: 'sticky', top: 80 }}>
                <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 20, fontSize: '1.1rem' }}>
                  {editId ? '✏️ تعديل الكلمة' : '➕ إضافة كلمة جديدة'}
                </h2>

                {msg && (
                  <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 14, fontSize: '.84rem' }}>
                    {msg.text}
                  </div>
                )}

                <form onSubmit={handleSave}>

                  {/* Word */}
                  <div className="form-group">
                    <label className="form-label">الكلمة مشكولة *</label>
                    <input className="form-input" value={form.word} onChange={set('word')}
                      placeholder="مثال: كِتَابٌ" required
                      style={{ fontSize: '1.3rem', fontWeight: 800, textAlign: 'center' }} />
                  </div>

                  {/* Type + Topic */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">نوع الكلمة</label>
                      <select className="form-input" value={form.word_type} onChange={set('word_type')}>
                        {WORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">الموضوع</label>
                      <select className="form-input" value={form.topic} onChange={set('topic')}>
                        {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Sentence */}
                  <div className="form-group">
                    <label className="form-label">الجملة السياقية</label>
                    <textarea className="form-input" value={form.sentence} onChange={set('sentence')}
                      placeholder="أدخل جملة توضيحية للكلمة" rows={2}
                      style={{ resize: 'vertical', lineHeight: 1.7 }} />
                  </div>

                  {/* Grade */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">من الصف</label>
                      <select className="form-input" value={form.grade_from} onChange={set('grade_from')}>
                        {GRADE_OPTS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">إلى الصف</label>
                      <select className="form-input" value={form.grade_to} onChange={set('grade_to')}>
                        {GRADE_OPTS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>

                  {showSyllables && (
                    <div className="form-group">
                      <label className="form-label">المقاطع الصوتية (للصفوف 1-4)</label>
                      <input className="form-input" value={form.syllables} onChange={set('syllables')}
                        placeholder="مثال: كِـ / تَا / بٌ" />
                      <p className="form-help">افصل المقاطع بـ / أو مسافة</p>
                    </div>
                  )}

                  {showRoot && (
                    <div className="form-group">
                      <label className="form-label">الجذر الثلاثي (للصفوف 5-7)</label>
                      <input className="form-input" value={form.root} onChange={set('root')}
                        placeholder="مثال: ك ت ب" style={{ letterSpacing: 4, fontWeight: 800 }} />
                    </div>
                  )}

                  {/* ══ Image upload ══ */}
                  <div className="form-group" style={{ marginTop: 8 }}>
                    <label className="form-label">🖼️ صورة الكلمة التوضيحية</label>

                    {curImg && (
                      <div style={{ position: 'relative', marginBottom: 8 }}>
                        <img src={curImg} alt="صورة الكلمة"
                          style={{ width: '100%', maxHeight: 130, objectFit: 'contain', borderRadius: 8,
                                   border: '1.5px solid var(--border)', background: '#f8faff', display: 'block' }} />
                        <button type="button" onClick={removeImage}
                          title="حذف الصورة"
                          style={{ position: 'absolute', top: 5, left: 5, width: 22, height: 22,
                                   background: '#e53e3e', color: '#fff', border: 'none',
                                   borderRadius: 6, cursor: 'pointer', fontSize: '11px',
                                   display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          ✕
                        </button>
                      </div>
                    )}

                    <div onClick={() => imageRef.current?.click()}
                      style={{
                        border: `2px dashed ${imageFile ? '#1a7c40' : 'var(--border)'}`,
                        borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                        textAlign: 'center', background: imageFile ? '#e8f8ef' : 'var(--bg)',
                        fontSize: '.83rem', color: imageFile ? '#1a7c40' : 'var(--muted)', fontWeight: 700,
                      }}>
                      {imageFile ? `✅ ${imageFile.name}` : curImg ? '🔄 استبدال الصورة' : '📷 رفع صورة'}
                    </div>
                    <input ref={imageRef} type="file" accept="image/*"
                      onChange={pickImage} style={{ display: 'none' }} />
                    <p className="form-help">JPG · PNG · WebP — الحد الأقصى 500 كيلوبايت</p>
                  </div>

                  {/* ══ Audio upload ══ */}
                  <div className="form-group">
                    <label className="form-label">🔊 النطق الصوتي للكلمة</label>

                    {curAudio && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <audio controls src={curAudio}
                          style={{ flex: 1, height: 36 }} />
                        <button type="button" onClick={removeAudio}
                          title="حذف الصوت"
                          style={{ width: 24, height: 24, background: '#e53e3e', color: '#fff',
                                   border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '11px',
                                   display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          ✕
                        </button>
                      </div>
                    )}

                    <div onClick={() => audioRef.current?.click()}
                      style={{
                        border: `2px dashed ${audioFile ? '#1a7c40' : 'var(--border)'}`,
                        borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                        textAlign: 'center', background: audioFile ? '#e8f8ef' : 'var(--bg)',
                        fontSize: '.83rem', color: audioFile ? '#1a7c40' : 'var(--muted)', fontWeight: 700,
                      }}>
                      {audioFile ? `✅ ${audioFile.name}` : curAudio ? '🔄 استبدال الصوت' : '🎤 رفع ملف صوتي'}
                    </div>
                    <input ref={audioRef} type="file" accept="audio/*"
                      onChange={pickAudio} style={{ display: 'none' }} />
                    <p className="form-help">MP3 · WAV · OGG — الحد الأقصى 1 ميغابايت</p>
                  </div>

                  {loadingMedia && (
                    <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '.82rem', padding: '4px 0 8px' }}>
                      <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2, display: 'inline-block', marginLeft: 6 }} />
                      جارٍ تحميل الوسائط الحالية...
                    </div>
                  )}

                  {/* Save / Cancel */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                      {saving
                        ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />جارٍ الحفظ</>
                        : (editId ? '💾 حفظ التعديل' : '✅ إضافة')}
                    </button>
                    {editId && (
                      <button type="button" className="btn btn-ghost"
                        onClick={() => { setForm(EMPTY_FORM); setEditId(null); resetMedia(); }}>
                        إلغاء
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* ══ Table (right) ══ */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="🔍 بحث عن كلمة..." style={{ flex: '1 1 200px', maxWidth: 280 }} />
                <select className="form-input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ width: 130 }}>
                  <option value="">كل الأنواع</option>
                  {WORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select className="form-input" value={filterTopic} onChange={e => setFilterTopic(e.target.value)} style={{ width: 150 }}>
                  <option value="">كل الموضوعات</option>
                  {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <span style={{ color: 'var(--muted)', fontSize: '.85rem', whiteSpace: 'nowrap' }}>
                  {filtered.length} كلمة
                </span>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: 48 }}>
                  <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)', width: 32, height: 32 }} />
                </div>
              ) : filtered.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📭</span>
                  <p>لا توجد كلمات — أضف كلمة من النموذج</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>الكلمة</th>
                        <th>النوع</th>
                        <th>الموضوع</th>
                        <th>الصفوف</th>
                        <th>الجملة</th>
                        <th>الجذر / المقاطع</th>
                        <th style={{ textAlign: 'center' }}>وسائط</th>
                        <th>إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(w => (
                        <tr key={w.id}>
                          <td style={{ fontWeight: 800, fontSize: '1.15rem' }}>{w.word}</td>
                          <td><span className="badge badge-blue">{w.word_type}</span></td>
                          <td><span className="badge badge-orange">{w.topic}</span></td>
                          <td style={{ color: 'var(--muted)', fontSize: '.83rem', whiteSpace: 'nowrap' }}>
                            {w.grade_from}–{w.grade_to}
                          </td>
                          <td style={{ color: 'var(--muted)', fontSize: '.83rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {w.sentence}
                          </td>
                          <td style={{ fontSize: '.8rem', color: '#475569' }}>
                            {w.root     && <div>جذر: <strong>{w.root}</strong></div>}
                            {w.syllables && <div>مقاطع: {w.syllables}</div>}
                          </td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <span title={w.has_image ? 'يوجد صورة' : 'لا توجد صورة'}
                              style={{ opacity: w.has_image ? 1 : 0.2, marginLeft: 4, fontSize: '1rem' }}>🖼️</span>
                            <span title={w.has_audio ? 'يوجد صوت' : 'لا يوجد صوت'}
                              style={{ opacity: w.has_audio ? 1 : 0.2, fontSize: '1rem' }}>🔊</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button className="btn btn-sm btn-outline" onClick={() => startEdit(w)}>✏️</button>
                              {isSuperAdmin && (
                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(w.id)}>🗑️</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
