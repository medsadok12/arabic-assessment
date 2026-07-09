'use client';

import { useState, useEffect, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

/*
  مكوّن موحّد لإدارة الأكواد الثلاثة (طلاب / معلمون / تقييم تشخيصي).
  كان مكرراً في StudentCodes/TeacherCodes/AssessmentCodes بتطابق ~91%؛
  كل الفروق الفعلية بين الثلاثة محفوظة حرفياً في جدول الإعدادات أدناه
  (مسارات API، النصوص، ألوان شريط الكود الجديد، نص التأكيد، وواجهة
  dbReady الاحتياطية الخاصة بأكواد التقييم).
*/
const CONFIGS = {
  student: {
    listApi:       '/api/student-codes',
    generateApi:   '/api/generate-student-code',
    deleteApi:     '/api/admin/delete-student-code',
    title:         '🔑 أكواد تفعيل الطلاب',
    generateLabel: 'توليد كود طالب جديد',
    newCodeLabel:  'تم توليد كود طالب جديد:',
    emptyIcon:     '🔑',
    emptyNoCodes:  'لا توجد أكواد — اضغط "توليد كود طالب جديد"',
    usedLabel:     '✓ تم الاستخدام',
    confirmMsg:    code => `هل أنت متأكد من حذف الكود "${code}"؟\nلا يمكن التراجع عن هذا الإجراء.`,
    banner:        { bg: '#e8f5e9', border: '#a5d6a7', label: '#388e3c', code: '#1b5e20', copyIdle: '#388e3c' },
    deleteBtnTransition: 'opacity .2s',
    dbGuard:       false,
  },
  teacher: {
    listApi:       '/api/teacher-codes',
    generateApi:   '/api/generate-teacher-code',
    deleteApi:     '/api/admin/delete-teacher-code',
    title:         '🔑 أكواد تفعيل المعلمين',
    generateLabel: 'توليد كود جديد',
    newCodeLabel:  'تم توليد كود جديد:',
    emptyIcon:     '🔑',
    emptyNoCodes:  'لا توجد أكواد — اضغط "توليد كود جديد"',
    usedLabel:     '✓ تم الاستخدام',
    confirmMsg:    code => `هل أنت متأكد من حذف الكود "${code}"؟\nلا يمكن التراجع عن هذا الإجراء.`,
    banner:        { bg: '#e8f5e9', border: '#a5d6a7', label: '#388e3c', code: '#1b5e20', copyIdle: '#388e3c' },
    deleteBtnTransition: 'opacity .2s',
    dbGuard:       false,
  },
  assessment: {
    listApi:       '/api/admin/assessment-codes/list',
    generateApi:   '/api/admin/assessment-codes/generate',
    deleteApi:     '/api/admin/assessment-codes/delete',
    title:         '📋 أكواد التقييم التشخيصي',
    generateLabel: 'توليد كود تقييم جديد',
    newCodeLabel:  'تم توليد كود تقييم جديد:',
    emptyIcon:     '📋',
    emptyNoCodes:  'لا توجد أكواد — اضغط "توليد كود تقييم جديد"',
    usedLabel:     '✓ مستخدم',
    confirmMsg:    code => `هل أنت متأكد من حذف الكود "${code}"؟`,
    banner:        { bg: '#e3f2fd', border: '#90caf9', label: '#1565c0', code: '#0d47a1', copyIdle: '#1565c0' },
    deleteBtnTransition: undefined,
    dbGuard:       true,
  },
};

export default function CodesManager({ type }) {
  const cfg = CONFIGS[type] ?? CONFIGS.student;

  const [codes,      setCodes]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newCode,    setNewCode]    = useState('');
  const [err,        setErr]        = useState('');
  const [deleting,   setDeleting]   = useState(new Set());
  const [copiedId,   setCopiedId]   = useState(null);
  const [hideUsed,   setHideUsed]   = useState(false);
  const [dbReady,    setDbReady]    = useState(true);

  function handleCopy(code, id) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const loadCodes = useCallback(async () => {
    const res  = await fetch(cfg.listApi, { method: 'POST', cache: 'no-store' });
    const data = await res.json();
    if (cfg.dbGuard && (data.error?.includes('exist') || data.error?.includes('relation') || data.error?.includes('42P01'))) {
      setDbReady(false);
      setLoading(false);
      return;
    }
    if (data.error) setErr(data.error);
    setCodes(data.codes ?? []);
    setLoading(false);
  }, [cfg.listApi, cfg.dbGuard]);

  useEffect(() => { loadCodes(); }, [loadCodes]);

  async function handleGenerate() {
    setGenerating(true);
    setNewCode('');
    setErr('');
    try {
      const res  = await fetch(cfg.generateApi, { method: 'POST' });
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
    if (!window.confirm(cfg.confirmMsg(code))) return;
    setDeleting(prev => new Set(prev).add(id));
    const res  = await fetch(cfg.deleteApi, {
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

  if (cfg.dbGuard && !dbReady) return (
    <div className="dash-section">
      <div className="dash-section-title">{cfg.title}</div>
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
      <div className="dash-section-title">{cfg.title}</div>

      {/* Actions bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
          {generating ? <span className="spinner" /> : '➕'} {cfg.generateLabel}
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
          background: cfg.banner.bg, border: `1px solid ${cfg.banner.border}`, borderRadius: 12,
          padding: '12px 18px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: '1.1rem' }}>✅</span>
          <div>
            <div style={{ fontSize: '.8rem', color: cfg.banner.label, fontWeight: 600 }}>{cfg.newCodeLabel}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: 800, color: cfg.banner.code, letterSpacing: 3 }}>{newCode}</span>
              <button onClick={() => handleCopy(newCode, 'new')} title="نسخ الكود" style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedId === 'new' ? '#27ae60' : cfg.banner.copyIdle, padding: 2 }}>
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
          <span className="empty-icon">{cfg.emptyIcon}</span>
          <p>{codes.length === 0 ? cfg.emptyNoCodes : 'لا توجد أكواد متاحة — جميع الأكواد مستعملة'}</p>
        </div>
      ) : (
        <div className="card table-scroll" style={{ padding: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
                      {c.is_used ? cfg.usedLabel : '● متاح'}
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
                        transition: cfg.deleteBtnTransition,
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
