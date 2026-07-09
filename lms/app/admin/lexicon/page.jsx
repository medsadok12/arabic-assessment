'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const TOPICS  = ['حيوانات','فاكهة','خضروات','مدرسة','طبيعة','طعام','مهن','أدوات','عام'];
const W_TYPES = ['اسم','فعل','صفة','ظرف','حرف'];
const GRADES  = [1,2,3,4,5,6,7,8,9,10,11,12];

const SQL = `-- إنشاء جدول الكلمات
CREATE TABLE IF NOT EXISTS lexicon_words (
  id          BIGSERIAL PRIMARY KEY,
  word        TEXT NOT NULL UNIQUE,
  word_type   TEXT,
  sentence    TEXT,
  topic       TEXT DEFAULT 'عام',
  grade_from  INT  NOT NULL DEFAULT 1 CHECK (grade_from BETWEEN 1 AND 12),
  grade_to    INT  NOT NULL DEFAULT 6  CHECK (grade_to  BETWEEN 1 AND 12),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول تقدم الطلاب في البطاقات
CREATE TABLE IF NOT EXISTS flashcard_progress (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id       BIGINT NOT NULL REFERENCES lexicon_words(id) ON DELETE CASCADE,
  level         INT    NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 5),
  next_review   DATE   NOT NULL DEFAULT CURRENT_DATE,
  last_reviewed DATE,
  UNIQUE(user_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_fp_user_review
  ON flashcard_progress(user_id, next_review);

NOTIFY pgrst, 'reload schema';`;

const EMPTY_FORM = { word:'', word_type:'اسم', sentence:'', topic:'حيوانات', grade_from:1, grade_to:6 };

