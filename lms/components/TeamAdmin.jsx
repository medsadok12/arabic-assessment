'use client';
import { useState, useEffect, useRef } from 'react';

const EMPTY = { name: '', title: '', bio: '', image_url: '', sort_order: 0, is_active: true };

/* resize/compress a member photo to the actual max display size (110×110, see TeamShowcase) before upload */
async function resizeImage(file, maxSize = 110, quality = 0.85) {
  const bitmap = await createImageBitmap(file);
  const scale  = Math.min(maxSize / bitmap.width, maxSize / bitmap.height, 1);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = maxSize; canvas.height = maxSize;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, (maxSize - w) / 2, (maxSize - h) / 2, w, h);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
  return blob || file;
}

async function uploadMemberImage(file) {
  const resized = await resizeImage(file);
  const fd = new FormData();
  fd.append('file', resized, `member-${Date.now()}.webp`);
  const res  = await fetch('/api/bogga/team/upload', { method: 'POST', body: fd });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'فشل رفع الصورة');
  return json.url;
}

function MemberModal({ initial, onSave, onClose }) {
  const [form, setForm]   = useState(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr]     = useState('');
  const [preview, setPreview] = useState(initial?.image_url || '');
  const fileRef = useRef(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true); setErr('');
    try {
      const url = await uploadMemberImage(file);
      set('image_url', url);
    } catch (e2) {
      setErr(e2.message || 'فشل رفع الصورة');
    }
    setUploading(false);
  }

  async function handleSave() {
    if (!form.name.trim())  { setErr('الاسم مطلوب'); return; }
    if (!form.title.trim()) { setErr('المسمى الوظيفي مطلوب'); return; }
    setSaving(true); setErr('');
    await onSave(form);
    setSaving(false);
  }

  const inp = {
    style: {
      width: '100%', padding: '9px 12px', border: '2px solid #e2e8f0',
      borderRadius: 10, fontFamily: 'inherit', fontSize: '.92rem',
      color: '#1e293b', outline: 'none', boxSizing: 'border-box',
      transition: 'border-color .2s',
    },
    onFocus:  e => e.target.style.borderColor = '#185FA5',
    onBlur:   e => e.target.style.borderColor = '#e2e8f0',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: 16,
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div dir="rtl" style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520,
        boxShadow: '0 24px 64px rgba(0,0,0,.22)',
        maxHeight: '90vh', overflow: 'auto',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg,#104880,#185FA5)',
          padding: '18px 22px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 1,
        }}>
          <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', margin: 0 }}>
            {initial ? '✏️ تعديل عضو الفريق' : '➕ إضافة عضو جديد'}
          </h3>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,.18)', border: 'none', color: '#fff',
            width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem',
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 22px 24px' }}>

          {/* Photo preview + upload */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{
              width: 96, height: 96, borderRadius: '50%', overflow: 'hidden',
              border: '3px solid #185FA5', background: '#e8f0fb', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {preview
                ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: '2.5rem' }}>👤</span>
              }
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#1a3a6b', marginBottom: 6 }}>
                صورة العضو
              </div>
              <button onClick={() => fileRef.current?.click()} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', background: '#e8f0fb', color: '#185FA5',
                border: '1.5px solid #c5d9f2', borderRadius: 8, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '.83rem', fontWeight: 700, marginBottom: 8,
              }}>
                📁 رفع صورة
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              <div style={{ fontSize: '.75rem', color: '#94a3b8', marginBottom: 6 }}>أو أدخل رابط URL:</div>
              <input
                {...inp}
                type="url" value={form.image_url} dir="ltr"
                placeholder="https://example.com/photo.jpg"
                onChange={e => { set('image_url', e.target.value); setPreview(e.target.value); }}
              />
            </div>
          </div>

          {/* Name */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '.83rem', fontWeight: 700, color: '#1a3a6b', marginBottom: 5 }}>
              الاسم الكامل <span style={{ color: '#e53935' }}>*</span>
            </label>
            <input {...inp} type="text" value={form.name}
              placeholder="مثال: أ. محمد العمري"
              onChange={e => set('name', e.target.value)} />
          </div>

          {/* Title */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '.83rem', fontWeight: 700, color: '#1a3a6b', marginBottom: 5 }}>
              المسمى الوظيفي <span style={{ color: '#e53935' }}>*</span>
            </label>
            <input {...inp} type="text" value={form.title}
              placeholder="مثال: معلم لغة عربية"
              onChange={e => set('title', e.target.value)} />
          </div>

          {/* Bio */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '.83rem', fontWeight: 700, color: '#1a3a6b', marginBottom: 5 }}>
              نبذة مختصرة (اختياري)
            </label>
            <textarea
              rows={3}
              value={form.bio}
              placeholder="وصف قصير عن الخبرة والتخصص..."
              onChange={e => set('bio', e.target.value)}
              style={{
                ...inp.style, resize: 'vertical', minHeight: 80,
              }}
              onFocus={e => e.target.style.borderColor = '#185FA5'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* Sort order + Active toggle */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 18 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '.83rem', fontWeight: 700, color: '#1a3a6b', marginBottom: 5 }}>
                ترتيب الظهور
              </label>
              <input {...inp} type="number" min="0" value={form.sort_order}
                onChange={e => set('sort_order', Number(e.target.value))}
                style={{ ...inp.style, width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '.83rem', fontWeight: 700, color: '#1a3a6b', marginBottom: 8 }}>
                ظاهر
              </label>
              <button
                onClick={() => set('is_active', !form.is_active)}
                style={{
                  width: 48, height: 26, borderRadius: 99, border: 'none', cursor: 'pointer',
                  background: form.is_active ? '#16a34a' : '#d1d5db',
                  position: 'relative', transition: 'background .22s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%',
                  background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.2)',
                  transition: 'inset-inline-start .22s',
                  insetInlineStart: form.is_active ? 24 : 4,
                }}/>
              </button>
            </div>
          </div>

          {err && (
            <div style={{ color: '#e53935', fontSize: '.85rem', fontWeight: 600, marginBottom: 12 }}>
              ⚠️ {err}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleSave} disabled={saving || uploading}
              style={{
                flex: 1, padding: '11px 16px', background: '#185FA5', color: '#fff',
                fontWeight: 800, fontSize: '.92rem', borderRadius: 10, border: 'none',
                cursor: (saving || uploading) ? 'wait' : 'pointer', fontFamily: 'inherit', minHeight: 44,
              }}>
              {uploading ? '⏳ جارٍ رفع الصورة...' : saving ? 'جارٍ الحفظ...' : initial ? '💾 حفظ التعديل' : '➕ إضافة العضو'}
            </button>
            <button onClick={onClose} style={{
              padding: '11px 16px', border: '2px solid #e2e8f0', borderRadius: 10,
              background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', minHeight: 44,
            }}>إلغاء</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeamAdmin() {
  const [members, setMembers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null); // null | 'add' | { member }
  const [deleting, setDeleting] = useState(null);
  const [err, setErr]           = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/bogga/team').catch(() => null);
    if (res?.ok) {
      const d = await res.json();
      setMembers(d.members || []);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleSave(form) {
    setErr('');
    const isEdit = modal && typeof modal === 'object';
    const url  = isEdit ? `/api/bogga/team/${modal.id}` : '/api/bogga/team';
    const method = isEdit ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    }).catch(() => null);
    if (!res?.ok) {
      const d = await res?.json().catch(() => ({}));
      setErr(d.error || 'حدث خطأ');
      return;
    }
    setModal(null);
    load();
  }

  async function handleDelete(id) {
    if (!confirm('هل تريد حذف هذا العضو نهائياً؟')) return;
    setDeleting(id);
    const res = await fetch(`/api/bogga/team/${id}`, { method: 'DELETE' }).catch(() => null);
    setDeleting(null);
    if (!res?.ok) { alert('فشل الحذف — يرجى المحاولة مجدداً'); return; }
    load();
  }

  async function toggleActive(m) {
    await fetch(`/api/bogga/team/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !m.is_active }),
    }).catch(() => null);
    load();
  }

  return (
    <div dir="rtl" style={{ padding: '24px 0' }}>
      <style>{`
        .team-admin-card {
          background: #fff; border-radius: 16px; border: 2px solid #e2e8f0;
          box-shadow: 0 2px 10px rgba(0,0,0,.06); overflow: hidden;
          transition: box-shadow .2s; display: flex; flex-direction: column;
        }
        .team-admin-card:hover { box-shadow: 0 4px 18px rgba(24,95,165,.12); }
        .team-badge-active   { background:#dcfce7;color:#166534;border:1px solid #bbf7d0; }
        .team-badge-inactive { background:#fee2e2;color:#991b1b;border:1px solid #fecaca; }
        .team-action-btn { display:inline-flex;align-items:center;gap:5px;padding:6px 12px;
          border-radius:8px;border:none;cursor:pointer;font-family:inherit;
          font-size:.8rem;font-weight:700;transition:filter .15s;min-height:34px; }
        .team-action-btn:hover { filter:brightness(.92); }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1a3a6b', margin: 0 }}>
            👨‍🏫 إدارة فريق التدريس
          </h2>
          <p style={{ fontSize: '.85rem', color: '#64748b', margin: '4px 0 0' }}>
            يظهر الفريق في الصفحة الرئيسية أعلى الفوتر
          </p>
        </div>
        <button
          onClick={() => setModal('add')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '10px 18px', background: '#185FA5', color: '#fff',
            fontWeight: 800, fontSize: '.9rem', borderRadius: 10, border: 'none',
            cursor: 'pointer', fontFamily: 'inherit', minHeight: 44,
            boxShadow: '0 2px 8px rgba(24,95,165,.28)',
          }}>
          ➕ إضافة عضو
        </button>
      </div>

      {err && (
        <div style={{
          background: '#fff1f2', border: '1.5px solid #fecaca', borderRadius: 10,
          padding: '12px 16px', color: '#e53935', marginBottom: 16, fontSize: '.88rem',
        }}>⚠️ {err}</div>
      )}

      {/* SQL hint */}
      <details style={{
        background: '#f0f6ff', border: '1.5px solid #c5d9f2', borderRadius: 12,
        padding: '10px 14px', marginBottom: 20, fontSize: '.8rem', color: '#1a3a6b',
      }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
          📋 SQL لإنشاء جدول team_members (شغّله مرة واحدة في Supabase)
        </summary>
        <pre style={{
          background: '#1e293b', color: '#e2e8f0', borderRadius: 8,
          padding: '12px 14px', marginTop: 10, fontSize: '.78rem',
          overflowX: 'auto', lineHeight: 1.6, direction: 'ltr', textAlign: 'left',
        }}>{`CREATE TABLE IF NOT EXISTS team_members (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT         NOT NULL,
  title        TEXT         NOT NULL,
  bio          TEXT,
  image_url    TEXT,
  sort_order   INT          NOT NULL DEFAULT 0,
  is_active    BOOLEAN      NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS team_members_sort_idx ON team_members (sort_order, is_active);
NOTIFY pgrst, 'reload schema';`}</pre>
        <a
          href="https://supabase.com/dashboard/project/uqspozzkzyytwwidojxv/sql/new"
          target="_blank" rel="noopener noreferrer"
          style={{
            display: 'inline-block', marginTop: 8, color: '#185FA5',
            fontWeight: 700, textDecoration: 'underline', fontSize: '.8rem',
          }}>
          🔗 افتح Supabase SQL Editor
        </a>
      </details>

      {/* Members grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
          <span className="spinner" style={{ borderTopColor: '#185FA5', borderColor: '#e2e8f0', width: 28, height: 28, borderWidth: 3 }} />
        </div>
      ) : members.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 24px', background: '#f8fafc',
          borderRadius: 16, border: '2px dashed #e2e8f0', color: '#94a3b8',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>👥</div>
          <p style={{ fontWeight: 600, fontSize: '.95rem' }}>لم تُضف أي أعضاء للفريق بعد</p>
          <p style={{ fontSize: '.85rem', marginTop: 4 }}>اضغط "إضافة عضو" لإضافة أول عضو</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
          {members.map(m => (
            <div key={m.id} className="team-admin-card">
              {/* Card header with photo + name */}
              <div style={{ display: 'flex', gap: 14, padding: '16px 16px 12px', alignItems: 'center' }}>
                <div style={{
                  width: 62, height: 62, borderRadius: '50%', overflow: 'hidden',
                  border: '2px solid #185FA5', background: '#e8f0fb', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {m.image_url
                    ? <img src={m.image_url} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: '1.6rem' }}>👤</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '.97rem', color: '#1a1a2e', marginBottom: 3 }}>
                    {m.name}
                  </div>
                  <div style={{
                    display: 'inline-block', background: '#e8f0fb', color: '#185FA5',
                    fontSize: '.73rem', fontWeight: 700, padding: '2px 10px', borderRadius: 99,
                  }}>{m.title}</div>
                  {m.bio && (
                    <div style={{
                      fontSize: '.78rem', color: '#64748b', marginTop: 5,
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>{m.bio}</div>
                  )}
                </div>
              </div>

              {/* Card footer */}
              <div style={{
                padding: '10px 14px 12px', borderTop: '1px solid #f1f5f9',
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              }}>
                {/* Status badge */}
                <span className={m.is_active ? 'team-badge-active' : 'team-badge-inactive'} style={{
                  fontSize: '.72rem', fontWeight: 700, padding: '2px 10px', borderRadius: 99,
                }}>
                  {m.is_active ? '🟢 ظاهر' : '🔴 مخفي'}
                </span>
                <span style={{ fontSize: '.72rem', color: '#94a3b8' }}>ترتيب: {m.sort_order}</span>

                <div style={{ flex: 1 }} />

                {/* Toggle visibility */}
                <button
                  onClick={() => toggleActive(m)}
                  className="team-action-btn"
                  style={{ background: m.is_active ? '#fee2e2' : '#dcfce7', color: m.is_active ? '#991b1b' : '#166534' }}>
                  {m.is_active ? '🙈 إخفاء' : '👁 إظهار'}
                </button>

                {/* Edit */}
                <button
                  onClick={() => setModal(m)}
                  className="team-action-btn"
                  style={{ background: '#e8f0fb', color: '#185FA5' }}>
                  ✏️ تعديل
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(m.id)}
                  disabled={deleting === m.id}
                  className="team-action-btn"
                  style={{ background: '#fff1f2', color: '#e53935' }}>
                  {deleting === m.id ? '...' : '🗑️'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modal && (
        <MemberModal
          initial={typeof modal === 'object' ? modal : null}
          onSave={handleSave}
          onClose={() => { setModal(null); setErr(''); }}
        />
      )}
    </div>
  );
}
