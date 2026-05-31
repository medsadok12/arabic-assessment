'use client';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { Target, FileBarChart, Globe, Smartphone, Lock, Zap, Play, UserPlus, LogIn } from 'lucide-react';

function PromoVideoSection() {
  const videoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/promo.mp4`;
  return (
    <section id="promo-video" style={{ background: '#f8faff', padding: '48px 16px' }}>
      <div style={{ maxWidth: 440, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.55rem', color: 'var(--primary)', marginBottom: 6 }}>
          شاهد المنصة في دقيقتين
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--muted)', marginBottom: 24, fontSize: '.95rem' }}>
          تعرّف على كيفية عمل نظام التقييم الذكي لأكاديمية عارم
        </p>
        <video
          src={videoUrl}
          controls
          playsInline
          style={{
            width: '100%',
            borderRadius: 14,
            display: 'block',
            boxShadow: '0 4px 20px rgba(13,79,161,.10)',
          }}
          onError={e => {
            const sec = document.getElementById('promo-video');
            if (sec) sec.style.display = 'none';
          }}
        />
      </div>
    </section>
  );
}

export default function LandingPage() {
  const features = [
    { icon: Target,        title: 'تقييم تشخيصي ذكي',         desc: 'قياس مستوى الطالب في القراءة والكتابة والاستماع والتحدث عبر 10 تدريبات تشخيصية متنوعة.' },
    { icon: FileBarChart,  title: 'تقارير تفصيلية',             desc: 'تقارير تفصيلية فورية تُرسل تلقائياً لولي الأمر لمتابعة مستوى الطالب وتطوره أولاً بأول.' },
    { icon: Globe,         title: 'للناطقين وغير الناطقين',     desc: 'مناهج مُصمَّمة لفئتين: الناطقون باللغة العربية وغير الناطقين بها.' },
    { icon: Smartphone,    title: 'يعمل على جميع الأجهزة',      desc: 'واجهة متجاوبة تعمل على الحاسوب والجهاز اللوحي والهاتف الذكي.' },
    { icon: Lock,          title: 'آمن وخاص',                   desc: 'بيانات الطلاب محمية بالكامل وسرية تامة، لضمان خصوصية وبيئة تعلم آمنة لكل طالب.' },
    { icon: Zap,           title: 'سريع وسهل الاستخدام',        desc: 'أدِرْ تقييمات متعددة في وقت واحد مع واجهة بسيطة وسهلة.' },
  ];

  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="hero">
        <div className="container">
          <h1>نظام التقييم الذكي<br />لأكاديمية عارم</h1>
          <p>منصتكم التعليمية المتكاملة أونلاين لتقييم وتطوير مهارات الطلاب في اللغة العربية بأساليب ذكية وتفاعلية.</p>
          <div className="hero-btns">
            <Link href="/assessment" className="btn btn-accent btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Play size={18} strokeWidth={2} /> ابدأ التقييم التشخيصي
            </Link>
            <Link href="/auth/register" className="btn btn-outline btn-lg" style={{ borderColor: 'rgba(255,255,255,.6)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <UserPlus size={18} strokeWidth={2} /> إنشاء حساب مجاناً
            </Link>
          </div>
        </div>
      </section>

      {/* Promo Video — hidden automatically if no video uploaded yet */}
      <PromoVideoSection />

      {/* Features */}
      <section className="features">
        <div className="container">
          <h2>لماذا أكاديمية عارم؟</h2>
          <div className="card-grid-3">
            {features.map(f => (
              <div key={f.title} className="feature-card">
                <span className="feature-icon">
                  <f.icon size={36} strokeWidth={1.6} />
                </span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About — مرتبط بـ /#about من الـ Navbar */}
      <section id="about" style={{ background: '#f0f6ff', padding: '72px 0' }}>
        <div className="container">
          <div style={{
            maxWidth: 780, margin: '0 auto', textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.4rem', marginBottom: 16 }}>🌱</div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 8 }}>
              تعرّف على أكاديمية عارم
            </h2>
            <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1a3a5c', marginBottom: 28 }}>
              نبني بذور المستقبل بلغة عربية أصيلة
            </p>
            <div style={{
              background: '#fff', borderRadius: 20,
              padding: '36px 40px', boxShadow: '0 4px 24px rgba(13,79,161,.08)',
              textAlign: 'right', lineHeight: 2, color: '#2d3748', fontSize: '1.02rem',
            }}>
              <p style={{ marginBottom: 20 }}>
                نحن نؤمن بأن كل طفل يحمل في داخله شغفاً للتعلم. في <strong>«أكاديمية عارم»</strong>، لا نكتفي بالتعليم التقليدي، بل نمنح طفلك بيئة تفاعلية وذكية، تُحببه في لغته الأم، وتنمي مهاراته <strong>(الاستماع، التحدث، والكتابة)</strong> بدقة واحترافية.
              </p>
              <p>
                هدفنا أن نكون الشريك الموثوق لك في رحلة طفلك نحو التميز، لنصنع معاً جيلاً يعتز بهويته، ويفكر بوضوح، ويبدع بلغته العربية.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--primary)', padding: '60px 0', textAlign: 'center', color: '#fff' }}>
        <div className="container">
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 14 }}>جاهز للبدء؟</h2>
          <p style={{ opacity: .85, marginBottom: 28 }}>انضم إلى المعلمين الذين يستخدمون عارم لتطوير طلابهم</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/register/teacher" className="btn btn-accent btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <UserPlus size={18} strokeWidth={2} /> تسجيل حساب معلم
            </Link>
            <Link href="/auth/login" className="btn btn-lg" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '2px solid rgba(255,255,255,.5)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <LogIn size={18} strokeWidth={2} /> دخول المعلم
            </Link>
          </div>
        </div>
      </section>

      <footer style={{ background: '#0e3d70', color: 'rgba(255,255,255,.6)', textAlign: 'center', padding: '20px', fontSize: '.88rem' }}>
        © 2026 أكاديمية عارم — جميع الحقوق محفوظة
      </footer>
    </>
  );
}

