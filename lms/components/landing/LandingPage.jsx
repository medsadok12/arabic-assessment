'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ClipboardCheck, BookOpen, Gamepad2, FileBarChart, Target, Languages, Zap, MonitorSmartphone, ShieldCheck,
  Lock, Sparkles, FileText, ChevronDown,
} from 'lucide-react';
import Navbar from '../Navbar';
import FloatingSidebar from '../FloatingSidebar';
import SmartFAQ from '../SmartFAQ';
import PricingSection from '../PricingSection';
import { useLanguage } from '../../contexts/LanguageContext';
import { createClient } from '../../lib/supabase';
import { getRole } from '../../lib/auth-role';
import { V2_CONTENT, V2_FAQ_EXTRA, V2_FAQ_MOBILE_PLACEHOLDER } from './content';
import Showcase from './Showcase';
import FaheemChapter from './FaheemChapter';

/* ════════════════════════════════════════════════════════════════
   الصفحة الرئيسية (app/page.jsx يجلب بيانات المعاينات ويعرض هذا المكوّن).
   اعتمدها الأستاذ محمد بعد تجربتها على /landing-v2 (2026-10-16).
   الترتيب: البداية + شريط الطمأنينة ← لماذا عارم (9 + الفيديو) ← كيف تعمل
   ← معاينة من داخل المنصة ← الأسعار ← الأسئلة الشائعة + فهيم.
════════════════════════════════════════════════════════════════ */

const WHATSAPP_HREF = 'https://api.whatsapp.com/send/?phone=447400755914&text&type=phone_number&app_absent=0';
const ASSESSMENT_HREF = 'https://assessment.aarem.net';

const FEATURE_ICONS  = [ClipboardCheck, BookOpen, Gamepad2, FileBarChart, Target, Languages, Zap, MonitorSmartphone, ShieldCheck];
const FEATURE_COLORS = ['gold', 'purple', 'green', 'gold', 'purple', 'green', 'gold', 'purple', 'green'];
const TRUST_ICONS    = [Lock, Target, MonitorSmartphone];
const STEP_ICONS     = [Sparkles, FileText, BookOpen];

/* فصل «فهيم معك في كل خطوة» البنفسجي — مخفي بطلب الأستاذ محمد (2026-10-15).
   لإعادته: true فقط (النصوص في translations/index.js باقية كما هي). */
const SHOW_FAHEEM_CHAPTER = false;

