'use client';

import { useState, useEffect, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

export default function AssessmentCodes() {
  const [codes,      setCodes]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newCode,    setNewCode]    = useState('');
  const [err,        setErr]        = useState('');
  const [deleting,   setDeleting]   = useState(new Set());
  const [dbReady,    setDbReady]    = useState(true);
  const [copiedId,   setCopiedId]   = useState(null);
  const [hideUsed,   setHideUsed]   = useState(false);

  function handleCopy(code, id) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const loadCodes = useCallback(async () => {
    const res  = await fetch('/api/admin/assessment-codes/list', { method: 'POST', cache: 'no-store' });
    const data = await res.json();
    if (data.error?.includes('exist') || data.error?.includes('relation') || data.error?.includes('42P01')) {
      setDbReady(false);
      setLoading(false);
      return;
    }
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
      const res  = await fetch('/api/admin/assessment-codes/generate', { method: 'POST' });
      const data = await res.json();
      if (data.code) { setNewCode(data.code); await loadCodes(); }
      else setErr(data.error ?? 'حدث خطأ، حاول مجدداً');
    } catch { setErr('فشل الاتصال بالخادم — حاول مجدداً'); }
    setGenerating(false);
  }

  async function handleDelete(id, code) {
    if (!window.confirm(`هل أنت متأكد من حذف الكود "${code}"؟`)) return;
    setDeleting(prev => new Set(prev).add(id));
    const res  = await fetch('/api/admin/assessment-codes/delete', {
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

  if (!dbReady) return (
    <div className="dash-section">
      <div className="dash-section-title">📋 أكواد التقييم التشخيصي</div>
      <div className="card" style={{ padding: 24 }}>
        <p style={{ marginBottom: 12, fontWeight: 600, color: 'var(--danger, #e74c3c)' }}>
          ⚠️ جدول أكواد التقييم غير موجود في قاعدة البيانات.
        </p>
        <p style={{ marginBottom: 12, color: 'var(--muted)' }}>شغّل هذا الكود مرة واحدة في Supabase SQL Editor:</p>
        <pre style={{
          background: '#1e1e2e', color: '#cdd6f4', padding: '14px 18px',
          borderRadius: 8, fontSize: '.82rem', overflowX: 'auto', lineHeight: 1.7,
          marginBottom: 18, direction: 'ltr', textAlign: 'left',
        }}>{`CREATE TABLE IF NOT EXISTS assessment_codes (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  code       text        NOT NULL UNIQUE,
  is_used    boolean     NOT NULL DEFAULT false,
  used_at    timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE assessment_codes DISABLE ROW LEVEL SECURITY;`}</pre>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="https://supabase.com/dashboard/project/uqspozzkzyytwwidojxv/sql/new"
             target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            🔗 افتح Supabase SQL Editor
          </a>
          <button className="btn" onClick={() => { setDbReady(true); setLoading(true); loadCodes(); }}>
            🔄 تحقق مجدداً
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="dash-section">
      <div className="dash-section-title">📋 أكواد التقييم التشخيصي</div>

      {/* Actions bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
          {generating ? <span className="spinner" /> : '➕'} توليد كود تقييم جديد
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

      {/* New code banner */}
      {newCode && (
        <div style={{
          background: '#e3f2fd', border: '1px solid #90caf9', borderRadius: 12,
          padding: '12px 18px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: '1.1rem' }}>✅</span>
          <div>
            <div style={{ fontSize: '.8rem', color: '#1565c0', fontWeight: 600 }}>تم توليد كود تقييم جديد:</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: 800, color: '#0d47a1', letterSpacing: 3 }}>{newCode}</span>
              <button onClick={() => handleCopy(newCode, 'new')} title="نسخ الكود" style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedId === 'new' ? '#27ae60' : '#1565c0', padding: 2 }}>
                {copiedId === 'new' ? <Check size={16} /> : <Copy size={16} />}
              </button>
              {copiedId === 'new' && <span style={{ fontSize: '.78rem', color: '#27ae60', fontWeight: 600 }}>تم النسخ!</span>}
            </div>
          </div>
        </div>
      )}

      {err && <div className="alert alert-error" style={{ marginBottom: 12 }}>{err}</div>}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>
          <span className="spinner" style={{ display: 'inline-block' }} />
        </div>
      ) : visibleCodes.length === 0 ? (
        <div className="empty-state card">
          <span className="empty-icon">📋</span>
          <p>{codes.length === 0 ? 'لا توجد أكواد — اضغط "توليد كود تقييم جديد"' : 'لا توجد أكواد متاحة — جميع الأكواد مستعملة'}</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>#</th>
                <th>الكود</th>
                <th>اسم المستخدم</th>
                <th>الحالة</th>
                <th>تاريخ الإنشاء</th>
                <th>تاريخ الاستخدام</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {visibleCodes.map((c, i) => (
                <tr key={c.id}>
                  <td style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '.82rem', fontWeight: 600 }}>{i + 1}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 2, fontSize: '.95rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{c.code}</span>
                      <button onClick={() => handleCopy(c.code, c.id)} title="نسخ الكود" style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedId === c.id ? '#27ae60' : '#aaa', padding: 2, lineHeight: 1, flexShrink: 0 }}>
                        {copiedId === c.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                      {copiedId === c.id && <span style={{ fontSize: '.72rem', color: '#27ae60', fontWeight: 600, whiteSpace: 'nowrap' }}>تم النسخ!</span>}
                    </div>
                  </td>
                  <td style={{ fontSize: '.88rem', color: c.used_by_name ? 'var(--text)' : 'var(--muted)', fontWeight: c.used_by_name ? 600 : 400 }}>
                    {c.used_by_name || '—'}
                  </td>
                  <td>
                    <span className={`badge ${c.is_used ? 'badge-orange' : 'badge-green'}`}>
                      {c.is_used ? '✓ مستخدم' : '● متاح'}
                    </span>
                  </td>
                  <td style={{ fontSize: '.85rem', color: 'var(--muted)', direction: 'ltr', textAlign: 'right' }}>
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td style={{ fontSize: '.85rem', color: 'var(--muted)', direction: 'ltr', textAlign: 'right' }}>
                    {c.used_at ? new Date(c.used_at).toLocaleDateString('en-GB') : '—'}
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
