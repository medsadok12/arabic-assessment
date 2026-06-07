'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '../components/Navbar';
import FloatingSidebar from '../components/FloatingSidebar';
import SmartFAQ from '../components/SmartFAQ';
import { Target, FileBarChart, Globe, Smartphone, Lock, Zap } from 'lucide-react';
import { createClient } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

const WHATSAPP_HREF = 'https://api.whatsapp.com/send/?phone=447400755914&text&type=phone_number&app_absent=0';
const FEATURE_ICONS = [Target, FileBarChart, Globe, Smartphone, Lock, Zap];

export default function LandingPage() {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const role = user.user_metadata?.role;
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
      <section className="hero">

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
                <a href="https://arabic-assessment.vercel.app"
                  className="btn btn-accent btn-lg"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {t('landing.heroCta')}
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

      {/* ── About + Video ── */}
      <section id="about" style={{ background: '#f0f6ff', padding: '80px 0' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: 52, alignItems: 'center', flexWrap: 'wrap' }}>

            {/* Right — text */}
            <div style={{ flex: '1 1 340px', minWidth: 0, textAlign: 'right' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>🌱</div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 8 }}>
                {t('landing.aboutTitle')}
              </h2>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: '#1a3a5c', marginBottom: 20 }}>
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

      {/* ── Smart FAQ ── */}
      <SmartFAQ />

      {/* ── CTA ── */}
      <section style={{ background: 'var(--primary)', padding: '64px 0', textAlign: 'center', color: '#fff' }}>
        <div className="container">
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 12 }}>{t('landing.ctaTitle')}</h2>
          <p style={{ opacity: .82, marginBottom: 30, fontSize: '1rem' }}>{t('landing.ctaSub')}</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/register/teacher" className="btn btn-accent btn-lg"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {t('landing.ctaRegister')}
            </Link>
            <Link href="/auth/login?for=teacher" className="btn btn-lg"
              style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '2px solid rgba(255,255,255,.5)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {t('landing.ctaLogin')}
            </Link>
          </div>
          <p style={{ marginTop: 16, fontSize: '.88rem', color: 'rgba(255,255,255,.6)' }}>
            {t('landing.ctaApply')}{' '}
            <Link href="/apply"
              style={{ color: 'rgba(255,255,255,.9)', textDecoration: 'underline', fontWeight: 700 }}>
              {t('landing.ctaApplyLink')}
            </Link>
          </p>
        </div>
      </section>

      <footer style={{ background: '#0e3d70', color: 'rgba(255,255,255,.55)', textAlign: 'center', padding: '22px', fontSize: '.88rem' }}>
        {t('landing.footer')}
      </footer>
    </>
  );
}
