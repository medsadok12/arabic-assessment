'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import TeamChat        from './TeamChat';
import PointsBadge     from './PointsBadge';

/* ── Global style for navbar pulse + points sheet ── */
if (typeof document !== 'undefined' && !document.getElementById('nav-pulse-style')) {
  const s = document.createElement('style');
  s.id = 'nav-pulse-style';
  s.textContent = `
    @keyframes navPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.82;transform:scale(1.04)}}
    @keyframes ptsSheetIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
    @keyframes ptsFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
  `;
  document.head.appendChild(s);
}

/* ── أيقونات التواصل الاجتماعي ── */
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

const socialLinks = [
  { href: 'https://api.whatsapp.com/send/?phone=447400755914&text&type=phone_number&app_absent=0', icon: <WhatsAppIcon />,  label: 'واتساب',   color: '#25D366' },
  { href: 'https://www.instagram.com/aremacademy/',                                                icon: <InstagramIcon />, label: 'انستغرام', color: '#E1306C' },
  { href: 'https://www.facebook.com/Aremacademy',                                                  icon: <FacebookIcon />,  label: 'فيسبوك',   color: '#1877F2' },
];

function SocialIcons({ mobile = false }) {
  return (
    <div style={{
      display: 'flex',
      gap: mobile ? 14 : 8,
      alignItems: 'center',
      ...(mobile ? { justifyContent: 'center', padding: '10px 0' } : {}),
    }}>
      {socialLinks.map(s => (
        <a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.label}
          title={s.label}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: mobile ? 38 : 32, height: mobile ? 38 : 32,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
            color: '#fff',
            transition: 'background .2s, transform .2s',
            textDecoration: 'none',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = s.color;
            e.currentTarget.style.transform  = 'scale(1.15)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
            e.currentTarget.style.transform  = 'scale(1)';
          }}
        >
          {s.icon}
        </a>
      ))}
    </div>
  );
}

/* ── مكوّنات مساعدة ── */
function Initials({ name, size = 34 }) {
  const letters = (name ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg,#185FA5,#1e88e5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.38), fontWeight: 800, color: '#fff', flexShrink: 0,
    }}>
      {letters}
    </div>
  );
}

