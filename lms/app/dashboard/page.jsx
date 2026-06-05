import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase-server';
import Navbar from '../../components/Navbar';
import ParentPanel from '../../components/ParentPanel';
import FaheemWidget from '../../components/FaheemWidget';

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
  if (role === 'teacher') redirect('/teacher');

  const today = new Date().toISOString().slice(0, 10);
  const { data: sessionsRaw, error: sessionsErr } = await supabase
    .from('sessions')
    .select('id, teacher_name, session_date, start_time, duration_minutes, subject, room_name')
    .eq('student_email', user.email)
    .eq('status', 'scheduled')
    .gte('session_date', today)
    .order('session_date', { ascending: true })
    .order('start_time',   { ascending: true })
    .limit(5);
  const upcomingSessions = sessionsErr ? [] : (sessionsRaw ?? []);

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

  const actions = [
    { icon: '📚', title: 'المكتبة التعليمية',   desc: 'تصفح المناهج والدروس المتاحة لك',                        href: '/library'          },
    { icon: '📖', title: 'بنك الكلمات الذكي',   desc: 'تعلّم الكلمات العربية المشكولة مع الصوت والصورة',       href: '/dashboard/lexicon' },
    { icon: '📈', title: 'تقارير التقدم',        desc: 'شاهد نتيجة تقييمك التشخيصي ومستوى تقدمك',              href: '/dashboard'         },
  ];

  const displayName    = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'طالب';
  const studentGender  = user.user_metadata?.gender === 'female' ? 'female' : 'male';

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

          {/* Upcoming Sessions */}
          {upcomingSessions.length > 0 && (
            <div className="dash-section">
              <div className="dash-section-title">📅 حصصي القادمة</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcomingSessions.map(s => (
                  <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.8rem' }}>🎥</span>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontWeight: 800, fontSize: '.97rem', marginBottom: 3 }}>{s.subject || 'حصة عامة'}</div>
                      <div style={{ fontSize: '.83rem', color: 'var(--muted)', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        <span>👤 {s.teacher_name}</span>
                        <span>📅 {new Date(s.session_date).toLocaleDateString('ar-SA')}</span>
                        <span>⏰ {s.start_time?.slice(0, 5)}</span>
                        <span>⏱️ {s.duration_minutes} دقيقة</span>
                      </div>
                    </div>
                    <a
                      href={`https://meet.jit.si/${s.room_name}`}
                      target="_blank" rel="noopener noreferrer"
                      className="btn btn-primary btn-sm">
                      انضم للحصة 🎥
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {/* Faheem AI companion — students only */}
          {isStudent && <FaheemWidget studentName={displayName} studentGender={studentGender} />}

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
