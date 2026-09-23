'use client';
import { useEffect, useState } from 'react';
import { fmtDate } from './shared.jsx';

// ترتيب المهارات نفسه المعتمد في بنك الأسئلة (src/data/questions.js بالمشروع
// الجذر) — مكرَّر هنا كقائمة id/name صغيرة فقط للترتيب، بلا أي استيراد فعلي
// عبر المشروعين (gitRootDirectory مختلف، القسم 4 من CLAUDE.md). skillName
// الكامل يصل فعلياً محفوظاً مسبقاً داخل answers[].skillName من buildAnswerReport.
const SKILL_ORDER = ['listening', 'vocabulary', 'reading', 'grammar', 'writing', 'speaking', 'other'];

// أسماء أكواد MediaError القياسية (MDN) — لعرض سبب فشل التحميل الحقيقي
// بدل ترك الطالب "0:00" صامتة بلا أي تفسير.
const MEDIA_ERROR_NAMES = {
  1: 'MEDIA_ERR_ABORTED',
  2: 'MEDIA_ERR_NETWORK',
  3: 'MEDIA_ERR_DECODE',
  4: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
};

export default function AssessmentDetailDrawer({ resultId, lang = 'ar', onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  // تشخيص مؤقت: أي رابط تسجيل يفشل تحميله فعلياً في المتصفح (لا مجرد بيانات
  // مفقودة) يُسجَّل هنا مع كود/رسالة الخطأ الحقيقيين من عنصر <audio> نفسه —
  // يُعرَض بصرياً بدل الاكتفاء بـ0:00 صامتة، ليُعرف السبب الدقيق من أول تجربة.
  const [audioErrors, setAudioErrors] = useState({});

  useEffect(() => {
    if (!resultId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/bogga/results/${resultId}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'فشل التحميل');
        return d;
      })
      .then((d) => { setData(d.result); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [resultId]);

  if (!resultId) return null;

  const answers = Array.isArray(data?.answers) ? data.answers : [];
  const passed  = (data?.score ?? 0) >= 70;

  // تجميع الأسئلة حسب المهارة — بترتيب SKILL_ORDER، ثم أي مهارة إضافية غير متوقعة
  const bySkill = {};
  for (const a of answers) {
    const sk = a.skill || 'other';
    if (!bySkill[sk]) bySkill[sk] = [];
    bySkill[sk].push(a);
  }
  const orderedSkills = [
    ...SKILL_ORDER.filter((sk) => bySkill[sk]?.length),
    ...Object.keys(bySkill).filter((sk) => !SKILL_ORDER.includes(sk) && bySkill[sk]?.length),
  ];

  return (
    <>
      <style>{`
        .adr-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:1200;
                      display:flex; justify-content:flex-end; }
        .adr-panel   { width:min(680px,100vw); height:100vh; overflow-y:auto;
                      background:#f8fafc; direction:rtl;
                      animation:adrSlideIn .25s ease; }
        @keyframes adrSlideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }

        .adr-head  { background:var(--primary); color:#fff; padding:20px 22px; position:sticky; top:0; z-index:10; }
        .adr-body  { padding:20px 22px; display:flex; flex-direction:column; gap:20px; }

        .adr-summary { display:flex; gap:10px; margin-top:14px; flex-wrap:wrap; }
        .adr-chip    { background:rgba(255,255,255,.15); border-radius:20px; padding:6px 14px;
                       font-size:.82rem; font-weight:700; display:flex; align-items:center; gap:6px; }

        .adr-sec       { background:#fff; border-radius:14px; border:1.5px solid var(--border); overflow:hidden; }
        .adr-sec-head  { background:#f0f4f8; padding:10px 16px; display:flex; justify-content:space-between;
                         align-items:center; border-bottom:1.5px solid var(--border); }
        .adr-sec-title { font-weight:800; font-size:.92rem; color:var(--primary); }
        .adr-sec-pct   { font-weight:800; font-size:.85rem; }

        .adr-q      { padding:12px 16px; border-bottom:1px solid #eef1f4; }
        .adr-q:last-child { border-bottom:none; }
        .adr-q-text { font-weight:700; font-size:.9rem; color:#1e293b; margin-bottom:8px; line-height:1.6; }
        .adr-ans    { display:flex; flex-wrap:wrap; gap:8px 20px; font-size:.84rem; }
        .adr-ans-lbl{ color:var(--muted); font-weight:600; }

        .adr-audio-row { display:flex; align-items:center; gap:8px; margin-top:8px; background:#f8fafc;
                         border-radius:8px; padding:6px 10px; }
      `}</style>

      <div className="adr-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="adr-panel">

          {/* Header — ملخص التقييم */}
          <div className="adr-head">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <button onClick={onClose} style={{
                background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', borderRadius: 8,
                padding: '6px 10px', cursor: 'pointer', fontSize: '1rem', fontFamily: 'inherit', fontWeight: 700,
              }}>
                ✕
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: '1.15rem' }}>{data?.student_name ?? (loading ? '…' : '—')}</div>
                {data?.student_email && (
                  <div style={{ fontSize: '.78rem', opacity: .85, marginTop: 2, direction: 'ltr', textAlign: 'right' }}>
                    {data.student_email}
                  </div>
                )}
              </div>
            </div>

            {data && (
              <div className="adr-summary">
                <span className="adr-chip" style={{ background: passed ? 'rgba(42,187,122,.28)' : 'rgba(231,76,60,.28)' }}>
                  {passed ? '✅' : '❌'} {data.score ?? 0}%
                </span>
                <span className="adr-chip">🏅 {lang === 'ar' ? 'المستوى' : 'Level'} {data.level ?? '—'}</span>
                <span className="adr-chip">📅 {data.completed_at ? fmtDate(data.completed_at.slice(0, 10), lang) : '—'}</span>
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}>
              {lang === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
            </div>
          ) : error ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#dc2626' }}>
              ⚠️ {error}
            </div>
          ) : (
            <div className="adr-body">
              {answers.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '30px 10px', fontSize: '.9rem' }}>
                  {lang === 'ar'
                    ? 'لا تتوفر تفاصيل الإجابات لهذا التقييم — قد يكون تقييماً قديماً قبل تفعيل هذه الميزة.'
                    : 'No answer details available for this assessment — it may predate this feature.'}
                </div>
              ) : orderedSkills.map((sk) => {
                const qs = bySkill[sk];
                const correct = qs.filter((q) => q.isCorrect).length;
                const pct = Math.round((correct / qs.length) * 100);
                return (
                  <div key={sk} className="adr-sec">
                    <div className="adr-sec-head">
                      <span className="adr-sec-title">{qs[0]?.skillName || sk}</span>
                      <span className="adr-sec-pct" style={{ color: pct >= 70 ? 'var(--success)' : '#e74c3c' }}>
                        {correct}/{qs.length} — {pct}%
                      </span>
                    </div>
                    {qs.map((q, i) => (
                      <div key={`${q.questionId}_${i}`} className="adr-q">
                        <div className="adr-q-text">
                          {q.isCorrect ? '✅' : '❌'} {q.questionText}
                        </div>
                        <div className="adr-ans">
                          <span><span className="adr-ans-lbl">{lang === 'ar' ? 'إجابة الطالب: ' : 'Student answer: '}</span>{q.studentAnswer}</span>
                          <span><span className="adr-ans-lbl">{lang === 'ar' ? 'الإجابة الصحيحة: ' : 'Correct answer: '}</span>{q.correctAnswer}</span>
                        </div>
                        {q.audioUrls?.map((url, j) => (
                          <div key={j}>
                            <div className="adr-audio-row">
                              <span>🎵</span>
                              <audio
                                controls
                                src={url}
                                style={{ flex: 1, height: 36 }}
                                onError={(e) => {
                                  const err = e.currentTarget.error;
                                  const detail = err ? `${MEDIA_ERROR_NAMES[err.code] || err.code} — ${err.message || ''}` : 'unknown';
                                  console.error('[AssessmentDetailDrawer] audio load failed:', url, detail);
                                  setAudioErrors((prev) => ({ ...prev, [url]: detail }));
                                }}
                              />
                            </div>
                            {audioErrors[url] && (
                              <div style={{ fontSize: '.75rem', color: '#dc2626', marginTop: 2 }}>
                                ⚠️ {lang === 'ar' ? 'تعذّر تحميل الصوت' : 'Failed to load audio'} ({audioErrors[url]}) —{' '}
                                <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#dc2626', textDecoration: 'underline' }}>
                                  {lang === 'ar' ? 'افتح الرابط مباشرة' : 'open link directly'}
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
