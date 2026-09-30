'use client';
import { useState, useEffect } from 'react';

/*
  لوحة العملاء المحتملين (Lead Generation) — ذاتية الاكتفاء (بلا props)،
  بنفس نمط AnalyticsTab.jsx. مصدران يغذّيان نفس جدول marketing_leads
  (منفصل تماماً عن assessments الحقيقية بقرار صريح من الأستاذ محمد — لا
  اختلاط، لا أدوات خارجية)، مُميَّزان بعمود source:
    - quick_test: قمع "اختبار تحديد المستوى" (assessment.aarem.net/?quick=1، src/quicktest/)
    - consultation_survey: استبانة "الاستشارة التعليمية" (assessment.aarem.net/?survey=1، src/components/ConsultationSurvey.jsx)
*/

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('ar-SA-u-nu-latn', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function waLink(phone) {
  const digits = phone.replace(/[^\d]/g, '');
  return `https://api.whatsapp.com/send/?phone=${digits}&type=phone_number&app_absent=0`;
}

// مصدر العميل المحتمل — quick_test (الاختبار الترويجي الأصلي) مقابل
// consultation_survey (ConsultationSurvey.jsx، assessment.aarem.net/?survey=1)
// كلاهما يغذّي نفس الجدول marketing_leads بقرار صريح (لا جدول منفصل).
const SOURCE_LABELS = {
  quick_test:          '🎯 اختبار المستوى',
  consultation_survey: '📋 استبانة استشارة',
};
function sourceLabel(source) { return SOURCE_LABELS[source] || source || '—'; }

// نفس خيارات الاستبانة المعروضة لولي الأمر في ConsultationSurvey.jsx —
// مكرَّرة هنا حرفياً لأن هذا تطبيق Next.js منفصل تماماً (لا يمكن استيراد
// مكوّنات Vite مباشرة، نفس القيد الموثَّق لمعاينة الأسئلة في QuicktestCmsTab).
const GOAL_LABELS = {
  reading:      '📖 القراءة والنطق',
  vocabulary:   '💬 الرصيد اللغوي',
  writing:      '✍️ الكتابة والإملاء',
  'special-care': '🧩 رعاية خاصة',
  foundation:   '🌱 تأسيس شامل من الصفر',
};
const PLAN_LABELS = {
  monthly:   'شهري',
  quarterly: 'ربع سنوي',
  biannual:  'نصف سنوي',
  yearly:    'سنوي',
};

// answers قد تصل كمصفوفة (اختبار تحديد المستوى) أو ككائن واحد (استبانة
// الاستشارة) — كلا الشكلين يستحق زر "تفاصيل" فعّالاً.
function hasAnswerDetails(answers) {
  if (Array.isArray(answers)) return answers.length > 0;
  return !!answers && typeof answers === 'object' && Object.keys(answers).length > 0;
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
    const headers = ['تاريخ التسجيل', 'المصدر', 'اسم ولي الأمر', 'الهاتف/واتساب', 'البريد الإلكتروني', 'اسم الطفل', 'العمر', 'النتيجة', 'المستوى'];
    const csv = [
      headers.join(','),
      ...leads.map(l => [
        new Date(l.created_at).toLocaleString('en-GB'),
        `"${sourceLabel(l.source).replace(/"/g, '""')}"`,
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
          لا يوجد عملاء محتملون بعد — سيظهرون هنا فور تسجيل أي زائر عبر اختبار تحديد المستوى المجاني أو استبانة الاستشارة التعليمية.
        </div>
      ) : (
        <div className="card table-scroll-wrapper" style={{ padding: 0 }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
            <thead>
              <tr>
                {['التاريخ', 'المصدر', 'ولي الأمر', 'الهاتف/واتساب', 'البريد', 'الطفل', 'العمر', 'النتيجة', 'المستوى', ''].map(h => (
                  <th key={h} style={{ background: 'var(--primary)', color: '#fff', padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((l, i) => (
                <tr key={l.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9fbff' }}>
                  <td style={{ padding: '9px 16px', whiteSpace: 'nowrap' }}>{fmtDate(l.created_at)}</td>
                  <td style={{ padding: '9px 16px', whiteSpace: 'nowrap' }}>
                    <span className={l.source === 'consultation_survey' ? 'badge badge-orange' : 'badge badge-blue'}>{sourceLabel(l.source)}</span>
                  </td>
                  <td style={{ padding: '9px 16px', fontWeight: 700 }}>{l.parent_name}</td>
                  <td style={{ padding: '9px 16px' }}>
                    <a href={waLink(l.phone)} target="_blank" rel="noopener noreferrer" style={{ color: '#1a7c40', fontWeight: 700, textDecoration: 'none' }}>
                      📱 {l.phone}
                    </a>
                  </td>
                  <td style={{ padding: '9px 16px' }}>{l.email ?? '—'}</td>
                  <td style={{ padding: '9px 16px' }}>{l.child_name ?? '—'}</td>
                  <td style={{ padding: '9px 16px', textAlign: 'center' }}>{l.child_age ?? '—'}</td>
                  <td style={{ padding: '9px 16px', textAlign: 'center' }}>{l.score != null ? `${l.score}%` : '—'}</td>
                  <td style={{ padding: '9px 16px', textAlign: 'center' }}>
                    {l.level ? <span className="badge badge-blue">{l.level}</span> : '—'}
                  </td>
                  <td style={{ padding: '9px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button
                      className="btn btn-sm btn-outline"
                      disabled={!hasAnswerDetails(l.answers)}
                      onClick={() => setDetailsLead(l)}
                      title={!hasAnswerDetails(l.answers) ? 'لا تتوفر تفاصيل إجابات لهذا العميل المحتمل' : ''}
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
  if (lead.source === 'consultation_survey') {
    return <ConsultationSurveyDetails lead={lead} onClose={onClose} />;
  }

  const allAnswers = Array.isArray(lead.answers) ? lead.answers : [];
  // السؤال الافتتاحي (AlphabetGridAssessment.jsx) ليس MCQ عادياً — يحمل
  // type:'alphabet-grid' بدل isCorrect/chosenText، ويُعرَض كقسم منفصل
  // (قائمتا حروف) بدل صف سؤال/إجابة عادي. يُستبعَد من حساب المهارات
  // المتقنة/الضعيفة أدناه (لا isCorrect له، ولا معنى لعدّه ضمنها).
  const alphabet = allAnswers.find(a => a.type === 'alphabet-grid');
  // تدريبا المطابقة (MatchingAssessment.jsx) نفس منطق الحروف — لا isCorrect
  // على مستوى الإجابة نفسها (فقط correctWords/needsReviewWords)، فتُستبعَد
  // بدورها من حساب المهارات العادي أدناه، وتُعرَض كقسمين منفصلين لكل تدريب.
  const matchingEntries = allAnswers.filter(a => a.type === 'matching');
  // تقييم القراءة الجهرية (VoiceReadingAssessment.jsx) نفس منطق الحروف
  // والمطابقة — لا isCorrect (تسجيلات صوتية للاستماع، لا صح/خطأ)، فتُستبعَد
  // من حساب المهارات العادي وتُعرَض كقسم مستقل بمشغلات صوتية.
  const voiceReading = allAnswers.find(a => a.type === 'voice-reading');
  // تدريب إكمال الكلمة الناقصة (WordCompletionAssessment.jsx) — نفس منطق
  // الحروف/المطابقة/القراءة الجهرية، مستبعَد من حساب المهارات العادي أدناه.
  const wordCompletion = allAnswers.find(a => a.type === 'word-completion');
  const answers  = allAnswers.filter(a => a.type !== 'alphabet-grid' && a.type !== 'matching' && a.type !== 'voice-reading' && a.type !== 'word-completion');
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

        {matchingEntries.map((m, mi) => (
          <div key={mi} style={{ marginBottom: 18 }}>
            <div className="dash-section-title" style={{ marginBottom: 10 }}>🔗 {m.label || 'تدريب المطابقة'}</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 220px', background: '#eafbf3', border: '1px solid #bbf3d8', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontWeight: 800, color: '#065f46', fontSize: '.85rem', marginBottom: 6 }}>
                  كلمات ربطها بنجاح ({m.correctWords?.length ?? 0})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {m.correctWords?.length
                    ? m.correctWords.map((w, i) => <span key={i} className="badge badge-green">{w}</span>)
                    : <span style={{ fontSize: '.8rem', color: '#065f46' }}>لا شيء بعد</span>}
                </div>
              </div>
              <div style={{ flex: '1 1 220px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontWeight: 800, color: '#92400e', fontSize: '.85rem', marginBottom: 6 }}>
                  كلمات تحتاج مراجعة ({m.needsReviewWords?.length ?? 0})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {m.needsReviewWords?.length
                    ? m.needsReviewWords.map((w, i) => <span key={i} className="badge badge-orange">{w}</span>)
                    : <span style={{ fontSize: '.8rem', color: '#92400e' }}>لا شيء — أداء ممتاز!</span>}
                </div>
              </div>
            </div>
          </div>
        ))}

        {voiceReading && (
          <div style={{ marginBottom: 18 }}>
            <div className="dash-section-title" style={{ marginBottom: 10 }}>🎙️ تقييم القراءة الجهرية</div>
            {!voiceReading.recordings?.length ? (
              <p style={{ fontSize: '.85rem', color: 'var(--muted)' }}>لم يسجّل الطفل أياً من الجمل.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {voiceReading.recordings.map((r, i) => (
                  <div key={i} style={{ border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 700, fontSize: '.95rem' }}>
                      {r.emoji && <span style={{ fontSize: '1.3rem' }}>{r.emoji}</span>}
                      <span>{r.text}</span>
                    </div>
                    <audio controls src={r.audioUrl} style={{ width: '100%' }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {wordCompletion && (() => {
          const wcItems = Array.isArray(wordCompletion.items) ? wordCompletion.items : [];
          const correctWords     = wcItems.filter(i => i.isCorrect).map(i => i.word);
          const needsReviewWords = wcItems.filter(i => !i.isCorrect).map(i => i.word);
          return (
            <div style={{ marginBottom: 18 }}>
              <div className="dash-section-title" style={{ marginBottom: 10 }}>🔤 تدريب إكمال الكلمة الناقصة</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 220px', background: '#eafbf3', border: '1px solid #bbf3d8', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontWeight: 800, color: '#065f46', fontSize: '.85rem', marginBottom: 6 }}>
                    كلمات أكملها بنجاح ({correctWords.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {correctWords.length
                      ? correctWords.map((w, i) => <span key={i} className="badge badge-green">{w}</span>)
                      : <span style={{ fontSize: '.8rem', color: '#065f46' }}>لا شيء بعد</span>}
                  </div>
                </div>
                <div style={{ flex: '1 1 220px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontWeight: 800, color: '#92400e', fontSize: '.85rem', marginBottom: 6 }}>
                    كلمات تحتاج مراجعة ({needsReviewWords.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {needsReviewWords.length
                      ? needsReviewWords.map((w, i) => <span key={i} className="badge badge-orange">{w}</span>)
                      : <span style={{ fontSize: '.8rem', color: '#92400e' }}>لا شيء — أداء ممتاز!</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

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

/**
 * تفاصيل عميل محتمل من استبانة "الاستشارة التعليمية" — شكل بيانات مختلف
 * جذرياً عن اختبار تحديد المستوى (لا صح/خطأ، answers كائن واحد لا مصفوفة
 * أسئلة)، فتُعرَض كبطاقات اختيارات بسيطة بدل تصنيف مهارات/إجابات.
 */
function ConsultationSurveyDetails({ lead, onClose }) {
  const a = (lead.answers && typeof lead.answers === 'object') ? lead.answers : {};
  const goals = Array.isArray(a.developmentGoals) ? a.developmentGoals : [];

  const rows = [
    { label: 'الفئة العمرية',          value: a.childAgeBracket },
    { label: 'النظام المدرسي',         value: a.schoolSystem },
    { label: 'تقييم المستوى الحالي',   value: a.currentLevelAssessment },
    { label: 'بيئة التعلم المفضلة',    value: a.learningEnvironment },
    { label: 'الحصص الأسبوعية',        value: a.sessionsPerWeek },
    { label: 'الأوقات الأنسب',         value: a.preferredTimes },
    { label: 'خطة الاشتراك المفضّلة',   value: PLAN_LABELS[a.subscriptionPlan] || a.subscriptionPlan },
  ];

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700, padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#fff', borderRadius: 20, padding: '26px 22px', width: '100%', maxWidth: 560, direction: 'rtl', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <h3 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>📋 تفاصيل استبانة الاستشارة التعليمية</h3>
            <p style={{ fontSize: '.85rem', color: 'var(--muted)' }}>
              ولي الأمر: {lead.parent_name}{lead.child_name ? ` · الطفل: ${lead.child_name}` : ''} · {fmtDate(lead.created_at)}
            </p>
          </div>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          {rows.map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 14px', background: '#f9fbff', border: '1px solid var(--border)', borderRadius: 10 }}>
              <span style={{ fontWeight: 700, color: 'var(--muted)', fontSize: '.85rem' }}>{r.label}</span>
              <span style={{ fontWeight: 700, fontSize: '.9rem' }}>{r.value || '—'}</span>
            </div>
          ))}
        </div>

        <div className="dash-section-title" style={{ marginBottom: 10 }}>🎯 الجوانب المطلوب تطويرها</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {goals.length
            ? goals.map((g, i) => <span key={i} className="badge badge-blue">{GOAL_LABELS[g] || g}</span>)
            : <span style={{ fontSize: '.85rem', color: 'var(--muted)' }}>لا يوجد</span>}
        </div>

        {a.preferredTimesNote && (
          <div style={{ marginTop: 18 }}>
            <div className="dash-section-title" style={{ marginBottom: 10 }}>📝 ملاحظة ولي الأمر عن الأوقات</div>
            <div style={{ background: '#f9fbff', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: '.88rem', whiteSpace: 'pre-wrap' }}>
              {a.preferredTimesNote}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
