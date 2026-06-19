'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '../../../../../lib/supabase';

const ALL_ARABIC_LETTERS = ['أ','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'];

const TIME_OPTIONS = [60, 75, 90, 120];

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function WordWheelSettingsPage() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formTime, setFormTime] = useState(90);
  const [formSelectedLetters, setFormSelectedLetters] = useState([]);
  const [formCenter, setFormCenter] = useState('');
  const [formWords, setFormWords] = useState([]);
  const [newWord, setNewWord] = useState('');
  const [newWordImage, setNewWordImage] = useState('');
  const [imageInputMode, setImageInputMode] = useState('url');
  const fileInputRef = useRef(null);
  const wordInputRef = useRef(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data?.user) { setLoading(false); return; }
      setUser(data.user);
      const r = data.user.user_metadata?.role || null;
      setRole(r);
      if (['teacher','admin','super_admin'].includes(r)) {
        fetchConfigs();
      } else {
        setLoading(false);
      }
    });
  }, []);

  async function fetchConfigs() {
    try {
      const res = await fetch('/api/word-wheel/configs');
      const json = await res.json();
      setConfigs(json.configs || []);
    } catch (_) {}
    setLoading(false);
  }

  function openCreate() {
    setEditing('new');
    setFormName('');
    setFormTime(90);
    setFormSelectedLetters([]);
    setFormCenter('');
    setFormWords([]);
    setNewWord('');
    setNewWordImage('');
    setImageInputMode('url');
    setMsg(null);
  }

  function openEdit(config) {
    setEditing(config.id);
    setFormName(config.name);
    setFormTime(config.time_seconds);
    const allLetters = [...(config.outer_letters || []), config.center_letter].filter(Boolean);
    setFormSelectedLetters(allLetters);
    setFormCenter(config.center_letter);
    setFormWords(config.valid_words || []);
    setNewWord('');
    setNewWordImage('');
    setImageInputMode('url');
    setMsg(null);
  }

  function toggleLetter(letter) {
    if (formSelectedLetters.includes(letter)) {
      setFormSelectedLetters(prev => prev.filter(l => l !== letter));
      if (formCenter === letter) setFormCenter('');
    } else {
      const outerCount = formSelectedLetters.filter(l => l !== formCenter).length;
      if (outerCount >= 8 && letter !== formCenter) return;
      setFormSelectedLetters(prev => [...prev, letter]);
    }
  }

  function setAsCenter(letter) {
    setFormCenter(prev => prev === letter ? '' : letter);
  }

  function addWord() {
    const w = newWord.trim();
    if (!w) return;
    if (formWords.some(fw => fw.word === w)) return;
    setFormWords(prev => [...prev, { word: w, image: newWordImage || null }]);
    setNewWord('');
    setNewWordImage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (wordInputRef.current) wordInputRef.current.focus();
  }

  function removeWord(index) {
    setFormWords(prev => prev.filter((_, i) => i !== index));
  }

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const b64 = await fileToBase64(file);
      setNewWordImage(b64);
    } catch (_) {}
  }

  async function handleSave() {
    if (!formName.trim()) { setMsg({ ok: false, text: 'أدخل اسم العجلة' }); return; }
    if (!formCenter) { setMsg({ ok: false, text: 'اختر الحرف الأوسط' }); return; }
    const outerLetters = formSelectedLetters.filter(l => l !== formCenter);
    if (outerLetters.length < 2) { setMsg({ ok: false, text: 'اختر حرفين خارجيين على الأقل' }); return; }

    setSaving(true);
    setMsg(null);

    const body = {
      name: formName.trim(),
      center_letter: formCenter,
      outer_letters: outerLetters,
      valid_words: formWords,
      time_seconds: formTime,
    };

    const isNew = editing === 'new';
    const url = isNew ? '/api/word-wheel/configs' : `/api/word-wheel/configs/${editing}`;
    const method = isNew ? 'POST' : 'PUT';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ ok: false, text: json.error || 'فشل الحفظ' });
        setSaving(false);
        return;
      }
      if (isNew) setConfigs(prev => [json.config, ...prev]);
      else setConfigs(prev => prev.map(c => c.id === editing ? json.config : c));
      setEditing(null);
      setMsg({ ok: true, text: '✅ تم حفظ العجلة بنجاح' });
      setTimeout(() => setMsg(null), 3000);
    } catch (_) {
      setMsg({ ok: false, text: 'خطأ في الاتصال' });
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/word-wheel/configs/${id}`, { method: 'DELETE' });
      if (res.ok) setConfigs(prev => prev.filter(c => c.id !== id));
    } catch (_) {}
    setDeleting(null);
    setConfirmDelete(null);
  }

  const outerLetters = formSelectedLetters.filter(l => l !== formCenter);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={styles.fullCenter}>
      <div style={styles.spinner} />
      <p style={{ color: '#fff', fontFamily: 'Cairo, Tajawal, sans-serif', marginTop: 16 }}>جاري التحميل…</p>
    </div>
  );

  if (!user || !['teacher','admin','super_admin'].includes(role)) return (
    <div style={styles.fullCenter}>
      <div style={styles.authCard}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <h2 style={{ fontFamily: 'Cairo, Tajawal, sans-serif', color: '#92400E', margin: '12px 0 4px' }}>غير مصرح</h2>
        <p style={{ fontFamily: 'Cairo, Tajawal, sans-serif', color: '#6B7280' }}>هذه الصفحة خاصة بالمعلمين والمشرفين فقط</p>
        <Link href="/library/games/word-wheel" style={{ ...styles.btn, marginTop: 20, display: 'inline-block', textDecoration: 'none' }}>
          ← العودة للعبة
        </Link>
      </div>
    </div>
  );

  // ── Main Page ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page} dir="rtl">
      {/* ── Header ── */}
      <div style={styles.header}>
        <Link href="/library/games/word-wheel" style={styles.backLink}>← العودة للعبة</Link>
        <h1 style={styles.pageTitle}>⚙️ إعداد عجلات الكلمات</h1>
        <button onClick={openCreate} style={styles.addBtn}>+ إضافة عجلة جديدة</button>
      </div>

      {/* ── Success / Error Message ── */}
      {msg && (
        <div style={{ ...styles.msgBanner, background: msg.ok ? '#D1FAE5' : '#FEE2E2', color: msg.ok ? '#065F46' : '#991B1B' }}>
          {msg.text}
        </div>
      )}

      {/* ── Config Cards Grid ── */}
      {configs.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 56 }}>🎡</div>
          <p style={{ fontFamily: 'Cairo, Tajawal, sans-serif', color: '#6B7280', fontSize: '1.1rem', marginTop: 12 }}>
            لا توجد عجلات بعد — أضف أول عجلة!
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {configs.map(cfg => (
            <div key={cfg.id} style={styles.card}>
              {/* Wheel Preview */}
              <div style={styles.wheelPreview}>
                <div style={styles.centerCircle}>{cfg.center_letter || '؟'}</div>
                <div style={styles.outerLetters}>
                  {(cfg.outer_letters || []).slice(0, 8).map((l, i) => (
                    <div key={i} style={styles.outerCircle}>{l}</div>
                  ))}
                </div>
              </div>

              {/* Card Info */}
              <h3 style={styles.cardTitle}>{cfg.name}</h3>
              <div style={styles.chipsRow}>
                <span style={styles.chip}>الأوسط: {cfg.center_letter}</span>
                <span style={styles.chip}>{(cfg.outer_letters || []).length} حرف خارجي</span>
                <span style={styles.chip}>{(cfg.valid_words || []).length} كلمة</span>
                <span style={{ ...styles.chip, background: '#FEF3C7', color: '#92400E' }}>{cfg.time_seconds}ث</span>
              </div>

              {/* Actions */}
              <div style={styles.cardActions}>
                <button onClick={() => openEdit(cfg)} style={styles.editBtn}>تعديل ✏️</button>
                <button
                  onClick={() => setConfirmDelete(cfg.id)}
                  style={styles.deleteBtn}
                  disabled={deleting === cfg.id}
                >
                  {deleting === cfg.id ? '...' : 'حذف 🗑️'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      {confirmDelete && (
        <div style={styles.overlay} onClick={() => setConfirmDelete(null)}>
          <div style={{ ...styles.modal, maxWidth: 380, padding: 32, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 40 }}>🗑️</div>
            <h3 style={{ fontFamily: 'Cairo, Tajawal, sans-serif', color: '#1F2937', margin: '12px 0 8px' }}>تأكيد الحذف</h3>
            <p style={{ fontFamily: 'Cairo, Tajawal, sans-serif', color: '#6B7280', margin: '0 0 24px' }}>
              هل أنت متأكد من حذف هذه العجلة؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting === confirmDelete}
                style={{ ...styles.deleteBtn, padding: '10px 24px', fontSize: '1rem' }}
              >
                {deleting === confirmDelete ? 'جاري الحذف…' : 'نعم، احذف'}
              </button>
              <button onClick={() => setConfirmDelete(null)} style={{ ...styles.editBtn, padding: '10px 24px', fontSize: '1rem' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Editor Modal ── */}
      {editing !== null && (
        <div style={styles.overlay} onClick={() => !saving && setEditing(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editing === 'new' ? '✨ إضافة عجلة جديدة' : '✏️ تعديل العجلة'}
              </h2>
              <button
                onClick={() => !saving && setEditing(null)}
                style={styles.closeBtn}
                disabled={saving}
              >✕</button>
            </div>

            {/* ── Section 1: Name & Time ── */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>الاسم والوقت</h3>
              <div style={styles.field}>
                <label style={styles.label}>اسم العجلة *</label>
                <input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="مثال: عجلة الغلال"
                  style={styles.input}
                  dir="rtl"
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>المدة الزمنية</label>
                <div style={styles.timeButtons}>
                  {TIME_OPTIONS.map(t => (
                    <button
                      key={t}
                      onClick={() => setFormTime(t)}
                      style={{
                        ...styles.timeBtn,
                        background: formTime === t ? '#D97706' : '#F3F4F6',
                        color: formTime === t ? '#fff' : '#374151',
                        fontWeight: formTime === t ? 700 : 400,
                      }}
                    >
                      {t}ث
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Section 2: Letters ── */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                اختيار الحروف
                <span style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 400, marginRight: 8 }}>
                  (الخارجية: {outerLetters.length}/8)
                </span>
              </h3>

              {/* Letters Grid */}
              <div style={styles.lettersGrid}>
                {ALL_ARABIC_LETTERS.map(letter => {
                  const isSelected = formSelectedLetters.includes(letter);
                  const isCenter = formCenter === letter;
                  const outerFull = outerLetters.length >= 8 && !isSelected && !isCenter;
                  return (
                    <button
                      key={letter}
                      onClick={() => toggleLetter(letter)}
                      disabled={outerFull}
                      title={outerFull ? 'الحد الأقصى 8 حروف خارجية' : ''}
                      style={{
                        ...styles.letterBtn,
                        background: isCenter
                          ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                          : isSelected
                          ? 'linear-gradient(135deg, #FCD34D, #F59E0B)'
                          : '#F3F4F6',
                        color: isSelected || isCenter ? '#fff' : '#374151',
                        border: isCenter ? '2px solid #92400E' : isSelected ? '2px solid #D97706' : '2px solid transparent',
                        opacity: outerFull ? 0.4 : 1,
                        cursor: outerFull ? 'not-allowed' : 'pointer',
                        boxShadow: isSelected || isCenter ? '0 2px 6px rgba(217,119,6,0.4)' : 'none',
                      }}
                    >
                      {letter}
                    </button>
                  );
                })}
              </div>

              {/* Selected Letters as Chips — click to set center */}
              {formSelectedLetters.length > 0 && (
                <div style={styles.selectedSection}>
                  <p style={styles.hintText}>
                    انقر على حرف لتحديده كـ <strong>الحرف الأوسط 👑</strong>
                    {formCenter && <span style={{ color: '#D97706' }}> — الأوسط الحالي: {formCenter}</span>}
                  </p>
                  <div style={styles.selectedChips}>
                    {formSelectedLetters.map(l => (
                      <button
                        key={l}
                        onClick={() => setAsCenter(l)}
                        style={{
                          ...styles.letterChip,
                          background: formCenter === l ? '#D97706' : '#FEF3C7',
                          color: formCenter === l ? '#fff' : '#92400E',
                          border: formCenter === l ? '2px solid #92400E' : '2px solid #F59E0B',
                          fontWeight: 700,
                        }}
                      >
                        {formCenter === l && '👑 '}
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Section 3: Words ── */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>الكلمات الصحيحة ({formWords.length})</h3>

              {/* Add Word Form */}
              <div style={styles.addWordForm}>
                <input
                  ref={wordInputRef}
                  value={newWord}
                  onChange={e => setNewWord(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addWord()}
                  placeholder="اكتب كلمة…"
                  style={{ ...styles.input, flex: 1, marginBottom: 0 }}
                  dir="rtl"
                />
                <button onClick={addWord} style={styles.addWordBtn}>+ إضافة</button>
              </div>

              {/* Image Input Toggle */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontFamily: 'Cairo, Tajawal, sans-serif', fontSize: '0.85rem', color: '#6B7280' }}>صورة الكلمة:</span>
                <button
                  onClick={() => setImageInputMode('url')}
                  style={{ ...styles.toggleBtn, background: imageInputMode === 'url' ? '#D97706' : '#E5E7EB', color: imageInputMode === 'url' ? '#fff' : '#374151' }}
                >
                  رابط URL
                </button>
                <button
                  onClick={() => setImageInputMode('file')}
                  style={{ ...styles.toggleBtn, background: imageInputMode === 'file' ? '#D97706' : '#E5E7EB', color: imageInputMode === 'file' ? '#fff' : '#374151' }}
                >
                  رفع ملف
                </button>
                {newWordImage && (
                  <button onClick={() => { setNewWordImage(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    style={{ ...styles.toggleBtn, background: '#FEE2E2', color: '#DC2626' }}>
                    ✕ إزالة الصورة
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                {imageInputMode === 'url' ? (
                  <input
                    value={newWordImage}
                    onChange={e => setNewWordImage(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    style={{ ...styles.input, flex: 1, marginBottom: 0, fontSize: '0.85rem' }}
                    dir="ltr"
                  />
                ) : (
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ fontFamily: 'Cairo, Tajawal, sans-serif', fontSize: '0.85rem', flex: 1 }}
                  />
                )}
                {newWordImage && (
                  <img
                    src={newWordImage}
                    alt="preview"
                    style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', border: '2px solid #D97706' }}
                    onError={e => e.target.style.display = 'none'}
                  />
                )}
              </div>

              {/* Words List */}
              {formWords.length === 0 ? (
                <p style={{ fontFamily: 'Cairo, Tajawal, sans-serif', color: '#9CA3AF', fontSize: '0.9rem', textAlign: 'center', padding: '16px 0' }}>
                  لم تُضف كلمات بعد
                </p>
              ) : (
                <div style={styles.wordsList}>
                  {formWords.map((fw, i) => (
                    <div key={i} style={styles.wordRow}>
                      {fw.image ? (
                        <img
                          src={fw.image}
                          alt={fw.word}
                          style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid #E5E7EB', flexShrink: 0 }}
                          onError={e => e.target.style.display = 'none'}
                        />
                      ) : (
                        <div style={styles.noImagePlaceholder}>🔤</div>
                      )}
                      <span style={styles.wordText}>{fw.word}</span>
                      <button onClick={() => removeWord(i)} style={styles.removeWordBtn}>✕ حذف</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Error Message ── */}
            {msg && !msg.ok && (
              <div style={{ ...styles.msgBanner, background: '#FEE2E2', color: '#991B1B', margin: '0 0 16px' }}>
                ⚠️ {msg.text}
              </div>
            )}

            {/* ── Save Button ── */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => !saving && setEditing(null)}
                disabled={saving}
                style={styles.cancelBtn}
              >
                إلغاء
              </button>
              <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
                {saving ? 'جاري الحفظ…' : 'حفظ العجلة 💾'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #92400E, #D97706)',
    padding: '24px 16px 48px',
    fontFamily: 'Cairo, Tajawal, sans-serif',
  },
  fullCenter: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #92400E, #D97706)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    padding: 24,
  },
  spinner: {
    width: 48,
    height: 48,
    border: '4px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  authCard: {
    background: '#fff',
    borderRadius: 20,
    padding: '40px 48px',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
  header: {
    maxWidth: 780,
    margin: '0 auto 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  backLink: {
    color: 'rgba(255,255,255,0.85)',
    textDecoration: 'none',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '0.95rem',
    background: 'rgba(255,255,255,0.15)',
    padding: '8px 16px',
    borderRadius: 20,
    transition: 'background 0.2s',
  },
  pageTitle: {
    color: '#fff',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: 0,
    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  addBtn: {
    background: '#fff',
    color: '#92400E',
    border: 'none',
    borderRadius: 24,
    padding: '10px 20px',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  btn: {
    background: 'linear-gradient(135deg, #D97706, #92400E)',
    color: '#fff',
    border: 'none',
    borderRadius: 20,
    padding: '10px 20px',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  msgBanner: {
    maxWidth: 780,
    margin: '0 auto 16px',
    padding: '12px 20px',
    borderRadius: 12,
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '0.95rem',
    fontWeight: 600,
    textAlign: 'center',
  },
  emptyState: {
    maxWidth: 780,
    margin: '0 auto',
    background: '#fff',
    borderRadius: 20,
    padding: '60px 24px',
    textAlign: 'center',
  },
  grid: {
    maxWidth: 780,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 16,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '20px 16px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  wheelPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  centerCircle: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    fontWeight: 700,
    boxShadow: '0 2px 8px rgba(217,119,6,0.4)',
    flexShrink: 0,
  },
  outerLetters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  outerCircle: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: '#FEF3C7',
    color: '#92400E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    fontWeight: 600,
    border: '1px solid #F59E0B',
  },
  cardTitle: {
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#1F2937',
    margin: 0,
  },
  chipsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    background: '#F3F4F6',
    color: '#6B7280',
    borderRadius: 12,
    padding: '3px 10px',
    fontSize: '0.78rem',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontWeight: 500,
  },
  cardActions: {
    display: 'flex',
    gap: 8,
    marginTop: 4,
  },
  editBtn: {
    flex: 1,
    background: '#EEF2FF',
    color: '#4338CA',
    border: 'none',
    borderRadius: 10,
    padding: '8px 12px',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '0.88rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  deleteBtn: {
    flex: 1,
    background: '#FEE2E2',
    color: '#DC2626',
    border: 'none',
    borderRadius: 10,
    padding: '8px 12px',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '0.88rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.65)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    background: '#fff',
    borderRadius: 20,
    padding: '28px 24px',
    maxWidth: 720,
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '1.3rem',
    fontWeight: 700,
    color: '#1F2937',
    margin: 0,
  },
  closeBtn: {
    background: '#F3F4F6',
    border: 'none',
    borderRadius: 50,
    width: 36,
    height: 36,
    fontSize: '1rem',
    cursor: 'pointer',
    color: '#6B7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    background: '#FAFAFA',
    border: '1px solid #E5E7EB',
    borderRadius: 14,
    padding: '16px 18px',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '1rem',
    fontWeight: 700,
    color: '#374151',
    margin: '0 0 14px',
    paddingBottom: 8,
    borderBottom: '2px solid #FDE68A',
  },
  field: {
    marginBottom: 14,
  },
  label: {
    display: 'block',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#4B5563',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1.5px solid #D1D5DB',
    borderRadius: 10,
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '1rem',
    color: '#1F2937',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 12,
    background: '#fff',
  },
  timeButtons: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  timeBtn: {
    border: 'none',
    borderRadius: 24,
    padding: '8px 20px',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  lettersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: 6,
    marginBottom: 14,
  },
  letterBtn: {
    width: '100%',
    aspectRatio: '1',
    minHeight: 38,
    border: '2px solid transparent',
    borderRadius: 10,
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '1.05rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s',
    padding: 0,
  },
  selectedSection: {
    background: '#FFFBEB',
    border: '1px solid #FDE68A',
    borderRadius: 12,
    padding: '12px 14px',
    marginTop: 6,
  },
  hintText: {
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '0.85rem',
    color: '#6B7280',
    margin: '0 0 10px',
  },
  selectedChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  letterChip: {
    padding: '6px 16px',
    borderRadius: 20,
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  addWordForm: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  addWordBtn: {
    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 18px',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  toggleBtn: {
    border: 'none',
    borderRadius: 16,
    padding: '5px 14px',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  wordsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 260,
    overflowY: 'auto',
    paddingRight: 4,
  },
  wordRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#fff',
    border: '1px solid #E5E7EB',
    borderRadius: 10,
    padding: '8px 12px',
  },
  noImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    background: '#F3F4F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.3rem',
    flexShrink: 0,
  },
  wordText: {
    flex: 1,
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#1F2937',
  },
  removeWordBtn: {
    background: '#FEE2E2',
    color: '#DC2626',
    border: 'none',
    borderRadius: 8,
    padding: '5px 12px',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  saveBtn: {
    background: 'linear-gradient(135deg, #F59E0B, #92400E)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '12px 28px',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(217,119,6,0.35)',
  },
  cancelBtn: {
    background: '#F3F4F6',
    color: '#6B7280',
    border: 'none',
    borderRadius: 12,
    padding: '12px 24px',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
