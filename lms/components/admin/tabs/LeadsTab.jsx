'use client';
import { useState, useEffect } from 'react';

/*
  لوحة العملاء المحتملين (Lead Generation) — ذاتية الاكتفاء (بلا props)،
  بنفس نمط AnalyticsTab.jsx. البيانات مصدرها قمع "اختبار تحديد المستوى"
  التسويقي المفتوح للعموم (assessment.aarem.net/?quick=1، راجع
  src/quicktest/) — جدول marketing_leads منفصل تماماً عن assessments
  الحقيقية بقرار صريح من الأستاذ محمد (لا اختلاط، لا أدوات خارجية).
*/

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('ar-SA-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function waLink(phone) {
  const digits = phone.replace(/[^\d]/g, '');
  return `https://api.whatsapp.com/send/?phone=${digits}&type=phone_number&app_absent=0`;
}

export default function LeadsTab() {
  const [leads, setLeads] = useState(null); // null = لم يُحمَّل بعد
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [detailsLead, setDetailsLead] = useState(null);

  useEffect(() => {
    fetch('/api/bogga/leads')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setLeads(d.leads); })
      .catch(() => setError('تعذّر تحميل قائمة العملاء المحتملين'));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!leads) return <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>;

  const todayStr = new Date().toDateString();
  const today = leads.filter(l => new Date(l.created_at).toDateString() === todayStr).length;

  function exportCsv() {
    setExporting(true);
    const headers = ['تاريخ التسجيل', 'اسم ولي الأمر', 'الهاتف/واتساب', 'البريد الإلكتروني', 'اسم الطفل', 'العمر', 'النتيجة', 'المستوى'];
    const csv = [
      headers.join(','),
      ...leads.map(l => [
        new Date(l.created_at).toLocaleString('en-GB'),
        `"${(l.parent_name ?? '').replace(/"/g, '""')}"`,
        `"${(l.phone ?? '').replace(/"/g, '""')}"`,
        `"${(l.email ?? '').replace(/"/g, '""')}"`,
        `"${(l.child_name ?? '').replace(/"/g, '""')}"`,
        l.child_age ?? '',
        l.score ?? '',
        `"${(l.level ?? '').replace(/"/g, '""')}"`,
      ].join(','))
    ].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `عملاء_محتملون_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <h2 style={{ fontWeight: 800, color: 'var(--primary)' }}>🎯 العملاء المحتملون</h2>
        <button className="btn btn-outline btn-sm" onClick={exportCsv} disabled={exporting || leads.length === 0}>
          📥 تصدير CSV
        </button>
      </div>

      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 20 }}>
        <div className="stat-card">
          <span className="stat-icon">🧾</span>
          <div><div className="stat-val">{leads.length}</div><div className="stat-lbl">إجمالي العملاء المحتملين</div></div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">📅</span>
          <div><div className="stat-val">{today}</div><div className="stat-lbl">اليوم</div></div>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          لا يوجد عملاء محتملون بعد — سيظهرون هنا فور تسجيل أي زائر عبر اختبار تحديد المستوى المجاني.
        </div>
      ) : (
        <div className="card table-scroll-wrapper" style={{ padding: 0 }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
            <thead>
              <tr>
                {['التاريخ', 'ولي الأمر', 'الهاتف/واتساب', 'البريد', 'الطفل', 'العمر', 'النتيجة', 'المستوى', ''].map(h => (
                  <th key={h} style={{ background: 'var(--primary)', color: '#fff', padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((l, i) => (
                <tr key={l.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fbff' }}>
                  <td style={{ padding: '9px 16px', whiteSpace: 'nowrap' }}>{fmtDate(l.created_at)}</td>
                  <td style={{ padding: '9px 16px', fontWeight: 700 }}>{l.parent_name}</td>
                  <td style={{ padding: '9px 16px' }}>
                    <a href={waLink(l.phone)} target="_blank" rel="noopener noreferrer" style={{ color: '#1a7c40', fontWeight: 700, textDecoration: 'none' }}>
                      📱 {l.phone}
                    </a>
                  </td>
                  <td style={{ padding: '9px 16px' }}>{l.email ?? '—'}</td>
                  <td style={{ padding: '9px 16px' }}>{l.child_name}</td>
                  <td style={{ padding: '9px 16px', textAlign: 'center' }}>{l.child_age ?? '—'}</td>
                  <td style={{ padding: '9px 16px', textAlign: 'center' }}>{l.score != null ? `${l.score}%` : '—'}</td>
                  <td style={{ padding: '9px 16px', textAlign: 'center' }}>
                    {l.level ? <span className="badge badge-blue">{l.level}</span> : '—'}
                  </td>
                  <td style={{ padding: '9px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button
                      className="btn btn-sm btn-outline"
                      disabled={!Array.isArray(l.answers) || l.answers.length === 0}
                      onClick={() => setDetailsLead(l)}
                      title={!Array.isArray(l.answers) || l.answers.length === 0 ? 'لا تتوفر تفاصيل إجابات لهذا التقييم' : ''}
                    >
                      📋 تفاصيل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailsLead && (
        <LeadDetailsModal lead={detailsLead} onClose={() => setDetailsLead(null)} />
      )}
    </div>
  );
}

/**
 * نافذة "تفاصيل الإجابات" — تعرض الـ15 سؤالاً كما أجاب عليها الطفل بالضبط
 * (السؤال، إجابته مقابل الإجابة الصحيحة، ✓/✗)، وملخص أداء سريع حسب وسم
 * كل سؤال (skill_tag) ليراجعه المدير/المعلم قبل مكالمة واتساب مع ولي الأمر.
 * ملاحظة: كل سؤال في هذا الاختبار يحمل وسم مهارة فريداً (لا تكرار)، فـ
 * "الملخص" هنا فعلياً تصنيف كل سؤال منفرد إلى متقن/يحتاج دعم — عرض سريع
 * يكمّل القائمة التفصيلية أسفله، لا يستبدلها.
 */
function LeadDetailsModal({ lead, onClose }) {
  const allAnswers = Array.isArray(lead.answers) ? lead.answers : [];
  // السؤال الافتتاحي (AlphabetGridAssessment.jsx) ليس MCQ عادياً — يحمل
  // type:'alphabet-grid' بدل isCorrect/chosenText، ويُعرَض كقسم منفصل
  // (قائمتا حروف) بدل صف سؤال/إجابة عادي. يُستبعَد من حساب المهارات
  // المتقنة/الضعيفة أدناه (لا isCorrect له، ولا معنى لعدّه ضمنها).
  const alphabet = allAnswers.find(a => a.type === 'alphabet-grid');
  const answers  = allAnswers.filter(a => a.type !== 'alphabet-grid');
  const mastered   = answers.filter(a => a.isCorrect && a.skillTag);
  const needsHelp  = answers.filter(a => !a.isCorrect && a.skillTag);

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#fff', borderRadius: 20, padding: '26px 22px', width: '100%', maxWidth: 640, direction: 'rtl', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            <h3 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>📋 تفاصيل إجابات {lead.child_name}</h3>
            <p style={{ fontSize: '.85rem', color: 'var(--muted)' }}>
              ولي الأمر: {lead.parent_name} · النتيجة: {lead.score != null ? `${lead.score}%` : '—'} · {lead.level ?? '—'}
            </p>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '18px 0' }}>
          <div style={{ flex: '1 1 220px', background: '#eafbf3', border: '1px solid #bbf3d8', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 800, color: '#065f46', fontSize: '.85rem', marginBottom: 6 }}>✅ مهارات أتقنها ({mastered.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {mastered.length === 0
                ? <span style={{ fontSize: '.8rem', color: '#065f46' }}>لا شيء بعد</span>
                : mastered.map((a, i) => <span key={i} className="badge badge-green">{a.skillTag}</span>)}
            </div>
          </div>
          <div style={{ flex: '1 1 220px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 800, color: '#92400e', fontSize: '.85rem', marginBottom: 6 }}>⚠️ يحتاج دعماً في ({needsHelp.length})</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {needsHelp.length === 0
                ? <span style={{ fontSize: '.8rem', color: '#92400e' }}>لا شيء — أداء ممتاز!</span>
                : needsHelp.map((a, i) => <span key={i} className="badge badge-orange">{a.skillTag}</span>)}
            </div>
          </div>
        </div>

        {alphabet && (
          <div style={{ marginBottom: 18 }}>
            <div className="dash-section-title" style={{ marginBottom: 10 }}>🔤 التعرف على الحروف الأبجدية (السؤال الافتتاحي)</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 220px', background: '#eafbf3', border: '1px solid #bbf3d8', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontWeight: 800, color: '#065f46', fontSize: '.85rem', marginBottom: 6 }}>
                  حروف قرأها بنجاح ({alphabet.masteredLetters?.length ?? 0})
                </div>
                <div style={{ fontSize: '1.3rem', lineHeight: 1.8 }}>
                  {alphabet.masteredLetters?.length ? alphabet.masteredLetters.join('، ') : <span style={{ fontSize: '.8rem', color: '#065f46' }}>لا شيء بعد</span>}
                </div>
              </div>
              <div style={{ flex: '1 1 220px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontWeight: 800, color: '#92400e', fontSize: '.85rem', marginBottom: 6 }}>
                  حروف تحتاج مراجعة ({alphabet.needsReviewLetters?.length ?? 0})
                </div>
                <div style={{ fontSize: '1.3rem', lineHeight: 1.8 }}>
                  {alphabet.needsReviewLetters?.length ? alphabet.needsReviewLetters.join('، ') : <span style={{ fontSize: '.8rem', color: '#92400e' }}>لا شيء — أداء ممتاز!</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="dash-section-title" style={{ marginBottom: 10 }}>📝 كل الأسئلة والإجابات</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {answers.map((a, i) => (
            <div key={i} style={{
              border: `1.5px solid ${a.isCorrect ? '#bbf3d8' : '#fde0e0'}`,
              background: a.isCorrect ? '#f7fefb' : '#fff8f8',
              borderRadius: 10, padding: '10px 14px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: '.88rem' }}>{i + 1}. {a.questionText}</span>
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{a.isCorrect ? '✅' : '❌'}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '.82rem' }}>
                <span>
                  <strong style={{ color: 'var(--muted)' }}>إجابة الطفل: </strong>
                  {a.chosenEmoji && <span>{a.chosenEmoji} </span>}{a.chosenText || '—'}
                </span>
                {!a.isCorrect && (
                  <span>
                    <strong style={{ color: 'var(--muted)' }}>الصحيحة: </strong>
                    {a.correctEmoji && <span>{a.correctEmoji} </span>}{a.correctText || '—'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
