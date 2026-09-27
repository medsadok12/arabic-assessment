'use client';
import { useState, useEffect } from 'react';

/*
  لوحة إدارة "اختبار تحديد المستوى" التسويقي — ذاتية الاكتفاء (بلا props)،
  بنفس نمط LeadsTab.jsx/AnalyticsTab.jsx (حالتها الخاصة، جلبها الخاص).
  ثلاثة أقسام داخلية: الأسئلة (CRUD + ترتيب بأزرار ▲▼ + رفع وسائط حقيقي)،
  المستويات (حدود النقاط والنصوص الوصفية)، الإعدادات (قالب رسالة واتساب).
  عند أي فشل في القراءة هنا، الموقع العام (assessment.aarem.net/?quick=1)
  يسقط تلقائياً لمحتوى blueprint.js الثابت — راجع fetchQuicktestData.js.
*/

async function uploadMedia(file, kind) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`/api/bogga/quicktest-questions/upload?kind=${kind}`, { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'فشل رفع الملف');
  return data.url;
}

const EMPTY_QUESTION = {
  question_text: '', image_url: null, audio_url: null, prompt_emoji: '', audio_prompt: '',
  reading_text: '', parent_read_hint: false, skill_tag: '',
  options: [{ text: '', correct: true }, { text: '', correct: false }, { text: '', correct: false }],
  enabled: true,
};

