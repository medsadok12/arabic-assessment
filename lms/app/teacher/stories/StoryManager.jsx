'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const ACCENTS = [
  { label: 'أخضر',   accent: '#10b981', bg: '#ecfdf5', border: '#6ee7b7' },
  { label: 'ذهبي',   accent: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  { label: 'بنفسجي', accent: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
  { label: 'وردي',   accent: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' },
  { label: 'أزرق',   accent: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
  { label: 'برتقالي',accent: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
  { label: 'سماوي',  accent: '#22d3ee', bg: '#ecfeff', border: '#a5f3fc' },
  { label: 'أحمر',   accent: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
];

const LENGTHS = ['قصيرة', 'متوسطة', 'طويلة'];

const EMPTY_FORM = {
  title: '', icon: '📖', level: 1, length: 'قصيرة',
  content: '', status: 'draft', points: 10,
  accent: '#10b981', bg: '#ecfdf5', border_color: '#6ee7b7',
};

/* ── تحويل content ↔ مصفوفة صفحات ── */
function parseToPages(content) {
  const blocks = (content || '').split('<!-- PAGE -->').map(b => b.trim()).filter(Boolean);
  if (!blocks.length) return [{ html: '', imgUrl: '' }];
  return blocks.map(block => {
    const m = block.match(/^<img\s+class="sp-img"\s+src="([^"]*)"[^>]*>/i);
    return m
      ? { imgUrl: m[1], html: block.slice(m[0].length).trim() }
      : { imgUrl: '', html: block };
  });
}

function pagesToContent(pages) {
  return pages
    .filter(p => p.html.trim() || p.imgUrl)
    .map(p => {
      const imgTag = p.imgUrl
        ? `<img class="sp-img" src="${p.imgUrl}" alt="" style="width:100%;max-height:260px;object-fit:cover;border-radius:14px;margin-bottom:18px;display:block;">`
        : '';
      return imgTag + (imgTag && p.html ? '\n' : '') + p.html;
    })
    .join('\n<!-- PAGE -->\n');
}

function StatusBadge({ status }) {
  return status === 'published'
    ? <span style={{ background:'#d1fae5', color:'#065f46', borderRadius:20, padding:'2px 10px', fontSize:'.68rem', fontWeight:900, border:'1.5px solid #86efac' }}>✅ منشورة</span>
    : <span style={{ background:'#fef3c7', color:'#78350f', borderRadius:20, padding:'2px 10px', fontSize:'.68rem', fontWeight:900, border:'1.5px solid #fde68a' }}>✏️ مسودة</span>;
}

export default function StoryManager({ initialStories }) {
  const [stories,   setStories]   = useState(initialStories ?? null);

  useEffect(() => {
    if (initialStories !== undefined) return;
    fetch('/api/stories').then(r => r.json()).then(j => setStories(j.stories || [])).catch(() => setStories([]));
  }, []);

  if (stories === null) return (
    <div style={{ textAlign:'center', padding:'60px 0', color:'#94a3b8', fontFamily:'Cairo,Tajawal,sans-serif', fontWeight:700 }}>
      ⏳ جارٍ تحميل القصص...
    </div>
  );
  const [view,      setView]      = useState('list');   // 'list' | 'create' | 'edit'
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [editId,    setEditId]    = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(null);
  const [msg,       setMsg]       = useState(null);
  const [preview,   setPreview]   = useState(false);
  const [pages,     setPages]     = useState([{ html: '', imgUrl: '' }]);
  const [uploading, setUploading] = useState(null); // index of page being uploaded

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  /* ── صفحات ── */
  const updatePage  = (i, key, val) => setPages(p => p.map((pg, idx) => idx === i ? { ...pg, [key]: val } : pg));
  const addPage     = () => setPages(p => [...p, { html: '', imgUrl: '' }]);
  const deletePage  = (i) => setPages(p => p.filter((_, idx) => idx !== i));
  const movePage    = (i, dir) => setPages(p => {
    const arr = [...p];
    [arr[i + dir], arr[i]] = [arr[i], arr[i + dir]];
    return arr;
  });
  const uploadPageImg = async (i, file) => {
    setUploading(i);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/stories/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (json.url) updatePage(i, 'imgUrl', json.url);
      else setMsg({ ok: false, text: `❌ فشل رفع الصورة: ${json.error || ''}` });
    } catch { setMsg({ ok: false, text: '❌ خطأ في رفع الصورة' }); }
    setUploading(null);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setPages([{ html: '', imgUrl: '' }]);
    setEditId(null); setMsg(null); setPreview(false); setView('create');
  };
  const openEdit   = (s) => {
    setForm({
      title:        s.title,
      icon:         s.icon || '📖',
      level:        s.level || 1,
      length:       s.length || 'قصيرة',
      content:      s.content || '',
      status:       s.status || 'draft',
      points:       s.points || 10,
      accent:       s.accent || '#10b981',
      bg:           s.bg || '#ecfdf5',
      border_color: s.border_color || '#6ee7b7',
    });
    setPages(parseToPages(s.content));
    setEditId(s.id);
    setMsg(null);
    setPreview(false);
    setView('edit');
  };
  const backToList = () => { setView('list'); setMsg(null); };

  const handleSave = async () => {
    if (!form.title.trim()) { setMsg({ ok: false, text: 'العنوان مطلوب' }); return; }
    setSaving(true); setMsg(null);
    try {
      const method  = view === 'edit' ? 'PUT' : 'POST';
      const url     = view === 'edit' ? `/api/stories/${editId}` : '/api/stories';
      const content = pagesToContent(pages);
      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, content }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'فشل الحفظ');
      if (view === 'edit') {
        setStories(p => p.map(s => s.id === editId ? json.story : s));
        setMsg({ ok: true, text: '✅ تم الحفظ' });
        setTimeout(backToList, 800);
      } else {
        setStories(p => [json.story, ...p]);
        setMsg({ ok: true, text: '✅ تم إنشاء القصة' });
        setTimeout(backToList, 800);
      }
    } catch (e) {
      setMsg({ ok: false, text: `❌ ${e.message}` });
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('هل تريد حذف هذه القصة نهائياً؟')) return;
    setDeleting(id);
    try {
      await fetch(`/api/stories/${id}`, { method: 'DELETE' });
      setStories(p => p.filter(s => s.id !== id));
    } catch {}
    setDeleting(null);
  };

  const handleToggleStatus = async (s) => {
    const newStatus = s.status === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch(`/api/stories/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.story) setStories(p => p.map(x => x.id === s.id ? json.story : x));
    } catch {}
  };

  const selectedAccent = ACCENTS.find(a => a.accent === form.accent) || ACCENTS[0];

  return (
    <>
      <style>{`
        @keyframes smFadeIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
        .sm-wrap { direction:rtl; font-family:'Cairo','Tajawal',sans-serif; padding:20px 0 60px; animation:smFadeIn .35s ease both; }
        .sm-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
        .sm-title  { font-size:1.5rem; font-weight:900; color:#1e3a5f; margin:0; }
        .sm-btn-primary {
          background:linear-gradient(135deg,#10b981,#059669); color:#fff;
          border:none; border-radius:12px; padding:10px 20px;
          font-size:.88rem; font-weight:800; cursor:pointer;
          font-family:'Cairo','Tajawal',sans-serif;
          box-shadow:0 4px 14px rgba(16,185,129,.3);
          transition:transform .18s, box-shadow .18s;
        }
        .sm-btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 20px rgba(16,185,129,.4); }
        .sm-btn-secondary {
          background:#f8fafc; color:#475569; border:1.5px solid #e2e8f0;
          border-radius:12px; padding:9px 18px;
          font-size:.85rem; font-weight:700; cursor:pointer;
          font-family:'Cairo','Tajawal',sans-serif;
          transition:all .18s;
        }
        .sm-btn-secondary:hover { border-color:#a5b4fc; color:#4f46e5; }

        /* قائمة القصص */
        .sm-story-list { display:flex; flex-direction:column; gap:14px; }
        .sm-story-row {
          display:flex; align-items:center; gap:14px;
          background:#fff; border-radius:18px; padding:16px 18px;
          border:2px solid #f1f5f9;
          box-shadow:0 2px 12px rgba(0,0,0,.05);
          transition:box-shadow .18s;
        }
        .sm-story-row:hover { box-shadow:0 6px 24px rgba(0,0,0,.1); }
        .sm-story-icon {
          width:52px; height:52px; border-radius:14px;
          display:flex; align-items:center; justify-content:center;
          font-size:2rem; flex-shrink:0;
        }
        .sm-story-info { flex:1; min-width:0; }
        .sm-story-name { font-size:.95rem; font-weight:800; color:#1e293b; margin:0 0 5px; }
        .sm-story-meta { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .sm-meta-chip  { background:#f8fafc; color:#64748b; border-radius:20px; padding:2px 9px; font-size:.65rem; font-weight:700; border:1px solid #e2e8f0; }
        .sm-actions    { display:flex; gap:8px; flex-shrink:0; flex-wrap:wrap; }
        .sm-action-btn {
          border:none; border-radius:10px; padding:7px 14px;
          font-size:.78rem; font-weight:700; cursor:pointer;
          font-family:'Cairo','Tajawal',sans-serif; transition:all .16s;
        }
        .sm-action-btn.edit   { background:#eef2ff; color:#4f46e5; }
        .sm-action-btn.edit:hover { background:#e0e7ff; }
        .sm-action-btn.pub    { background:#d1fae5; color:#065f46; }
        .sm-action-btn.pub:hover { background:#a7f3d0; }
        .sm-action-btn.unpub  { background:#fef3c7; color:#78350f; }
        .sm-action-btn.unpub:hover { background:#fde68a; }
        .sm-action-btn.del    { background:#fee2e2; color:#b91c1c; }
        .sm-action-btn.del:hover { background:#fecaca; }
        .sm-action-btn:disabled { opacity:.5; cursor:not-allowed; }

        .sm-view-link { background:#ecfdf5; color:#065f46; border:1.5px solid #86efac; border-radius:10px; padding:6px 13px; font-size:.75rem; font-weight:700; text-decoration:none; transition:all .16s; }
        .sm-view-link:hover { background:#d1fae5; }

        /* نموذج إنشاء/تعديل */
        .sm-form { background:#fff; border-radius:22px; padding:28px 24px; box-shadow:0 4px 24px rgba(0,0,0,.07); border:2px solid #f1f5f9; }
        .sm-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        @media (max-width:600px) { .sm-form-grid { grid-template-columns:1fr; } .sm-actions { flex-direction:column; } }
        .sm-field { display:flex; flex-direction:column; gap:6px; }
        .sm-label { font-size:.82rem; font-weight:800; color:#374151; }
        .sm-input, .sm-select, .sm-textarea {
          border:1.5px solid #e5e7eb; border-radius:12px; padding:9px 13px;
          font-family:'Cairo','Tajawal',sans-serif; font-size:.9rem;
          direction:rtl; outline:none; color:#1e293b;
          transition:border-color .18s, box-shadow .18s;
        }
        .sm-input:focus, .sm-select:focus, .sm-textarea:focus {
          border-color:#818cf8; box-shadow:0 0 0 3px rgba(129,140,248,.15);
        }
        .sm-textarea { resize:vertical; min-height:260px; line-height:1.8; }
        .sm-form-footer { display:flex; gap:12px; margin-top:20px; flex-wrap:wrap; }
        .sm-save-btn {
          flex:1; border:none; border-radius:14px; padding:13px;
          background:linear-gradient(135deg,#10b981,#059669); color:#fff;
          font-size:.95rem; font-weight:900; cursor:pointer;
          font-family:'Cairo','Tajawal',sans-serif;
          box-shadow:0 5px 18px rgba(16,185,129,.3); transition:all .18s;
        }
        .sm-save-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 28px rgba(16,185,129,.4); }
        .sm-save-btn:disabled { opacity:.6; cursor:not-allowed; }
        .sm-cancel-btn {
          border:1.5px solid #e2e8f0; border-radius:14px; padding:12px 20px;
          background:#f8fafc; color:#64748b;
          font-size:.9rem; font-weight:700; cursor:pointer;
          font-family:'Cairo','Tajawal',sans-serif; transition:all .18s;
        }
        .sm-cancel-btn:hover { border-color:#a5b4fc; color:#4f46e5; }

        /* معاينة */
        .sm-preview-card {
          border-radius:18px; padding:20px 16px 16px;
          display:flex; flex-direction:column; align-items:center;
          text-align:center; gap:8px; border:2px solid; width:160px; margin:0 auto 20px;
        }

        /* شريط ألوان */
        .sm-color-swatches { display:flex; gap:8px; flex-wrap:wrap; }
        .sm-swatch {
          width:28px; height:28px; border-radius:8px; cursor:pointer;
          border:2.5px solid transparent; transition:all .15s;
          display:flex; align-items:center; justify-content:center;
          font-size:.6rem;
        }
        .sm-swatch.active { border-color:#1e293b; transform:scale(1.15); }

        .sm-msg { padding:10px 14px; border-radius:10px; font-size:.85rem; font-weight:700; margin-bottom:14px; }
        .sm-msg.ok  { background:#d4edda; color:#155724; }
        .sm-msg.err { background:#f8d7da; color:#721c24; }

        .sm-empty { text-align:center; padding:60px 20px; color:#94a3b8; font-weight:700; }
        .sm-empty span { display:block; font-size:3.5rem; margin-bottom:12px; }

        .sm-tabs { display:flex; gap:10px; margin-bottom:22px; }
        .sm-tab {
          border:none; border-radius:50px; padding:7px 18px;
          font-size:.82rem; font-weight:700; cursor:pointer;
          font-family:'Cairo','Tajawal',sans-serif; transition:all .16s;
        }
        .sm-tab.active { background:linear-gradient(135deg,#10b981,#059669); color:#fff; box-shadow:0 4px 14px rgba(16,185,129,.3); }
        .sm-tab:not(.active) { background:#f0fdf4; color:#065f46; border:1.5px solid #86efac; }
      `}</style>

      <div className="sm-wrap">

        {/* رأس الصفحة */}
        <div className="sm-header">
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            {view !== 'list' && (
              <button className="sm-btn-secondary" onClick={backToList}>→ رجوع</button>
            )}
            <h1 className="sm-title">
              {view === 'list'   ? '📚 إدارة القصص' :
               view === 'create' ? '➕ قصة جديدة'  :
                                   '✏️ تعديل القصة'}
            </h1>
          </div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            {view === 'list' && (
              <>
                <Link href="/teacher" className="sm-btn-secondary" style={{ textDecoration:'none', padding:'9px 18px', display:'inline-block', fontSize:'.85rem', fontWeight:700, color:'#475569', borderRadius:12, border:'1.5px solid #e2e8f0', background:'#f8fafc' }}>
                  → لوحة المعلم
                </Link>
                <button className="sm-btn-primary" onClick={openCreate}>+ إضافة قصة</button>
              </>
            )}
            {view !== 'list' && (
              <button
                style={{ background:preview?'#4f46e5':'#eef2ff', color:preview?'#fff':'#4f46e5', border:'none', borderRadius:12, padding:'9px 18px', fontSize:'.85rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}
                onClick={() => setPreview(p => !p)}
              >
                {preview ? '✏️ محرر' : '👁 معاينة'}
              </button>
            )}
          </div>
        </div>

        {/* ── قائمة القصص ── */}
        {view === 'list' && (
          <>
            {/* فلترة سريعة */}
            <div className="sm-tabs">
              <span style={{ background:'#1e3a5f', color:'#fff', borderRadius:50, padding:'6px 16px', fontSize:'.8rem', fontWeight:800, display:'inline-flex', alignItems:'center', gap:6 }}>
                الكل ({stories.length})
              </span>
              <span style={{ background:'#d1fae5', color:'#065f46', borderRadius:50, padding:'6px 16px', fontSize:'.8rem', fontWeight:800, border:'1.5px solid #86efac', display:'inline-flex', alignItems:'center', gap:6 }}>
                منشورة ({stories.filter(s => s.status === 'published').length})
              </span>
              <span style={{ background:'#fef3c7', color:'#78350f', borderRadius:50, padding:'6px 16px', fontSize:'.8rem', fontWeight:800, border:'1.5px solid #fde68a', display:'inline-flex', alignItems:'center', gap:6 }}>
                مسودة ({stories.filter(s => s.status === 'draft').length})
              </span>
            </div>

            {stories.length === 0 ? (
              <div className="sm-empty">
                <span>📖</span>
                لا توجد قصص بعد — ابدأ بإضافة أول قصة!
                <br />
                <button className="sm-btn-primary" onClick={openCreate} style={{ marginTop:20 }}>
                  + أضف أول قصة
                </button>
              </div>
            ) : (
              <div className="sm-story-list">
                {stories.map(s => (
                  <div key={s.id} className="sm-story-row">
                    <div className="sm-story-icon" style={{ background: s.bg || '#ecfdf5', border: `2px solid ${s.border_color || '#6ee7b7'}` }}>
                      {s.icon || '📖'}
                    </div>
                    <div className="sm-story-info">
                      <p className="sm-story-name">{s.title}</p>
                      <div className="sm-story-meta">
                        <StatusBadge status={s.status} />
                        <span className="sm-meta-chip">مستوى {s.level || 1}</span>
                        <span className="sm-meta-chip">⏱ {s.length || 'قصيرة'}</span>
                        <span className="sm-meta-chip">⭐ {s.points || 10} نقطة</span>
                      </div>
                    </div>
                    <div className="sm-actions">
                      {s.status === 'published' && (
                        <Link
                          href={`/library/stories/${s.slug}`}
                          className="sm-view-link"
                          target="_blank"
                        >
                          👁 عرض
                        </Link>
                      )}
                      <button
                        className={`sm-action-btn ${s.status === 'published' ? 'unpub' : 'pub'}`}
                        onClick={() => handleToggleStatus(s)}
                      >
                        {s.status === 'published' ? '⬇️ إلغاء النشر' : '🚀 نشر'}
                      </button>
                      <button className="sm-action-btn edit" onClick={() => openEdit(s)}>✏️ تعديل</button>
                      <button
                        className="sm-action-btn del"
                        onClick={() => handleDelete(s.id)}
                        disabled={deleting === s.id}
                      >
                        {deleting === s.id ? '...' : '🗑 حذف'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── نموذج إنشاء / تعديل ── */}
        {(view === 'create' || view === 'edit') && (
          <div className="sm-form">
            {msg && (
              <div className={`sm-msg ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</div>
            )}

            {/* معاينة البطاقة */}
            {preview && (
              <div style={{ marginBottom:24 }}>
                <p style={{ textAlign:'center', fontSize:'.8rem', color:'#64748b', fontWeight:700, marginBottom:14 }}>معاينة البطاقة في المكتبة</p>
                <div className="sm-preview-card" style={{ background: form.bg, borderColor: form.border_color, boxShadow: `0 4px 18px ${form.accent}20` }}>
                  <span style={{ fontSize:'2.8rem', lineHeight:1 }}>{form.icon || '📖'}</span>
                  <span style={{ background: `${form.accent}20`, color: form.accent, borderRadius:20, padding:'2px 9px', fontSize:'.62rem', fontWeight:800 }}>مستوى {form.level}</span>
                  <p style={{ fontSize:'.8rem', fontWeight:800, color:'#1e293b', margin:0 }}>{form.title || 'عنوان القصة'}</p>
                  <span style={{ fontSize:'.65rem', color:'#64748b' }}>⏱ {form.length}</span>
                  <span style={{ background:`linear-gradient(135deg,${form.accent},${form.accent}bb)`, color:'#fff', borderRadius:50, padding:'5px 14px', fontSize:'.7rem', fontWeight:800 }}>اقرأ الآن ←</span>
                </div>
              </div>
            )}

            {!preview && (
              <>
                <div className="sm-form-grid" style={{ marginBottom:16 }}>
                  {/* عنوان + أيقونة */}
                  <div className="sm-field" style={{ gridColumn:'1/-1' }}>
                    <label className="sm-label">عنوان القصة *</label>
                    <input className="sm-input" value={form.title} onChange={e => f('title', e.target.value)} placeholder="مثال: الأرنب الشجاع" />
                  </div>

                  <div className="sm-field">
                    <label className="sm-label">الأيقونة (إيموجي)</label>
                    <input className="sm-input" value={form.icon} onChange={e => f('icon', e.target.value)} placeholder="مثال: 🦁" maxLength={4} style={{ fontSize:'1.3rem', textAlign:'center' }} />
                  </div>

                  <div className="sm-field">
                    <label className="sm-label">النقاط</label>
                    <input className="sm-input" type="number" min={1} max={500} value={form.points} onChange={e => f('points', e.target.value)} />
                  </div>

                  <div className="sm-field">
                    <label className="sm-label">المستوى</label>
                    <select className="sm-select" value={form.level} onChange={e => f('level', e.target.value)}>
                      <option value={1}>مستوى 1</option>
                      <option value={2}>مستوى 2</option>
                      <option value={3}>مستوى 3</option>
                    </select>
                  </div>

                  <div className="sm-field">
                    <label className="sm-label">طول القصة</label>
                    <select className="sm-select" value={form.length} onChange={e => f('length', e.target.value)}>
                      {LENGTHS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>

                  <div className="sm-field">
                    <label className="sm-label">الحالة</label>
                    <select className="sm-select" value={form.status} onChange={e => f('status', e.target.value)}>
                      <option value="draft">مسودة (غير منشورة)</option>
                      <option value="published">منشورة للطلاب</option>
                    </select>
                  </div>

                  <div className="sm-field">
                    <label className="sm-label">لون القصة</label>
                    <div className="sm-color-swatches">
                      {ACCENTS.map(a => (
                        <div
                          key={a.accent}
                          className={`sm-swatch${form.accent === a.accent ? ' active' : ''}`}
                          style={{ background: a.bg, border: `2.5px solid ${form.accent === a.accent ? a.accent : '#e2e8f0'}` }}
                          title={a.label}
                          onClick={() => setForm(p => ({ ...p, accent: a.accent, bg: a.bg, border_color: a.border }))}
                        >
                          <span style={{ width:14, height:14, borderRadius:'50%', background: a.accent, display:'block' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── محرر الصفحات ── */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <span className="sm-label" style={{ margin:0 }}>
                      صفحات القصة
                      <span style={{ fontSize:'.7rem', color:'#94a3b8', fontWeight:600, marginRight:8 }}>({pages.length} صفحة)</span>
                    </span>
                    <button
                      type="button"
                      onClick={addPage}
                      style={{ background:'#eef2ff', color:'#4f46e5', border:'1.5px solid #c7d2fe', borderRadius:10, padding:'6px 16px', fontSize:'.8rem', fontWeight:800, cursor:'pointer', fontFamily:'inherit' }}
                    >
                      + إضافة صفحة
                    </button>
                  </div>

                  <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    {pages.map((page, i) => (
                      <div key={i} style={{ border:'2px solid #e5e7eb', borderRadius:16, overflow:'hidden', background:'#fff', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>

                        {/* رأس الصفحة */}
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'#f8fafc', borderBottom:'1px solid #e5e7eb' }}>
                          <span style={{ fontWeight:800, fontSize:'.83rem', color:'#374151' }}>📄 الصفحة {i + 1}</span>
                          <div style={{ display:'flex', gap:5 }}>
                            {i > 0 && (
                              <button type="button" onClick={() => movePage(i, -1)}
                                style={{ background:'#f1f5f9', color:'#475569', border:'none', borderRadius:7, padding:'3px 10px', fontSize:'.75rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>⬆</button>
                            )}
                            {i < pages.length - 1 && (
                              <button type="button" onClick={() => movePage(i, 1)}
                                style={{ background:'#f1f5f9', color:'#475569', border:'none', borderRadius:7, padding:'3px 10px', fontSize:'.75rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>⬇</button>
                            )}
                            {pages.length > 1 && (
                              <button type="button" onClick={() => deletePage(i)}
                                style={{ background:'#fee2e2', color:'#b91c1c', border:'none', borderRadius:7, padding:'3px 10px', fontSize:'.75rem', fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>🗑 حذف</button>
                            )}
                          </div>
                        </div>

                        {/* منطقة الصورة */}
                        <div style={{ padding:'12px 14px', borderBottom:'1px solid #f3f4f6', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
                          {page.imgUrl ? (
                            <div style={{ position:'relative', flexShrink:0 }}>
                              <img src={page.imgUrl} alt="" style={{ height:90, width:140, objectFit:'cover', borderRadius:10, display:'block', border:'1.5px solid #e2e8f0' }} />
                              <button
                                type="button"
                                onClick={() => updatePage(i, 'imgUrl', '')}
                                style={{ position:'absolute', top:4, right:4, background:'rgba(0,0,0,.55)', color:'#fff', border:'none', borderRadius:6, padding:'1px 6px', fontSize:'.72rem', cursor:'pointer' }}
                              >✕</button>
                            </div>
                          ) : null}

                          <label style={{
                            display:'inline-flex', alignItems:'center', gap:7,
                            background: uploading === i ? '#f8fafc' : '#f0fdf4',
                            border:`1.5px dashed ${uploading === i ? '#cbd5e1' : '#86efac'}`,
                            borderRadius:10, padding:'9px 16px',
                            cursor: uploading === i ? 'wait' : 'pointer',
                            fontSize:'.8rem', color: uploading === i ? '#94a3b8' : '#166534',
                            fontWeight:700, transition:'all .15s',
                          }}>
                            {uploading === i ? '⏳ جارٍ الرفع...' : page.imgUrl ? '🔄 تغيير الصورة' : '🖼 رفع صورة للصفحة'}
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display:'none' }}
                              disabled={uploading === i}
                              onChange={e => { if (e.target.files[0]) uploadPageImg(i, e.target.files[0]); e.target.value = ''; }}
                            />
                          </label>
                          {!page.imgUrl && (
                            <span style={{ fontSize:'.7rem', color:'#94a3b8' }}>اختيارية — تظهر في أعلى الصفحة للطالب</span>
                          )}
                        </div>

                        {/* محتوى HTML */}
                        <textarea
                          className="sm-textarea"
                          value={page.html}
                          onChange={e => updatePage(i, 'html', e.target.value)}
                          placeholder="<p>كان يا ما كان في قديم الزمان...</p>"
                          style={{ borderRadius:0, border:'none', minHeight:130, display:'block', width:'100%', boxSizing:'border-box', background:'#fff', borderTop:'1px solid #f3f4f6' }}
                        />
                      </div>
                    ))}
                  </div>

                  <p style={{ color:'#94a3b8', fontSize:'.72rem', margin:'10px 0 0', fontWeight:600 }}>
                    💡 يدعم HTML: &lt;p&gt; للفقرات · &lt;strong&gt; للخط العريض · &lt;em&gt; لتمييز المفردات الجديدة
                  </p>
                </div>
              </>
            )}

            <div className="sm-form-footer">
              <button className="sm-cancel-btn" onClick={backToList}>إلغاء</button>
              <button className="sm-save-btn" onClick={handleSave} disabled={saving}>
                {saving ? 'جارٍ الحفظ...' : view === 'edit' ? '💾 حفظ التغييرات' : '✅ إنشاء القصة'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
