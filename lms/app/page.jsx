'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '../components/Navbar';
import FloatingSidebar from '../components/FloatingSidebar';
import SmartFAQ from '../components/SmartFAQ';
import TeamShowcase from '../components/TeamShowcase';
import PricingSection from '../components/PricingSection';
import { Target, FileBarChart, Globe, Smartphone, Lock, Zap } from 'lucide-react';
import { createClient } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { getRole } from '../lib/auth-role';

const WHATSAPP_HREF = 'https://api.whatsapp.com/send/?phone=447400755914&text&type=phone_number&app_absent=0';
const FEATURE_ICONS = [Target, FileBarChart, Globe, Smartphone, Lock, Zap];

export default function LandingPage() {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const role = getRole(user);
      if (role === 'super_admin' || role === 'admin') router.replace('/bogga');
      else if (role === 'teacher') router.replace('/teacher');
      else if (role === 'supervisor') router.replace('/supervisor');
      else router.replace('/dashboard');
    });
  }, [router]);

  const features = t('landing.features').map((f, i) => ({ ...f, icon: FEATURE_ICONS[i] }));

  const videoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/promo.mp4`;

  return (
    <>
      <Navbar />
      <FloatingSidebar />

      {/* ── Hero ── */}
      <section className="hero" id="register-section">

        {/* Contact strip — integrated inside hero */}
        <div className="hero-topbar">
          <div className="hero-topbar-inner">
            <span className="hero-topbar-label">{t('landing.contactStrip')}</span>
            <a href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer" className="hero-topbar-link">
              <span aria-hidden="true">💬</span>
              <span>{t('landing.whatsappDirect')}</span>
              <bdi dir="ltr">+44 7400 755914</bdi>
            </a>
          </div>
        </div>

        {/* Main content */}
        <div className="hero-main">
          <div className="container">
            <div className="hero-content">
              <h1>{t('landing.heroTitle')}</h1>
              <p>
                {t('landing.heroSub').split('\n').map((line, i) => (
                  <span key={i}>{line}{i === 0 && <br />}</span>
                ))}
              </p>
              <div className="hero-btns">
                <a href="https://assessment.aarem.net"
                  className="btn btn-accent btn-lg"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {t('landing.heroCta')}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-image">
          <Image
            src="/teacher-student-hero.png"
            alt="معلم وطالب يستخدمان التطبيق مع الفيل فهيم"
            width={1894}
            height={1414}
            priority
            sizes="(max-width: 768px) 92vw, 64vw"
            className="hero-photo"
          />
        </div>

        <svg className="hero-wave" xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0,80 L0,44 C240,80 480,8 720,44 C960,80 1200,8 1440,44 L1440,80 Z" fill="#FAF7F2" />
        </svg>
      </section>

      {/* ── Features ── */}
      <section className="features">
        <div className="container">
          <h2>{t('landing.whyTitle')}</h2>
          <p className="features-subtitle">{t('landing.whySub')}</p>
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

      {/* ── Faheem chapter ── */}
      <section className="faheem-chapter">
        <style>{`
          .faheem-chapter{ background:linear-gradient(165deg,#7C5CD9,#5f3fc4); padding:72px 0; }
          .faheem-chapter .container{ display:flex; flex-direction:column; align-items:center; gap:24px; text-align:center; }
          .faheem-tag{ color:#E8B84B; font-weight:800; font-size:.85rem; letter-spacing:.3px; }
          .faheem-chapter h2{ color:#fff; font-size:1.9rem; font-weight:900; max-width:18ch; margin:0; }
          .faheem-spot{
            width:170px; height:170px; border-radius:50%; background:#FAF7F2;
            position:relative; box-shadow:0 16px 34px rgba(0,0,0,.2); overflow:hidden; flex-shrink:0;
          }
          .faheem-skills{ display:flex; gap:10px; flex-wrap:wrap; justify-content:center; }
          .faheem-pill{
            background:rgba(255,255,255,.22); border:1.5px solid rgba(255,255,255,.4);
            color:#fff; font-size:.85rem; font-weight:700; border-radius:999px; padding:9px 18px;
          }
          .faheem-fact{
            background:#fff; border-radius:18px; padding:20px 24px; max-width:48ch;
            color:#475569; font-size:.92rem; line-height:1.9;
          }
          .faheem-fact b{ color:#1A2B4A; }
          @media (max-width:480px){
            .faheem-chapter{ padding:52px 0; }
            .faheem-chapter h2{ font-size:1.5rem; }
            .faheem-spot{ width:140px; height:140px; }
          }
        `}</style>
        <div className="container">
          <span className="faheem-tag">{t('landing.faheemTag')}</span>
          <h2>{t('landing.faheemTitle')}</h2>
          <div className="faheem-spot">
            <Image src="/faheem.png" alt="فهيم" fill sizes="170px" style={{ objectFit: 'contain', padding: 14 }} />
          </div>
          <div className="faheem-skills">
            {t('landing.faheemSkills').map(s => (
              <span key={s} className="faheem-pill">{s}</span>
            ))}
          </div>
          <p className="faheem-fact">{t('landing.faheemFact')}</p>
        </div>
      </section>

      {/* ── About + Video ── */}
      <section id="about" style={{ background: '#EDE5D8', padding: '80px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: 52, alignItems: 'center', flexWrap: 'wrap' }}>

            {/* Right — text */}
            <div style={{ flex: '1 1 340px', minWidth: 0, textAlign: 'right' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>🌱</div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 8 }}>
                {t('landing.aboutTitle')}
              </h2>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: '#1A2B4A', marginBottom: 20 }}>
                {t('landing.aboutMotto')}
              </p>
              <div style={{ lineHeight: 2, color: '#2d3748', fontSize: '1rem' }}>
                <p style={{ marginBottom: 16 }}>{t('landing.aboutBody1')}</p>
                <p>{t('landing.aboutBody2')}</p>
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

      {/* ── Pricing ── */}
      <PricingSection />

      {/* ── Smart FAQ ── */}
      <SmartFAQ />

      <TeamShowcase />

      <footer style={{ background: '#0d1f38', color: 'rgba(255,255,255,.55)', textAlign: 'center', padding: '24px 20px', fontSize: '.88rem' }}>
        <style>{`
          .footer-tlink {
            color: rgba(255,255,255,.65);
            text-decoration: none;
            margin: 0 6px;
            display: inline-block;
            position: relative;
            padding-bottom: 3px;
            transition: color .25s, transform .28s cubic-bezier(.34,1.56,.64,1), letter-spacing .25s;
          }
          .footer-tlink::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            width: 100%;
            height: 1.5px;
            background: linear-gradient(90deg, transparent, #E8B84B, transparent);
            border-radius: 2px;
            transform: translateX(-50%) scaleX(0);
            transition: transform .32s cubic-bezier(.4,0,.2,1);
          }
          .footer-tlink:hover {
            color: #fff;
            transform: scale(1.12);
            letter-spacing: .03em;
          }
          .footer-tlink:hover::after {
            transform: translateX(-50%) scaleX(1);
          }
        `}</style>
        <p>{t('landing.footer')}</p>
        <p style={{ marginTop: 10, fontSize: '.8rem' }}>
          <span style={{ opacity: .6 }}>للمعلمين: </span>
          <Link href="/auth/login?for=teacher" className="footer-tlink">
            {t('landing.ctaLogin')}
          </Link>
          ·
          <Link href="/auth/register/teacher" className="footer-tlink">
            {t('landing.ctaRegister')}
          </Link>
          ·
          <Link href="/apply" className="footer-tlink">
            {t('landing.ctaApplyLink')}
          </Link>
        </p>
      </footer>
    </>
  );
}
