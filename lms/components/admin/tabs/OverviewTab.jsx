'use client';
import { TAB_NAMES, TAB_NAMES_EN } from '../shared';

/* هذا المكوّن استُخرج حرفياً من lms/app/bogga/page.jsx (تفكيك الملف الأحادي).
   الحالة والمعالجات بقيت في الصفحة الأم وتصل هنا كـprops — سلوك مطابق 100%. */
export default function OverviewTab({ lang, tr, stats, isSuperAdmin, myPermissions, setTab, recentAssessments }) {
  return (
            <div>
              <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 32 }}>
                {[
                  { icon: '📋', val: stats.assessments, lbl: tr('admin.overview.totalAssessments') },
                  { icon: '✅', val: stats.pass,         lbl: lang === 'ar' ? 'ناجحون (≥70%)' : 'Passed (≥70%)' },
                  { icon: '📊', val: stats.avg + '%',    lbl: lang === 'ar' ? 'متوسط النتائج' : 'Average Score' },
                  ...(isSuperAdmin ? [{ icon: '📄', val: stats.applications, lbl: tr('admin.overview.applications') }] : []),
                ].map(s => (
                  <div key={s.lbl} className="stat-card">
                    <span className="stat-icon">{s.icon}</span>
                    <div><div className="stat-val">{s.val}</div><div className="stat-lbl">{s.lbl}</div></div>
                  </div>
                ))}
              </div>
              <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: 16 }}>
                  {isSuperAdmin
                    ? (lang === 'ar' ? '👑 صلاحيات المدير المطلق' : '👑 Super Admin Permissions')
                    : (lang === 'ar' ? '🛡️ صلاحياتك كمشرف مساعد' : '🛡️ Your Permissions as Assistant Admin')}
                </h3>
                {isSuperAdmin ? (
                  <ul style={{ paddingRight: 20, lineHeight: 2.2 }}>
                    {lang === 'ar' ? (
                      <>
                        <li>✅ تعديل وحذف أي شيء في المنصة</li>
                        <li>✅ إدارة المشرفين المساعدين وضبط صلاحياتهم</li>
                        <li>✅ جدولة مقابلات التوظيف وإرسال دعوات تفاعلية</li>
                        <li>✅ الاطلاع على طلبات التوظيف والسير الذاتية</li>
                        <li>✅ تعديل بنك الكلمات اللغوية</li>
                        <li>✅ توليد أكواد التقييم والدعوة</li>
                      </>
                    ) : (
                      <>
                        <li>✅ Edit and delete anything on the platform</li>
                        <li>✅ Manage assistant admins and their permissions</li>
                        <li>✅ Schedule job interviews and send interactive invitations</li>
                        <li>✅ View job applications and resumes</li>
                        <li>✅ Edit the word bank</li>
                        <li>✅ Generate assessment and invitation codes</li>
                      </>
                    )}
                  </ul>
                ) : (
                  <ul style={{ paddingRight: 20, lineHeight: 2.2 }}>
                    {Object.keys(myPermissions).filter(k => myPermissions[k]).map(k => (
                      <li key={k}>✅ {(lang === 'ar' ? TAB_NAMES : TAB_NAMES_EN)[k] ?? k}</li>
                    ))}
                    {Object.keys(myPermissions).filter(k => myPermissions[k]).length === 0 && (
                      <li style={{ color: 'var(--muted)' }}>{lang === 'ar' ? 'لا توجد صلاحيات مُعيَّنة' : 'No permissions assigned yet'}</li>
                    )}
                  </ul>
                )}
              </div>

              {/* ── آخر التقييمات ── */}
              <div className="card" style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                  <h3 style={{ fontWeight: 700, fontSize: '.95rem', margin: 0 }}>🏆 {lang === 'ar' ? 'آخر التقييمات' : 'Recent Assessments'}</h3>
                  <button onClick={() => setTab('results')} style={{ fontSize: '.82rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: '4px 10px', borderRadius: 7, textDecoration: 'underline' }}>
                    {lang === 'ar' ? '← عرض الكل' : 'View All →'}
                  </button>
                </div>
                {recentAssessments.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: '.88rem', textAlign: 'center', padding: '16px 0', margin: 0 }}>
                    {lang === 'ar' ? 'لا توجد تقييمات بعد' : 'No assessments yet'}
                  </p>
                ) : (
                  <div className="table-scroll" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <th style={{ padding: '6px 10px', textAlign: lang === 'ar' ? 'right' : 'left', color: 'var(--muted)', fontWeight: 600 }}>{lang === 'ar' ? 'الطالب' : 'Student'}</th>
                          <th style={{ padding: '6px 10px', textAlign: 'center', color: 'var(--muted)', fontWeight: 600 }}>{lang === 'ar' ? 'المستوى' : 'Level'}</th>
                          <th style={{ padding: '6px 10px', textAlign: 'center', color: 'var(--muted)', fontWeight: 600 }}>{lang === 'ar' ? 'النتيجة' : 'Score'}</th>
                          <th style={{ padding: '6px 10px', textAlign: 'center', color: 'var(--muted)', fontWeight: 600 }}>{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentAssessments.map((r, i) => (
                          <tr key={r.id ?? i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.student_name ?? '—'}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>{lang === 'ar' ? `المستوى ${r.level}` : `Level ${r.level}`}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: (r.score ?? 0) >= 70 ? '#16a34a' : '#dc2626' }}>{r.score ?? 0}%</td>
                            <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--muted)', fontSize: '.8rem' }}>{r.completed_at ? new Date(r.completed_at).toLocaleDateString(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB') : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
  );
}
