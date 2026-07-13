'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

/* ── Inject model-viewer once ─────────────────────────────────────────── */
function loadMvScript() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('script[data-mv]')) return;
  const s = document.createElement('script');
  s.type = 'module';
  s.src = '/vendor/model-viewer.min.js'; // مستضاف ذاتياً — لا اعتماد على CDN خارجي
  s.dataset.mv = '1';
  document.head.appendChild(s);
}

/* ── Companion CSS (injected once on client via useEffect in component) ── */
const HERO3D_CSS = `
  @keyframes h3dFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
  @keyframes h3dPulse { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:.9;transform:scale(1.08)} }
  @keyframes h3dSlide { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
  model-viewer { --progress-bar-color:#8b5cf6; --poster-color:transparent; }
`;

/* ── Per-hero static data ────────── */
const HERO_META = {
  robot:     { name:'الروبوت الذكي',    emoji:'🤖',  color:'#8B5CF6' },
  astronaut: { name:'رائد الفضاء',      emoji:'🧑‍🚀', color:'#3B82F6' },
  fox:       { name:'الثعلب الذكي',     emoji:'🦊',  color:'#F97316' },
  duck:      { name:'البطة الذهبية',    emoji:'🦆',  color:'#CA8A04' },
  parrot:    { name:'الببغاء الملون',   emoji:'🦜',  color:'#16A34A' },
  flamingo:  { name:'النحامة الوردية',  emoji:'🦩',  color:'#EC4899' },
  explorer:  { name:'المستكشف',          emoji:'🧭',  color:'#22C55E' },
  cyborg:    { name:'الآلة المُدرَّعة', emoji:'🦾',  color:'#EF4444' },
  knight:    { name:'الفارس',            emoji:'⚔️', color:'#EAB308' },
};

const GREETINGS = [
  'بطلك المرافق جاهز معك اليوم!',
  'بجانبك دائماً في رحلة التعلم.',
  'رفيقك في كل خطوة من رحلتك!',
  'رفيقك الأمين في كل خطوة.',
];

export default function DashboardHero3D({ displayName, pendingHw, nextSession, isStudent }) {
  const [cfg,      setCfg]      = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [greeting, setGreeting] = useState('');
  const mvRef = useRef(null);

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
    setGreeting(GREETINGS[Math.floor(Date.now() / 86400000) % GREETINGS.length]);
    if (document.getElementById('hero3d-anim')) return;
    const s = document.createElement('style');
    s.id = 'hero3d-anim';
    s.textContent = HERO3D_CSS;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!isStudent) { setCfg({}); return; }
    fetch('/api/hero-config')
      .then(r => r.json())
      .then(d => {
        setCfg(d);
        if (d.avatar_url?.endsWith('.glb')) loadMvScript();
      })
      .catch(() => setCfg({}));
  }, [isStudent]);

  /* Apply saved tint colour after GLB loads */
  useEffect(() => {
    const mv = mvRef.current;
    if (!mv || !cfg?.avatar_tint) return;
    function applyTint() {
      const mat = mv.model?.materials?.[0];
      if (!mat) return;
      const hex = cfg.avatar_tint.replace('#', '');
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      mat.pbrMetallicRoughness.setBaseColorFactor([r, g, b, 1.0]);
    }
    mv.addEventListener('load', applyTint);
    return () => mv.removeEventListener('load', applyTint);
  }, [cfg?.avatar_tint, cfg?.avatar_url]);

  if (cfg === null) return <div style={{ marginBottom: 28 }} />;

  const avatarUrl = cfg.avatar_url;
  const is3D      = Boolean(avatarUrl?.endsWith?.('.glb'));

  if (!is3D) return <div style={{ marginBottom: 28 }} />;

  const heroId  = cfg.avatar_id ?? 'robot';
  const meta    = HERO_META[heroId] ?? HERO_META.robot;
  const color   = meta.color;

  const statusMsg = pendingHw > 0
    ? `لديك ${pendingHw} واجب${pendingHw === 1 ? '' : 'ات'} معلّقة ⚡`
    : nextSession
      ? 'حصتك القادمة في الأسفل 📅'
      : 'يوم رائع! استمر في التعلم 🌟';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'stretch',
      borderRadius: 24,
      overflow: 'hidden',
      background: `linear-gradient(135deg, ${color}0e 0%, #f8fafc 100%)`,
      border: `1.5px solid ${color}28`,
      boxShadow: `0 6px 28px ${color}14, 0 1px 4px rgba(0,0,0,.06)`,
      marginBottom: 24,
      minHeight: isMobile ? 160 : 200,
      position: 'relative',
      animation: 'h3dSlide .45s ease-out',
    }}>

      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, right: 0,
        background: `radial-gradient(ellipse at right 30%, ${color}18 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />

      {[...Array(5)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          right: `${10 + i * 6}%`,
          top: `${10 + i * 14}%`,
          width: i % 2 === 0 ? 6 : 4,
          height: i % 2 === 0 ? 6 : 4,
          borderRadius: '50%',
          background: color,
          opacity: .2 + i * .06,
          animation: `h3dPulse ${2 + i * 0.4}s ease-in-out infinite`,
          animationDelay: `${i * 0.3}s`,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Left: info */}
      <div style={{
        flex: 1, padding: isMobile ? '18px 16px' : '22px 28px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        gap: 10, zIndex: 1,
        fontFamily: "'Cairo','Tajawal',sans-serif",
      }}>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content',
          background: `${color}18`, border: `1px solid ${color}35`,
          borderRadius: 30, padding: '5px 14px',
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{meta.emoji}</span>
          <span style={{
            color, fontWeight: 800, fontSize: isMobile ? '.78rem' : '.84rem',
            whiteSpace: 'nowrap',
          }}>
            مرافقك: {meta.name}
          </span>
        </div>

        <p style={{
          margin: 0,
          fontSize: isMobile ? '.8rem' : '.9rem',
          color: '#64748b', fontWeight: 600, lineHeight: 1.5,
        }}>
          {greeting}
        </p>

        <p style={{
          margin: 0,
          fontSize: isMobile ? '.75rem' : '.82rem',
          color: pendingHw > 0 ? '#d97706' : '#059669',
          fontWeight: 700,
        }}>
          {statusMsg}
        </p>

        <Link href="/dashboard/heroes-studio" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: color, color: 'white',
          borderRadius: 30, padding: '7px 18px', width: 'fit-content',
          fontSize: '.78rem', fontWeight: 700, textDecoration: 'none',
          boxShadow: `0 4px 14px ${color}44`,
          transition: 'transform .15s, box-shadow .15s',
        }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = `0 6px 20px ${color}66`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = `0 4px 14px ${color}44`;
          }}
        >
          🎨 غيّر بطلك
        </Link>
      </div>

      {/* Right: 3D model */}
      <div style={{
        width: isMobile ? 130 : 200,
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <model-viewer
          ref={mvRef}
          src={avatarUrl}
          poster={cfg.preview_url ?? undefined}
          auto-rotate=""
          auto-rotate-delay="300"
          environment-image="neutral"
          exposure="1.1"
          tone-mapping="commerce"
          style={{
            width: '100%',
            height: '100%',
            minHeight: isMobile ? 160 : 200,
            background: 'transparent',
          }}
        />
      </div>
    </div>
  );
}
