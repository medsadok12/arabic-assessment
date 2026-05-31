'use client';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { Target, FileBarChart, Globe, Smartphone, Lock, Zap } from 'lucide-react';

const WHATSAPP_HREF = 'https://api.whatsapp.com/send/?phone=447400755914&text&type=phone_number&app_absent=0';

function InstructorIllustration() {
  return (
    <svg viewBox="0 0 380 420" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 380, display: 'block' }} aria-hidden="true">
      {/* Background card */}
      <rect width="380" height="420" rx="28" fill="rgba(255,255,255,0.13)" />

      {/* Desk surface */}
      <rect x="40" y="300" width="300" height="14" rx="7" fill="rgba(255,255,255,0.22)" />
      <rect x="80" y="314" width="220" height="70" rx="10" fill="rgba(255,255,255,0.1)" />

      {/* Laptop base */}
      <rect x="90" y="248" width="200" height="55" rx="10" fill="#0d47a1" />
      <rect x="98" y="254" width="184" height="41" rx="6" fill="#1565c0" />
      <rect x="108" y="260" width="164" height="29" rx="4" fill="#42a5f5" opacity="0.5" />
      {/* Screen lines */}
      <rect x="116" y="265" width="80" height="4" rx="2" fill="rgba(255,255,255,0.5)" />
      <rect x="116" y="274" width="120" height="4" rx="2" fill="rgba(255,255,255,0.35)" />
      <rect x="116" y="283" width="60" height="4" rx="2" fill="rgba(255,255,255,0.25)" />

      {/* Body / shirt */}
      <path d="M135 248 Q145 225 190 220 Q235 225 245 248 L250 300 L130 300 Z" fill="#1a3a6c" />
      {/* Collar */}
      <path d="M175 220 L190 240 L205 220" fill="white" opacity="0.9" />
      {/* Tie */}
      <polygon points="190,238 184,260 190,268 196,260" fill="#e53935" />

      {/* Neck */}
      <rect x="180" y="195" width="20" height="28" rx="8" fill="#d4956a" />

      {/* Head */}
      <ellipse cx="190" cy="175" rx="50" ry="54" fill="#d4956a" />

      {/* Hair */}
      <path d="M140 158 Q142 120 190 115 Q238 120 240 158 Q238 130 190 126 Q142 130 140 158Z" fill="#1a0e06" />
      <ellipse cx="148" cy="158" rx="14" ry="22" fill="#1a0e06" />
      <ellipse cx="232" cy="158" rx="14" ry="22" fill="#1a0e06" />

      {/* Ears */}
      <ellipse cx="142" cy="178" rx="8" ry="10" fill="#c07848" />
      <ellipse cx="238" cy="178" rx="8" ry="10" fill="#c07848" />

      {/* Eyes */}
      <ellipse cx="176" cy="172" rx="7" ry="8" fill="#1a0c00" />
      <ellipse cx="204" cy="172" rx="7" ry="8" fill="#1a0c00" />
      <circle cx="178" cy="169" r="2.5" fill="white" />
      <circle cx="206" cy="169" r="2.5" fill="white" />

      {/* Eyebrows */}
      <path d="M166 160 Q176 155 186 159" stroke="#1a0c00" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <path d="M194 159 Q204 155 214 160" stroke="#1a0c00" strokeWidth="2.8" fill="none" strokeLinecap="round" />

      {/* Nose */}
      <path d="M188 182 Q190 190 192 182" stroke="#b06040" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Smile */}
      <path d="M178 196 Q190 206 202 196" stroke="#a05030" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Headphones arc */}
      <path d="M144 168 Q144 122 190 118 Q236 122 236 168" stroke="#0a2d6e" strokeWidth="9" fill="none" strokeLinecap="round" />
      {/* Headphone cups */}
      <rect x="132" y="162" width="22" height="30" rx="9" fill="#0d47a1" />
      <ellipse cx="143" cy="177" rx="9" ry="13" fill="#1565c0" />
      <ellipse cx="143" cy="177" rx="5" ry="8" fill="#1e88e5" />
      <rect x="226" y="162" width="22" height="30" rx="9" fill="#0d47a1" />
      <ellipse cx="237" cy="177" rx="9" ry="13" fill="#1565c0" />
      <ellipse cx="237" cy="177" rx="5" ry="8" fill="#1e88e5" />

      {/* Book stack on desk */}
      <rect x="280" y="272" width="44" height="10" rx="3" fill="#ef9a9a" />
      <rect x="278" y="263" width="44" height="10" rx="3" fill="#90caf9" />
      <rect x="276" y="254" width="44" height="10" rx="3" fill="#a5d6a7" />

      {/* Sparkle decorations */}
      <text x="50" y="80" fontSize="22" fill="rgba(255,255,255,0.6)">✨</text>
      <text x="310" y="60" fontSize="18" fill="rgba(255,255,255,0.5)">⭐</text>
      <text x="330" y="230" fontSize="16" fill="rgba(255,255,255,0.4)">📚</text>
      <text x="30" y="230" fontSize="14" fill="rgba(255,255,255,0.4)">🎓</text>

      {/* Label */}
      <rect x="100" y="376" width="180" height="30" rx="15" fill="rgba(255,255,255,0.18)" />
      <text x="190" y="396" textAnchor="middle" fill="white" fontSize="13" fontWeight="700" fontFamily="Arial, sans-serif">معلم اللغة العربية</text>
    </svg>
  );
}

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
      {/* ── Top Contact Bar ── */}
      <div className="top-bar">
        📞 للاستفسارات والدعم الفني مباشرة عبر الواتساب:&nbsp;
        <a href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer">
          +44 7400 755914
        </a>
      </div>

      <Navbar />

      {/* ── Hero ── */}
      <section className="hero">
        <div className="container">
          <div className="hero-layout">

            {/* Right — Text + Buttons */}
            <div className="hero-content">
              <h1>نظام التقييم الذكي<br />لأكاديمية عارم</h1>
              <p>منصتكم التعليمية المتكاملة أونلاين لتقييم وتطوير مهارات الطلاب في اللغة العربية بأساليب ذكية وتفاعلية.</p>
              <div className="hero-btns">
                <a href="https://arabic-assessment.vercel.app" className="btn btn-accent btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  ابدأ التقييم التشخيصي ▷
                </a>
                <a href={WHATSAPP_HREF} target="_blank" rel="noopener noreferrer"
                  className="btn btn-lg"
                  style={{ borderColor: 'rgba(255,255,255,.65)', color: '#fff', background: 'transparent', border: '2px solid rgba(255,255,255,.65)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  💬 تواصل مع الإدارة
                </a>
              </div>
            </div>

            {/* Left — Instructor Illustration */}
            <div className="hero-image">
              <InstructorIllustration />
            </div>

          </div>
        </div>
      </section>

      {/* ── Features ── */}
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

      {/* ── About + Video — two-column ── */}
      <section id="about" style={{ background: '#f0f6ff', padding: '72px 0' }}>
        <div className="container">
          <div style={{
            display: 'flex',
            gap: 52,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}>

            {/* Right — About text */}
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

            {/* Left — Video */}
            <div id="promo-video" style={{ flex: '0 1 380px', minWidth: 260 }}>
              <video
                src={videoUrl}
                controls
                playsInline
                style={{
                  width: '100%',
                  borderRadius: 16,
                  display: 'block',
                  boxShadow: '0 6px 28px rgba(13,79,161,.12)',
                }}
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
      <section style={{ background: 'var(--primary)', padding: '60px 0', textAlign: 'center', color: '#fff' }}>
        <div className="container">
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 14 }}>جاهز للبدء؟</h2>
          <p style={{ opacity: .85, marginBottom: 28 }}>انضم إلى المعلمين الذين يستخدمون عارم لتطوير طلابهم</p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/register/teacher" className="btn btn-accent btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              👨‍🏫 تسجيل حساب معلم
            </Link>
            <Link href="/auth/login" className="btn btn-lg" style={{ background: 'rgba(255,255,255,.15)', color: '#fff', border: '2px solid rgba(255,255,255,.5)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              🔑 دخول المعلم
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
