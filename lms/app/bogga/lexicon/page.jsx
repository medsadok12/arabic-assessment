'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import { createClient } from '../../../lib/supabase';

const WORD_TYPES  = ['اسم', 'فعل', 'صفة', 'ظرف', 'حرف', 'ضمير'];
const TOPICS      = ['الحيوانات', 'الطبيعة', 'الأسرة', 'المدرسة', 'الطعام', 'الجسم', 'الألوان', 'الأعداد', 'المهن', 'الزمن', 'أخرى'];
const GRADE_OPTS  = [1, 2, 3, 4, 5, 6, 7];

const EMPTY_FORM = { word: '', word_type: 'اسم', sentence: '', topic: 'أخرى', grade_from: 1, grade_to: 7, syllables: '', root: '' };

export default function LexiconAdminPage() {
  const supabase = createClient();

  const [user, setUser]         = useState(null);
  const [role, setRole]         = useState('');
  const [words, setWords]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [editId, setEditId]     = useState(null);
  const [search, setSearch]     = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (u) { setUser(u); setRole(u.user_metadata?.role ?? ''); }
    });
    loadWords();
  }, []);

  async function loadWords() {
    setLoading(true);
    const { data } = await supabase
      .from('lexicon_words')
      .select('*')
      .order('created_at', { ascending: false });
    setWords(data ?? []);
    setLoading(false);
  }

  const set = k => v => setForm(p => ({ ...p, [k]: v.target ? v.target.value : v }));

  async function handleSave(e) {
    e.preventDefault();
    if (!form.word.trim()) return;
    setSaving(true);

    const isSuperAdmin = role === 'super_admin';
    const payload = {
      word: form.word.trim(),
      word_type: form.word_type,
      sentence: form.sentence.trim(),
      topic: form.topic,
      grade_from: +form.grade_from,
      grade_to: +form.grade_to,
      syllables: form.syllables.trim(),
      root: form.root.trim(),
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editId) {
      if (!isSuperAdmin) { setMsg({ type: 'error', text: 'لا تملك صلاحية التعديل' }); setSaving(false); return; }
      ({ error } = await supabase.from('lexicon_words').update(payload).eq('id', editId));
    } else {
      ({ error } = await supabase.from('lexicon_words').insert({ ...payload, created_at: new Date().toISOString() }));
    }

    if (error) {
      setMsg({ type: 'error', text: error.message });
    } else {
      setMsg({ type: 'success', text: editId ? 'تم التعديل بنجاح' : 'تمت الإضافة بنجاح' });
      setForm(EMPTY_FORM); setEditId(null);
      await loadWords();
    }
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  }

  async function handleDelete(id) {
    if (role !== 'super_admin') { setMsg({ type: 'error', text: 'لا تملك صلاحية الحذف' }); return; }
    if (!confirm('هل تريد حذف هذه الكلمة نهائياً؟')) return;
    await supabase.from('lexicon_words').delete().eq('id', id);
    setWords(p => p.filter(w => w.id !== id));
  }

  function startEdit(w) {
    setForm({ word: w.word, word_type: w.word_type, sentence: w.sentence ?? '', topic: w.topic ?? 'أخرى', grade_from: w.grade_from, grade_to: w.grade_to, syllables: w.syllables ?? '', root: w.root ?? '' });
    setEditId(w.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const filtered = words.filter(w =>
    (!search || w.word.includes(search) || (w.sentence ?? '').includes(search)) &&
    (!filterType  || w.word_type === filterType) &&
    (!filterTopic || w.topic === filterTopic)
  );

  const isSuperAdmin = role === 'super_admin';
  const showSyllables = +form.grade_from <= 4 || +form.grade_to <= 4;
  const showRoot      = +form.grade_to >= 5;

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap" dir="rtl">
        <div className="container">

          {/* Back link */}
          <div style={{ marginBottom: 20 }}>
            <Link href="/bogga" style={{ color: 'var(--primary)', fontSize: '.88rem', textDecoration: 'none' }}>
              ← حصن الإدارة
            </Link>
          </div>

          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>

            {/* ── Left: Form ── */}
            <div style={{ flex: '0 0 320px', minWidth: 0 }}>
              <div className="card" style={{ position: 'sticky', top: 80 }}>
                <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 20, fontSize: '1.1rem' }}>
                  {editId ? '✏️ تعديل الكلمة' : '➕ إضافة كلمة جديدة'}
                </h2>

                {msg && (
                  <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: 14 }}>
                    {msg.text}
                  </div>
                )}

                <form onSubmit={handleSave}>
                  <div className="form-group">
                    <label className="form-label">الكلمة مشكولة *</label>
                    <input className="form-input" value={form.word} onChange={set('word')}
                      placeholder="مثال: كِتَابٌ" required
                      style={{ fontSize: '1.3rem', fontWeight: 800, textAlign: 'center' }} />
                  </div>

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

                  <div className="form-group">
                    <label className="form-label">الجملة السياقية</label>
                    <textarea className="form-input" value={form.sentence} onChange={set('sentence')}
                      placeholder="أدخل جملة توضيحية للكلمة" rows={2}
                      style={{ resize: 'vertical', lineHeight: 1.7 }} />
                  </div>

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

                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1 }}>
                      {saving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />جارٍ الحفظ</> : (editId ? '💾 حفظ التعديل' : '✅ إضافة')}
                    </button>
                    {editId && (
                      <button type="button" className="btn btn-ghost"
                        onClick={() => { setForm(EMPTY_FORM); setEditId(null); }}>
                        إلغاء
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* ── Right: Table ── */}
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
                        <th>الجذر/المقاطع</th>
                        <th>إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(w => (
                        <tr key={w.id}>
                          <td style={{ fontWeight: 800, fontSize: '1.1rem' }}>{w.word}</td>
                          <td><span className="badge badge-blue">{w.word_type}</span></td>
                          <td><span className="badge badge-orange">{w.topic}</span></td>
                          <td style={{ color: 'var(--muted)', fontSize: '.83rem', whiteSpace: 'nowrap' }}>
                            {w.grade_from}–{w.grade_to}
                          </td>
                          <td style={{ color: 'var(--muted)', fontSize: '.83rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {w.sentence}
                          </td>
                          <td style={{ fontSize: '.8rem', color: '#475569' }}>
                            {w.root && <div>جذر: <strong>{w.root}</strong></div>}
                            {w.syllables && <div>مقاطع: {w.syllables}</div>}
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
