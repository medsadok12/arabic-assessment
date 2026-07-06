import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '../../lib/supabase-server';
import { createAdminClient } from '../../lib/supabase-admin';
import Navbar from '../../components/Navbar';
import ParentPanel from '../../components/ParentPanel';

// كل طلب يجلب بيانات طازجة — لا كاش أبداً
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const role      = user.user_metadata?.role ?? 'student';
  const isStudent = role === 'student';

  if (role === 'admin') redirect('/admin');

  const adminSupabase = createAdminClient();

  const [{ data: assessments }, { data: rawSessions }, { data: lexiconWords }] = await Promise.all([
    supabase
      .from('assessments')
      .select('id, level, score, completed_at, student_name')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(50),
    supabase
      .from('sessions')
      .select('id, session_date, attended, status')
      .eq('student_email', user.email)
      .neq('status', 'cancelled'),
    adminSupabase
      .from('lexicon_words')
      .select('id, word, word_type, sentence, syllables, topic, has_image, has_audio')
      .order('created_at', { ascending: true }),
  ]);

  // كلمة اليوم — اختيار حتمي بناءً على التاريخ (نفس الكلمة لكل المستخدمين)
  const epochDays  = Math.floor(Date.now() / 86400000);
  const wordOfDay  = lexiconWords?.length
    ? lexiconWords[epochDays % lexiconWords.length]
    : null;

  // حساب الحضور الصحيح
  const todayStr = new Date().toISOString().split('T')[0];
  const countedSessions = (rawSessions ?? []).filter(s =>
    s.attended !== null || s.session_date <= todayStr
  );
  const attendedCount  = countedSessions.filter(s => s.attended === true).length;
  const totalSessions  = countedSessions.length;
  const absentCount    = totalSessions - attendedCount;
  const attendanceRate = totalSessions > 0
    ? Math.round((attendedCount / totalSessions) * 100)
    : null;

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
    { icon: '📚', title: 'المكتبة التعليمية', desc: 'تصفح المناهج والدروس المتاحة لك',                    href: '/library'  },
    { icon: '📈', title: 'تقارير التقدم',      desc: 'شاهد نتيجة تقييمك التشخيصي ومستوى تقدمك', href: '/admin'    },
  ];

  const displayName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'طالب';

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap">
        <div className="container">
          <h1 className="dash-welcome">مرحباً، {displayName} 👋</h1>

          {/* زر لوحة الإدارة — للمعلمين فقط */}
          {role === 'teacher' && (
            <div style={{ marginBottom: 24 }}>
              <Link href="/admin" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
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

          {/* Attendance */}
          {totalSessions > 0 && (
            <div className="dash-section">
              <div className="dash-section-title">نسبة الحضور 📅</div>
              <div className="card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                  {/* النسبة المئوية */}
                  <div style={{ textAlign: 'center', minWidth: 80 }}>
                    <div style={{
                      fontSize: '2.2rem', fontWeight: 800,
                      color: attendanceRate >= 75 ? '#2e7d32' : attendanceRate >= 50 ? '#e65100' : '#c62828',
                    }}>
                      {attendanceRate}%
                    </div>
                    <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: 2 }}>نسبة الحضور</div>
                  </div>

                  {/* شريط التقدم */}
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ background: '#e0e0e0', borderRadius: 8, height: 10, overflow: 'hidden' }}>
                      <div style={{
                        width: `${attendanceRate}%`, height: '100%', borderRadius: 8,
                        background: attendanceRate >= 75 ? '#4caf50' : attendanceRate >= 50 ? '#ff9800' : '#f44336',
                        transition: 'width .4s',
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, gap: 12, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '.82rem', color: '#2e7d32', fontWeight: 600 }}>
                        ✅ حضر: {attendedCount}
                      </span>
                      <span style={{ fontSize: '.82rem', color: '#c62828', fontWeight: 600 }}>
                        ❌ غاب: {absentCount}
                      </span>
                      <span style={{ fontSize: '.82rem', color: 'var(--muted)' }}>
                        إجمالي الحصص المنقضية: {totalSessions}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* كلمة اليوم */}
          {wordOfDay && (
            <div className="dash-section">
              <div className="dash-section-title">✨ كلمة اليوم</div>
              <div className="card" style={{ padding: '24px', display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {wordOfDay.has_image && (
                  <div style={{ flexShrink: 0 }}>
                    <Image
                      src={`/api/word-image/${wordOfDay.id}`}
                      alt={wordOfDay.word}
                      width={120}
                      height={120}
                      style={{ borderRadius: 12, objectFit: 'cover' }}
                    />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>
                    {wordOfDay.word}
                  </div>
                  <div style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: 4 }}>
                    {wordOfDay.word_type}
                    {wordOfDay.topic && ` · ${wordOfDay.topic}`}
                  </div>
                  {wordOfDay.syllables && (
                    <div style={{ marginTop: 8, fontSize: '1rem', color: '#1565c0', fontWeight: 600, letterSpacing: 2 }}>
                      {wordOfDay.syllables}
                    </div>
                  )}
                  {wordOfDay.sentence && (
                    <div style={{
                      marginTop: 12, padding: '10px 14px', background: 'var(--bg)',
                      borderRadius: 8, fontSize: '.95rem', color: 'var(--text)', fontStyle: 'italic',
                    }}>
                      "{wordOfDay.sentence}"
                    </div>
                  )}
                </div>
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