/* ── Language Toggle ── */
function LangToggle() {
  const { lang, setLang } = useLanguage();
  const next = lang === 'ar' ? 'en' : 'ar';
  return (
    <button
      onClick={() => setLang(next)}
      title={next === 'en' ? 'Switch to English' : 'التبديل للعربية'}
      style={{
        background: 'rgba(255,255,255,0.12)',
        border: '1.5px solid rgba(255,255,255,0.3)',
        borderRadius: 8,
        color: '#fff',
        fontWeight: 700,
        fontSize: '.8rem',
        padding: '5px 10px',
        cursor: 'pointer',
        letterSpacing: '.5px',
        transition: 'background .2s',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.24)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
    >
      {lang === 'ar' ? 'EN' : 'AR'}
    </button>
  );
}

const ROLE_LABELS_AR = { admin: 'مدير', teacher: 'معلم', student: 'طالب', supervisor: 'مرشد' };
const ROLE_LABELS_EN = { admin: 'Admin', teacher: 'Teacher', student: 'Student', supervisor: 'Supervisor' };

const NAV_ICONS = {
  '/dashboard':  '🏠',
  '/bogga':      '⚙️',
  '/teacher':    '🏫',
  '/supervisor': '👁️',
  '/library':    '📚',
};

/* ── Points levels (mirrors PointsBadge — used in mobile sheet) ── */
const PTS_LEVELS = [
  { min: 0,    color: '#D97706', icon: '🌱', name: 'مبتدئ'  },
  { min: 1000, color: '#94A3B8', icon: '⚡', name: 'مستكشف' },
  { min: 2000, color: '#F59E0B', icon: '⭐', name: 'بطل'     },
  { min: 3000, color: '#A78BFA', icon: '💎', name: 'محترف'  },
  { min: 4000, color: '#22D3EE', icon: '🚀', name: 'أسطورة' },
];
const PTS_PER_LVL = 1000;
function getPtsLvl(earned) {
  const idx = Math.min(PTS_LEVELS.length - 1, Math.floor(earned / PTS_PER_LVL));
  return { ...PTS_LEVELS[idx], idx };
}

/* ── Points tab for the bottom nav (students, mobile only) ── */
function PointsBottomItem() {
  const [pts,    setPts]    = useState(0);
  const [earned, setEarned] = useState(0);
  const [open,   setOpen]   = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch('/api/points');
        const j = await r.json();
        setPts(j.points ?? 0);
        setEarned(j.earned ?? 0);
      } catch {}
    }
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, []);

  const lvl      = getPtsLvl(earned);
  const inLevel  = earned - lvl.idx * PTS_PER_LVL;
  const progress = Math.min(100, (inLevel / PTS_PER_LVL) * 100);
  const toNext   = PTS_PER_LVL - inLevel;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="nav-bottom-item"
      >
        <span className="nav-bottom-icon" style={{ fontSize: '1.3rem' }}>{lvl.icon}</span>
        <span className="nav-bottom-label" style={{ color: lvl.color, fontVariantNumeric: 'tabular-nums' }}>
          {earned > 0 ? earned.toLocaleString() : 'نقاطي'}
        </span>
      </button>

      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,.55)',
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: '0 0 74px',
            fontFamily: "'Cairo','Tajawal',sans-serif", direction: 'rtl',
          }}
        >
          <div style={{
            background: 'linear-gradient(160deg,#0f172a,#1e293b)',
            border: `1.5px solid ${lvl.color}45`,
            borderRadius: '24px 24px 20px 20px',
            padding: '20px 20px 24px', width: '100%', maxWidth: 400,
            boxShadow: `0 -8px 40px rgba(0,0,0,.6), 0 0 28px ${lvl.color}18`,
            animation: 'ptsSheetIn .25s ease', color: '#fff',
          }}>
            {/* drag handle */}
            <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 99, margin: '0 auto 18px' }} />

            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                background: `radial-gradient(circle,${lvl.color}28,transparent 70%)`,
                border: `2px solid ${lvl.color}70`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.9rem', boxShadow: `0 0 20px ${lvl.color}40`,
                animation: 'ptsFloat 2.5s ease-in-out infinite',
              }}>{lvl.icon}</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: '1.1rem', color: lvl.color }}>{lvl.name}</div>
                <div style={{ fontSize: '.75rem', color: '#94a3b8', marginTop: 3 }}>
                  {earned.toLocaleString()} نقطة مكتسبة
                </div>
                <div style={{ fontSize: '.72rem', color: '#475569', marginTop: 2 }}>
                  رصيد متاح: <span style={{ color: '#F59E0B', fontWeight: 700 }}>{pts.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* progress */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', marginBottom: 6 }}>
                <span style={{ color: '#94a3b8' }}>
                  {lvl.idx < PTS_LEVELS.length - 1
                    ? `نحو "${PTS_LEVELS[lvl.idx + 1].name}"`
                    : '🏆 أعلى مستوى!'}
                </span>
                <span style={{ fontWeight: 700, color: lvl.color }}>
                  {inLevel.toLocaleString()} / {PTS_PER_LVL.toLocaleString()}
                </span>
              </div>
              <div style={{ height: 9, background: 'rgba(255,255,255,.08)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${progress}%`,
                  background: `linear-gradient(90deg,${lvl.color}70,${lvl.color})`,
                  borderRadius: 99, boxShadow: `0 0 8px ${lvl.color}90`,
                  transition: 'width 1.2s cubic-bezier(.4,0,.2,1)',
                }} />
              </div>
            </div>

            {lvl.idx < PTS_LEVELS.length - 1 && (
              <div style={{ fontSize: '.71rem', color: '#475569', textAlign: 'center', marginBottom: 16 }}>
                {toNext.toLocaleString()} نقطة للمستوى التالي
              </div>
            )}

            {/* levels map */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.08)' }}>
              {PTS_LEVELS.map((l, i) => {
                const reached = earned >= l.min;
                const current = i === lvl.idx;
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: reached ? `${l.color}22` : 'rgba(255,255,255,.04)',
                      border: `1.5px solid ${reached ? l.color + (current ? 'ff' : '70') : 'rgba(255,255,255,.1)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.05rem',
                      boxShadow: current ? `0 0 14px ${l.color}90` : 'none',
                      opacity: reached ? 1 : .28,
                      animation: current ? 'ptsFloat 2s ease-in-out infinite' : 'none',
                    }}>{l.icon}</div>
                    <span style={{
                      fontSize: '.58rem', fontWeight: current ? 800 : 500,
                      color: current ? l.color : reached ? '#64748b' : '#334155',
                    }}>{l.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BottomNav({ navLinks, pathname, role }) {
  const isStudent = role === 'student';
  return (
    <div className="nav-bottom-bar">
      {navLinks.map(l => {
        const icon = l.icon ?? NAV_ICONS[l.href] ?? '📄';
        const active = pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={`nav-bottom-item${active ? ' active' : ''}`}>
            <span className="nav-bottom-icon">{icon}</span>
            <span className="nav-bottom-label">{l.label}</span>
          </Link>
        );
      })}
      {isStudent && (
        <Link
          href="/dashboard/heroes-studio"
          className={`nav-bottom-item${pathname.startsWith('/dashboard/heroes-studio') ? ' active' : ''}`}
        >
          <span className="nav-bottom-icon">🎭</span>
          <span className="nav-bottom-label">استوديو</span>
        </Link>
      )}
      {isStudent && <PointsBottomItem />}
    </div>
  );
}

function dashboardPath(role) {
  if (role === 'admin' || role === 'super_admin') return '/bogga';
  if (role === 'teacher') return '/teacher';
  if (role === 'supervisor') return '/supervisor';
  return '/dashboard';
}

export default function Navbar({ user: initialUser, sessionCountdown = null }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const dropRef   = useRef(null);
  const { t, lang } = useLanguage();

  const [user,     setUser]     = useState(initialUser ?? null);
  const [dropOpen, setDropOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    if (!initialUser) {
      supabase.auth.getUser().then(({ data: { user } }) => setUser(user ?? null));
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Handle both login and logout state changes
      setUser(session?.user ?? null);
    });

    function onOutsideClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => {
      subscription.unsubscribe();
      document.removeEventListener('mousedown', onOutsideClick);
    };
  }, [initialUser]);

  async function handleLogout() {
    setDropOpen(false);
    // Redirect to server-side signout route which clears cookies properly
    window.location.href = '/api/auth/signout';
  }

  const role      = user?.user_metadata?.role ?? 'student';
  const fullName  = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '';
  const avatarURL = user?.user_metadata?.avatar_url ?? null;
  const destPath  = dashboardPath(role);

  const ROLE_LABELS = lang === 'ar' ? ROLE_LABELS_AR : ROLE_LABELS_EN;

  const isAdmin = role === 'admin' || role === 'super_admin';
  const navLinks = [
    {
      href:  destPath,
      label: isAdmin ? t('nav.admin') : t('nav.home'),
      icon:  isAdmin ? '⚙️' : '🏠',
    },
    { href: '/library', label: t('nav.library'), icon: '📚' },
  ];

  return (
    <>
    <nav className="navbar">
      <div className="container navbar-inner">

        {/* ── الجانب الأيمن: الشعار ── */}
        <Link href={user ? destPath : '/'} className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img
            src="/logo.svg"
            alt={t('siteName')}
            style={{ height: 42, width: 42, borderRadius: '50%', flexShrink: 0, display: 'block' }}
          />
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', letterSpacing: '.3px' }}>
            {t('siteName')}
          </span>
        </Link>

        {/* ── الوسط: روابط التنقل (desktop) — تظهر فقط عند تسجيل الدخول ── */}
        {user && (
          <ul className="navbar-links navbar-links-desktop">
            {navLinks.map(l => (
              <li key={l.href}>
                <Link href={l.href} className={pathname.startsWith(l.href) ? 'active' : ''}>
                  {l.icon && <span style={{ fontSize: '1rem', lineHeight: 1 }}>{l.icon}</span>}
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* ── الجانب الأيسر: رابط تعريفي + أيقونات التواصل + أزرار الدخول/الحساب ── */}
        <div className="navbar-user">

          {!user && (
            <Link href="/#about" className="navbar-about-link">
              {t('nav.about')}
            </Link>
          )}

          <div className="navbar-social-desktop" style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 20 }}>
            <SocialIcons />
          </div>

          {sessionCountdown && (
            <div style={{
              background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
              color: '#fff', borderRadius: 20, padding: '5px 14px',
              fontSize: '.82rem', fontWeight: 900, letterSpacing: '.5px',
              fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
              boxShadow: '0 0 12px rgba(220,38,38,.5)',
              animation: 'navPulse 1.5s ease-in-out infinite',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>⏱️</span> {sessionCountdown}
            </div>
          )}

          <LangToggle />

          {!user && (
            <Link
              href="/auth/login?for=student"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '.88rem',
                padding: '7px 14px',
                borderRadius: 10,
                textDecoration: 'none',
                border: '1.5px solid rgba(255,255,255,0.35)',
                transition: 'background .2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.26)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            >
              {t('nav.studentPortal')}
            </Link>
          )}

          {user ? (
            <div className="nav-dropdown" ref={dropRef}>
              <button
                className="nav-avatar-btn"
                onClick={() => setDropOpen(o => !o)}
                aria-label="قائمة المستخدم"
              >
                {avatarURL
                  ? <img src={avatarURL} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,.5)' }} />
                  : <Initials name={fullName} />
                }
                <span className="nav-username">{fullName}</span>
                <span style={{ fontSize: 10, opacity: .65, marginRight: 2 }}>▾</span>
              </button>

              {dropOpen && (
                <div className="nav-dropdown-menu">
                  <div className="nav-dropdown-header">
                    <div style={{ fontWeight: 700, fontSize: '.92rem' }}>{fullName}</div>
                    <div style={{ fontSize: '.78rem', opacity: .65 }}>{ROLE_LABELS[role] ?? t('nav.roleStudent')}</div>
                  </div>
                  <Link href="/profile" className="nav-dropdown-item" onClick={() => setDropOpen(false)}>
                    {t('nav.profile')}
                  </Link>
                  <Link href={destPath} className="nav-dropdown-item" onClick={() => setDropOpen(false)}>
                    {t('nav.dashboard')}
                  </Link>
                  <div className="nav-dropdown-divider" />
                  <button className="nav-dropdown-item nav-dropdown-logout" onClick={handleLogout}>
                    {t('nav.signOut')}
                  </button>
                </div>
              )}
            </div>
          ) : null}

        </div>
      </div>

    </nav>
    <TeamChat user={user} />
    {user && <BottomNav navLinks={navLinks} pathname={pathname} role={role} />}
    {user && role === 'student' && <PointsBadge />}
    </>
  );
}
