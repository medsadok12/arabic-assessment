'use client';
import Link from 'next/link';
import Image from 'next/image';
import PricingSection from '../../../components/PricingSection';
import SmartFAQ from '../../../components/SmartFAQ';
import TeamShowcase from '../../../components/TeamShowcase';

/* ── توكنات اللوح الخماسية الرسمية (CLAUDE.md §2.1) ── */
const PRIMARY  = '#1A2B4A';
const GOLD     = '#E8B84B';
const PURPLE   = '#7C5CD9';
const CREAM    = '#F4EFE6';
const CREAM_LT = '#FAF7F2';
const CREAM_DK = '#EDE5D8';
const GREEN    = '#2ABB7A';

const WA = 'https://api.whatsapp.com/send/?phone=447400755914&text&type=phone_number&app_absent=0';

const FEATURES = [
  { icon: '🎯', title: 'تقييم تشخيصي ذكي',     desc: 'قياس مستوى الطالب في القراءة والكتابة والاستماع والتحدث عبر 10 تدريبات تشخيصية متنوعة.' },
  { icon: '📊', title: 'تقارير تفصيلية',         desc: 'تقارير تفصيلية فورية تُرسل تلقائياً لولي الأمر لمتابعة مستوى الطالب وتطوره أولاً بأول.' },
  { icon: '🌍', title: 'للناطقين وغير الناطقين', desc: 'مناهج مُصمَّمة لفئتين: الناطقون باللغة العربية وغير الناطقين بها.' },
  { icon: '📱', title: 'يعمل على جميع الأجهزة',  desc: 'واجهة متجاوبة تعمل على الحاسوب والجهاز اللوحي والهاتف الذكي.' },
  { icon: '🔒', title: 'آمن وخاص',               desc: 'بيانات الطلاب محمية بالكامل وسرية تامة، لضمان خصوصية وبيئة تعلم آمنة لكل طالب.' },
  { icon: '⚡', title: 'سريع وسهل الاستخدام',    desc: 'أدِرْ تقييمات متعددة في وقت واحد مع واجهة بسيطة وسهلة.' },
];

