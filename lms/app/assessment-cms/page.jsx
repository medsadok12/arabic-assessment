'use client';
import { useState, useEffect, useMemo } from 'react';
import Navbar from '../../components/Navbar';
import {
  SKILL_LABELS, TYPE_LABELS, CATEGORY_A_TYPES, CATEGORY_B_TYPES,
  FIELD_SCHEMAS, emptyPayloadFor,
} from '../../lib/assessment-question-types';
import QuestionFieldEditor from '../../components/admin/QuestionFieldEditor';
import QuestionPreview     from '../../components/admin/QuestionPreview';

const SKILL_ORDER = ['listening', 'vocabulary', 'reading', 'grammar', 'writing', 'speaking'];
// نفس الدومين المستخدَم في كل أنحاء lms/ (SmartFAQ.jsx، app/page.jsx...) — لا رابط جديد.
const ASSESSMENT_URL = 'https://assessment.aarem.net';

async function uploadMedia(file, kind) {
  const body = new FormData();
  body.append('file', file);
  const res  = await fetch(`/api/bogga/assessment-questions/upload?kind=${kind}`, { method: 'POST', body });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'فشل رفع الملف');
  return data.url;
}

const card = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 18, marginBottom: 18 };
const btnPrimary = { background: '#E8B84B', color: '#1A2B4A', border: 'none', borderRadius: 10, padding: '8px 16px', fontWeight: 800, cursor: 'pointer' };
const btnGhost   = { background: '#F1F5F9', color: '#334155', border: 'none', borderRadius: 10, padding: '8px 16px', fontWeight: 700, cursor: 'pointer' };
const iconBtn    = { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 4 };

