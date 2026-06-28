'use client';
import { useState, useEffect } from 'react';

const PLAN_TYPES = [
  { key: 'lessons',      ar: 'دروس مباشرة',       en: 'Live Lessons'    },
  { key: 'content_only', ar: 'محتوى رقمي فقط',    en: 'Digital Content' },
  { key: 'family',       ar: 'عائلي',              en: 'Family'          },
  { key: 'school',       ar: 'مدارس ومؤسسات',     en: 'Schools'         },
];

const ACCENT_COLORS = [
  { value: '#185FA5', label: 'أزرق'   },
  { value: '#7c3aed', label: 'بنفسجي' },
  { value: '#e11d48', label: 'أحمر'   },
  { value: '#059669', label: 'أخضر'   },
  { value: '#d97706', label: 'برتقالي' },
  { value: '#0284c7', label: 'سماوي'  },
];

const EMPTY = {
  plan_name_ar: '', plan_name_en: '',
  price_monthly: '', price_yearly: '',
  features_list: [],
  checkout_url: '',
  plan_type: 'lessons',
  is_popular: false,
  accent_color: '#185FA5',
  sort_order: 0,
  is_active: true,
};

function FeatureEditor({ features, onChange, lang }) {
  const [input, setInput] = useState('');

  function add() {
    const v = input.trim();
    if (!v) return;
    onChange([...features, v]);
    setInput('');
  }

  function remove(i) {
    onChange(features.filter((_, idx) => idx !== i));
  }

  function move(i, dir) {
    const arr = [...features];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange(arr);
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px' }}>
            <span style={{ flex: 1, fontSize: '.88rem' }}>{f}</span>
            <button onClick={() => move(i, -1)} title="أعلى" style={iconBtn}  disabled={i === 0}>↑</button>
            <button onClick={() => move(i, +1)} title="أسفل" style={iconBtn} disabled={i === features.length - 1}>↓</button>
            <button onClick={() => remove(i)}   title="حذف"  style={{ ...iconBtn, color: '#e53935' }}>✕</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="form-input" style={{ flex: 1, margin: 0, fontSize: '.88rem' }}
          placeholder={lang === 'ar' ? 'أضف ميزة...' : 'Add feature...'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
        />
        <button onClick={add} className="btn btn-primary btn-sm">{lang === 'ar' ? '+ أضف' : '+ Add'}</button>
      </div>
    </div>
  );
}

const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#64748b', fontSize: '.9rem', padding: '2px 4px',
  borderRadius: 4, lineHeight: 1,
};

