'use client';
import { fmtDate, waLink, STATUS_COLORS, IV_COLORS } from '../shared';

/* هذا المكوّن استُخرج حرفياً من lms/app/bogga/page.jsx (تفكيك الملف الأحادي).
   الحالة والمعالجات بقيت في الصفحة الأم وتصل هنا كـprops — سلوك مطابق 100%. */
export default function RecruitmentTab({
  lang, isSuperAdmin,
  apps, appsLoading, loadApps, loadInterviews,
  interviewsMap, toggleVisibility,
  downloadCV, downloadingCV,
  updateAppStatus, openScheduleModal,
  deleteApp, deletingApp,
  cancelInterview, cancellingInterview,
}) {
  const STATUS_LABELS = lang === 'ar'
    ? { pending: 'قيد المراجعة', reviewed: 'تمت المراجعة', accepted: 'مقبول', rejected: 'مرفوض' }
    : { pending: 'Pending', reviewed: 'Reviewed', accepted: 'Accepted', rejected: 'Rejected' };

  const IV_LABELS = lang === 'ar'
    ? { pending: '⏳ بانتظار الرد', confirmed: '✅ مؤكد', reschedule_requested: '📅 طلب تعديل', rejected: '❌ اعتذر' }
    : { pending: '⏳ Awaiting Reply', confirmed: '✅ Confirmed', reschedule_requested: '📅 Reschedule Requested', rejected: '❌ Declined' };

  return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontWeight: 800, color: 'var(--primary)' }}>📋 {lang === 'ar' ? 'طلبات الترشح للتوظيف' : 'Job Applications'}</h2>
                <button onClick={() => { loadApps(); loadInterviews(); }} className="btn btn-outline btn-sm">🔄 {lang === 'ar' ? 'تحديث' : 'Refresh'}</button>
              </div>
              {appsLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
                </div>
              ) : apps.length === 0 ? (
                <div className="empty-state"><span className="empty-icon">📭</span><p>{lang === 'ar' ? 'لا توجد طلبات توظيف بعد' : 'No job applications yet'}</p></div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {apps.map(app => {
                    const ivList  = interviewsMap[app.id] ?? [];
                    const latestIv = ivList.slice(-1)[0];
                    const wa = waLink(app.phone);
                    return (
                      <div key={app.id} className="card" style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>

                          {/* Candidate info */}
                          <div style={{ flex: '1 1 260px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>{app.name}</span>
                              {isSuperAdmin && (
                                <button
                                  onClick={() => toggleVisibility(app.id, app.is_visible_to_assistants ?? true)}
                                  title={app.is_visible_to_assistants !== false
                                    ? (lang === 'ar' ? 'مرئي للمساعدين — انقر للإخفاء' : 'Visible to assistants — click to hide')
                                    : (lang === 'ar' ? 'مخفي عن المساعدين — انقر للإظهار' : 'Hidden from assistants — click to show')}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
                                    fontSize: '.73rem', fontWeight: 700,
                                    background: app.is_visible_to_assistants !== false ? '#dcfce7' : '#f1f5f9',
                                    color:      app.is_visible_to_assistants !== false ? '#166534' : '#64748b',
                                  }}
                                >
                                  {app.is_visible_to_assistants !== false
                                    ? (lang === 'ar' ? '👁️ مرئي' : '👁️ Visible')
                                    : (lang === 'ar' ? '🙈 مخفي' : '🙈 Hidden')}
                                </button>
                              )}
                            </div>
                            <div style={{ fontSize: '.85rem', color: 'var(--muted)', lineHeight: 2 }}>
                              {/* Mailto link */}
                              📧&nbsp;
                              <a className="quick-link" href={`mailto:${app.email}?subject=بخصوص طلبك في أكاديمية عارم`}
                                style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                {app.email}
                              </a>
                              &nbsp;|&nbsp;
                              {/* WhatsApp link */}
                              📱&nbsp;
                              {wa ? (
                                <a className="quick-link" href={wa} target="_blank" rel="noopener noreferrer"
                                  style={{ color: '#1a7c40', fontWeight: 600 }}>
                                  <bdi dir="ltr">{app.phone}</bdi>
                                </a>
                              ) : (
                                <bdi dir="ltr">{app.phone}</bdi>
                              )}
                              <br />
                              💼 {app.experience}&nbsp;|&nbsp;🎓 {app.specialty}
                            </div>
                            {app.notes && (
                              <div style={{ marginTop: 8, fontSize: '.83rem', color: '#475569', background: 'var(--bg)', padding: '8px 12px', borderRadius: 8 }}>
                                {app.notes}
                              </div>
                            )}
                            <button
                              onClick={() => downloadCV(app.id)}
                              disabled={downloadingCV[app.id]}
                              className="btn btn-sm btn-outline"
                              style={{ marginTop: 10, fontSize: '.8rem', gap: 6 }}>
                              {downloadingCV[app.id]
                                ? <><span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />{lang === 'ar' ? 'جارٍ التحميل...' : 'Downloading...'}</>
                                : (lang === 'ar' ? '⬇️ تحميل السيرة الذاتية' : '⬇️ Download CV')}
                            </button>

                            {/* Interview status block */}
                            {latestIv && (
                              <div style={{ marginTop: 14, background: '#eef5ff', borderRadius: 10, padding: '11px 14px', fontSize: '.83rem', borderRight: '3px solid #185FA5' }}>
                                <div style={{ fontWeight: 800, color: '#185FA5', marginBottom: 6, fontSize: '.88rem' }}>📅 {lang === 'ar' ? 'المقابلة المجدولة' : 'Scheduled Interview'}</div>
                                <div style={{ color: '#1a2d4a', lineHeight: 1.8 }}>
                                  📆 {fmtDate(latestIv.interview_date, lang)} · ⏰ {latestIv.start_time?.slice(0, 5)} · 👤 {latestIv.interviewer_name}
                                </div>
                                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                  <span style={{ padding: '3px 11px', borderRadius: 20, fontSize: '.76rem', fontWeight: 700, background: (IV_COLORS[latestIv.candidate_response] ?? '#6b7280') + '22', color: IV_COLORS[latestIv.candidate_response] ?? '#6b7280' }}>
                                    {IV_LABELS[latestIv.candidate_response] ?? latestIv.candidate_response}
                                  </span>
                                  {cancellingInterview === latestIv.id
                                    ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2, borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
                                    : <button onClick={() => cancelInterview(latestIv.id, app.id)} style={{ fontSize: '.76rem', background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>✕ {lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                                  }
                                </div>
                                {latestIv.candidate_response === 'reschedule_requested' && latestIv.reschedule_reason && (
                                  <div style={{ marginTop: 10, padding: '9px 12px', background: '#fff8e1', borderRadius: 8, border: '1px solid #ffe082', color: '#7a4f00', fontSize: '.83rem', lineHeight: 1.7 }}>
                                    💬 <strong>{lang === 'ar' ? 'سبب التعديل:' : 'Reason:'}</strong> {latestIv.reschedule_reason}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Actions column */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                            <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: '.78rem', fontWeight: 700, background: STATUS_COLORS[app.status] + '20', color: STATUS_COLORS[app.status] }}>
                              {STATUS_LABELS[app.status] ?? app.status}
                            </span>
                            {isSuperAdmin && <>
                              <select value={app.status} onChange={e => updateAppStatus(app.id, e.target.value)}
                                style={{ fontSize: '.8rem', padding: '4px 8px', borderRadius: 8, border: '1.5px solid var(--border)', fontFamily: 'inherit' }}>
                                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                              </select>
                              <button onClick={() => openScheduleModal(app)} className="btn btn-sm"
                                style={{ background: '#e8f0fb', color: '#185FA5', border: '1.5px solid #b3ccee', fontSize: '.8rem', gap: 5 }}>
                                📅 {latestIv ? (lang === 'ar' ? 'إعادة جدولة' : 'Reschedule') : (lang === 'ar' ? 'جدولة مقابلة' : 'Schedule Interview')}
                              </button>
                              <button onClick={() => deleteApp(app.id, app.name)} disabled={deletingApp === app.id} className="btn btn-sm btn-danger" style={{ fontSize: '.78rem' }}>
                                {deletingApp === app.id ? <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> : (lang === 'ar' ? '🗑️ حذف' : '🗑️ Delete')}
                              </button>
                            </>}
                          </div>
                        </div>
                        <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 10 }}>
                          {new Date(app.created_at).toLocaleString(lang === 'ar' ? 'en-GB' : 'en-GB')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
  );
}