// ملاحظة معمارية: صلاحية الوصول الحقيقية تُفرَض بالكامل من app/assessment-cms/
// layout.jsx (Server Component يُنفَّذ قبل وصول أي طلب إلى هنا) — لا حاجة
// لتكرار فحص الدور هنا؛ من وصل لهذا المكوّن فهو مخوَّل فعلياً (super_admin/
// admin دائماً، أو معلّم مُنح صراحةً صلاحية assessment_cms).
export default function AssessmentCmsPage() {
  const [loading, setLoading] = useState(true);

  const [questions, setQuestions] = useState([]);
  const [skills, setSkills]       = useState([]);
  const [level, setLevel]         = useState(1);
  const [msg, setMsg]             = useState(null);

  const [editing, setEditing]   = useState(null); // { id|null, level, skill, type, payload, weight, enabled, shuffle_within_level }
  const [saving, setSaving]     = useState(false);
  const [previewQ, setPreviewQ] = useState(null);
  const [showSkills, setShowSkills] = useState(false);
  const [uploading, setUploading]   = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [qRes, sRes] = await Promise.all([
      fetch('/api/bogga/assessment-questions').then(r => r.json()),
      fetch('/api/bogga/assessment-skills').then(r => r.json()),
    ]);
    setQuestions(qRes.questions || []);
    setSkills(sRes.skills || []);
    setLoading(false);
  }

  const levelQuestions = useMemo(
    () => questions.filter(q => q.level === level).sort((a, b) => a.order_index - b.order_index),
    [questions, level]
  );

  const bySkill = useMemo(() => {
    const map = {};
    for (const s of SKILL_ORDER) map[s] = [];
    for (const q of levelQuestions) (map[q.skill] ??= []).push(q);
    return map;
  }, [levelQuestions]);

  function flash(ok, text) {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), 3500);
  }

  async function patchQuestion(id, patch) {
    const res  = await fetch(`/api/bogga/assessment-questions/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) { flash(false, data.error || 'فشل التحديث'); return false; }
    setQuestions(prev => prev.map(q => (q.id === id ? data.question : q)));
    return true;
  }

  async function toggleEnabled(q) { await patchQuestion(q.id, { enabled: !q.enabled }); }
  async function toggleShuffle(q) { await patchQuestion(q.id, { shuffle_within_level: !q.shuffle_within_level }); }

  async function moveQuestion(q, dir) {
    const idx = levelQuestions.findIndex(x => x.id === q.id);
    const j = idx + dir;
    if (j < 0 || j >= levelQuestions.length) return;
    const other = levelQuestions[j];
    const res = await fetch('/api/bogga/assessment-questions/reorder', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: q.id, order_index: other.order_index }, { id: other.id, order_index: q.order_index }] }),
    });
    if (!res.ok) { flash(false, 'فشلت إعادة الترتيب'); return; }
    setQuestions(prev => prev.map(x => {
      if (x.id === q.id) return { ...x, order_index: other.order_index };
      if (x.id === other.id) return { ...x, order_index: q.order_index };
      return x;
    }));
  }

  async function deleteQuestion(q) {
    if (!confirm(`حذف السؤال "${q.id}" نهائياً؟`)) return;
    const res = await fetch(`/api/bogga/assessment-questions/${q.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { flash(false, data.error || 'فشل الحذف'); return; }
    setQuestions(prev => prev.filter(x => x.id !== q.id));
    flash(true, 'تم الحذف');
  }

  function openEdit(q) {
    setEditing({ ...q, isNew: false });
  }
  function openCreate(skill) {
    const type = CATEGORY_A_TYPES[0];
    setEditing({ id: '', level, skill, type, payload: emptyPayloadFor(type), weight: 1, enabled: true, shuffle_within_level: false, isNew: true });
  }

  async function saveEditing() {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.isNew) {
        if (!editing.id.trim()) { flash(false, 'معرّف السؤال مطلوب'); setSaving(false); return; }
        const res = await fetch('/api/bogga/assessment-questions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editing.id.trim(), level: editing.level, skill: editing.skill, type: editing.type,
            payload: editing.payload, weight: editing.weight, enabled: editing.enabled,
          }),
        });
        const data = await res.json();
        if (!res.ok) { flash(false, data.error || 'فشل الحفظ'); setSaving(false); return; }
        setQuestions(prev => [...prev, data.question]);
        flash(true, 'أُضيف السؤال بنجاح');
      } else {
        const ok = await patchQuestion(editing.id, {
          skill: editing.skill, payload: editing.payload, weight: editing.weight,
          enabled: editing.enabled, shuffle_within_level: editing.shuffle_within_level,
        });
        if (!ok) { setSaving(false); return; }
        flash(true, 'تم حفظ التعديلات');
      }
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function saveSkillWeight(id, weight) {
    const res = await fetch('/api/bogga/assessment-skills', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, weight }),
    });
    const data = await res.json();
    if (!res.ok) { flash(false, data.error); return; }
    setSkills(prev => prev.map(s => (s.id === id ? data.skill : s)));
    flash(true, 'تم تحديث وزن المهارة');
  }

  async function handleUpload(e, kind) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadMedia(file, kind);
      setEditing(prev => ({ ...prev, payload: { ...prev.payload, [kind === 'image' ? 'image_url' : 'audio_url']: url } }));
    } catch (err) {
      flash(false, err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  if (loading) {
    return (
      <div>
        <Navbar />
        <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif', background: '#F4EFE6', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <h1 style={{ color: '#1A2B4A', fontWeight: 800, margin: 0 }}>📝 إدارة أسئلة التقييم</h1>
          <button style={btnGhost} onClick={() => setShowSkills(s => !s)}>⚙️ أوزان المهارات</button>
        </div>

        {msg && (
          <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 10, fontWeight: 700, background: msg.ok ? '#EAFBF3' : '#FEE2E2', color: msg.ok ? '#065F46' : '#B91C1C' }}>
            {msg.text}
          </div>
        )}

        {showSkills && (
          <div style={card}>
            <h3 style={{ marginTop: 0, color: '#1A2B4A' }}>أوزان المهارات في الدرجة النهائية</h3>
            {skills.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ flex: 1, fontWeight: 700 }}>{s.name}</span>
                <input
                  type="number" step="0.01" min="0" defaultValue={s.weight}
                  style={{ width: 90, padding: 6, borderRadius: 8, border: '1px solid #E2E8F0' }}
                  onBlur={e => {
                    const w = Number(e.target.value);
                    if (!Number.isNaN(w) && w !== s.weight) saveSkillWeight(s.id, w);
                  }}
                />
              </div>
            ))}
            <p style={{ color: '#94A3B8', fontSize: '.8rem', marginTop: 8 }}>
              الأوزان نسبية فيما بينها — يُعاد توزيعها تلقائياً عند غياب أسئلة مهارة ما في مستوى معيّن.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[1, 2, 3].map(lv => (
            <button
              key={lv}
              onClick={() => setLevel(lv)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 800,
                background: level === lv ? '#1A2B4A' : '#fff', color: level === lv ? '#fff' : '#1A2B4A',
                boxShadow: level === lv ? 'none' : '0 0 0 1px #E2E8F0 inset',
              }}
            >
              المستوى {lv}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[1, 2, 3].map(lv => (
            <a
              key={lv}
              href={`${ASSESSMENT_URL}/?admin_preview=true&level=${lv}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1, padding: '8px 0', borderRadius: 10, textAlign: 'center', textDecoration: 'none',
                background: '#EAFBF3', color: '#065F46', fontWeight: 700, fontSize: '.85rem',
                border: '1px dashed #2ABB7A',
              }}
              title="يفتح التقييم فعلياً بلا نموذج تسجيل ولا حفظ نتيجة حقيقية"
            >
              🚀 تجربة المستوى {lv} فعلياً
            </a>
          ))}
        </div>
        <p style={{ color: '#94A3B8', fontSize: '.78rem', marginTop: -12, marginBottom: 20 }}>
          يفتح تطبيق التقييم في تبويب جديد مباشرة على هذا المستوى — يتخطى بيانات الطالب وكود التقييم، ولا يُسجَّل أي نتيجة.
        </p>

        {SKILL_ORDER.map(skillId => (
          <div key={skillId} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: '#1A2B4A' }}>{SKILL_LABELS[skillId]} <span style={{ color: '#94A3B8', fontWeight: 500, fontSize: '.85rem' }}>({(bySkill[skillId] || []).length})</span></h3>
              <button style={btnPrimary} onClick={() => openCreate(skillId)}>+ سؤال جديد</button>
            </div>
            {(bySkill[skillId] || []).length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: '.85rem' }}>لا توجد أسئلة لهذه المهارة في هذا المستوى.</div>
            ) : (
              (bySkill[skillId] || []).map(q => (
                <div key={q.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                  background: q.enabled ? '#F8FAFC' : '#FEF2F2', marginBottom: 8, flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button style={iconBtn} title="نقل للأعلى" onClick={() => moveQuestion(q, -1)} disabled={q.shuffle_within_level}>▲</button>
                    <button style={iconBtn} title="نقل للأسفل" onClick={() => moveQuestion(q, 1)} disabled={q.shuffle_within_level}>▼</button>
                  </div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, fontSize: '.85rem', color: '#1A2B4A' }}>
                      {TYPE_LABELS[q.type] || q.type}
                      {q.shuffle_within_level && <span title="يُعرض بترتيب عشوائي" style={{ marginRight: 6 }}>🔀</span>}
                      {!q.enabled && <span style={{ marginRight: 6, color: '#DC2626' }}>(معطَّل)</span>}
                    </div>
                    <div style={{ color: '#64748B', fontSize: '.78rem' }}>{(q.payload?.text || q.id).slice(0, 70)}</div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '.78rem' }}>
                    الوزن
                    <input
                      type="number" step="0.5" min="0" defaultValue={q.weight}
                      style={{ width: 55, padding: 4, borderRadius: 6, border: '1px solid #E2E8F0' }}
                      onBlur={e => {
                        const w = Number(e.target.value);
                        if (!Number.isNaN(w) && w !== q.weight) patchQuestion(q.id, { weight: w });
                      }}
                    />
                  </label>
                  <button style={iconBtn} title={q.enabled ? 'تعطيل' : 'تفعيل'} onClick={() => toggleEnabled(q)}>{q.enabled ? '✅' : '⏸️'}</button>
                  <button style={iconBtn} title="معاينة" onClick={() => setPreviewQ(q)}>👁️</button>
                  <button style={iconBtn} title="تعديل" onClick={() => openEdit(q)}>✏️</button>
                  <button style={iconBtn} title="حذف" onClick={() => deleteQuestion(q)}>🗑️</button>
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900, padding: 16 }}
          onClick={e => e.target === e.currentTarget && setEditing(null)}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 24, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', direction: 'rtl' }}>
            <h3 style={{ marginTop: 0, color: '#1A2B4A' }}>{editing.isNew ? '➕ سؤال جديد' : `✏️ تعديل — ${editing.id}`}</h3>

            {editing.isNew && (
              <>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '.85rem', marginBottom: 6 }}>معرّف السؤال (فريد، بالإنجليزية) *</label>
                <input
                  style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #E2E8F0', marginBottom: 14 }}
                  value={editing.id} placeholder="مثال: L1_CUSTOM_1"
                  onChange={e => setEditing(p => ({ ...p, id: e.target.value }))}
                />
                <label style={{ display: 'block', fontWeight: 700, fontSize: '.85rem', marginBottom: 6 }}>نوع السؤال</label>
                <select
                  style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #E2E8F0', marginBottom: 14 }}
                  value={editing.type}
                  onChange={e => setEditing(p => ({ ...p, type: e.target.value, payload: emptyPayloadFor(e.target.value) }))}
                >
                  {CATEGORY_A_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </>
            )}

            <label style={{ display: 'block', fontWeight: 700, fontSize: '.85rem', marginBottom: 6 }}>المهارة</label>
            <select
              style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #E2E8F0', marginBottom: 14 }}
              value={editing.skill}
              onChange={e => setEditing(p => ({ ...p, skill: e.target.value }))}
            >
              {SKILL_ORDER.map(s => <option key={s} value={s}>{SKILL_LABELS[s]}</option>)}
            </select>

            <QuestionFieldEditor
              type={editing.type}
              payload={editing.payload}
              onChange={p => setEditing(prev => ({ ...prev, payload: p }))}
            />

            {CATEGORY_A_TYPES.includes(editing.type) && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '.85rem', marginBottom: 6 }}>وسائط إضافية (اختياري)</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <label style={{ ...btnGhost, cursor: uploading ? 'wait' : 'pointer' }}>
                    🖼️ رفع صورة
                    <input type="file" accept="image/*" hidden disabled={uploading} onChange={e => handleUpload(e, 'image')} />
                  </label>
                  <label style={{ ...btnGhost, cursor: uploading ? 'wait' : 'pointer' }}>
                    🔊 رفع صوت
                    <input type="file" accept="audio/*" hidden disabled={uploading} onChange={e => handleUpload(e, 'audio')} />
                  </label>
                </div>
                {editing.payload?.image_url && <div style={{ marginTop: 8, fontSize: '.78rem', color: '#64748B' }}>✅ صورة مرفوعة</div>}
                {editing.payload?.audio_url && <div style={{ marginTop: 4, fontSize: '.78rem', color: '#64748B' }}>✅ صوت مرفوع</div>}
              </div>
            )}

            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={editing.enabled} onChange={e => setEditing(p => ({ ...p, enabled: e.target.checked }))} />
                مفعَّل
              </label>
              {!editing.isNew && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={!editing.shuffle_within_level} onChange={e => setEditing(p => ({ ...p, shuffle_within_level: !e.target.checked }))} />
                  ترتيب ثابت (لا يُخلط عشوائياً)
                </label>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                الوزن
                <input type="number" step="0.5" min="0" style={{ width: 70, padding: 4, borderRadius: 6, border: '1px solid #E2E8F0' }}
                  value={editing.weight} onChange={e => setEditing(p => ({ ...p, weight: Number(e.target.value) }))} />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ ...btnPrimary, flex: 1 }} disabled={saving} onClick={saveEditing}>{saving ? 'جارٍ الحفظ...' : '💾 حفظ'}</button>
              <button style={btnGhost} onClick={() => setEditing(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {previewQ && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900, padding: 16 }}
          onClick={e => e.target === e.currentTarget && setPreviewQ(null)}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 24, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', direction: 'rtl' }}>
            <h3 style={{ marginTop: 0, color: '#1A2B4A' }}>👁️ معاينة — {TYPE_LABELS[previewQ.type] || previewQ.type}</h3>
            <QuestionPreview type={previewQ.type} payload={previewQ.payload || {}} />
            <button style={{ ...btnGhost, marginTop: 16 }} onClick={() => setPreviewQ(null)}>إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
}
