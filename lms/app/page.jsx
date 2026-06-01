'use client';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '../components/Navbar';
import FloatingSidebar from '../components/FloatingSidebar';
import { Target, FileBarChart, Globe, Smartphone, Lock, Zap } from 'lucide-react';

const WHATSAPP_HREF = 'https://api.whatsapp.com/send/?phone=447400755914&text&type=phone_number&app_absent=0';

export default function LandingPage() {
  const features = [
    { icon: Target,       title: 'تقييم تشخيصي ذكي',       desc: 'قياس مستوى الطالب في القراءة والكتابة والاستماع والتحدث عبر 10 تدريبات تشخيصية متنوعة.' },
    { icon: FileBarChart, title: 'تقارير تفصيلية',           desc: 'تقارير تفصيلية فورية تُرسل تلقائياً لولي الأمر لمتابعة مستوى الطالب وتطوره أولاً بأول.' },
    { icon: Globe,        title: 'للناطقين وغير الناطقين',   desc: 'مناهج مُصمَّمة لفئتين: الناطقون باللغة العربية وغير الناطقين بها.' },
    { icon: Smartphone,   title: 'يعمل على جميع الأجهزة',    desc: 'واجهة متجاوبة تعمل على الحاسوب والجهاز اللوحي والهاتف الذكي.' },
    { icon: Lock,         title: 'آمن وخاص',                 desc: 'بيانات الطلاب محمية بالكامل وسرية تامة، لضمان خصوصية وبيئة تعلم آمنة لكل طالب.' },
    { icon: Zap,          title: 'سريع وسهل الاستخدام',      desc: 'أدِرْ تقييمات متعددة في وقت واحد مع واجهة بسيطة وسهلة.' },
  ];

  const videoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/promo.mp4`;

  return (
    <>
      <Navbar />
      <FloatingSidebar />

      {/* ── Hero ── */}
      <section className="hero">

        {/* Contact strip — integrated inside hero */}
        <div className="hero-topbar">
          <div className="hero-topbar-inner">
            <span className="hero-topbar-label">📞 للاستفسارات والدعم الفني مباشرة:</span>
            <a href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer" className="hero-topbar-link">
              <span aria-hidden="true">💬</span>
              <span>واتساب مباشرة:</span>
              <bdi dir="ltr">+44 7400 755914</bdi>
            </a>
          </div>
        </div>

        {/* Main content — z-index:2 keeps text above the photo */}
        <div className="hero-main">
          <div className="container">
            <div className="hero-content">
              <h1>نظام التقييم الذكي</h1>
              <p>
                منصتكم التعليمية المتكاملة أونلاين<br />
                لتقييم وتطوير مهارات الطلاب في اللغة العربية بأساليب ذكية وتفاعلية.
              </p>
              <div className="hero-btns">
                <a href="https://arabic-assessment.vercel.app"
                  className="btn btn-accent btn-lg"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  ابدأ التقييم التشخيصي ▷
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Photo — direct child of .hero so bottom:0 is relative to the section,
            z-index:1 sits below the wave (z-index:3) which hides the cut base */}
        <div className="hero-image">
          <Image
            src="/teacher-student-hero.png"
            alt="معلم وطالب يستخدمان التطبيق"
            width={1408}
            height={768}
            priority
            sizes="(max-width: 768px) 92vw, 64vw"
            className="hero-photo"
          />
        </div>

        {/* Wave — z-index:3 paints over the photo's cut lower edge */}
        <svg className="hero-wave" xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0,80 L0,44 C240,80 480,8 720,44 C960,80 1200,8 1440,44 L1440,80 Z" fill="#ffffff" />
        </svg>
      </section>

      {/* ── Features ── */}
      <section className="features">
        <div className="container">
          <h2>لماذا أكاديمية عارم؟</h2>
          <p className="features-subtitle">نظام متكامل يجمع بين الدقة العلمية وسهولة الاستخدام</p>
          <div className="card-grid-3">
            {features.map(f => (
              <div key={f.title} className="feature-card">
                <span className="feature-icon">
                  <f.icon size={32} strokeWidth={1.6} />
                </span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About + Video ── */}
      <section id="about" style={{ background: '#f0f6ff', padding: '80px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: 52, alignItems: 'center', flexWrap: 'wrap' }}>

            {/* Right — text */}
            <div style={{ flex: '1 1 340px', minWidth: 0, textAlign: 'right' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>🌱</div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 8 }}>
                تعرّف على أكاديمية عارم
              </h2>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: '#1a3a5c', marginBottom: 20 }}>
                نبني بذور المستقبل بلغة عربية أصيلة
              </p>
              <div style={{ lineHeight: 2, color: '#2d3748', fontSize: '1rem' }}>
                <p style={{ marginBottom: 16 }}>
                  نحن نؤمن بأن كل طفل يحمل في داخله شغفاً للتعلم. في <strong>«أكاديمية عارم»</strong>، لا نكتفي بالتعليم التقليدي، بل نمنح طفلك بيئة تفاعلية وذكية، تُحببه في لغته الأم، وتنمي مهاراته <strong>(الاستماع، التحدث، والكتابة)</strong> بدقة واحترافية.
                </p>
                <p>
                  هدفنا أن نكون الشريك الموثوق لك في رحلة طفلك نحو التميز، لنصنع معاً جيلاً يعتز بهويته، ويفكر بوضوح، ويبدع بلغته العربية.
                </p>
              </div>
            </div>

            {/* Left — promo video */}
            <div id="promo-video" style={{ flex: '0 1 380px', minWidth: 260 }}>
              <video
                src={videoUrl}
                controls
                playsInline
                style={{ width: '100%', borderRadius: 16, display: 'block', boxShadow: '0 6px 28px rgba(13,79,161,.12)' }}
                onError={() => {
                  const el = document.getElementById('promo-video');
                  if (el) el.style.display = 'none';
                }}
              />
            </div>

          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: 'var(--primary)', padding: '64px 0', textAlign: 'center', color: '#fff' }}>
        <div className="container">
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 12 }}>جاهز للبدء؟</h2>
          <p style={{ opacity: .82, marginBottom: 30, fontSize: '1rem' }}>انضم إلى المعلمين الذين يستخدمون عارم لتطوير طلابهم</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/register/teacher" className="btn btn-accent btn-lg"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              👨‍🏫 تسجيل حساب معلم
            </Link>
            <Link href="/auth/login" className="btn btn-lg"
              style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '2px solid rgba(255,255,255,.5)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              🔑 دخول المعلم
            </Link>
          </div>
        </div>
      </section>

      <footer style={{ background: '#0e3d70', color: 'rgba(255,255,255,.55)', textAlign: 'center', padding: '22px', fontSize: '.88rem' }}>
        © 2026 أكاديمية عارم — جميع الحقوق محفوظة
      </footer>
    </>
  );
}
