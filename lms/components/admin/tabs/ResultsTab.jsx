'use client';

/* هذا المكوّن استُخرج حرفياً من lms/app/bogga/page.jsx (تفكيك الملف الأحادي).
   الحالة والمعالجات بقيت في الصفحة الأم وتصل هنا كـprops — سلوك مطابق 100%. */
export default function ResultsTab({
  lang, tr,
  results, resultsTotal, resultsPage, resultsLoading, resultsStats,
  resultsSearch, setResultsSearch,
  resultsLevel, setResultsLevel,
  resultsMin, setResultsMin,
  resultsMax, setResultsMax,
  loadResults, exportCsv, resultsExporting,
  sheetsUrl,
}) {
  return (
            <div>
              {/* Stats */}
              <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', marginBottom: 24 }}>
                {[
                  { icon: '📋', val: resultsStats.total,          lbl: tr('admin.overview.totalAssessments') },
                  { icon: '✅', val: resultsStats.passed,         lbl: lang === 'ar' ? 'ناجحون (≥70%)' : 'Passed (≥70%)' },
                  { icon: '📊', val: (resultsStats.avg ?? 0) + '%', lbl: lang === 'ar' ? 'متوسط النتائج' : 'Average Score' },
                  { icon: '❌', val: (resultsStats.total ?? 0) - (resultsStats.passed ?? 0), lbl: lang === 'ar' ? 'دون 70%' : 'Below 70%' },
                ].map(s => (
                  <div key={s.lbl} className="stat-card">
                    <span className="stat-icon">{s.icon}</span>
                    <div><div className="stat-val">{s.val}</div><div className="stat-lbl">{s.lbl}</div></div>
                  </div>
                ))}
              </div>

              {/* Chart — score distribution */}
              {resultsStats.total > 0 && (() => {
                const dist  = resultsStats.scoreDist ?? {};
                const maxV  = Math.max(...Object.values(dist), 1);
                const bars  = [
                  { label: '0–29%',   key: '0-29',   color: '#dc2626' },
                  { label: '30–49%',  key: '30-49',  color: '#ea580c' },
                  { label: '50–69%',  key: '50-69',  color: '#ca8a04' },
                  { label: '70–89%',  key: '70-89',  color: '#16a34a' },
                  { label: '90–100%', key: '90-100', color: '#15803d' },
                ];
                return (
                  <div className="card" style={{ marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: 14, color: 'var(--primary)' }}>
                      📊 {lang === 'ar' ? 'توزيع الدرجات' : 'Score Distribution'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {bars.map(b => {
                        const val = dist[b.key] ?? 0;
                        const pct = Math.round((val / maxV) * 100);
                        return (
                          <div key={b.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 60, fontSize: '.78rem', color: 'var(--muted)', flexShrink: 0, textAlign: 'left' }}>{b.label}</span>
                            <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 6, height: 20, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, background: b.color, height: '100%', borderRadius: 6, transition: 'width .4s', minWidth: val > 0 ? 4 : 0 }} />
                            </div>
                            <span style={{ width: 28, fontSize: '.82rem', fontWeight: 700, color: b.color, flexShrink: 0 }}>{val}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Filters */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 200px' }}>
                    <label style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>🔍 {lang === 'ar' ? 'بحث بالاسم' : 'Search by name'}</label>
                    <input
                      className="form-input" style={{ margin: 0 }}
                      placeholder={lang === 'ar' ? 'اسم الطالب...' : 'Student name...'}
                      value={resultsSearch}
                      onChange={e => setResultsSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && loadResults(1, resultsSearch, resultsLevel, resultsMin, resultsMax)}
                    />
                  </div>
                  <div style={{ flex: '0 1 130px' }}>
                    <label style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{lang === 'ar' ? 'المستوى' : 'Level'}</label>
                    <select className="form-input" style={{ margin: 0 }} value={resultsLevel} onChange={e => setResultsLevel(e.target.value)}>
                      <option value="">{lang === 'ar' ? 'كل المستويات' : 'All levels'}</option>
                      {[1,2,3,4,5,6,7].map(l => <option key={l} value={l}>{lang === 'ar' ? `المستوى ${l}` : `Level ${l}`}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: '0 1 110px' }}>
                    <label style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{lang === 'ar' ? 'الدرجة من' : 'Min score'}</label>
                    <input className="form-input" style={{ margin: 0 }} type="number" min="0" max="100" placeholder="0" value={resultsMin} onChange={e => setResultsMin(e.target.value)} />
                  </div>
                  <div style={{ flex: '0 1 110px' }}>
                    <label style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>{lang === 'ar' ? 'الدرجة إلى' : 'Max score'}</label>
                    <input className="form-input" style={{ margin: 0 }} type="number" min="0" max="100" placeholder="100" value={resultsMax} onChange={e => setResultsMax(e.target.value)} />
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => loadResults(1, resultsSearch, resultsLevel, resultsMin, resultsMax)}
                    disabled={resultsLoading}
                  >
                    {resultsLoading ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : `🔍 ${lang === 'ar' ? 'بحث' : 'Search'}`}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setResultsSearch(''); setResultsLevel(''); setResultsMin(''); setResultsMax('');
                      loadResults(1, '', '', '', '');
                    }}
                  >
                    {lang === 'ar' ? 'مسح' : 'Clear'}
                  </button>
                  <button className="btn btn-sm" style={{ background: '#166534', color: '#fff' }}
                    onClick={exportCsv} disabled={resultsExporting}>
                    {resultsExporting ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : `⬇ ${lang === 'ar' ? 'تصدير CSV' : 'Export CSV'}`}
                  </button>
                  {sheetsUrl && (
                    <a href={sheetsUrl} target="_blank" rel="noopener noreferrer"
                      className="btn btn-sm"
                      style={{ background: '#1a7c40', color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                      {lang === 'ar' ? 'فتح Google Sheet' : 'Open Google Sheet'}
                    </a>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-scroll-wrapper">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.9rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
                        {['#', lang === 'ar' ? 'اسم الطالب' : 'Student', lang === 'ar' ? 'المستوى' : 'Level', lang === 'ar' ? 'الدرجة' : 'Score', lang === 'ar' ? 'الحالة' : 'Status', lang === 'ar' ? 'التاريخ' : 'Date', lang === 'ar' ? 'حالة الطالب' : 'Registration'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--muted)', fontSize: '.82rem' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resultsLoading ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}><span className="spinner" /></td></tr>
                      ) : results.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>{tr('admin.results.noResults')}</td></tr>
                      ) : results.map((r, i) => {
                        const passed = (r.score ?? 0) >= 70;
                        const rowNum = (resultsPage - 1) * 50 + i + 1;
                        return (
                          <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background .1s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                            <td style={{ padding: '11px 16px', color: 'var(--muted)', fontSize: '.82rem' }}>{rowNum}</td>
                            <td style={{ padding: '11px 16px', fontWeight: 600 }}>
                              <div>{r.student_name ?? '—'}</div>
                              <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: 2, direction: r.student_email ? 'ltr' : 'rtl' }}>{r.student_email || 'لم يحفظ الايميل'}</div>
                            </td>
                            <td style={{ padding: '11px 16px' }}>
                              <span style={{ background: 'var(--primary-lt)', color: 'var(--primary)', borderRadius: 6, padding: '2px 10px', fontSize: '.82rem', fontWeight: 700 }}>
                                {lang === 'ar' ? 'المستوى' : 'Level'} {r.level ?? '—'}
                              </span>
                            </td>
                            <td style={{ padding: '11px 16px', fontWeight: 800, fontSize: '1rem', color: passed ? '#1a7c40' : '#b91c1c' }}>
                              {r.score ?? 0}%
                            </td>
                            <td style={{ padding: '11px 16px' }}>
                              <span style={{
                                borderRadius: 6, padding: '3px 10px', fontSize: '.8rem', fontWeight: 700,
                                background: passed ? '#dcfce7' : '#fee2e2',
                                color:      passed ? '#15803d' : '#b91c1c',
                              }}>
                                {passed ? (lang === 'ar' ? '✅ ناجح' : '✅ Passed') : (lang === 'ar' ? '❌ دون المعدل' : '❌ Below average')}
                              </span>
                            </td>
                            <td style={{ padding: '11px 16px', color: 'var(--muted)', fontSize: '.85rem' }}>
                              {r.completed_at ? new Date(r.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td style={{ padding: '11px 16px' }}>
                              {r.user_id ? (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  borderRadius: 20, padding: '4px 12px', fontSize: '.8rem', fontWeight: 700,
                                  background: '#dcfce7', color: '#15803d',
                                }}>
                                  ✅ {lang === 'ar' ? 'مسجّل' : 'Registered'}
                                </span>
                              ) : (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  borderRadius: 20, padding: '4px 12px', fontSize: '.8rem', fontWeight: 700,
                                  background: '#fef3c7', color: '#92400e',
                                }}>
                                  ⏳ {lang === 'ar' ? 'لم يسجّل' : 'Not Registered'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {resultsTotal > 50 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid var(--border)', fontSize: '.85rem' }}>
                    <span style={{ color: 'var(--muted)' }}>
                      {lang === 'ar'
                        ? `عرض ${(resultsPage - 1) * 50 + 1}–${Math.min(resultsPage * 50, resultsTotal)} من ${resultsTotal}`
                        : `Showing ${(resultsPage - 1) * 50 + 1}–${Math.min(resultsPage * 50, resultsTotal)} of ${resultsTotal}`}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" disabled={resultsPage === 1}
                        onClick={() => loadResults(resultsPage - 1, resultsSearch, resultsLevel, resultsMin, resultsMax)}>
                        {lang === 'ar' ? '← السابق' : '← Previous'}
                      </button>
                      <button className="btn btn-ghost btn-sm" disabled={resultsPage * 50 >= resultsTotal}
                        onClick={() => loadResults(resultsPage + 1, resultsSearch, resultsLevel, resultsMin, resultsMax)}>
                        {lang === 'ar' ? 'التالي →' : 'Next →'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
  );
}
