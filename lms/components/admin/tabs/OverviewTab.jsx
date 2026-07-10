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
            </div>
  );
}
