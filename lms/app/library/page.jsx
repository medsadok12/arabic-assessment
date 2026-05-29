import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase-server';
import Navbar from '../../components/Navbar';

const RESOURCES = [
  {
    icon: '🔤', title: 'الحروف الهجائية', desc: 'دروس تفاعلية لتعلم الحروف العربية وأشكالها في بداية الكلمة ووسطها وآخرها.',
    tag: 'مستوى 1', link: '#'
  },
  {
    icon: '🔊', title: 'الحركات والتشكيل', desc: 'شرح الفتحة والكسرة والضمة والسكون والتنوين مع أمثلة صوتية.',
    tag: 'مستوى 1', link: '#'
  },
  {
    icon: '📖', title: 'القراءة المقطعية', desc: 'تدريبات تقطيع الكلمات إلى مقاطع صوتية لتعزيز مهارة القراءة.',
    tag: 'مستوى 1', link: '#'
  },
  {
    icon: '✍️', title: 'الكتابة الصحيحة', desc: 'قواعد الكتابة العربية السليمة مع تمارين تفاعلية لتصحيح الأخطاء.',
    tag: 'مستوى 2', link: '#'
  },
  {
    icon: '👂', title: 'الاستماع والفهم', desc: 'نصوص صوتية متدرجة لتطوير مهارة الاستماع والفهم الشفهي.',
    tag: 'مستوى 2', link: '#'
  },
  {
    icon: '💬', title: 'التعبير الشفهي', desc: 'أنشطة محادثة وحوارات نموذجية لتنمية القدرة على التعبير باللغة العربية.',
    tag: 'مستوى 3', link: '#'
  },
  {
    icon: '📝', title: 'النصوص الأدبية', desc: 'قصص ونصوص مختارة مناسبة للمستويات المختلفة.',
    tag: 'مستوى 3', link: '#'
  },
  {
    icon: '🎮', title: 'ألعاب لغوية', desc: 'ألعاب تفاعلية ممتعة لتعزيز المفردات وقواعد اللغة.',
    tag: 'تعزيزي', link: '#'
  },
];

export default async function LibraryPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap">
        <div className="container">
          <div className="page-header">
            <h1>المكتبة التعليمية 📚</h1>
            <p>موارد ودروس تعليمية لدعم رحلة تعلم اللغة العربية</p>
          </div>

          <div className="alert alert-info" style={{ marginBottom: 24 }}>
            قريباً — يجري العمل على إضافة محتوى تفاعلي متكامل لكل مستوى.
          </div>

          <div className="card-grid">
            {RESOURCES.map(r => (
              <div key={r.title} className="lib-card">
                <span className="lib-card-icon">{r.icon}</span>
                <div className="lib-card-title">{r.title}</div>
                <p className="lib-card-desc">{r.desc}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="lib-tag">{r.tag}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '.82rem' }}>قريباً</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