function PlanModal({ plan, onClose, onSave, lang }) {
  const [form, setForm] = useState({ ...EMPTY, ...plan });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!form.plan_name_ar || !form.plan_name_en) {
      setErr(lang === 'ar' ? 'أدخل اسم الباقة باللغتين' : 'Enter plan name in both languages');
      return;
    }
    setSaving(true); setErr('');
    try {
      const method = plan.id ? 'PATCH' : 'POST';
      const body   = plan.id ? { id: plan.id, ...form } : form;
      const r = await fetch('/api/bogga/pricing', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.error) { setErr(d.error); setSaving(false); return; }
      onSave(d.plan);
    } catch (e) {
      setErr(e.message);
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      backdropFilter: 'blur(3px)',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 580,
        maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.22)',
      }}>
        <h3 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 20, color: '#1a1a2e' }}>
          {plan.id ? (lang === 'ar' ? '✏️ تعديل الباقة' : '✏️ Edit Plan') : (lang === 'ar' ? '➕ باقة جديدة' : '➕ New Plan')}
        </h3>

        {err && <div className="alert alert-error" style={{ marginBottom: 14 }}>{err}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">اسم الباقة (عربي) *</label>
            <input className="form-input" style={{ margin: 0 }} value={form.plan_name_ar} onChange={e => set('plan_name_ar', e.target.value)} placeholder="مثال: باقة العائلة" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Plan Name (EN) *</label>
            <input className="form-input" style={{ margin: 0, direction: 'ltr' }} value={form.plan_name_en} onChange={e => set('plan_name_en', e.target.value)} placeholder="e.g. Family Plan" />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">السعر الشهري (£)</label>
            <input className="form-input" style={{ margin: 0, direction: 'ltr' }} type="number" min="0" value={form.price_monthly} onChange={e => set('price_monthly', e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">السعر السنوي (£)</label>
            <input className="form-input" style={{ margin: 0, direction: 'ltr' }} type="number" min="0" value={form.price_yearly} onChange={e => set('price_yearly', e.target.value)} />
          </div>
        </div>

        <div className="form-group" style={{ marginTop: 14 }}>
          <label className="form-label">نوع الباقة</label>
          <select className="form-input" style={{ margin: 0 }} value={form.plan_type} onChange={e => set('plan_type', e.target.value)}>
            {PLAN_TYPES.map(t => <option key={t.key} value={t.key}>{t.ar} — {t.en}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">رابط بوابة الدفع (Checkout URL)</label>
          <input className="form-input" style={{ margin: 0, direction: 'ltr' }} type="url" value={form.checkout_url || ''} onChange={e => set('checkout_url', e.target.value)} placeholder="https://..." />
          <p className="form-help">اتركه فارغاً لباقة المدارس (سيظهر زر واتساب تلقائياً)</p>
        </div>

        <div className="form-group">
          <label className="form-label">قائمة الميزات</label>
          <FeatureEditor features={form.features_list} onChange={v => set('features_list', v)} lang={lang} />
        </div>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <label className="form-label" style={{ marginBottom: 6 }}>لون الباقة</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {ACCENT_COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => set('accent_color', c.value)}
                  title={c.label}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c.value,
                    border: form.accent_color === c.value ? '3px solid #1a1a2e' : '2px solid rgba(255,255,255,.6)',
                    cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,.18)',
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="form-label" style={{ marginBottom: 6 }}>الترتيب</label>
            <input className="form-input" style={{ margin: 0, width: 80, direction: 'ltr' }} type="number" min="0" value={form.sort_order} onChange={e => set('sort_order', parseInt(e.target.value) || 0)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: '.9rem' }}>
            <input type="checkbox" checked={form.is_popular} onChange={e => set('is_popular', e.target.checked)} />
            ⭐ {lang === 'ar' ? 'الأكثر طلباً' : 'Popular'}
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: '.9rem' }}>
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
            {lang === 'ar' ? 'مفعّل (يظهر في الموقع)' : 'Active (visible on site)'}
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn btn-ghost btn-sm">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
          <button onClick={save}    disabled={saving} className="btn btn-primary" style={{ minWidth: 100 }}>
            {saving ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : (lang === 'ar' ? 'حفظ الباقة' : 'Save Plan')}
          </button>
        </div>
      </div>
    </div>
  );
}

const TYPE_LABELS = { lessons: 'دروس', content_only: 'محتوى', family: 'عائلي', school: 'مدارس' };