const CSS = `
/* ── معاينة: إعادة تعيين اللوح اللوني فقط لهذه الصفحة ── */
.rd-page {
  background: ${CREAM};
  min-height: 100vh;
  direction: rtl;
  font-family: var(--font-cairo, var(--font-tajawal, sans-serif));
}

/* شريط المعاينة */
.rd-banner {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 9999;
  background: linear-gradient(90deg, #f59e0b, #d97706);
  color: #fff;
  text-align: center;
  padding: 9px 16px;
  font-size: .82rem;
  font-weight: 700;
  direction: rtl;
  letter-spacing: .3px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.rd-banner a {
  color: #fff;
  text-decoration: underline;
  font-weight: 800;
}

/* شريط التنقل */
.rd-nav {
  position: sticky;
  top: 38px;
  left: 0; right: 0;
  z-index: 900;
  background: ${PRIMARY};
  box-shadow: 0 2px 12px rgba(0,0,0,.25);
}
.rd-nav-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  gap: 12px;
}
.rd-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
}
.rd-brand-logo {
  width: 42px; height: 42px;
  background: ${GOLD};
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.35rem;
  font-weight: 900;
  color: ${PRIMARY};
}
.rd-brand-name {
  color: #fff;
  font-weight: 800;
  font-size: 1.05rem;
}
.rd-nav-cta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: ${GOLD};
  color: ${PRIMARY};
  font-weight: 800;
  font-size: .88rem;
  padding: 9px 20px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-family: inherit;
  min-height: 44px;
  text-decoration: none;
  transition: filter .2s, transform .15s;
  white-space: nowrap;
}
.rd-nav-cta:hover { filter: brightness(1.08); transform: translateY(-1px); }

.rd-nav-links {
  display: flex;
  align-items: center;
  gap: 6px;
  list-style: none;
  padding: 0; margin: 0;
}
.rd-nav-links a {
  color: rgba(255,255,255,.85);
  text-decoration: none;
  padding: 7px 16px;
  border-radius: 50px;
  font-size: .88rem;
  font-weight: 700;
  border: 1.5px solid rgba(255,255,255,.22);
  background: rgba(255,255,255,.08);
  transition: all .2s;
  white-space: nowrap;
}
.rd-nav-links a:hover {
  background: rgba(255,255,255,.2);
  color: #fff;
  transform: translateY(-1px);
}

/* شريط التواصل */
.rd-topbar {
  background: rgba(0,0,0,.22);
  border-bottom: 1px solid rgba(255,255,255,.12);
  padding: 9px 16px;
  font-size: .82rem;
  color: rgba(255,255,255,.8);
  text-align: center;
}
.rd-topbar-inner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px 10px;
}
.rd-wa-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${GOLD};
  text-decoration: none;
  font-weight: 700;
  white-space: nowrap;
  transition: color .15s;
}
.rd-wa-link:hover { color: #ffd580; text-decoration: underline; }
.rd-wa-link bdi { direction: ltr; unicode-bidi: isolate; }

/* Hero */
.rd-hero {
  background: linear-gradient(135deg, ${PRIMARY} 0%, #0d1f38 100%);
  color: #fff;
  overflow: hidden;
  position: relative;
}
.rd-hero-main {
  padding: 72px 0 120px;
  position: relative;
  z-index: 2;
}
.rd-hero-content {
  max-width: 540px;
  margin-left: auto;
  text-align: right;
}
.rd-hero h1 {
  font-size: 2.7rem;
  font-weight: 800;
  line-height: 1.28;
  margin-bottom: 18px;
  letter-spacing: -.01em;
}
.rd-hero p {
  font-size: 1.05rem;
  opacity: .88;
  margin: 0 0 34px;
  line-height: 1.75;
}
.rd-hero-btns {
  display: flex;
  gap: 14px;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.rd-cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: ${GOLD};
  color: ${PRIMARY};
  font-weight: 800;
  font-size: 1.05rem;
  padding: 14px 32px;
  border-radius: 12px;
  text-decoration: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: filter .2s, transform .15s, box-shadow .2s;
  box-shadow: 0 4px 18px rgba(232,184,75,.45);
}
.rd-cta-btn:hover {
  filter: brightness(1.07);
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(232,184,75,.55);
}
.rd-hero-image {
  position: absolute;
  left: 0; bottom: 0;
  width: min(48vw, 800px);
  z-index: 1;
  pointer-events: none;
}
.rd-hero-photo {
  display: block;
  width: 100%;
  height: auto;
  filter: drop-shadow(0 14px 30px rgba(0,0,0,.22));
}
.rd-hero-wave {
  display: block;
  width: 100%;
  margin-top: -2px;
  line-height: 0;
  position: relative;
  z-index: 3;
}

/* قسم المميزات */
.rd-features {
  padding: 80px 0;
  background: ${CREAM_LT};
}
.rd-features h2 {
  text-align: center;
  font-size: 1.9rem;
  font-weight: 800;
  color: ${PRIMARY};
  margin-bottom: 12px;
}
.rd-features-sub {
  text-align: center;
  color: #64748b;
  font-size: .97rem;
  margin-bottom: 48px;
}
.rd-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
@media (max-width: 900px) { .rd-cards-grid { grid-template-columns: repeat(2,1fr); } }
@media (max-width: 580px) { .rd-cards-grid { grid-template-columns: 1fr; } }

.rd-feat-card {
  background: #fff;
  border-radius: 20px;
  padding: 36px 24px 28px;
  box-shadow: 0 1px 4px rgba(26,43,74,.06), 0 4px 20px rgba(26,43,74,.08);
  text-align: center;
  border: 1.5px solid rgba(26,43,74,.08);
  transition: transform .28s, box-shadow .28s, background .28s, border-color .28s;
}
.rd-feat-card:hover {
  transform: translateY(-7px);
  box-shadow: 0 12px 40px rgba(26,43,74,.22);
  background: linear-gradient(145deg, ${PRIMARY} 0%, #253d6a 100%);
  border-color: transparent;
}
.rd-feat-icon {
  width: 72px; height: 72px;
  border-radius: 22px;
  background: linear-gradient(135deg, ${CREAM_DK}, ${CREAM});
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 20px;
  font-size: 1.8rem;
  transition: background .28s, transform .28s;
}
.rd-feat-card:hover .rd-feat-icon {
  background: rgba(255,255,255,.18);
  transform: scale(1.1) rotate(-5deg);
}
.rd-feat-card h3 {
  font-size: 1.08rem;
  font-weight: 700;
  color: ${PRIMARY};
  margin-bottom: 10px;
  transition: color .28s;
}
.rd-feat-card p {
  font-size: .88rem;
  color: #64748b;
  line-height: 1.75;
  transition: color .28s;
}
.rd-feat-card:hover h3 { color: ${GOLD}; }
.rd-feat-card:hover p  { color: rgba(255,255,255,.82); }

/* قسم من نحن + الفيديو */
.rd-about {
  background: ${CREAM_DK};
  padding: 80px 0;
}
.rd-about-inner {
  display: flex;
  gap: 52px;
  align-items: center;
  flex-wrap: wrap;
}
.rd-about-text {
  flex: 1 1 340px;
  min-width: 0;
  text-align: right;
}
.rd-about-text h2 {
  font-size: 1.75rem;
  font-weight: 800;
  color: ${PRIMARY};
  margin-bottom: 8px;
}
.rd-about-text .motto {
  font-size: 1rem;
  font-weight: 700;
  color: ${PRIMARY};
  opacity: .75;
  margin-bottom: 20px;
}
.rd-about-text p {
  line-height: 2;
  color: #2d3748;
  font-size: 1rem;
  margin-bottom: 16px;
}
.rd-about-video {
  flex: 0 1 380px;
  min-width: 260px;
}
.rd-about-video video {
  width: 100%;
  border-radius: 16px;
  display: block;
  box-shadow: 0 6px 28px rgba(26,43,74,.15);
}

/* قسم CTA */
.rd-cta-section {
  background: ${PRIMARY};
  padding: 72px 0;
  text-align: center;
  color: #fff;
}
.rd-cta-section h2 {
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 12px;
}
.rd-cta-section p {
  opacity: .8;
  font-size: 1rem;
  margin-bottom: 32px;
}
.rd-cta-section .rd-cta-btn {
  font-size: 1.05rem;
  padding: 14px 36px;
}

/* فوتر */
.rd-footer {
  background: #0d1f38;
  color: rgba(255,255,255,.55);
  text-align: center;
  padding: 24px 20px;
  font-size: .88rem;
}
.rd-footer a {
  color: rgba(255,255,255,.65);
  text-decoration: none;
  margin: 0 6px;
  transition: color .2s;
}
.rd-footer a:hover { color: ${GOLD}; }

/* container مُعاد تعريفه لهذه الصفحة */
.rd-container {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 20px;
}

/* تمييز بصري للفرق في الألوان */
.rd-color-badge {
  display: inline-block;
  width: 14px; height: 14px;
  border-radius: 4px;
  vertical-align: middle;
  margin-left: 5px;
}
`;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