export default function QuicktestCmsTab() {
  const [subTab, setSubTab] = useState('questions'); // questions | levels | settings

  const [questions, setQuestions] = useState(null);
  const [levels,    setLevels]    = useState(null);
  const [settings,  setSettings]  = useState(null);
  const [error,     setError]     = useState(null);

  const [editingQ, setEditingQ] = useState(null); // { id?, ...EMPTY_QUESTION } أو null
  const [qSaving,  setQSaving]  = useState(false);
  const [qMsg,     setQMsg]     = useState(null);
  const [uploading, setUploading] = useState(null); // 'image' | 'audio' | null

  const [editingLevel, setEditingLevel] = useState(null);
  const [lSaving, setLSaving] = useState(false);
  const [lMsg,    setLMsg]    = useState(null);

  const [waTemplate, setWaTemplate] = useState('');
  const [waSaving,   setWaSaving]   = useState(false);
  const [waMsg,      setWaMsg]      = useState(null);

  function loadAll() {
    Promise.all([
      fetch('/api/bogga/quicktest-questions').then(r => r.json()),
      fetch('/api/bogga/quicktest-levels').then(r => r.json()),
      fetch('/api/bogga/quicktest-settings').then(r => r.json()),
    ]).then(([q, l, s]) => {
      if (q.error || l.error || s.error) { setError(q.error || l.error || s.error); return; }
      setQuestions(q.questions);
      setLevels(l.levels);
      setSettings(s.settings);
      setWaTemplate(s.settings?.whatsapp_template ?? '');
    }).catch(() => setError('تعذّر تحميل بيانات لوحة الاختبار الترويجي'));
  }

  useEffect(loadAll, []);

  // ── الأسئلة ────────────────────────────────────────────────────────────
  async function moveQuestion(q, dir) {
    const idx = questions.findIndex(x => x.id === q.id);
    const j = idx + dir;
    if (j < 0 || j >= questions.length) return;
    const other = questions[j];
    const res = await fetch('/api/bogga/quicktest-questions/reorder', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: q.id, order_index: other.order_index }, { id: other.id, order_index: q.order_index }] }),
    });
    if (res.ok) {
      const next = [...questions];
      [next[idx], next[j]] = [next[j], next[idx]];
      const tmp = next[idx].order_index; next[idx].order_index = next[j].order_index; next[j].order_index = tmp;
      setQuestions(next.sort((a, b) => a.order_index - b.order_index));
    }
  }

  async function toggleEnabled(q) {
    const res = await fetch(`/api/bogga/quicktest-questions/${q.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !q.enabled }),
    });
    if (res.ok) setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, enabled: !q.enabled } : x));
  }

  async function deleteQuestion(id) {
    if (!confirm('هل تريد حذف هذا السؤال نهائياً؟')) return;
    const res = await fetch(`/api/bogga/quicktest-questions/${id}`, { method: 'DELETE' });
    if (res.ok) setQuestions(prev => prev.filter(x => x.id !== id));
  }

  async function saveQuestion(e) {
    e.preventDefault();
    setQSaving(true); setQMsg(null);
    try {
      const isEdit = !!editingQ.id;
      const body = { ...editingQ };
      delete body.id;
      const res = await fetch(isEdit ? `/api/bogga/quicktest-questions/${editingQ.id}` : '/api/bogga/quicktest-questions', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الحفظ');
      if (isEdit) setQuestions(prev => prev.map(x => x.id === editingQ.id ? data.question : x));
      else setQuestions(prev => [...prev, data.question]);
      setEditingQ(null);
    } catch (err) {
      setQMsg({ ok: false, text: '❌ ' + err.message });
    }
    setQSaving(false);
  }

  async function handleMediaUpload(file, kind) {
    setUploading(kind); setQMsg(null);
    try {
      const url = await uploadMedia(file, kind);
      setEditingQ(prev => ({ ...prev, [kind === 'image' ? 'image_url' : 'audio_url']: url }));
    } catch (err) {
      setQMsg({ ok: false, text: '❌ ' + err.message });
    }
    setUploading(null);
  }

  // ── المستويات ──────────────────────────────────────────────────────────
  async function saveLevel(e) {
    e.preventDefault();
    setLSaving(true); setLMsg(null);
    try {
      const res = await fetch('/api/bogga/quicktest-levels', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingLevel),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الحفظ');
      setLevels(prev => prev.map(x => x.id === editingLevel.id ? data.level : x));
      setEditingLevel(null);
    } catch (err) {
      setLMsg({ ok: false, text: '❌ ' + err.message });
    }
    setLSaving(false);
  }

  // ── الإعدادات ──────────────────────────────────────────────────────────
  async function saveSettings() {
    setWaSaving(true); setWaMsg(null);
    try {
      const res = await fetch('/api/bogga/quicktest-settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp_template: waTemplate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الحفظ');
      setWaMsg({ ok: true, text: '✅ تم الحفظ' });
    } catch (err) {
      setWaMsg({ ok: false, text: '❌ ' + err.message });
    }
    setWaSaving(false);
  }

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!questions || !levels) return <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>;

  return (
    <div>
      <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 6 }}>🛠️ إدارة الاختبار الترويجي</h2>
      <p style={{ color: 'var(--muted)', fontSize: '.85rem', marginBottom: 20 }}>
        يتحكم هذا التبويب باختبار "تحديد المستوى" المجاني المنشور على assessment.aarem.net/?quick=1 — عند أي فشل هنا، يعرض الموقع العام تلقائياً نسخة احتياطية ثابتة، فلا يتعطل أمام الزوار.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 22, borderBottom: '1.5px solid var(--border)', paddingBottom: 4 }}>
        {[
          { id: 'questions', label: `📝 الأسئلة (${questions.length})` },
          { id: 'levels',    label: '⚙️ المستويات' },
          { id: 'settings',  label: '📱 رسالة واتساب' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className="btn btn-sm"
            style={{
              background: subTab === t.id ? 'var(--primary)' : 'transparent',
              color: subTab === t.id ? '#fff' : 'var(--text)',
              border: 'none', fontWeight: 700,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'questions' && (
        <QuestionsSection
          questions={questions}
          moveQuestion={moveQuestion}
          toggleEnabled={toggleEnabled}
          deleteQuestion={deleteQuestion}
          onAdd={() => { setEditingQ({ ...EMPTY_QUESTION }); setQMsg(null); }}
          onEdit={q => { setEditingQ({ ...q, options: q.options?.length ? q.options : EMPTY_QUESTION.options }); setQMsg(null); }}
        />
      )}

      {subTab === 'levels' && (
        <LevelsSection levels={levels} onEdit={l => { setEditingLevel({ ...l }); setLMsg(null); }} />
      )}

      {subTab === 'settings' && (
        <div className="card" style={{ maxWidth: 620, padding: 22 }}>
          <div className="form-group">
            <label className="form-label">قالب رسالة واتساب</label>
            <textarea
              className="form-input" rows={3} value={waTemplate}
              onChange={e => setWaTemplate(e.target.value)}
            />
            <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: 6 }}>
              يمكن استخدام <code>{'{childName}'}</code> (اسم الطفل) و<code>{'{program}'}</code> (اسم البرنامج الموصى به) — تُستبدَل تلقائياً عند إرسال الرسالة.
            </p>
          </div>
          {waMsg && <div className={`alert alert-${waMsg.ok ? 'success' : 'error'}`}>{waMsg.text}</div>}
          <button className="btn btn-primary" onClick={saveSettings} disabled={waSaving}>
            {waSaving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> جارٍ الحفظ...</> : '✅ حفظ'}
          </button>
        </div>
      )}

      {editingQ && (
        <QuestionModal
          value={editingQ} setValue={setEditingQ}
          onSubmit={saveQuestion} onClose={() => setEditingQ(null)}
          saving={qSaving} msg={qMsg} uploading={uploading}
          onUpload={handleMediaUpload}
        />
      )}

      {editingLevel && (
        <LevelModal
          value={editingLevel} setValue={setEditingLevel}
          onSubmit={saveLevel} onClose={() => setEditingLevel(null)}
          saving={lSaving} msg={lMsg}
        />
      )}
    </div>
  );
}

function QuestionsSection({ questions, moveQuestion, toggleEnabled, deleteQuestion, onAdd, onEdit }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="btn btn-primary btn-sm" onClick={onAdd}>+ سؤال جديد</button>
      </div>
      <div className="card table-scroll-wrapper" style={{ padding: 0 }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.87rem' }}>
          <thead>
            <tr>
              {['#', 'السؤال', 'المهارة', 'الوسائط', 'الحالة', 'إجراءات'].map(h => (
                <th key={h} style={{ background: 'var(--primary)', color: '#fff', padding: '9px 14px', textAlign: 'right', fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questions.map((q, i) => (
              <tr key={q.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fbff', opacity: q.enabled ? 1 : .5 }}>
                <td style={{ padding: '8px 14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button className="btn btn-sm" style={{ padding: '1px 8px' }} disabled={i === 0} onClick={() => moveQuestion(q, -1)}>▲</button>
                    <button className="btn btn-sm" style={{ padding: '1px 8px' }} disabled={i === questions.length - 1} onClick={() => moveQuestion(q, 1)}>▼</button>
                  </div>
                </td>
                <td style={{ padding: '8px 14px', maxWidth: 320 }}>{q.question_text}</td>
                <td style={{ padding: '8px 14px' }}>{q.skill_tag ? <span className="badge badge-blue">{q.skill_tag}</span> : '—'}</td>
                <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                  {q.image_url ? '🖼️' : q.prompt_emoji ? q.prompt_emoji : ''}{' '}
                  {q.audio_url ? '🔊' : q.audio_prompt ? '🗣️(TTS)' : ''}{' '}
                  {q.reading_text ? '📖' : ''}{' '}
                  {q.parent_read_hint ? '👨‍👧' : ''}
                </td>
                <td style={{ padding: '8px 14px' }}>
                  <button
                    onClick={() => toggleEnabled(q)}
                    className="btn btn-sm"
                    style={{ background: q.enabled ? '#f0fdf4' : '#f1f5f9', color: q.enabled ? '#16a34a' : '#64748b', border: 'none' }}
                  >
                    {q.enabled ? '✅ مفعّل' : '⏸ معطّل'}
                  </button>
                </td>
                <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                  <button className="btn btn-sm btn-outline" onClick={() => onEdit(q)} style={{ marginLeft: 6 }}>✏️</button>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteQuestion(q.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LevelsSection({ levels, onEdit }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
      {levels.map(l => (
        <div key={l.id} className="card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: '1.6rem' }}>{l.icon}</span>
            <strong style={{ color: 'var(--primary)' }}>{l.label}</strong>
          </div>
          <div style={{ fontSize: '.85rem', color: 'var(--muted)', marginBottom: 6 }}>
            النطاق: من {l.min_correct} إلى {l.max_correct} إجابة صحيحة
          </div>
          <div style={{ fontSize: '.82rem', color: 'var(--text)', marginBottom: 10, lineHeight: 1.7 }}>{l.strengths_text}</div>
          <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--primary)' }}>{l.program_name}</div>
          <button className="btn btn-sm btn-outline" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }} onClick={() => onEdit(l)}>✏️ تعديل</button>
        </div>
      ))}
    </div>
  );
}

function QuestionModal({ value, setValue, onSubmit, onClose, saving, msg, uploading, onUpload }) {
  const set = patch => setValue(prev => ({ ...prev, ...patch }));

  function updateOption(i, patch) {
    set({ options: value.options.map((o, idx) => idx === i ? { ...o, ...patch } : o) });
  }
  function setCorrect(i) {
    set({ options: value.options.map((o, idx) => ({ ...o, correct: idx === i })) });
  }
  function removeOption(i) {
    if (value.options.length <= 2) return;
    set({ options: value.options.filter((_, idx) => idx !== i) });
  }
  function addOption() {
    set({ options: [...value.options, { text: '', emoji: '', correct: false }] });
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '26px 22px', width: '100%', maxWidth: 560, direction: 'rtl', maxHeight: '92vh', overflowY: 'auto' }}>
        <h3 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 18 }}>{value.id ? '✏️ تعديل السؤال' : '+ سؤال جديد'}</h3>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">نص السؤال *</label>
            <textarea className="form-input" rows={2} required value={value.question_text} onChange={e => set({ question_text: e.target.value })} />
          </div>

          <div className="form-group">
            <label className="form-label">فقرة قراءة (اختياري — لأسئلة الاستيعاب القرائي)</label>
            <textarea className="form-input" rows={2} value={value.reading_text || ''} onChange={e => set({ reading_text: e.target.value })} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">صورة السؤال (اختياري)</label>
              {value.image_url ? (
                <div>
                  <img src={value.image_url} alt="" style={{ maxHeight: 80, borderRadius: 8, marginBottom: 6 }} />
                  <button type="button" className="btn btn-sm" onClick={() => set({ image_url: null })}>✕ إزالة</button>
                </div>
              ) : (
                <>
                  <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && onUpload(e.target.files[0], 'image')} disabled={uploading === 'image'} />
                  <p style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 4 }}>أو استخدم إيموجي كصورة سريعة أدناه (بلا رفع)</p>
                  <input className="form-input" placeholder="إيموجي — مثال: 🐱🌳" value={value.prompt_emoji || ''} onChange={e => set({ prompt_emoji: e.target.value })} style={{ marginTop: 4 }} />
                </>
              )}
              {uploading === 'image' && <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />}
            </div>
            <div className="form-group">
              <label className="form-label">صوت السؤال (اختياري)</label>
              {value.audio_url ? (
                <div>
                  <audio controls src={value.audio_url} style={{ maxWidth: '100%', height: 32 }} />
                  <button type="button" className="btn btn-sm" onClick={() => set({ audio_url: null })} style={{ display: 'block', marginTop: 6 }}>✕ إزالة</button>
                </div>
              ) : (
                <>
                  <input type="file" accept="audio/*" onChange={e => e.target.files?.[0] && onUpload(e.target.files[0], 'audio')} disabled={uploading === 'audio'} />
                  <p style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 4 }}>أو نص يُنطَق آلياً (بلا رفع)</p>
                  <input className="form-input" placeholder="مثال: بَ — أو جملة كاملة" value={value.audio_prompt || ''} onChange={e => set({ audio_prompt: e.target.value })} style={{ marginTop: 4 }} />
                </>
              )}
              {uploading === 'audio' && <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="q-parent-read" checked={!!value.parent_read_hint} onChange={e => set({ parent_read_hint: e.target.checked })} />
            <label htmlFor="q-parent-read" style={{ fontWeight: 600, cursor: 'pointer', fontSize: '.88rem' }}>يُطلَب من ولي الأمر قراءة السؤال بصوت مرتفع (بدل صوت مسجَّل)</label>
          </div>

          <div className="form-group">
            <label className="form-label">تصنيف المهارة (تنظيمي فقط)</label>
            <input className="form-input" placeholder="مثال: تمييز سمعي" value={value.skill_tag || ''} onChange={e => set({ skill_tag: e.target.value })} />
          </div>

          <div className="form-group">
            <label className="form-label">الخيارات * (حدّد الإجابة الصحيحة بالزر الدائري)</label>
            {value.options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, background: '#f8fafc', padding: '8px 10px', borderRadius: 8 }}>
                <input type="radio" name="qt-correct" checked={!!opt.correct} onChange={() => setCorrect(i)} title="الإجابة الصحيحة" />
                <input className="form-input" style={{ width: 56, textAlign: 'center' }} placeholder="🙂" value={opt.emoji || ''} onChange={e => updateOption(i, { emoji: e.target.value })} />
                <input className="form-input" style={{ flex: 1 }} placeholder="نص الخيار" required value={opt.text || ''} onChange={e => updateOption(i, { text: e.target.value })} />
                <button type="button" className="btn btn-sm btn-danger" onClick={() => removeOption(i)} disabled={value.options.length <= 2}>✕</button>
              </div>
            ))}
            <button type="button" className="btn btn-sm btn-outline" onClick={addOption}>+ خيار جديد</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="q-enabled" checked={!!value.enabled} onChange={e => set({ enabled: e.target.checked })} />
            <label htmlFor="q-enabled" style={{ fontWeight: 600, cursor: 'pointer', fontSize: '.88rem' }}>سؤال مفعّل (يظهر للزوار)</label>
          </div>

          {msg && <div className={`alert alert-${msg.ok ? 'success' : 'error'}`}>{msg.text}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={saving || uploading} style={{ flex: 1, justifyContent: 'center' }}>
              {saving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> جارٍ الحفظ...</> : '✅ حفظ'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LevelModal({ value, setValue, onSubmit, onClose, saving, msg }) {
  const set = patch => setValue(prev => ({ ...prev, ...patch }));
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '26px 22px', width: '100%', maxWidth: 480, direction: 'rtl', maxHeight: '92vh', overflowY: 'auto' }}>
        <h3 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 18 }}>✏️ تعديل مستوى: {value.label}</h3>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">من (إجابات صحيحة)</label>
              <input type="number" min="0" className="form-input" value={value.min_correct} onChange={e => set({ min_correct: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="form-label">إلى</label>
              <input type="number" min="0" className="form-input" value={value.max_correct} onChange={e => set({ max_correct: Number(e.target.value) })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">النتيجة الوصفية (نقاط القوة)</label>
            <textarea className="form-input" rows={2} value={value.strengths_text} onChange={e => set({ strengths_text: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">التوصية التربوية</label>
            <textarea className="form-input" rows={3} value={value.recommendation} onChange={e => set({ recommendation: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">اسم البرنامج الموصى به</label>
            <input className="form-input" value={value.program_name} onChange={e => set({ program_name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">جملة ترويجية قصيرة للبرنامج</label>
            <input className="form-input" value={value.program_pitch} onChange={e => set({ program_pitch: e.target.value })} />
          </div>
          {msg && <div className={`alert alert-${msg.ok ? 'success' : 'error'}`}>{msg.text}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
              {saving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> جارٍ الحفظ...</> : '✅ حفظ'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}