export default function LandingPage({ storyPreview, gameWords, wheels }) {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const c = V2_CONTENT[lang] || V2_CONTENT.ar;
  const [videoOk, setVideoOk] = useState(true);
  const [openFeature, setOpenFeature] = useState(null); // كل البطاقات مغلقة في البداية، وتُفتح واحدة في كل مرة

  // المسجَّل دخوله يذهب للوحته مباشرة (كما كانت الصفحة الرئيسية السابقة)
  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const role = getRole(user);
      if (role === 'super_admin' || role === 'admin') router.replace('/bogga');
      else if (role === 'teacher') router.replace('/teacher');
      else if (role === 'supervisor') router.replace('/supervisor');
      else router.replace('/dashboard');
    }).catch(() => {});
  }, [router]);
  const videoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/promo.mp4`;

  return (
    <>
      {/* dangerouslySetInnerHTML: يتفادى اختلاف تهريب علامات الاقتباس في CSS بين الخادم والمتصفح (تحذير hydration) */}
      <style dangerouslySetInnerHTML={{ __html: V2_CSS }} />
      <Navbar />
      <FloatingSidebar compact />

      {/* ── 1. البداية ── */}
      <section className="hero" id="register-section">
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
                <a href={ASSESSMENT_HREF} className="btn btn-accent btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
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
            width={1894} height={1414} priority
            sizes="(max-width: 768px) 92vw, 64vw"
            className="hero-photo"
          />
        </div>
        <svg className="hero-wave" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0,80 L0,44 C240,80 480,8 720,44 C960,80 1200,8 1440,44 L1440,80 Z" fill="#EDE5D8" />
        </svg>
      </section>

      {/* شريط الطمأنينة */}
      <div className="v2-trust-wrap">
        <div className="container">
          <ul className="v2-trust">
            {c.trust.map((label, i) => {
              const Icon = TRUST_ICONS[i];
              return (
                <li key={label}>
                  <span className="v2-trust-icon"><Icon size={20} strokeWidth={2} /></span>
                  <span>{label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {SHOW_FAHEEM_CHAPTER && <FaheemChapter />}

      {/* ── 2. لماذا أكاديمية عارم؟ ── */}
      <section id="about" className="v2-why">
        <div className="container">
          <h2 className="v2-h2">{t('landing.whyTitle')}</h2>
          <p className="v2-sub">{t('landing.whySub')}</p>
          {videoOk && (
            <div className="v2-video">
              <video src={videoUrl} controls playsInline preload="metadata" onError={() => setVideoOk(false)} />
            </div>
          )}
          <div className="v2-acc-grid">
            {c.features.map((f, i) => (
              <FeatureAccordion
                key={f.title}
                id={`feature-${i}`}
                title={f.title}
                desc={f.desc}
                Icon={FEATURE_ICONS[i]}
                color={FEATURE_COLORS[i]}
                open={openFeature === i}
                onToggle={() => setOpenFeature(o => (o === i ? null : i))}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. كيف تعمل المنصة؟ ── */}
      <section className="v2-how">
        <div className="container">
          <h2 className="v2-h2">{c.howTitle}</h2>
          <p className="v2-sub">{c.howSub}</p>
          <ol className="v2-steps">
            {c.steps.map((s, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <li key={s.title} className="v2-step">
                  <span className="v2-step-num" aria-hidden="true">{i + 1}</span>
                  <span className="v2-step-icon"><Icon size={26} strokeWidth={1.8} /></span>
                  <span className="v2-step-label">{c.stepLabel} {i + 1}</span>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </li>
              );
            })}
          </ol>
          <div className="v2-how-cta">
            <a href={ASSESSMENT_HREF} className="btn btn-accent btn-lg">{c.howCta}</a>
          </div>
        </div>
      </section>

      {/* ── 4. معاينة من داخل المنصة ── */}
      <Showcase c={c} story={storyPreview} gameWords={gameWords} wheels={wheels} />

      {/* ── 5. الأسعار ── */}
      <PricingSection />

      {/* ── 6. الأسئلة الشائعة + فهيم ── */}
      <SmartFAQ
        extraItems={V2_FAQ_EXTRA}
        mobilePlaceholder={V2_FAQ_MOBILE_PLACEHOLDER}
        standardSendIcon
      />

      <footer className="v2-footer">
        <p>{t('landing.footer')}</p>
        <p className="v2-footer-links">
          <span style={{ opacity: .6 }}>للمعلمين: </span>
          <Link href="/auth/login?for=teacher">{t('landing.ctaLogin')}</Link>
          ·
          <Link href="/auth/register/teacher">{t('landing.ctaRegister')}</Link>
          ·
          <Link href="/apply">{t('landing.ctaApplyLink')}</Link>
        </p>
      </footer>
    </>
  );
}

/* بطاقة «لماذا عارم» كقائمة منسدلة: العنوان والأيقونة وسهم ظاهرة دائماً، والتفاصيل
   تظهر عند الضغط. الزر يحمل aria-expanded واللوحة مرتبطة به (قارئات الشاشة ولوحة المفاتيح). */
function FeatureAccordion({ id, title, desc, Icon, color, open, onToggle }) {
  return (
    <div className={`v2-acc${open ? ' open' : ''}`}>
      <h3 className="v2-acc-h">
        <button
          type="button"
          id={`${id}-btn`}
          className="v2-acc-btn"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={onToggle}
        >
          <span className={`v2-icon ${color}`}><Icon size={22} strokeWidth={1.8} /></span>
          <span className="v2-acc-title">{title}</span>
          <ChevronDown className="v2-acc-chev" size={22} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </h3>
      <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-btn`} className="v2-acc-panel">
        <div className="v2-acc-inner">
          <p>{desc}</p>
        </div>
      </div>
    </div>
  );
}

