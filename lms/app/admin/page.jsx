import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase-server';
import Navbar from '../../components/Navbar';
import TeacherCodes from '../../components/TeacherCodes';
import StudentCodes from '../../components/StudentCodes';
import GroupsManager from '../../components/GroupsManager';
import PromoVideoAdmin from '../../components/PromoVideoAdmin';
import AssessmentCodes from '../../components/AssessmentCodes';

export default async function AdminPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: assessments, error } = await supabase
    .from('assessments')
    .select('*')
    .order('completed_at', { ascending: false });

  const { count: totalCount } = await supabase
    .from('assessments')
    .select('id', { count: 'exact', head: true });

  const avgScore = assessments?.length
    ? Math.round(assessments.reduce((s, a) => s + (a.score ?? 0), 0) / assessments.length)
    : 0;

  const passCount = assessments?.filter(a => (a.score ?? 0) >= 70).length ?? 0;

  const stats = [
    { icon: '📋', val: totalCount ?? 0,  lbl: 'إجمالي التقييمات' },
    { icon: '✅', val: passCount,          lbl: 'ناجحون (≥70%)' },
    { icon: '📊', val: avgScore + '%',     lbl: 'متوسط النتائج' },
  ];

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap">
        <div className="container">
          <div className="page-header">
            <h1>لوحة الإدارة ⚙️</h1>
            <p>متابعة نتائج الطلاب وإدارة التقييمات</p>
          </div>

          {/* Stats */}
          <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 32 }}>
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

          {/* Quick Links */}
          <div className="dash-section-title">أدوات الإدارة</div>
          <div style={{ marginBottom: 32, marginTop: 16 }}>
            <a href="/admin/lexicon" className="card" style={{ display: 'inline-flex', alignItems: 'center', gap: 14, padding: '18px 20px', textDecoration: 'none', color: 'inherit', maxWidth: 280 }}>
              <span style={{ fontSize: 32 }}>📚</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>بطاقات المفردات</div>
                <div style={{ fontSize: '.83rem', color: 'var(--muted)', marginTop: 2 }}>إضافة وتعديل كلمات الحفظ</div>
              </div>
            </a>
          </div>

          {/* Teacher Codes */}
          <TeacherCodes />

          {/* Student Codes */}
          <StudentCodes />

          {/* Assessment Codes */}
          <AssessmentCodes />

          {/* Groups Manager */}
          <GroupsManager />

          {/* Promo Video */}
          <PromoVideoAdmin />

          {/* Assessments Table */}
          <div className="dash-section-title">سجل التقييمات</div>
          {assessments && assessments.length > 0 ? (
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 16 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>اسم الطالب</th>
                    <th>نوع المتعلم</th>
                    <th>العمر</th>
                    <th>المستوى</th>
                    <th>النتيجة</th>
                    <th>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((a, i) => (
                    <tr key={a.id}>
                      <td style={{ color: 'var(--muted)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{a.student_name ?? '—'}</td>
                      <td>
                        <span className="badge badge-blue">
                          {a.learner_type === 'native' ? 'ناطق' : a.learner_type === 'non-native' ? 'غير ناطق' : '—'}
                        </span>
                      </td>
                      <td>{a.student_age ?? '—'}</td>
                      <td><span className="badge badge-blue">المستوى {a.level}</span></td>
                      <td>
                        <span className={`badge ${(a.score ?? 0) >= 70 ? 'badge-green' : 'badge-orange'}`}>
                          {a.score ?? 0}%
                        </span>
                      </td>
                      <td style={{ direction: 'ltr', textAlign: 'right', fontSize: '.88rem', color: 'var(--muted)' }}>
                        {a.completed_at ? new Date(a.completed_at).toLocaleDateString('ar-SA') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state card" style={{ marginTop: 16 }}>
              <span className="empty-icon">📊</span>
              <p>لا توجد تقييمات مسجلة بعد</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