export default function LexiconAdmin() {
  const [words,       setWords]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [needSql,     setNeedSql]     = useState(false);
  const [sqlCopied,   setSqlCopied]   = useState(false);
  const [search,      setSearch]      = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [modal,       setModal]       = useState(null); // null | 'add' | word-object
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [formMsg,     setFormMsg]     = useState(null);
  const [seeding,     setSeeding]     = useState(false);
  const [seedMsg,     setSeedMsg]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTopic) params.set('topic', filterTopic);
      const r = await fetch(`/api/admin/lexicon?${params}`);
      const d = await r.json();
      if (d.need_sql) { setNeedSql(true); setWords([]); }
      else            { setNeedSql(false); setWords(d.words || []); }
    } catch { setWords([]); }
    setLoading(false);
  }, [filterTopic]);

  useEffect(() => { load(); }, [load]);

  const displayed = search
    ? words.filter(w => w.word.includes(search) || (w.sentence||'').includes(search))
    : words;

  const byTopic = words.reduce((a, w) => { a[w.topic||'عام'] = (a[w.topic||'عام']||0)+1; return a; }, {});

  function openAdd() {
    setForm(EMPTY_FORM);
    setModal('add');
    setFormMsg(null);
  }

  function openEdit(w) {
    setForm({ word: w.word, word_type: w.word_type||'اسم', sentence: w.sentence||'', topic: w.topic||'عام', grade_from: w.grade_from||1, grade_to: w.grade_to||6 });
    setModal(w);
    setFormMsg(null);
  }

  async function handleSave() {
    setSaving(true); setFormMsg(null);
    try {
      const isEdit = modal !== 'add';
      const body   = isEdit ? { id: modal.id, ...form } : form;
      const r = await fetch('/api/admin/lexicon', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'خطأ');
      setFormMsg({ ok:true, text: isEdit ? '✅ تم التحديث' : '✅ تمت الإضافة' });
      setTimeout(() => { setModal(null); load(); }, 700);
    } catch(e) {
      setFormMsg({ ok:false, text: `❌ ${e.message}` });
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('هل تريد حذف هذه الكلمة نهائيًا؟')) return;
    const r = await fetch(`/api/admin/lexicon?id=${id}`, { method:'DELETE' });
    if (r.ok) load();
  }

  async function handleSeed() {
    setSeeding(true); setSeedMsg(null);
    try {
      const r = await fetch('/api/admin/lexicon', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ seed: true }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setSeedMsg(`✅ تمت إضافة ${d.count} كلمة بنجاح`);
      load();
    } catch(e) {
      setSeedMsg(`❌ ${e.message}`);
    }
    setSeeding(false);
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:'inherit', direction:'rtl', padding:'24px 16px' }}>
      <style>{`
        .lex-table { width:100%; border-collapse:collapse; }
        .lex-table th { padding:10px 12px; font-weight:800; color:#475569; font-size:.79rem; text-align:right; background:#f1f5f9; border-bottom:2px solid #e2e8f0; }
        .lex-table td { padding:9px 12px; border-bottom:1px solid #f1f5f9; font-size:.86rem; color:#334155; }
        .lex-table tr:hover td { background:#fafafe; }
        .lex-btn { border:none; border-radius:8px; padding:5px 11px; cursor:pointer; font-family:inherit; font-size:.78rem; font-weight:700; }
        .lex-input { border:1.5px solid #e2e8f0; border-radius:10px; padding:9px 12px; font-family:inherit; font-size:.9rem; direction:rtl; width:100%; box-sizing:border-box; }
        .lex-input:focus { outline:none; border-color:#6366f1; }
        .lex-select { border:1.5px solid #e2e8f0; border-radius:10px; padding:9px 10px; font-family:inherit; direction:rtl; width:100%; box-sizing:border-box; background:#fff; }
      `}</style>

      <div style={{ maxWidth:960, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24, flexWrap:'wrap' }}>
          <Link href="/admin" style={{ color:'#6366f1', textDecoration:'none', fontSize:'.88rem', fontWeight:700 }}>← لوحة الإدارة</Link>
          <span style={{ color:'#cbd5e1' }}>|</span>
          <h1 style={{ margin:0, fontSize:'1.25rem', fontWeight:900, color:'#1e293b' }}>📚 إدارة قاموس البطاقات</h1>
          <span style={{ marginRight:'auto', background:'#eff6ff', color:'#1d4ed8', borderRadius:20, padding:'3px 12px', fontSize:'.78rem', fontWeight:700 }}>
            {words.length} كلمة
          </span>
        </div>

        {/* SQL block */}
        {needSql && (
          <div style={{ background:'#fff', border:'2px dashed #f97316', borderRadius:16, padding:20, marginBottom:24 }}>
            <h3 style={{ margin:'0 0 10px', color:'#c2410c', fontSize:'1rem', fontWeight:800 }}>⚠️ الجداول غير موجودة — شغّل هذا SQL في Supabase أولاً:</h3>
            <div style={{ background:'#0f172a', borderRadius:10, padding:16, position:'relative', marginBottom:12 }}>
              <pre style={{ color:'#e2e8f0', fontSize:'.75rem', margin:0, whiteSpace:'pre-wrap', fontFamily:'monospace', direction:'ltr', textAlign:'left', overflowX:'auto' }}>{SQL}</pre>
              <button
                className="lex-btn"
                onClick={() => { navigator.clipboard.writeText(SQL); setSqlCopied(true); setTimeout(()=>setSqlCopied(false),2000); }}
                style={{ position:'absolute', top:10, left:10, background:'#4f46e5', color:'#fff' }}>
                {sqlCopied ? '✅ تم' : '📋 نسخ'}
              </button>
            </div>
            <button className="lex-btn" onClick={load} style={{ background:'#f97316', color:'#fff', padding:'8px 18px', fontSize:'.85rem' }}>
              🔄 إعادة المحاولة بعد تشغيل SQL
            </button>
          </div>
        )}

        {!needSql && (
          <>
            {/* Top row: stats + seed */}
            <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginBottom:20 }}>

              {/* Stats card */}
              <div style={{ flex:'1 1 260px', background:'#fff', borderRadius:14, padding:'14px 18px', border:'1.5px solid #e2e8f0' }}>
                <div style={{ fontWeight:800, color:'#1e293b', marginBottom:10, fontSize:'.88rem' }}>📊 توزيع الكلمات حسب الموضوع</div>
                <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                  {Object.entries(byTopic).sort((a,b)=>b[1]-a[1]).map(([t,n]) => (
                    <button key={t}
                      onClick={() => setFilterTopic(filterTopic===t?'':t)}
                      style={{ background: filterTopic===t?'#6366f1':'#f1f5f9', color: filterTopic===t?'#fff':'#475569', border:'none', borderRadius:20, padding:'3px 10px', fontSize:'.76rem', fontWeight:700, cursor:'pointer' }}>
                      {t}: {n}
                    </button>
                  ))}
                  {Object.keys(byTopic).length === 0 && (
                    <span style={{ color:'#94a3b8', fontSize:'.82rem' }}>لا توجد كلمات بعد</span>
                  )}
                </div>
              </div>

              {/* Seed card */}
              <div style={{ flex:'0 1 260px', background:'#f0fdf4', borderRadius:14, padding:'14px 18px', border:'1.5px solid #86efac' }}>
                <div style={{ fontWeight:800, color:'#15803d', marginBottom:6, fontSize:'.88rem' }}>🌱 الكلمات الافتراضية</div>
                <p style={{ color:'#4b7a5a', fontSize:'.78rem', margin:'0 0 10px', lineHeight:1.6 }}>
                  50 كلمة تعليمية جاهزة بالتشكيل وجمل مثال (حيوانات، فاكهة، خضروات، مدرسة، طبيعة)
                </p>
                <button className="lex-btn" onClick={handleSeed} disabled={seeding}
                  style={{ background: seeding?'#6ee7b7':'#16a34a', color:'#fff', padding:'8px 16px', fontSize:'.85rem', opacity: seeding?.7:1 }}>
                  {seeding ? '⏳ جارٍ الزرع…' : '🌱 زرع الكلمات الافتراضية'}
                </button>
                {seedMsg && (
                  <div style={{ marginTop:8, fontSize:'.78rem', fontWeight:700, color: seedMsg.startsWith('✅')?'#15803d':'#b91c1c' }}>{seedMsg}</div>
                )}
              </div>
            </div>

            {/* Toolbar */}
            <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
              <input
                className="lex-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="🔍 ابحث عن كلمة أو جملة…"
                style={{ flex:'1 1 180px', width:'auto' }}
              />
              <select
                className="lex-select"
                value={filterTopic}
                onChange={e => setFilterTopic(e.target.value)}
                style={{ flex:'0 1 160px', width:'auto' }}>
                <option value="">كل الموضوعات</option>
                {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button className="lex-btn" onClick={openAdd}
                style={{ background:'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#fff', padding:'9px 20px', fontSize:'.88rem', whiteSpace:'nowrap' }}>
                ➕ إضافة كلمة
              </button>
            </div>

            {/* Table */}
            {loading ? (
              <div style={{ textAlign:'center', padding:48, color:'#94a3b8', background:'#fff', borderRadius:14, border:'1.5px solid #e2e8f0' }}>جارٍ التحميل…</div>
            ) : displayed.length === 0 ? (
              <div style={{ textAlign:'center', padding:48, color:'#94a3b8', background:'#fff', borderRadius:14, border:'1.5px solid #e2e8f0' }}>
                <div style={{ fontSize:'2.5rem', marginBottom:10 }}>📭</div>
                لا توجد كلمات — أضف كلمة أو اضغط «زرع الكلمات الافتراضية»
              </div>
            ) : (
              <div className="table-scroll-wrapper" style={{ background:'#fff', borderRadius:14, border:'1.5px solid #e2e8f0' }}>
                <table className="lex-table">
                  <thead>
                    <tr>
                      <th>الكلمة</th>
                      <th>النوع</th>
                      <th>الموضوع</th>
                      <th>الصف</th>
                      <th>جملة مثال</th>
                      <th style={{ width:80 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map(w => (
                      <tr key={w.id}>
                        <td style={{ fontWeight:900, fontSize:'1.05rem', color:'#1e293b', fontFamily:'inherit' }}>{w.word}</td>
                        <td style={{ color:'#64748b' }}>{w.word_type || '—'}</td>
                        <td>
                          <span style={{ background:'#eff6ff', color:'#2563eb', borderRadius:20, padding:'2px 9px', fontSize:'.72rem', fontWeight:700 }}>
                            {w.topic || 'عام'}
                          </span>
                        </td>
                        <td style={{ color:'#64748b', whiteSpace:'nowrap' }}>{w.grade_from}–{w.grade_to}</td>
                        <td style={{ maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'#475569' }}>
                          {w.sentence || <span style={{ color:'#cbd5e1' }}>—</span>}
                        </td>
                        <td style={{ whiteSpace:'nowrap' }}>
                          <button className="lex-btn" onClick={() => openEdit(w)}
                            style={{ background:'#f1f5f9', color:'#475569', marginLeft:5 }}>✏️</button>
                          <button className="lex-btn" onClick={() => handleDelete(w.id)}
                            style={{ background:'#fef2f2', color:'#b91c1c', border:'1px solid #fca5a5' }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding:'8px 14px', color:'#94a3b8', fontSize:'.75rem', borderTop:'1px solid #f1f5f9' }}>
                  عرض {displayed.length} من {words.length} كلمة
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:999, padding:16 }}
          onClick={() => setModal(null)}>
          <div
            style={{ background:'#fff', borderRadius:20, padding:'24px 20px', width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto' }}
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <h3 style={{ margin:0, color:'#1e293b', fontSize:'1.05rem', fontWeight:900 }}>
                {modal === 'add' ? '➕ إضافة كلمة جديدة' : `✏️ تعديل: ${modal.word}`}
              </h3>
              <button onClick={() => setModal(null)}
                style={{ background:'#f1f5f9', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', fontSize:'1rem' }}>✕</button>
            </div>

            {/* Word */}
            <label style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
              <span style={{ fontWeight:700, color:'#374151', fontSize:'.84rem' }}>الكلمة <span style={{ color:'#ef4444' }}>*</span></span>
              <input className="lex-input" value={form.word} onChange={e => setForm(f=>({...f,word:e.target.value}))}
                placeholder="مثال: أَسَد" style={{ fontSize:'1.15rem', fontWeight:800 }} />
            </label>

            {/* Type + Topic */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <label style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <span style={{ fontWeight:700, color:'#374151', fontSize:'.84rem' }}>نوع الكلمة</span>
                <select className="lex-select" value={form.word_type} onChange={e => setForm(f=>({...f,word_type:e.target.value}))}>
                  {W_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <span style={{ fontWeight:700, color:'#374151', fontSize:'.84rem' }}>الموضوع</span>
                <select className="lex-select" value={form.topic} onChange={e => setForm(f=>({...f,topic:e.target.value}))}>
                  {TOPICS.map(t => <option key={t}>{t}</option>)}
                </select>
              </label>
            </div>

            {/* Grade range */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <label style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <span style={{ fontWeight:700, color:'#374151', fontSize:'.84rem' }}>من صف</span>
                <select className="lex-select" value={form.grade_from} onChange={e => setForm(f=>({...f,grade_from:Number(e.target.value)}))}>
                  {GRADES.map(g => <option key={g} value={g}>الصف {g}</option>)}
                </select>
              </label>
              <label style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <span style={{ fontWeight:700, color:'#374151', fontSize:'.84rem' }}>إلى صف</span>
                <select className="lex-select" value={form.grade_to} onChange={e => setForm(f=>({...f,grade_to:Number(e.target.value)}))}>
                  {GRADES.map(g => <option key={g} value={g}>الصف {g}</option>)}
                </select>
              </label>
            </div>

            {/* Sentence */}
            <label style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:20 }}>
              <span style={{ fontWeight:700, color:'#374151', fontSize:'.84rem' }}>جملة مثال</span>
              <textarea className="lex-input" value={form.sentence} onChange={e => setForm(f=>({...f,sentence:e.target.value}))}
                rows={3} placeholder="مثال: الأَسَدُ يَزْأَرُ فِي الغَابَة." style={{ resize:'vertical' }} />
            </label>

            {formMsg && (
              <div style={{ marginBottom:14, padding:'8px 12px', borderRadius:8, fontSize:'.85rem', fontWeight:700, background: formMsg.ok?'#d4edda':'#f8d7da', color: formMsg.ok?'#155724':'#721c24' }}>
                {formMsg.text}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !form.word.trim()}
              style={{ width:'100%', background:'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#fff', border:'none', borderRadius:12, padding:'13px', fontWeight:900, cursor: (saving||!form.word.trim())?'not-allowed':'pointer', fontFamily:'inherit', fontSize:'1rem', opacity: !form.word.trim()?.55:1 }}>
              {saving ? 'جارٍ الحفظ…' : modal==='add' ? '➕ إضافة الكلمة' : '💾 حفظ التعديلات'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
