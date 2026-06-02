import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase-server';
import Navbar from '../../components/Navbar';
import ParentPanel from '../../components/ParentPanel';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: assessments } = await supabase
    .from('assessments')
    .select('id, level, score, completed_at, student_name')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(50);

  const role      = user.user_metadata?.role ?? 'student';
  const isStudent = role === 'student';

  // المدير والسوبر أدمن لا يحتاجان لوحة الطالب — أعد توجيههم فوراً
  if (role === 'admin' || role === 'super_admin') redirect('/bogga');

  const avgScore = assessments?.length
    ? Math.round(assessments.reduce((s, a) => s + (a.score ?? 0), 0) / assessments.length)
    : null;

  const stats = isStudent
    ? [
        { icon: '📊', val: assessments?.length ?? 0, lbl: 'عدد تقييماتي' },
        { icon: '✅', val: assessments?.length ? 'مكتمل' : '—', lbl: 'حالة التقييم' },
      ]
    : [
        { icon: '📊', val: assessments?.length ?? 0,          lbl: 'عدد تقييماتي' },
        { icon: '⭐', val: avgScore != null ? avgScore + '%' : '—', lbl: 'متوسط نتائجي' },
        { icon: '🏅', val: assessments?.[0]?.level ? `المستوى ${assessments[0].level}` : '—', lbl: 'آخر مستوى' },
      ];

  const grade = user.user_metadata?.grade ?? null;
  const lexiconHref = grade ? `/dashboard/lexicon?grade=${grade}` : '/dashboard/lexicon';

  const actions = [
    { icon: '📚', title: 'المكتبة التعليمية',   desc: 'تصفح المناهج والدروس المتاحة لك',                        href: '/library'   },
    { icon: '📖', title: 'بنك الكلمات الذكي',   desc: 'تعلّم الكلمات العربية المشكولة مع الصوت والصورة',       href: lexiconHref  },
    { icon: '📈', title: 'تقارير التقدم',        desc: 'شاهد نتيجة تقييمك التشخيصي ومستوى تقدمك',              href: '/dashboard' },
  ];

  const displayName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'طالب';

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap">
        <div className="container">
          <h1 className="dash-welcome">مرحباً، {displayName} 👋</h1>

          {/* زر لوحة الإدارة — للسوبر أدمن فقط */}
          {role === 'super_admin' && (
            <div style={{ marginBottom: 24 }}>
              <Link href="/bogga" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                ⚙️ الانتقال للوحة الإدارة
              </Link>
            </div>
          )}

          {/* Stats */}
          <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {stats.map(s => (
              <div key={s.lbl} className="stat-card">
                <span className="stat-icon">{s.icon}</span>
                <div>
                  <div className="stat-val">{s.val}</div>
                  <div className="stat-lbl">{s.lbl}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="dash-section">
            <div className="dash-section-title">إجراءات سريعة</div>
            <div className="card-grid">
              {actions.map(a => (
                <Link key={a.href} href={a.href} className="dash-action-card">
                  <span className="dash-action-icon">{a.icon}</span>
                  <div className="dash-action-title">{a.title}</div>
                  <div className="dash-action-desc">{a.desc}</div>
                </Link>
              ))}
            </div>
          </div>

          {/* Parent Panel — teachers/admins only */}
          {!isStudent && <ParentPanel assessments={assessments ?? []} />}

          {/* Recent Assessments */}
          <div className="dash-section">
            <div className="dash-section-title">آخر تقييماتي</div>
            {assessments && assessments.length > 0 ? (
              isStudent ? (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>المستوى</th>
                        <th>الحالة</th>
                        <th>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessments.slice(0, 5).map(a => (
                        <tr key={a.id}>
                          <td><span className="badge badge-blue">المستوى {a.level}</span></td>
                          <td><span className="badge badge-green">تم الإرسال ✓</span></td>
                          <td style={{ direction: 'ltr', textAlign: 'right' }}>
                            {a.completed_at ? new Date(a.completed_at).toLocaleDateString('ar-SA') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>المستوى</th>
                        <th>النتيجة</th>
                        <th>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assessments.slice(0, 5).map(a => (
                        <tr key={a.id}>
                          <td><span className="badge badge-blue">المستوى {a.level}</span></td>
                          <td>
                            <span className={`badge ${(a.score ?? 0) >= 70 ? 'badge-green' : 'badge-orange'}`}>
                              {a.score ?? 0}%
                            </span>
                          </td>
                          <td style={{ direction: 'ltr', textAlign: 'right' }}>
                            {a.completed_at ? new Date(a.completed_at).toLocaleDateString('ar-SA') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="empty-state card">
                <span className="empty-icon">📋</span>
                <p>لا توجد تقييمات بعد</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
