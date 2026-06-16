import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../lib/supabase-server';
import Navbar from '../../components/Navbar';

const RESOURCES = [
  {
    icon: '🔤', title: 'الحروف الهجائية',
    desc: 'دروس تفاعلية لتعلم الحروف العربية وأشكالها في بداية الكلمة ووسطها وآخرها.',
    tag: 'مستوى 1', link: '/library/huroof', ready: true,
  },
  {
    icon: '🔊', title: 'الحركات والتشكيل',
    desc: 'شرح الفتحة والكسرة والضمة والسكون والتنوين مع أمثلة صوتية.',
    tag: 'مستوى 1', link: '#', ready: false,
  },
  {
    icon: '📖', title: 'القراءة المقطعية',
    desc: 'تدريبات تقطيع الكلمات إلى مقاطع صوتية لتعزيز مهارة القراءة.',
    tag: 'مستوى 1', link: '#', ready: false,
  },
  {
    icon: '✍️', title: 'الكتابة الصحيحة',
    desc: 'قواعد الكتابة العربية السليمة مع تمارين تفاعلية لتصحيح الأخطاء.',
    tag: 'مستوى 2', link: '#', ready: false,
  },
  {
    icon: '👂', title: 'الاستماع والفهم',
    desc: 'نصوص صوتية متدرجة لتطوير مهارة الاستماع والفهم الشفهي.',
    tag: 'مستوى 2', link: '#', ready: false,
  },
  {
    icon: '💬', title: 'التعبير الشفهي',
    desc: 'أنشطة محادثة وحوارات نموذجية لتنمية القدرة على التعبير باللغة العربية.',
    tag: 'مستوى 3', link: '#', ready: false,
  },
  {
    icon: '📝', title: 'النصوص الأدبية',
    desc: 'قصص ونصوص مختارة مناسبة للمستويات المختلفة.',
    tag: 'مستوى 3', link: '#', ready: false,
  },
  {
    icon: '🎮', title: 'صيّاد الحروف',
    desc: 'العب واعثر على الحرف الناقص في كل كلمة — لعبة ممتعة لتعزيز التعرف على الحروف.',
    tag: 'تعزيزي', link: '/library/games/letter-catcher', ready: true,
  },
  {
    icon: '🔀', title: 'رتّب الكلمة',
    desc: 'حروف مبعثرة — رتّبها لتكوّن الكلمة الصحيحة! لعبة تقوّي التهجئة والمفردات.',
    tag: 'تعزيزي', link: '/library/games/word-scramble', ready: true,
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

          <style>{`
            .lib-card-ready { transition: box-shadow .18s, transform .18s; border: 2px solid #185FA520 !important; }
            .lib-card-ready:hover { box-shadow: 0 6px 24px rgba(24,95,165,.2) !important; transform: translateY(-2px); }
          `}</style>

          <div className="card-grid">
            {RESOURCES.map(r => (
              r.ready ? (
                <Link key={r.title} href={r.link} style={{ textDecoration: 'none' }}>
                  <div className="lib-card lib-card-ready" style={{ cursor: 'pointer' }}>
                    <span className="lib-card-icon">{r.icon}</span>
                    <div className="lib-card-title">{r.title}</div>
                    <p className="lib-card-desc">{r.desc}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="lib-tag" style={{ background: '#185FA5', color: '#fff' }}>{r.tag}</span>
                      <span style={{ color: '#185FA5', fontSize: '.82rem', fontWeight: 700 }}>ابدأ ←</span>
                    </div>
                  </div>
                </Link>
              ) : (
                <div key={r.title} className="lib-card" style={{ opacity: .75 }}>
                  <span className="lib-card-icon">{r.icon}</span>
                  <div className="lib-card-title">{r.title}</div>
                  <p className="lib-card-desc">{r.desc}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="lib-tag">{r.tag}</span>
                    <span style={{ color: 'var(--muted)', fontSize: '.82rem' }}>قريباً</span>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