export default function RedesignPreview() {
  const videoUrl = `${SUPABASE_URL}/storage/v1/object/public/media/promo.mp4`;

  return (
    <div className="rd-page">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ── شريط المعاينة ── */}
      <div className="rd-banner">
        <span>🎨 معاينة تصميم محسّن — النظام البصري الرسمي لأكاديمية عارم</span>
        <span style={{ opacity: .7 }}>|</span>
        <Link href="/" style={{ color: '#fff', textDecoration: 'underline', fontWeight: 800 }}>
          ← العودة للموقع الحالي
        </Link>
      </div>

      {/* ── شريط التنقل ── */}
      <nav className="rd-nav">
        <div className="rd-nav-inner">
          <div className="rd-brand">
            <div className="rd-brand-logo">ع</div>
            <span className="rd-brand-name">أكاديمية عارم</span>
          </div>

          <ul className="rd-nav-links">
            <li><a href="#about">من نحن</a></li>
            <li><a href="#pricing">الأسعار</a></li>
            <li><a href="#faq">الأسئلة الشائعة</a></li>
          </ul>

          <Link href="/auth/register" className="rd-nav-cta">
            👤 لوحة الطالب
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="rd-hero">
        {/* شريط التواصل */}
        <div className="rd-topbar">
          <div className="rd-topbar-inner">
            <span>📞 للاستفسارات والدعم الفني مباشرة:</span>
            <a href={WA} target="_blank" rel="noopener noreferrer" className="rd-wa-link">
              <span aria-hidden="true">💬</span>
              <span>واتساب مباشرة:</span>
              <bdi dir="ltr">+44 7400 755914</bdi>
            </a>
          </div>
        </div>

        <div className="rd-hero-main">
          <div className="rd-container">
            <div className="rd-hero-content">
              <h1 className="rd-hero">نظام التقييم الذكي</h1>
              <p>
                منصتكم التعليمية لتقييم وتطوير مهارات الطلاب<br />
                في اللغة العربية بأساليب ذكية وتفاعلية.
              </p>
              <div className="rd-hero-btns">
                <Link href="/auth/register" className="rd-cta-btn">
                  ابدأ تحديد مستوى طفلك — مجاناً ▷
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="rd-hero-image">
          <Image
            src="/teacher-student-hero.png"
            alt="معلم وطالب يستخدمان التطبيق"
            width={1408}
            height={768}
            priority
            sizes="(max-width: 768px) 92vw, 64vw"
            className="rd-hero-photo"
          />
        </div>

        {/* الموجة تستخدم لون الكريمي بدل الأبيض */}
        <svg className="rd-hero-wave" xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d={`M0,80 L0,44 C240,80 480,8 720,44 C960,80 1200,8 1440,44 L1440,80 Z`}
            fill={CREAM_LT} />
        </svg>
      </section>

      {/* ── المميزات ── */}
      <section className="rd-features">
        <div className="rd-container">
          <h2>لماذا أكاديمية عارم؟</h2>
          <p className="rd-features-sub">نظام متكامل يجمع بين الدقة العلمية وسهولة الاستخدام</p>
          <div className="rd-cards-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="rd-feat-card">
                <div className="rd-feat-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── من نحن + فيديو ── */}
      <section id="about" className="rd-about">
        <div className="rd-container">
          <div className="rd-about-inner">
            <div className="rd-about-text">
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>🌱</div>
              <h2>تعرّف على أكاديمية عارم</h2>
              <p className="motto">نبني بذور المستقبل بلغة عربية أصيلة</p>
              <p>
                نحن نؤمن بأن كل طفل يحمل في داخله شغفاً للتعلم. في «أكاديمية عارم»، لا نكتفي بالتعليم التقليدي، بل نمنح طفلك بيئة تفاعلية وذكية، تُحببه في لغته الأم، وتنمي مهاراته (الاستماع، التحدث، والكتابة) بدقة واحترافية.
              </p>
              <p>
                هدفنا أن نكون الشريك الموثوق لك في رحلة طفلك نحو التميز، لنصنع معاً جيلاً يعتز بهويته، ويفكر بوضوح، ويبدع بلغته العربية.
              </p>

              {/* شارات الإنجاز — اللون الأخضر حصراً هنا */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24 }}>
                {['+500 طالب', 'تقييم ذكي', 'دعم مستمر'].map(label => (
                  <span key={label} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#e8f8f0', color: '#1a4d35',
                    border: `1.5px solid ${GREEN}40`,
                    borderRadius: 99, padding: '5px 14px',
                    fontSize: '.85rem', fontWeight: 700,
                  }}>
                    <span style={{ color: GREEN, fontWeight: 900 }}>✓</span>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="rd-about-video" id="promo-video">
              <video
                src={videoUrl}
                controls
                playsInline
                onError={() => {
                  const el = document.getElementById('promo-video');
                  if (el) el.style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── الأسعار (نفس المكوّن الحالي) ── */}
      <div id="pricing">
        <PricingSection />
      </div>

      {/* ── الأسئلة الشائعة ── */}
      <div id="faq">
        <SmartFAQ />
      </div>

      {/* ── فريق العمل ── */}
      <TeamShowcase />

      {/* ── CTA نهائي ── */}
      <section className="rd-cta-section">
        <div className="rd-container">
          <h2>جاهز للبدء؟</h2>
          <p>انضم إلى المعلمين الذين يستخدمون عارم لتطوير طلابهم</p>
          <Link href="/auth/register" className="rd-cta-btn">
            👨‍🏫 سجّل حساب معلم مجاناً ▷
          </Link>
        </div>
      </section>

      {/* ── فوتر ── */}
      <footer className="rd-footer">
        <p>© 2026 أكاديمية عارم — جميع الحقوق محفوظة</p>
        <p style={{ marginTop: 10, fontSize: '.8rem' }}>
          <span style={{ opacity: .6 }}>للمعلمين: </span>
          <a href="/auth/login?for=teacher">دخول المعلم</a>
          ·
          <a href="/auth/register/teacher">تسجيل معلم جديد</a>
          ·
          <a href={WA} target="_blank" rel="noopener noreferrer">سجل ترشحك كمعلم</a>
        </p>
      </footer>
    </div>
  );
}
