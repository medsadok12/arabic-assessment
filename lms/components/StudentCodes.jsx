'use client';

import { useState, useEffect, useCallback } from 'react';

export default function StudentCodes() {
  const [codes,      setCodes]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newCode,    setNewCode]    = useState('');
  const [err,        setErr]        = useState('');
  const [deleting,   setDeleting]   = useState(new Set());

  const loadCodes = useCallback(async () => {
    const res  = await fetch('/api/student-codes', { method: 'POST', cache: 'no-store' });
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
      const res  = await fetch('/api/generate-student-code', { method: 'POST' });
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
    const res  = await fetch('/api/admin/delete-student-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.error) setErr(data.error);
    else setCodes(prev => prev.filter(c => c.id !== id));
    setDeleting(prev => { const s = new Set(prev); s.delete(id); return s; });
  }

  const available = codes.filter(c => !c.is_used).length;
  const used      = codes.filter(c =>  c.is_used).length;

  return (
    <div className="dash-section">
      <div className="dash-section-title">🔑 أكواد تفعيل الطلاب</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
          {generating ? <span className="spinner" /> : '➕'} توليد كود طالب جديد
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
            <div style={{ fontSize: '.8rem', color: '#388e3c', fontWeight: 600 }}>تم توليد كود طالب جديد:</div>
            <div style={{ fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: 800, color: '#1b5e20', letterSpacing: 3 }}>
              {newCode}
            </div>
          </div>
        </div>
      )}

      {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>{err}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
          <span className="spinner" style={{ display: 'inline-block' }} />
        </div>
      ) : codes.length === 0 ? (
        <div className="empty-state card">
          <span className="empty-icon">🔑</span>
          <p>لا توجد أكواد — اضغط "توليد كود طالب جديد"</p>
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
              {codes.map(c => (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 2, fontSize: '.95rem' }}>
                    {c.code}
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
