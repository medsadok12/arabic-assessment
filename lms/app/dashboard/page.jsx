import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase-server';
import { createAdminClient } from '../../lib/supabase-admin';
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
  const admin = createAdminClient();
  const { data: sessionsRaw } = await admin
    .from('sessions')
    .select('id, teacher_name, session_date, start_time, duration_minutes, subject, room_name, meet_link')
    .ilike('student_email', user.email)
    .eq('status', 'scheduled')
    .gte('session_date', today)
    .order('session_date', { ascending: true })
    .order('start_time',   { ascending: true })
    .limit(5)
    .then(r => r.error?.code === '42P01' ? { data: [] } : r);
  const upcomingSessions = sessionsRaw ?? [];

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
    { icon: '📈', title: 'تقارير التقدم',        desc: 'شاهد رسوم بيانية لتطورك وسجل حصصك ونتائج تقييماتك',    href: '/dashboard/progress' },
  ];

  const displayName    = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'طالب';
  const studentGender  = user.user_metadata?.gender === 'female' ? 'female' : 'male';

  // حساب الوقت المتبقي للحصة القادمة
  const nextSession = upcomingSessions[0] ?? null;
  let timeLabel = '';
  let joinable  = false;
  if (nextSession) {
    const now       = new Date();
    const sessionDT = new Date(`${nextSession.session_date}T${nextSession.start_time}`);
    const diffMins  = Math.round((sessionDT - now) / 60000);
    joinable = diffMins <= 30;
    if (diffMins <= 0)        timeLabel = '🔴 جارية الآن';
    else if (diffMins < 60)   timeLabel = `تبدأ خلال ${diffMins} دقيقة`;
    else if (diffMins < 1440) timeLabel = `تبدأ خلال ${Math.floor(diffMins / 60)} ساعة`;
    else                      timeLabel = `تبدأ خلال ${Math.floor(diffMins / 1440)} ${Math.floor(diffMins / 1440) === 1 ? 'يوم' : 'أيام'}`;
  }

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

          {/* بطاقة الحصة القادمة — بارزة في الأعلى */}
          {nextSession && (
            <div style={{
              background: joinable
                ? 'linear-gradient(135deg, #1a7c40, #15803d)'
                : 'linear-gradient(135deg, #185FA5, #1d4ed8)',
              borderRadius: 18,
              padding: '22px 26px',
              marginBottom: 28,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              flexWrap: 'wrap',
              boxShadow: '0 6px 24px rgba(24,95,165,.22)',
            }}>
              <div style={{ fontSize: '2.6rem', lineHeight: 1 }}>📅</div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: '.8rem', opacity: .8, marginBottom: 4, fontWeight: 600 }}>
                  حصتك القادمة
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.12rem', marginBottom: 8 }}>
                  {nextSession.subject || 'حصة عامة'}
                </div>
                <div style={{ fontSize: '.85rem', opacity: .9, display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span>👤 {nextSession.teacher_name}</span>
                  <span>📅 {new Date(nextSession.session_date).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  <span>⏰ {nextSession.start_time?.slice(0, 5)}</span>
                  {nextSession.duration_minutes && <span>⏱️ {nextSession.duration_minutes} دقيقة</span>}
                </div>
                <span style={{
                  display: 'inline-block',
                  background: 'rgba(255,255,255,.2)',
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: '.8rem',
                  fontWeight: 700,
                }}>
                  {timeLabel}
                </span>
              </div>
              <a
                href={nextSession.meet_link || `https://meet.jit.si/${nextSession.room_name}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  background: joinable ? '#fff' : 'rgba(255,255,255,.18)',
                  color: joinable ? (joinable ? '#15803d' : '#185FA5') : '#fff',
                  borderRadius: 12,
                  padding: '12px 22px',
                  fontWeight: 800,
                  fontSize: '.92rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  border: joinable ? 'none' : '1.5px solid rgba(255,255,255,.4)',
                  whiteSpace: 'nowrap',
                }}>
                🎥 {joinable ? 'انضم الآن' : 'رابط الحصة'}
              </a>
            </div>
          )}

          {/* الحصص القادمة الأخرى — قائمة مضغوطة */}
          {upcomingSessions.length > 1 && (
            <div className="dash-section" style={{ marginTop: 0, marginBottom: 24 }}>
              <div className="dash-section-title">📋 حصص أخرى قادمة</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcomingSessions.slice(1).map(s => (
                  <div key={s.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{s.subject || 'حصة عامة'}</div>
                      <div style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
                        <span>👤 {s.teacher_name}</span>
                        <span>📅 {new Date(s.session_date).toLocaleDateString('ar-SA')}</span>
                        <span>⏰ {s.start_time?.slice(0, 5)}</span>
                      </div>
                    </div>
                    <a href={s.meet_link || `https://meet.jit.si/${s.room_name}`}
                      target="_blank" rel="noopener noreferrer"
                      className="btn btn-outline btn-sm" style={{ whiteSpace: 'nowrap' }}>
                      🎥 رابط الحصة
                    </a>
                  </div>
                ))}
              </div>
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
