'use client';
import { useState } from 'react';
import { fmtDate } from '../shared';

/* هذا المكوّن استُخرج حرفياً من lms/app/bogga/page.jsx (تفكيك الملف الأحادي).
   الحالة والمعالجات بقيت في الصفحة الأم وتصل هنا كـprops — سلوك مطابق 100%. */
export default function SessionsTab({
  lang,
  adminSessions, setAdminSessions, adminSessLoading,
  adminSessTab, setAdminSessTab,
  adminWeekOffset, setAdminWeekOffset,
  adminTeacherFilter, setAdminTeacherFilter,
  adminSessShowAll,
  loadAdminSessions, openAdminSchedModal,
  setAdminCompleteFor, setAdminRecordingUrl,
  handleAdminCancel, adminCancellingId,
}) {
  const [pastSearch,      setPastSearch]      = useState('');
  const [cancelledSearch, setCancelledSearch] = useState('');
            const today      = new Date().toISOString().slice(0, 10);
            const nextWeekDt = new Date(); nextWeekDt.setDate(nextWeekDt.getDate() + 7);
            const nextWeek   = nextWeekDt.toISOString().slice(0, 10);
            const filtered   = adminTeacherFilter
              ? adminSessions.filter(s => s.teacher_name?.includes(adminTeacherFilter) || s.student_name?.includes(adminTeacherFilter))
              : adminSessions;
            const upcoming   = filtered.filter(s => s.status === 'scheduled' && s.session_date >= today);
            const past       = filtered.filter(s => s.status === 'completed' || (s.status === 'scheduled' && s.session_date < today));
            const cancelled  = filtered.filter(s => s.status === 'cancelled');
            const totalStudents = new Set(adminSessions.map(s => s.student_email || s.student_name)).size;
            const calWeekDays  = Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - d.getDay() + i + adminWeekOffset * 7);
              return d.toISOString().slice(0, 10);
            });
            const dayName = iso => (lang === 'ar'
              ? ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']
              : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[new Date(iso).getDay()];
            const joinLink = s => s.meet_link ?? null;

            return (
              <div>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 24 }}>
                  {[
                    { icon: '📅', val: upcoming.length,                                            lbl: lang === 'ar' ? 'حصص قادمة'     : 'Upcoming'       },
                    { icon: '📆', val: upcoming.filter(s => s.session_date < nextWeek).length,     lbl: lang === 'ar' ? 'هذا الأسبوع'   : 'This week'      },
                    { icon: '👥', val: totalStudents,                                              lbl: lang === 'ar' ? 'إجمالي الطلاب' : 'Total students'  },
                    { icon: '✅', val: adminSessions.filter(s => s.status === 'completed').length, lbl: lang === 'ar' ? 'حصص منجزة'     : 'Completed'      },
                    { icon: '❌', val: adminSessions.filter(s => s.status === 'cancelled').length, lbl: lang === 'ar' ? 'ملغاة'          : 'Cancelled'      },
                  ].map(s => (
                    <div key={s.lbl} style={{ background: '#fff', border: '1.5px solid var(--border)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.3rem' }}>{s.icon}</div>
                      <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--primary)' }}>{s.val}</div>
                      <div style={{ fontSize: '.76rem', color: 'var(--muted)', marginTop: 2 }}>{s.lbl}</div>
                    </div>
                  ))}
                </div>

                {/* Filter + Refresh + All toggle + Schedule */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input className="form-input" style={{ flex: '1 1 200px', margin: 0 }}
                    placeholder={lang === 'ar' ? '🔍 فلتر حسب المعلم أو الطالب...' : '🔍 Filter by teacher or student...'}
                    value={adminTeacherFilter}
                    onChange={e => setAdminTeacherFilter(e.target.value)} />
                  <button onClick={() => loadAdminSessions(adminSessShowAll)} className="btn btn-outline btn-sm" style={{ whiteSpace: 'nowrap' }}>🔄 {lang === 'ar' ? 'تحديث' : 'Refresh'}</button>
                  <button
                    onClick={() => loadAdminSessions(!adminSessShowAll)}
                    className="btn btn-outline btn-sm"
                    style={{ whiteSpace: 'nowrap', color: adminSessShowAll ? 'var(--primary)' : 'var(--muted)', borderColor: adminSessShowAll ? 'var(--primary)' : 'var(--border)' }}
                  >
                    {adminSessShowAll ? (lang === 'ar' ? '📅 الشهر الحالي' : '📅 This month') : (lang === 'ar' ? '📂 كل الحصص' : '📂 All sessions')}
                  </button>
                  <button onClick={openAdminSchedModal} className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
                    📅 {lang === 'ar' ? '+ جدولة حصة' : '+ Schedule'}
                  </button>
                </div>
                {!adminSessShowAll && (
                  <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: 12, marginTop: -10 }}>
                    {lang === 'ar' ? '⚡ يُعرض الشهر الحالي فقط — اضغط «كل الحصص» لعرض الأرشيف الكامل.' : '⚡ Showing current month only — click «All sessions» to load the full archive.'}
                  </div>
                )}

                {/* Sub-tabs */}
                <div style={{ display: 'flex', gap: 4, background: '#f0f4f8', borderRadius: 10, padding: 4, marginBottom: 20, flexWrap: 'wrap' }}>
                  {[
                    { key: 'upcoming',  label: lang === 'ar' ? `📅 قادمة (${upcoming.length})`  : `📅 Upcoming (${upcoming.length})` },
                    { key: 'calendar',  label: lang === 'ar' ? '🗓️ التقويم'                     : '🗓️ Calendar' },
                    { key: 'past',      label: lang === 'ar' ? `✅ منتهية (${past.length})`     : `✅ Past (${past.length})` },
                    { key: 'cancelled', label: lang === 'ar' ? `❌ ملغاة (${cancelled.length})` : `❌ Cancelled (${cancelled.length})` },
                  ].map(t => (
                    <button key={t.key} onClick={() => setAdminSessTab(t.key)} style={{
                      flex: 1, minWidth: 80, padding: '8px 4px', border: 'none',
                      background: adminSessTab === t.key ? '#fff' : 'transparent',
                      borderRadius: 7, fontFamily: 'inherit', fontSize: '.85rem', fontWeight: 700,
                      color: adminSessTab === t.key ? 'var(--primary)' : 'var(--muted)',
                      boxShadow: adminSessTab === t.key ? '0 1px 6px rgba(0,0,0,.1)' : 'none',
                      cursor: 'pointer', transition: '.15s',
                    }}>{t.label}</button>
                  ))}
                </div>

                {adminSessLoading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'var(--border)' }} />
                  </div>
                ) : (
                  <>
                    {/* Upcoming */}
                    {adminSessTab === 'upcoming' && (
                      upcoming.length === 0 ? (
                        <div className="empty-state card"><span className="empty-icon">📭</span><p>{lang === 'ar' ? 'لا توجد حصص قادمة' : 'No upcoming sessions'}</p></div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {upcoming.map(s => (
                            <div key={s.id} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid var(--border)', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                              <div style={{ fontSize: '1.8rem', paddingTop: 2 }}>🎥</div>
                              <div style={{ flex: 1, minWidth: 180 }}>
                                <div style={{ fontWeight: 800, fontSize: '.97rem', color: 'var(--text)', marginBottom: 3 }}>{s.subject || (lang === 'ar' ? 'حصة عامة' : 'General session')}</div>
                                <div style={{ fontSize: '.83rem', color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                  <span>👨‍🏫 {s.teacher_name}</span>
                                  <span>👤 {s.student_name}</span>
                                  <span>📅 {fmtDate(s.session_date, lang)}</span>
                                  <span>⏰ {s.start_time?.slice(0, 5)}</span>
                                  <span>⏱️ {s.duration_minutes} {lang === 'ar' ? 'د' : 'min'}</span>
                                </div>
                                {s.student_email && <div style={{ fontSize: '.79rem', color: 'var(--accent)', marginTop: 3 }}>✉️ {s.student_email}</div>}
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-start', flexShrink: 0 }}>
                                {joinLink(s) && <a href={joinLink(s)} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">{lang === 'ar' ? 'ابدأ' : 'Start'} 🎥</a>}
                                <button onClick={() => { setAdminCompleteFor(s); setAdminRecordingUrl(''); }}
                                  className="btn btn-outline btn-sm" style={{ color: '#1a7c40', borderColor: '#1a7c40' }}>✅ {lang === 'ar' ? 'أنهِ' : 'Complete'}</button>
                                <button onClick={() => handleAdminCancel(s.id)} disabled={adminCancellingId === s.id}
                                  className="btn btn-outline btn-sm" style={{ color: '#e53e3e', borderColor: '#e53e3e' }}>
                                  {adminCancellingId === s.id ? '...' : (lang === 'ar' ? 'إلغاء' : 'Cancel')}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    )}

                    {/* Calendar */}
                    {adminSessTab === 'calendar' && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => setAdminWeekOffset(w => w - 1)}>{lang === 'ar' ? '← السابق' : '← Prev'}</button>
                          <span style={{ fontWeight: 800, fontSize: '.93rem', color: 'var(--primary)' }}>
                            {adminWeekOffset === 0
                              ? (lang === 'ar' ? 'الأسبوع الحالي' : 'This week')
                              : adminWeekOffset > 0
                                ? (lang === 'ar' ? `+${adminWeekOffset} أسابيع` : `+${adminWeekOffset} week${adminWeekOffset > 1 ? 's' : ''}`)
                                : (lang === 'ar' ? `${adminWeekOffset} أسابيع` : `${adminWeekOffset} week${Math.abs(adminWeekOffset) > 1 ? 's' : ''}`)}
                          </span>
                          <button className="btn btn-outline btn-sm" onClick={() => setAdminWeekOffset(w => w + 1)}>{lang === 'ar' ? 'التالي →' : 'Next →'}</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
                          {calWeekDays.map(dateStr => {
                            const daySess = filtered.filter(s => s.session_date === dateStr && s.status !== 'cancelled');
                            const isToday = dateStr === today;
                            const isPast  = dateStr < today;
                            return (
                              <div key={dateStr} style={{ borderRadius: 10, border: '1.5px solid var(--border)', overflow: 'hidden', minHeight: 80, opacity: isPast ? .7 : 1 }}>
                                <div style={{ padding: '6px 8px', fontSize: '.76rem', fontWeight: 800, textAlign: 'center', background: isToday ? 'var(--primary)' : daySess.length ? '#eef5ff' : '#f8fafc', color: isToday ? '#fff' : daySess.length ? 'var(--primary)' : 'var(--muted)' }}>
                                  <div>{dayName(dateStr)}</div>
                                  <div>{parseInt(dateStr.split('-')[2])}</div>
                                </div>
                                <div style={{ padding: 4 }}>
                                  {daySess.length === 0 ? (
                                    <div style={{ fontSize: '.7rem', color: 'var(--muted)', textAlign: 'center', padding: '8px 4px' }}>—</div>
                                  ) : daySess.map(s => (
                                    <div key={s.id} title={`${s.teacher_name} — ${s.student_name} — ${s.start_time?.slice(0,5)}`}
                                      style={{ padding: '3px 5px', fontSize: '.7rem', background: 'var(--accent)', color: '#fff', borderRadius: 4, margin: '3px 0', fontWeight: 700 }}>
                                      {s.start_time?.slice(0,5)}{s.subject ? ` · ${s.subject.slice(0,6)}` : ''}<br/>
                                      <span style={{ opacity: .85, fontWeight: 400 }}>👤 {s.student_name?.slice(0,8)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Past */}
                    {adminSessTab === 'past' && (() => {
                      const pastFiltered  = pastSearch
                        ? past.filter(s =>
                            s.teacher_name?.includes(pastSearch) ||
                            s.student_name?.includes(pastSearch) ||
                            s.subject?.includes(pastSearch) ||
                            s.session_date?.includes(pastSearch))
                        : past;
                      const attendedCount = pastFiltered.filter(s => s.attended === true).length;
                      const markedCount   = pastFiltered.filter(s => s.attended !== null && s.attended !== undefined).length;
                      return past.length === 0 ? (
                        <div className="empty-state card"><span className="empty-icon">📭</span><p>{lang === 'ar' ? 'لا توجد حصص منتهية' : 'No past sessions'}</p></div>
                      ) : (
                        <>
                          <input
                            className="form-input"
                            style={{ margin: '0 0 14px', width: '100%', boxSizing: 'border-box' }}
                            placeholder={lang === 'ar' ? '🔍 ابحث في الحصص المنتهية (معلم، طالب، مادة، تاريخ)...' : '🔍 Search past sessions...'}
                            value={pastSearch}
                            onChange={e => setPastSearch(e.target.value)}
                          />
                          {markedCount > 0 && (
                            <div style={{ background: '#f0fdf4', border: '1.5px solid #6ee7b7', borderRadius: 12, padding: '10px 16px', marginBottom: 14, display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 800, fontSize: '.88rem', color: '#065f46' }}>📊 إحصائيات الحضور</span>
                              <span style={{ fontSize: '.85rem', color: '#047857' }}>✅ حضر: <strong>{attendedCount}</strong></span>
                              <span style={{ fontSize: '.85rem', color: '#b91c1c' }}>❌ غاب: <strong>{markedCount - attendedCount}</strong></span>
                              <span style={{ fontSize: '.85rem', color: '#64748b' }}>نسبة الحضور: <strong>{Math.round((attendedCount / markedCount) * 100)}%</strong></span>
                            </div>
                          )}
                          {pastFiltered.length === 0 && pastSearch && (
                            <div className="empty-state card"><span className="empty-icon">🔍</span><p>{lang === 'ar' ? 'لا نتائج لهذا البحث' : 'No results found'}</p></div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {pastFiltered.slice(0, 30).map(s => (
                              <div key={s.id} style={{ background: '#fff', borderRadius: 14, border: `1.5px solid ${s.attended === true ? '#6ee7b7' : s.attended === false ? '#fca5a5' : 'var(--border)'}`, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                                <div style={{ fontSize: '1.6rem', paddingTop: 2 }}>{s.attended === true ? '✅' : s.attended === false ? '❌' : '📋'}</div>
                                <div style={{ flex: 1, minWidth: 180 }}>
                                  <div style={{ fontWeight: 800, fontSize: '.95rem', marginBottom: 3 }}>{s.subject || (lang === 'ar' ? 'حصة عامة' : 'General session')}</div>
                                  <div style={{ fontSize: '.83rem', color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                    <span>👨‍🏫 {s.teacher_name}</span>
                                    <span>👤 {s.student_name}</span>
                                    <span>📅 {fmtDate(s.session_date, lang)}</span>
                                    <span>⏰ {s.start_time?.slice(0, 5)}</span>
                                  </div>
                                  {s.notes && <div style={{ marginTop: 6, padding: '6px 10px', background: '#fffbeb', borderRadius: 8, fontSize: '.82rem', color: '#92400e' }}>📝 {s.notes}</div>}
                                  {s.recording_url && (
                                    <div style={{ marginTop: 4 }}>
                                      <a href={s.recording_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '.8rem', color: 'var(--primary)', fontWeight: 600 }}>🎬 {lang === 'ar' ? 'رابط التسجيل' : 'Recording Link'}</a>
                                    </div>
                                  )}
                                </div>
                                {/* Attendance toggle */}
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                                  <button
                                    onClick={async () => {
                                      const next = s.attended === true ? null : true;
                                      await fetch('/api/bogga/sessions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, attended: next }) });
                                      setAdminSessions(prev => prev.map(x => x.id === s.id ? { ...x, attended: next } : x));
                                    }}
                                    style={{ padding: '5px 12px', borderRadius: 20, border: 'none', background: s.attended === true ? '#16a34a' : '#e2e8f0', color: s.attended === true ? '#fff' : '#64748b', fontWeight: 700, fontSize: '.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
                                  >✅ حضر</button>
                                  <button
                                    onClick={async () => {
                                      const next = s.attended === false ? null : false;
                                      await fetch('/api/bogga/sessions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, attended: next }) });
                                      setAdminSessions(prev => prev.map(x => x.id === s.id ? { ...x, attended: next } : x));
                                    }}
                                    style={{ padding: '5px 12px', borderRadius: 20, border: 'none', background: s.attended === false ? '#dc2626' : '#e2e8f0', color: s.attended === false ? '#fff' : '#64748b', fontWeight: 700, fontSize: '.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
                                  >❌ غاب</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}

                    {/* Cancelled */}
                    {adminSessTab === 'cancelled' && (() => {
                      const cancelledFiltered = cancelledSearch
                        ? cancelled.filter(s =>
                            s.teacher_name?.includes(cancelledSearch) ||
                            s.student_name?.includes(cancelledSearch) ||
                            s.subject?.includes(cancelledSearch) ||
                            s.session_date?.includes(cancelledSearch))
                        : cancelled;
                      return cancelled.length === 0 ? (
                        <div className="empty-state card"><span className="empty-icon">📭</span><p>{lang === 'ar' ? 'لا توجد حصص ملغاة' : 'No cancelled sessions'}</p></div>
                      ) : (
                        <>
                          <input
                            className="form-input"
                            style={{ margin: '0 0 14px', width: '100%', boxSizing: 'border-box' }}
                            placeholder={lang === 'ar' ? '🔍 ابحث في الحصص الملغاة (معلم، طالب، مادة، تاريخ)...' : '🔍 Search cancelled sessions...'}
                            value={cancelledSearch}
                            onChange={e => setCancelledSearch(e.target.value)}
                          />
                          {cancelledFiltered.length === 0 && cancelledSearch && (
                            <div className="empty-state card"><span className="empty-icon">🔍</span><p>{lang === 'ar' ? 'لا نتائج لهذا البحث' : 'No results found'}</p></div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {cancelledFiltered.slice(0, 30).map(s => (
                              <div key={s.id} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid var(--border)', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', opacity: .7 }}>
                                <div style={{ fontSize: '1.6rem', paddingTop: 2 }}>❌</div>
                                <div style={{ flex: 1, minWidth: 180 }}>
                                  <div style={{ fontWeight: 800, fontSize: '.95rem', marginBottom: 3 }}>{s.subject || (lang === 'ar' ? 'حصة عامة' : 'General session')}</div>
                                  <div style={{ fontSize: '.83rem', color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                    <span>👨‍🏫 {s.teacher_name}</span>
                                    <span>👤 {s.student_name}</span>
                                    <span>📅 {fmtDate(s.session_date, lang)}</span>
                                    <span>⏰ {s.start_time?.slice(0, 5)}</span>
                                    <span style={{ color: '#e53e3e', fontWeight: 700 }}>{lang === 'ar' ? 'ملغاة' : 'Cancelled'}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            );
}
