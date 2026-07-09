'use client';
import { useEffect, useRef, useState } from 'react';

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

// Qatar = UTC+3, no DST — always use Qatar local time for month boundaries
function currentPeriod() {
  const qatar = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return `${qatar.getUTCFullYear()}-${String(qatar.getUTCMonth() + 1).padStart(2, '0')}`;
}

function periodLabel(p) {
  if (!p) return p;
  const [y, m] = p.split('-');
  return `${MONTHS_AR[parseInt(m) - 1]} ${y}`;
}

function fmtAmount(n) {
  return Number(n ?? 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Editable cell (locked when invoice is sent — financial lock) ─────────────
function EditableCell({ value, onSave, prefix = '', suffix = '', locked = false }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal]         = useState(value);
  const inputRef              = useRef(null);

  useEffect(() => { setVal(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function commit() {
    setEditing(false);
    const n = parseFloat(val);
    if (!isNaN(n) && n !== value) onSave(n);
    else setVal(value);
  }

  // ── Locked: render plain read-only text ──────────────────────────────────
  if (locked) {
    return (
      <span title="الفاتورة مغلقة — تم الإرسال" style={{
        padding: '4px 10px', borderRadius: 7,
        border: '1.5px solid #e2e8f0', fontSize: '.88rem',
        color: '#64748b', fontWeight: 600,
        display: 'inline-block', minWidth: 70, textAlign: 'center',
        background: '#f8fafc', cursor: 'not-allowed',
      }}>
        🔒 {prefix}{fmtAmount(value)}{suffix}
      </span>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number" min="0" step="0.01"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setVal(value); } }}
        style={{
          width: 90, padding: '4px 8px', border: '2px solid #185FA5',
          borderRadius: 7, fontSize: '.88rem', textAlign: 'center',
          fontFamily: 'inherit', outline: 'none',
        }}
      />
    );
  }
  return (
    <span
      onClick={() => setEditing(true)}
      title="انقر للتعديل"
      style={{
        cursor: 'pointer', padding: '4px 10px', borderRadius: 7,
        border: '1.5px dashed #c4cdd8', fontSize: '.88rem',
        color: '#334155', fontWeight: 600,
        transition: 'border-color .15s, background .15s',
        display: 'inline-block', minWidth: 70, textAlign: 'center',
      }}
      onMouseOver={e => { e.currentTarget.style.borderColor = '#185FA5'; e.currentTarget.style.background = '#f0f6ff'; }}
      onMouseOut={e => { e.currentTarget.style.borderColor = '#c4cdd8'; e.currentTarget.style.background = 'transparent'; }}
    >
      {prefix}{fmtAmount(value)}{suffix}
    </span>
  );
}

// ── Invoice row ──────────────────────────────────────────────────────────────
function InvoiceRow({ invoice, onUpdate, onSend, sending, lang }) {
  const [expanded,      setExpanded]      = useState(false);
  const [editingEmail,  setEditingEmail]  = useState(false);
  const [emailDraft,    setEmailDraft]    = useState('');
  const items  = Array.isArray(invoice.items) ? invoice.items : [];
  const isSent = invoice.status === 'sent';
  const emailUnknown = !invoice.user_email || invoice.user_email.includes('@teacher');

  function update(field, val) {
    onUpdate(invoice.id, { [field]: val });
  }

  return (
    <>
      <tr style={{
        background: isSent ? '#f0fdf4' : '#fff',
        transition: 'background .15s',
      }}>
        {/* Name */}
        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1e293b', fontSize: '.92rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => setExpanded(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                color: '#185FA5', fontSize: '.8rem', padding: 0, lineHeight: 1 }}
              title={expanded ? 'طي' : 'عرض التفاصيل'}
            >
              {expanded ? '▲' : '▼'}
            </button>
            {invoice.user_name}
            {!invoice.user_email?.endsWith('@demo.test') && !emailUnknown && (
              <span style={{ fontSize: '.72rem', color: '#94a3b8', fontWeight: 400 }}>
                {invoice.user_email}
              </span>
            )}
            {/* Email entry when unknown */}
            {emailUnknown && !isSent && (
              editingEmail ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="email"
                    value={emailDraft}
                    onChange={e => setEmailDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && emailDraft.includes('@')) {
                        onUpdate(invoice.id, { user_email: emailDraft });
                        setEditingEmail(false);
                      }
                      if (e.key === 'Escape') setEditingEmail(false);
                    }}
                    placeholder="البريد الإلكتروني"
                    autoFocus
                    style={{
                      width: 180, padding: '3px 8px', border: '1.5px solid #185FA5',
                      borderRadius: 7, fontSize: '.8rem', fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => {
                      if (emailDraft.includes('@')) {
                        onUpdate(invoice.id, { user_email: emailDraft });
                        setEditingEmail(false);
                      }
                    }}
                    style={{
                      background: '#185FA5', color: '#fff', border: 'none',
                      borderRadius: 6, padding: '3px 8px', fontSize: '.75rem',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >حفظ</button>
                  <button
                    onClick={() => setEditingEmail(false)}
                    style={{
                      background: '#f1f5f9', color: '#64748b', border: 'none',
                      borderRadius: 6, padding: '3px 7px', fontSize: '.75rem',
                      cursor: 'pointer',
                    }}
                  >✕</button>
                </span>
              ) : (
                <button
                  onClick={() => { setEmailDraft(''); setEditingEmail(true); }}
                  style={{
                    background: '#fef9c3', color: '#92400e', border: '1px dashed #f59e0b',
                    borderRadius: 7, padding: '2px 8px', fontSize: '.72rem',
                    cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
                  }}
                  title="أدخل بريد المعلم لتفعيل الإرسال"
                >
                  ⚠️ أدخل الإيميل
                </button>
              )
            )}
          </div>
        </td>
        {/* Sessions */}
        <td style={{ padding: '12px 14px', textAlign: 'center', color: '#475569', fontSize: '.88rem' }}>
          {invoice.sessions_count}
        </td>
        {/* Hours — editable, locked when sent */}
        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
          <EditableCell value={Number(invoice.total_hours)} onSave={val => update('total_hours', val)} suffix=" س" locked={isSent} />
        </td>
        {/* Rate — editable, locked when sent */}
        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
          <EditableCell value={Number(invoice.rate_per_hour)} onSave={val => update('rate_per_hour', val)} suffix=" ر.ق" locked={isSent} />
        </td>
        {/* Amount */}
        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800,
          color: Number(invoice.amount) > 0 ? '#1a7c40' : '#94a3b8', fontSize: '.95rem' }}>
          {fmtAmount(invoice.amount)} ر.ق
        </td>
        {/* Status */}
        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{
              display: 'inline-block', padding: '3px 11px', borderRadius: 20,
              fontSize: '.75rem', fontWeight: 700,
              background: isSent ? '#dcfce7' : '#fef9c3',
              color:      isSent ? '#166534' : '#713f12',
            }}>
              {isSent ? '✅ مُرسَل' : '⏳ مسودة'}
            </span>
            {/* Email delivery badge */}
            {invoice.email_delivery_status === 'failed' && (
              <span style={{
                background: '#fef2f2', color: '#b91c1c',
                border: '1px solid #fecaca', borderRadius: 20,
                padding: '2px 8px', fontSize: '.7rem', fontWeight: 700,
              }}>
                ⚠️ فشل الإرسال
              </span>
            )}
            {invoice.email_delivery_status === 'success' && (
              <span style={{
                background: '#f0fdf4', color: '#15803d',
                border: '1px solid #bbf7d0', borderRadius: 20,
                padding: '2px 8px', fontSize: '.7rem', fontWeight: 600,
              }}>
                📧 تم التسليم
              </span>
            )}
          </div>
        </td>
        {/* Actions */}
        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
          {isSent && invoice.email_delivery_status === 'success' ? (
            <span style={{ fontSize: '.75rem', color: '#94a3b8' }}>
              {invoice.sent_at ? new Date(invoice.sent_at).toLocaleDateString('en-GB') : '—'}
            </span>
          ) : (
            <button
              onClick={() => onSend(invoice)}
              disabled={sending || Number(invoice.amount) <= 0 || invoice.user_email?.endsWith('@demo.test') || emailUnknown}
              style={{
                background: (sending || Number(invoice.amount) <= 0 || emailUnknown)
                  ? '#e2e8f0'
                  : invoice.email_delivery_status === 'failed'
                    ? 'linear-gradient(135deg,#dc2626,#b91c1c)'
                    : 'linear-gradient(135deg,#185FA5,#1a3a6b)',
                color: (sending || Number(invoice.amount) <= 0 || emailUnknown) ? '#94a3b8' : '#fff',
                border: 'none', borderRadius: 9, padding: '7px 14px',
                fontSize: '.8rem', fontWeight: 700,
                cursor: (sending || Number(invoice.amount) <= 0 || emailUnknown) ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'opacity .15s', whiteSpace: 'nowrap',
              }}
              title={
                invoice.user_email?.endsWith('@demo.test') ? 'بيانات تجريبية — لا يمكن الإرسال' :
                emailUnknown ? 'أدخل بريد المعلم أولاً' : ''
              }
            >
              {sending ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 12, height: 12, borderRadius: '50%',
                    border: '2px solid #94a3b8', borderTopColor: 'transparent',
                    animation: 'spin .7s linear infinite', display: 'inline-block',
                  }} />
                  جارٍ...
                </span>
              ) : invoice.email_delivery_status === 'failed' ? '🔄 إعادة الإرسال' : '📨 اعتماد وإرسال'}
            </button>
          )}
        </td>
      </tr>

      {/* Expanded items */}
      {expanded && items.length > 0 && (
        <tr style={{ background: '#f8faff' }}>
          <td colSpan={7} style={{ padding: '0 24px 16px' }}>
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #dbeafe', marginTop: 2 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
                <thead>
                  <tr style={{ background: '#eff6ff' }}>
                    <th style={{ padding: '7px 12px', textAlign: 'right', color: '#185FA5', fontWeight: 700 }}>التاريخ</th>
                    <th style={{ padding: '7px 12px', textAlign: 'right', color: '#185FA5', fontWeight: 700 }}>
                      {invoice.type === 'teacher_payout' ? 'الطالب' : 'المعلم'}
                    </th>
                    <th style={{ padding: '7px 12px', textAlign: 'right', color: '#185FA5', fontWeight: 700 }}>المادة</th>
                    <th style={{ padding: '7px 12px', textAlign: 'center', color: '#185FA5', fontWeight: 700 }}>المدة</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #e0eeff' }}>
                      <td style={{ padding: '6px 12px', color: '#334155' }}>{it.date}</td>
                      <td style={{ padding: '6px 12px', color: '#334155' }}>
                        {invoice.type === 'teacher_payout' ? it.student : it.teacher}
                      </td>
                      <td style={{ padding: '6px 12px', color: '#334155' }}>{it.subject ?? '—'}</td>
                      <td style={{ padding: '6px 12px', color: '#334155', textAlign: 'center' }}>{it.minutes ?? 60} د</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function FinancialsTab({ lang = 'ar' }) {
  const [period,    setPeriod]    = useState(currentPeriod());
  const [subTab,    setSubTab]    = useState('teacher_payout');
  const [invoices,  setInvoices]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [genBusy,   setGenBusy]   = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [isMock,    setIsMock]    = useState(false);
  const [msg,       setMsg]       = useState(null); // { type: 'ok'|'err', text }

  // Period options: current + 11 previous months
  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => { loadInvoices(); }, [period, subTab]);

  async function loadInvoices() {
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/bogga/financials?period=${period}&type=${subTab}`);
      const d = await r.json();
      const list = d.invoices ?? [];
      setInvoices(list);
      // If all emails end with @demo.test → still showing mock data
      setIsMock(list.length > 0 && list.every(inv => inv.user_email?.endsWith('@demo.test')));
    } catch {
      setMsg({ type: 'err', text: 'خطأ في تحميل الفواتير' });
    } finally {
      setLoading(false);
    }
  }

  async function generate() {
    setGenBusy(true);
    setMsg(null);
    try {
      const r = await fetch('/api/bogga/financials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, type: subTab }),
      });
      const d = await r.json();
      if (d.error) { setMsg({ type: 'err', text: d.error }); return; }
      if (d.mock) {
        setMsg({ type: 'ok', text: `✅ تم توليد ${d.created} فاتورة تجريبية — جرّب جميع الخصائص!` });
      } else {
        const parts = [];
        if (d.created  > 0) parts.push(`${d.created} جديدة`);
        if (d.refreshed > 0) parts.push(`${d.refreshed} محدَّثة`);
        setMsg({ type: 'ok', text: `✅ الفواتير: ${parts.join(' | ') || 'لا تغييرات'}` });
      }
      await loadInvoices();
    } catch {
      setMsg({ type: 'err', text: 'خطأ في التوليد' });
    } finally {
      setGenBusy(false);
    }
  }

  async function updateInvoice(id, fields) {
    try {
      const r = await fetch(`/api/bogga/financials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      const d = await r.json();
      if (d.invoice) {
        setInvoices(prev => prev.map(inv => inv.id === id ? d.invoice : inv));
      }
    } catch { /* silent */ }
  }

  async function sendInvoice(invoice) {
    if (!confirm(`إرسال الفاتورة إلى ${invoice.user_email}؟`)) return;
    setSendingId(invoice.id);
    setMsg(null);
    try {
      const r = await fetch(`/api/bogga/financials/${invoice.id}/send`, { method: 'POST' });
      const d = await r.json();
      if (d.error) { setMsg({ type: 'err', text: d.error }); return; }
      setInvoices(prev => prev.map(inv => inv.id === invoice.id ? d.invoice : inv));
      setMsg({ type: 'ok', text: `تم إرسال الفاتورة إلى ${invoice.user_email}` });
    } catch {
      setMsg({ type: 'err', text: 'فشل إرسال الفاتورة' });
    } finally {
      setSendingId(null);
    }
  }

  const totalAmount = invoices.reduce((s, inv) => s + Number(inv.amount ?? 0), 0);
  const sentCount   = invoices.filter(inv => inv.status === 'sent').length;

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .fin-spin { animation: spin .7s linear infinite; }
      `}</style>
      {/* ── Header ── */}
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 4, fontSize: '1.25rem' }}>
          💰 الإدارة المالية والفواتير
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>
          توليد واعتماد وإرسال الفواتير للمعلمين والطلاب بشكل تلقائي
        </p>
      </div>

      {/* ── Controls ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
        {/* Period selector */}
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          style={{
            padding: '9px 14px', borderRadius: 10, border: '1.5px solid var(--border)',
            fontSize: '.9rem', fontFamily: 'inherit', color: '#1e293b', fontWeight: 600,
            background: '#fff', cursor: 'pointer',
          }}
        >
          {periodOptions.map(p => (
            <option key={p} value={p}>{periodLabel(p)}</option>
          ))}
        </select>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 4, gap: 2 }}>
          {[
            { id: 'teacher_payout', label: '👨‍🏫 مستحقات المعلمين' },
            { id: 'student_bill',   label: '🎓 فواتير الطلاب' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              style={{
                padding: '7px 16px', borderRadius: 8, border: 'none',
                fontFamily: 'inherit', fontSize: '.85rem', fontWeight: 700,
                cursor: 'pointer', transition: 'all .18s',
                background: subTab === t.id ? '#185FA5' : 'transparent',
                color:      subTab === t.id ? '#fff' : '#64748b',
                boxShadow:  subTab === t.id ? '0 2px 8px rgba(24,95,165,.3)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={genBusy}
          style={{
            padding: '9px 18px', borderRadius: 10, border: 'none',
            background: genBusy ? '#e2e8f0' : 'linear-gradient(135deg,#1a7c40,#166534)',
            color: genBusy ? '#94a3b8' : '#fff',
            fontFamily: 'inherit', fontSize: '.88rem', fontWeight: 700,
            cursor: genBusy ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 7,
          }}
        >
          {genBusy ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span className="fin-spin" style={{
                width: 14, height: 14, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff',
                display: 'inline-block',
              }} />
              جارٍ التوليد...
            </span>
          ) : '⚡ توليد من الحصص المكتملة'}
        </button>

        <button
          onClick={loadInvoices}
          disabled={loading}
          style={{
            padding: '9px 14px', borderRadius: 10,
            border: '1.5px solid var(--border)',
            background: '#fff', color: '#475569',
            fontFamily: 'inherit', fontSize: '.85rem', fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          🔄
        </button>
      </div>

      {/* ── Message ── */}
      {msg && (
        <div style={{
          padding: '10px 16px', borderRadius: 10, marginBottom: 16,
          background: msg.type === 'ok' ? '#f0fdf4' : '#fef2f2',
          color:      msg.type === 'ok' ? '#166534' : '#b91c1c',
          border:     `1.5px solid ${msg.type === 'ok' ? '#bbf7d0' : '#fecaca'}`,
          fontSize: '.88rem', fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} style={{ background: 'none', border: 'none',
            cursor: 'pointer', color: 'inherit', fontSize: '1rem', lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ── Mock data banner ── */}
      {isMock && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#fffbeb', border: '1.5px solid #fcd34d',
          borderRadius: 12, padding: '10px 16px', marginBottom: 16,
          fontSize: '.85rem', color: '#92400e', fontWeight: 600,
        }}>
          <span style={{ fontSize: '1.2rem' }}>🧪</span>
          <span>
            <strong>بيانات تجريبية</strong> — لا توجد حصص حقيقية لهذا الشهر. جرّب التعديل الفوري وزر الإرسال بحرية.
            ستُستبدل تلقائياً بالبيانات الحقيقية عند وجود حصص مكتملة.
          </span>
        </div>
      )}

      {/* ── Summary cards ── */}
      {invoices.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'إجمالي الفواتير', value: invoices.length, icon: '📄', color: '#185FA5', bg: '#eff6ff' },
            { label: 'المرسلة', value: sentCount, icon: '✅', color: '#1a7c40', bg: '#f0fdf4' },
            { label: 'المسودة', value: invoices.length - sentCount, icon: '⏳', color: '#b45309', bg: '#fffbeb' },
            { label: 'الإجمالي الكلي', value: `${fmtAmount(totalAmount)} ر.ق`, icon: '💰', color: '#7c3aed', bg: '#f5f3ff' },
          ].map(c => (
            <div key={c.label} style={{
              background: c.bg, borderRadius: 12, padding: '14px 18px',
              flex: 1, minWidth: 140,
              border: `1.5px solid ${c.color}22`,
            }}>
              <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{c.icon}</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: c.color }}>{c.value}</div>
              <div style={{ fontSize: '.75rem', color: '#64748b', fontWeight: 600 }}>{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--muted)' }}>جارٍ التحميل...</div>
      ) : invoices.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '56px 24px',
          background: '#fff', borderRadius: 16,
          border: '1.5px solid var(--border)',
        }}>
          <div style={{ fontSize: '2.8rem', marginBottom: 10 }}>📊</div>
          <p style={{ color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>
            لا توجد فواتير لهذه الفترة
          </p>
          <p style={{ color: '#94a3b8', fontSize: '.85rem' }}>
            اضغط "توليد من الحصص المكتملة" لإنشاء الفواتير تلقائياً
          </p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid var(--border)', overflow: 'hidden' }}>
          <div className="table-scroll-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
              <thead>
                <tr style={{ background: '#f8faff', borderBottom: '2px solid #dbeafe' }}>
                  {['الاسم', 'الحصص', 'الساعات ✎', 'السعر/س ✎', 'المبلغ', 'الحالة', 'إجراء'].map(h => (
                    <th key={h} style={{
                      padding: '11px 14px', textAlign: h === 'الاسم' ? 'right' : 'center',
                      fontSize: '.8rem', fontWeight: 800, color: '#185FA5',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <InvoiceRow
                    key={inv.id}
                    invoice={inv}
                    onUpdate={updateInvoice}
                    onSend={sendInvoice}
                    sending={sendingId === inv.id}
                    lang={lang}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'linear-gradient(135deg,#185FA5,#1a3a6b)', color: '#fff' }}>
                  <td colSpan={4} style={{ padding: '11px 14px', fontWeight: 800, fontSize: '.92rem' }}>
                    الإجمالي
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'center', fontWeight: 900, fontSize: '1rem' }}>
                    {fmtAmount(totalAmount)} ر.ق
                  </td>
                  <td colSpan={2} style={{ padding: '11px 14px', textAlign: 'center', fontSize: '.85rem' }}>
                    {sentCount}/{invoices.length} مُرسَل
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Note ── */}
      <p style={{ fontSize: '.78rem', color: '#94a3b8', marginTop: 14, lineHeight: 1.7 }}>
        ✎ انقر على خلية الساعات أو السعر لتعديلها مباشرة. المبلغ يُحسب تلقائياً.
        🔒 الخلايا تُقفل نهائياً بعد الإرسال الناجح لحماية السجلات التاريخية.
        {subTab === 'teacher_payout' && ' لإرسال مستحقات معلم، يجب أن يكون لديه بريد مسجّل في النظام.'}
        {' '}⚠️ إذا ظهرت علامة "فشل الإرسال" اضغط "إعادة الإرسال" مباشرة.
      </p>
    </div>
  );
}