export default function PricingAdmin({ lang = 'ar' }) {
  const [plans,   setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null); // null | plan object (empty for new)
  const [delId,   setDelId]   = useState(null);
  const [delBusy, setDelBusy] = useState(false);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/bogga/pricing');
    const d = await r.json();
    setPlans(d.plans || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function onSave(plan) {
    setPlans(prev => {
      const idx = prev.findIndex(p => p.id === plan.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = plan; return n; }
      return [...prev, plan];
    });
    setModal(null);
  }

  async function deletePlan() {
    if (!delId) return;
    setDelBusy(true);
    await fetch('/api/bogga/pricing', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: delId }) });
    setPlans(prev => prev.filter(p => p.id !== delId));
    setDelId(null); setDelBusy(false);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '1.15rem', color: '#1a1a2e', marginBottom: 4 }}>
            💰 {lang === 'ar' ? 'إعداد الباقات والأسعار' : 'Pricing Plans Setup'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '.88rem' }}>
            {lang === 'ar'
              ? 'تُضاف الباقات هنا وتظهر تلقائياً في قسم الأسعار بالصفحة الرئيسية.'
              : 'Plans added here appear automatically in the Pricing section on the homepage.'}
          </p>
        </div>
        <button onClick={() => setModal({ ...EMPTY })} className="btn btn-primary btn-sm" style={{ gap: 6 }}>
          ➕ {lang === 'ar' ? 'باقة جديدة' : 'New Plan'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: '#e2e8f0', width: 28, height: 28, borderWidth: 3 }} />
        </div>
      ) : plans.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">💰</span>
          <p>{lang === 'ar' ? 'لا توجد باقات بعد — أضف أول باقة الآن' : 'No plans yet — add your first plan'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {plans.map(p => (
            <div key={p.id} className="card" style={{
              border: `2px solid ${p.accent_color || '#e2e8f0'}22`,
              borderTop: `4px solid ${p.accent_color || 'var(--primary)'}`,
              opacity: p.is_active ? 1 : .55,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>{p.plan_name_ar}</div>
                  <div style={{ fontWeight: 500, fontSize: '.8rem', color: '#64748b' }}>{p.plan_name_en}</div>
                </div>
                <span style={{
                  background: `${p.accent_color || '#185FA5'}18`, color: p.accent_color || '#185FA5',
                  padding: '2px 10px', borderRadius: 99, fontSize: '.72rem', fontWeight: 700,
                }}>
                  {TYPE_LABELS[p.plan_type] || p.plan_type}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1, background: '#f8fafc', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '.7rem', color: '#64748b' }}>{lang === 'ar' ? 'شهري' : 'Monthly'}</div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>£{p.price_monthly}</div>
                </div>
                <div style={{ flex: 1, background: '#f8fafc', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '.7rem', color: '#64748b' }}>{lang === 'ar' ? 'سنوي' : 'Yearly'}</div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>£{p.price_yearly}</div>
                </div>
              </div>

              <div style={{ fontSize: '.8rem', color: '#64748b', marginBottom: 12 }}>
                {(Array.isArray(p.features_list) ? p.features_list : []).slice(0, 3).join(' · ')}
                {p.features_list?.length > 3 && ` +${p.features_list.length - 3}`}
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {p.is_popular && <span style={{ background: '#fef9c3', color: '#854d0e', padding: '2px 8px', borderRadius: 99, fontSize: '.7rem', fontWeight: 700 }}>⭐ الأكثر طلباً</span>}
                {!p.is_active && <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 99, fontSize: '.7rem', fontWeight: 700 }}>معطّل</span>}
                <div style={{ flex: 1 }} />
                <button onClick={() => setModal(p)} className="btn btn-outline btn-sm" style={{ padding: '4px 12px', fontSize: '.8rem' }}>✏️ تعديل</button>
                <button onClick={() => setDelId(p.id)} className="btn btn-danger btn-sm" style={{ padding: '4px 10px', fontSize: '.8rem' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create modal */}
      {modal !== null && (
        <PlanModal
          plan={modal}
          onClose={() => setModal(null)}
          onSave={onSave}
          lang={lang}
        />
      )}

      {/* Delete confirmation */}
      {delId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9100, background: 'rgba(0,0,0,.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div className="card" style={{ maxWidth: 360, width: '100%' }}>
            <h4 style={{ fontWeight: 800, marginBottom: 10, color: '#991b1b' }}>⚠️ {lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</h4>
            <p style={{ fontSize: '.9rem', color: '#64748b', marginBottom: 20 }}>
              {lang === 'ar' ? 'سيُحذف هذا السعر نهائياً ولن يظهر في الموقع.' : 'This plan will be permanently deleted.'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDelId(null)} className="btn btn-ghost btn-sm">{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={deletePlan} disabled={delBusy} className="btn btn-danger btn-sm">
                {delBusy ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : (lang === 'ar' ? 'حذف نهائياً' : 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
