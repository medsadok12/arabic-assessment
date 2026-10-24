'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProfileVerifyModal from './ProfileVerifyModal';

export default function FamilySwitcher({ children = [], viewingChildId = null, rootName = '' }) {
  const router = useRouter();
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ name: '', age: '', grade: '', code: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  // نافذة التحقق قبل التبديل: { name, href } للملف المستهدف
  const [verify, setVerify] = useState(null);

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })); setError(''); }

  // بطاقات الملفات: الجذر (الوالد/الطفل الأول) + كل طفل مُضاف
  const tabs = [
    { key: 'root', emoji: '👤', name: rootName || 'أنا', href: '/dashboard', active: !viewingChildId },
    ...children.map(c => ({
      key: c.id, emoji: '🧒', name: c.full_name,
      href: `/dashboard?child=${c.id}`, active: viewingChildId === c.id,
    })),
  ];

  function onTabClick(tab) {
    if (tab.active) return;                 // الملف المعروض حالياً — لا تبديل
    setVerify({ name: tab.name, href: tab.href });
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.age.trim() || !form.code.trim()) {
      setError('اسم الطفل وعمره وكود الأكاديمية كلها مطلوبة');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/family/add-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, age: form.age, grade: form.grade || undefined, invitationCode: form.code,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || 'حدث خطأ، حاول مجدداً');
        setSubmitting(false);
        return;
      }
      setShowForm(false);
      setForm({ name: '', age: '', grade: '', code: '' });
      router.push(`/dashboard?child=${data.childId}`);
      router.refresh();
    } catch {
      setError('تعذّر الاتصال — تحقق من الإنترنت وحاول مجدداً');
      setSubmitting(false);
    }
  }

  return (
    <div className="fam-switcher">
      <style>{`
        .fam-switcher { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:18px; }
        .fam-tab { padding:10px 18px; border-radius:20px; font-weight:800; font-size:.85rem;
                   border:1.5px solid var(--border); background:#fff; color:#475569; cursor:pointer;
                   text-decoration:none; white-space:nowrap; transition:.15s; display:inline-block;
                   font-family:inherit; }
        .fam-tab.active { background:#1A2B4A; border-color:#1A2B4A; color:#fff; }
        .fam-add-btn { padding:10px 18px; border-radius:20px; font-weight:800; font-size:.85rem;
                       border:1.5px dashed #E8B84B; background:#FEF9EE; color:#1A2B4A; cursor:pointer;
                       font-family:inherit; white-space:nowrap; }
        .fam-modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:1000;
                              display:flex; align-items:center; justify-content:center; padding:16px; }
        .fam-modal { background:#fff; border-radius:18px; padding:26px 24px; width:100%; max-width:380px; }
        .fam-field { margin-bottom:14px; }
        .fam-label { display:block; font-size:.85rem; font-weight:700; color:#475569; margin-bottom:6px; }
        .fam-input { width:100%; padding:11px 14px; border-radius:10px; border:1.5px solid var(--border);
                     font-size:.95rem; font-family:inherit; box-sizing:border-box; }
        .fam-submit { width:100%; padding:13px; border-radius:12px; border:none; background:#E8B84B;
                      color:#1A2B4A; font-weight:900; font-size:.95rem; cursor:pointer; margin-top:6px;
                      font-family:inherit; }
        .fam-submit:disabled { opacity:.6; cursor:not-allowed; }
        .fam-cancel { width:100%; padding:10px; border-radius:12px; border:none; background:none;
                      color:#94a3b8; font-weight:700; font-size:.85rem; cursor:pointer; margin-top:6px;
                      font-family:inherit; }
      `}</style>

      {children.length > 0 && tabs.map(tab => (
        <button
          key={tab.key}
          type="button"
          className={`fam-tab ${tab.active ? 'active' : ''}`}
          onClick={() => onTabClick(tab)}
        >
          {tab.emoji} {tab.name}
        </button>
      ))}

      <button type="button" className="fam-add-btn" onClick={() => setShowForm(true)}>
        ➕ إضافة طفل
      </button>

      {/* نافذة التحقق بالاسم قبل التبديل — المكوّن المشترك */}
      {verify && (
        <ProfileVerifyModal
          targetName={verify.name}
          onSuccess={() => { window.location.href = verify.href; }}
          onCancel={() => setVerify(null)}
        />
      )}

      {showForm && (
        <div className="fam-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <form className="fam-modal" onSubmit={handleAdd}>
            <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#1A2B4A', marginBottom: 18 }}>
              👨‍👩‍👧 إضافة طفل لعائلتك
            </div>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1.5px solid #fca5a5', color: '#991b1b',
                borderRadius: 10, padding: '10px 14px', fontSize: '.85rem', marginBottom: 14,
              }}>
                {error}
              </div>
            )}

            <div className="fam-field">
              <label className="fam-label">اسم الطفل الكامل</label>
              <input className="fam-input" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="fam-field" style={{ flex: 1 }}>
                <label className="fam-label">العمر</label>
                <input className="fam-input" type="number" min="1" max="18" value={form.age} onChange={e => set('age', e.target.value)} required />
              </div>
              <div className="fam-field" style={{ flex: 1 }}>
                <label className="fam-label">الصف (اختياري)</label>
                <input className="fam-input" type="number" min="1" max="12" value={form.grade} onChange={e => set('grade', e.target.value)} />
              </div>
            </div>
            <div className="fam-field">
              <label className="fam-label">🔑 كود التسجيل الخاص بالطفل</label>
              <input
                className="fam-input"
                style={{ letterSpacing: 2, textTransform: 'uppercase' }}
                value={form.code}
                onChange={e => set('code', e.target.value)}
                required
                dir="ltr"
              />
            </div>

            <button type="submit" className="fam-submit" disabled={submitting}>
              {submitting ? 'جارٍ الإضافة...' : 'إضافة الطفل ←'}
            </button>
            <button type="button" className="fam-cancel" onClick={() => setShowForm(false)} disabled={submitting}>
              إلغاء
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
