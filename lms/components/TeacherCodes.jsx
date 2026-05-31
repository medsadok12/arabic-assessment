'use client';

import { useState, useEffect, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

export default function TeacherCodes() {
  const [codes,      setCodes]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newCode,    setNewCode]    = useState('');
  const [err,        setErr]        = useState('');
  const [deleting,   setDeleting]   = useState(new Set());
  const [copiedId,   setCopiedId]   = useState(null);
  const [hideUsed,   setHideUsed]   = useState(false);

  function handleCopy(code, id) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const loadCodes = useCallback(async () => {
    const res  = await fetch('/api/teacher-codes', { method: 'POST', cache: 'no-store' });
    const data = await res.json();
    if (data.error) setErr(data.error);
    setCodes(data.codes ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadCodes(); }, [loadCodes]);

  async function handleGenerate() {
    setGenerating(true);
    setNewCode('');
    setErr('');
    try {
      const res  = await fetch('/api/generate-teacher-code', { method: 'POST' });
      const data = await res.json();
      if (data.code) {
        setNewCode(data.code);
        await loadCodes();
      } else {
        setErr(data.error ?? 'حدث خطأ، حاول مجدداً');
      }
    } catch {
      setErr('فشل الاتصال بالخادم — حاول مجدداً');
    }
    setGenerating(false);
  }

  async function handleDelete(id, code) {
    if (!window.confirm(`هل أنت متأكد من حذف الكود "${code}"؟\nلا يمكن التراجع عن هذا الإجراء.`)) return;
    setDeleting(prev => new Set(prev).add(id));
    const res  = await fetch('/api/admin/delete-teacher-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.error) setErr(data.error);
    else setCodes(prev => prev.filter(c => c.id !== id));
    setDeleting(prev => { const s = new Set(prev); s.delete(id); return s; });
  }

  const available    = codes.filter(c => !c.is_used).length;
  const used         = codes.filter(c =>  c.is_used).length;
  const visibleCodes = hideUsed ? codes.filter(c => !c.is_used) : codes;

  return (
    <div className="dash-section">
      <div className="dash-section-title">🔑 أكواد تفعيل المعلمين</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
          {generating ? <span className="spinner" /> : '➕'} توليد كود جديد
        </button>
        <button
          className="btn"
          onClick={() => setHideUsed(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.85rem' }}
        >
          {hideUsed ? '👁 عرض الكل' : '🙈 إخفاء المستعملة'}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-green">● متاح: {available}</span>
          <span className="badge badge-orange">✓ مستخدم: {used}</span>
        </div>
      </div>

      {newCode && (
        <div style={{
          background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 12,
          padding: '12px 18px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: '1.1rem' }}>✅</span>
          <div>
            <div style={{ fontSize: '.8rem', color: '#388e3c', fontWeight: 600 }}>تم توليد كود جديد:</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: 800, color: '#1b5e20', letterSpacing: 3 }}>{newCode}</span>
              <button onClick={() => handleCopy(newCode, 'new')} title="نسخ الكود" style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedId === 'new' ? '#27ae60' : '#388e3c', padding: 2 }}>
                {copiedId === 'new' ? <Check size={16} /> : <Copy size={16} />}
              </button>
              {copiedId === 'new' && <span style={{ fontSize: '.78rem', color: '#27ae60', fontWeight: 600 }}>تم النسخ!</span>}
            </div>
          </div>
        </div>
      )}

      {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>{err}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
          <span className="spinner" style={{ display: 'inline-block' }} />
        </div>
      ) : visibleCodes.length === 0 ? (
        <div className="empty-state card">
          <span className="empty-icon">🔑</span>
          <p>{codes.length === 0 ? 'لا توجد أكواد — اضغط "توليد كود جديد"' : 'لا توجد أكواد متاحة — جميع الأكواد مستعملة'}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>الكود</th>
                <th>الحالة</th>
                <th>تاريخ الإنشاء</th>
                <th>تاريخ الاستخدام</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {visibleCodes.map(c => (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 2, fontSize: '.95rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{c.code}</span>
                      <button onClick={() => handleCopy(c.code, c.id)} title="نسخ الكود" style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedId === c.id ? '#27ae60' : '#aaa', padding: 2, lineHeight: 1, flexShrink: 0 }}>
                        {copiedId === c.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                      {copiedId === c.id && <span style={{ fontSize: '.72rem', color: '#27ae60', fontWeight: 600, whiteSpace: 'nowrap' }}>تم النسخ!</span>}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${c.is_used ? 'badge-orange' : 'badge-green'}`}>
                      {c.is_used ? '✓ تم الاستخدام' : '● متاح'}
                    </span>
                  </td>
                  <td style={{ fontSize: '.85rem', color: 'var(--muted)', direction: 'ltr', textAlign: 'right' }}>
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('ar-SA') : '—'}
                  </td>
                  <td style={{ fontSize: '.85rem', color: 'var(--muted)', direction: 'ltr', textAlign: 'right' }}>
                    {c.used_at ? new Date(c.used_at).toLocaleDateString('ar-SA') : '—'}
                  </td>
                  <td>
                    <button
                      onClick={() => handleDelete(c.id, c.code)}
                      disabled={deleting.has(c.id)}
                      title="حذف الكود"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '1.1rem', padding: '2px 6px', borderRadius: 6,
                        opacity: deleting.has(c.id) ? 0.4 : 1,
                        transition: 'opacity .2s',
                      }}
                    >
                      {deleting.has(c.id) ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '🗑️'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