const V2_CSS = `
  .v2-h2{ text-align:center; font-size:1.9rem; font-weight:800; color:var(--primary); margin:0 0 12px; }
  .v2-sub{ text-align:center; color:var(--muted); font-size:.97rem; margin:0 0 44px; }

  /* شريط الطمأنينة — يتداخل قليلاً مع موجة البداية */
  .v2-trust-wrap{ background:#EDE5D8; padding:0 0 8px; }
  .v2-trust{ list-style:none; margin:-8px 0 0; padding:14px 18px; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px;
    background:#fff; border-radius:18px; border:1.5px solid rgba(26,43,74,.08); box-shadow:0 8px 28px rgba(26,43,74,.10); position:relative; z-index:1; }
  .v2-trust li{ display:flex; align-items:center; gap:10px; font-weight:700; font-size:.92rem; color:#1A2B4A; line-height:1.5; min-width:0; }
  .v2-trust-icon{ width:38px; height:38px; flex-shrink:0; border-radius:12px; background:#FDF1DB; color:#B07E1E; display:flex; align-items:center; justify-content:center; }

  /* لماذا عارم: الفيديو في الأعلى، والبطاقات قوائم منسدلة مغلقة في شبكة 3 أعمدة */
  .v2-why{ background:#EDE5D8; padding:64px 0 80px; }
  .v2-video{ max-width:760px; margin:0 auto 28px; }
  .v2-video video{ width:100%; display:block; border-radius:18px; background:#1A2B4A; box-shadow:0 10px 32px rgba(26,43,74,.18); }
  .v2-acc-grid{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; align-items:start; }
  .v2-acc{ background:#fff; border-radius:18px; border:1.5px solid rgba(26,43,74,.08);
    box-shadow:0 1px 4px rgba(26,43,74,.06),0 4px 16px rgba(26,43,74,.07); min-width:0; transition:border-color .2s, box-shadow .2s; }
  .v2-acc.open{ border-color:rgba(232,184,75,.75); box-shadow:0 8px 26px rgba(26,43,74,.12); }
  .v2-acc-h{ margin:0; font-size:inherit; }
  .v2-acc-btn{ width:100%; min-height:64px; display:flex; align-items:center; gap:12px; padding:10px 14px; background:none; border:0;
    border-radius:18px; cursor:pointer; font:inherit; color:var(--text); text-align:start; -webkit-tap-highlight-color:transparent; }
  .v2-acc-btn:hover{ background:#FAF7F2; }
  .v2-acc-btn:focus-visible{ outline:3px solid #E8B84B; outline-offset:2px; }
  .v2-acc-title{ flex:1; min-width:0; font-size:1rem; font-weight:800; line-height:1.5; }
  .v2-acc-chev{ flex-shrink:0; color:#B07E1E; transition:transform .3s ease; }
  .v2-acc.open .v2-acc-chev{ transform:rotate(180deg); }
  .v2-acc-panel{ display:grid; grid-template-rows:0fr; visibility:hidden; transition:grid-template-rows .3s ease, visibility .3s; }
  .v2-acc.open .v2-acc-panel{ grid-template-rows:1fr; visibility:visible; }
  .v2-acc-inner{ overflow:hidden; min-height:0; }
  .v2-acc-inner p{ margin:0; padding:2px 18px 18px; font-size:.9rem; color:var(--muted); line-height:1.85; }
  @media (prefers-reduced-motion:reduce){
    .v2-acc-panel, .v2-acc-chev{ transition:none; }
  }
  .v2-icon{ width:46px; height:46px; flex-shrink:0; border-radius:14px; display:flex; align-items:center; justify-content:center; }
  .v2-icon.gold{ background:linear-gradient(135deg,#FDF1DB,#FBE8C4); color:#C9962E; }
  .v2-icon.purple{ background:linear-gradient(135deg,#EFE9FB,#E3D9F9); color:#5f3fc4; }
  .v2-icon.green{ background:linear-gradient(135deg,#E6F7EF,#D7F2E4); color:#1f9a63; }

  /* كيف تعمل: ثلاث خطوات متصلة بخط */
  .v2-how{ background:#FAF7F2; padding:80px 0; }
  .v2-steps{ list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:22px; position:relative; }
  .v2-steps::before{ content:''; position:absolute; top:34px; right:16%; left:16%; border-top:3px dashed #E8B84B; z-index:0; }
  .v2-step{ position:relative; z-index:1; background:#fff; border-radius:20px; padding:22px 20px 24px; text-align:center;
    display:flex; flex-direction:column; align-items:center; gap:8px; border:1.5px solid rgba(26,43,74,.08); box-shadow:0 6px 22px rgba(26,43,74,.08); }
  .v2-step-num{ position:absolute; top:-16px; width:34px; height:34px; border-radius:50%; background:#1A2B4A; color:#fff; font-weight:800;
    display:flex; align-items:center; justify-content:center; box-shadow:0 0 0 5px #FAF7F2; }
  .v2-step-icon{ margin-top:10px; width:62px; height:62px; border-radius:18px; background:#FDF1DB; color:#B07E1E; display:flex; align-items:center; justify-content:center; }
  .v2-step-label{ font-size:.78rem; font-weight:800; color:#B07E1E; }
  .v2-step h3{ margin:0; font-size:1.08rem; font-weight:800; color:#1A2B4A; }
  .v2-step p{ margin:0; font-size:.9rem; color:var(--muted); line-height:1.8; }
  .v2-how-cta{ text-align:center; margin-top:36px; }

  .v2-footer{ background:#0d1f38; color:rgba(255,255,255,.55); text-align:center; padding:24px 20px; font-size:.88rem; }
  .v2-footer-links{ margin-top:10px; font-size:.8rem; }
  .v2-footer-links a{ color:rgba(255,255,255,.7); text-decoration:none; margin:0 6px; }
  .v2-footer-links a:hover{ color:#fff; }

  /* جهاز لوحي: القوائم المنسدلة في عمودين */
  @media (max-width:1023px){
    .v2-acc-grid{ grid-template-columns:repeat(2,minmax(0,1fr)); }
  }
  /* جوال: عمود واحد */
  @media (max-width:640px){
    .v2-h2{ font-size:1.5rem; }
    .v2-sub{ margin-bottom:28px; }
    .v2-trust{ grid-template-columns:minmax(0,1fr); gap:10px; padding:14px; }
    .v2-trust li{ font-size:.88rem; }
    .v2-why{ padding:40px 0 56px; }
    .v2-video{ margin-bottom:20px; }
    .v2-acc-grid{ grid-template-columns:minmax(0,1fr); gap:10px; }
    .v2-acc-btn{ min-height:60px; }
    .v2-acc-title{ font-size:.97rem; }
    .v2-how{ padding:56px 0; }
    .v2-steps{ grid-template-columns:minmax(0,1fr); gap:30px; }
    .v2-steps::before{ top:16px; bottom:16px; right:auto; left:50%; border-top:none; border-left:3px dashed #E8B84B; }
  }
`;
