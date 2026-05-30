'use client';
import Link from 'next/link';

export default function LandingPage() {
  const features = [
    { icon: '🎯', title: 'تقييم تشخيصي ذكي', desc: 'قياس مستوى الطالب في القراءة والكتابة والاستماع والتحدث عبر 10 تدريبات تشخيصية متنوعة.', href: '/auth/register' },
    { icon: '📊', title: 'تقارير تفصيلية', desc: 'تقارير PDF فورية لكل طالب تُرسل تلقائياً إلى ولي الأمر أو المعلم عبر البريد الإلكتروني.' },
    { icon: '🌍', title: 'للناطقين وغير الناطقين', desc: 'مناهج مُصمَّمة لفئتين: الناطقون باللغة العربية وغير الناطقين بها.' },
    { icon: '📱', title: 'يعمل على جميع الأجهزة', desc: 'واجهة متجاوبة تعمل على الحاسوب والجهاز اللوحي والهاتف الذكي.' },
    { icon: '🔒', title: 'آمن وخاص', desc: 'بيانات الطلاب محمية بالكامل. كل معلم يرى طلابه فقط.' },
    { icon: '⚡', title: 'سريع وسهل الاستخدام', desc: 'أدِرْ تقييمات متعددة في وقت واحد مع واجهة بسيطة وسهلة.' },
  ];

  return (
    <>
      {/* Header */}
      <nav className="navbar">
        <div className="container navbar-inner">
          <Link href="/" className="navbar-brand">
            <span>📚</span> أكاديمية عارم
          </Link>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/auth/login"    className="btn btn-outline btn-sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.5)' }}>دخول</Link>
            <Link href="/auth/register" className="btn btn-accent btn-sm">تسجيل</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="container">
          <h1>نظام التقييم الذكي<br />لأكاديمية عارم 🌟</h1>
          <p>منصة متكاملة لتشخيص مستوى الطلاب في اللغة العربية وتتبع تقدمهم الدراسي</p>
          <div className="hero-btns">
            <Link href="/assessment" className="btn btn-accent btn-lg">🎯 ابدأ التقييم التشخيصي</Link>
            <Link href="/auth/register" className="btn btn-outline btn-lg" style={{ borderColor: 'rgba(255,255,255,.6)', color: '#fff' }}>إنشاء حساب مجاناً ←</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="container">
          <h2>لماذا أكاديمية عارم؟</h2>
          <div className="card-grid">
            {features.map(f => (
              <div key={f.title} className="feature-card">
                <span className="feature-icon">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--primary)', padding: '60px 0', textAlign: 'center', color: '#fff' }}>
        <div className="container">
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 14 }}>جاهز للبدء؟</h2>
          <p style={{ opacity: .85, marginBottom: 28 }}>انضم إلى المعلمين الذين يستخدمون عارم لتطوير طلابهم</p>
          <Link href="/auth/register" className="btn btn-accent btn-lg">إنشاء حساب مجاناً ←</Link>
          <div style={{ marginTop: 20 }}>
            <Link href="/auth/login" style={{ color: 'rgba(255,255,255,.65)', fontSize: '.92rem', textDecoration: 'underline', textUnderlineOffset: 3 }}>
              لديك حساب بالفعل؟ دخول المعلمين ←
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
