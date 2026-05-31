'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase';

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

const ROLE_LABELS = { admin: 'مدير', teacher: 'معلم', student: 'طالب' };

function dashboardPath(role) {
  if (role === 'admin')   return '/admin';
  if (role === 'teacher') return '/dashboard';
  return '/dashboard';
}

export default function Navbar({ user: initialUser }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const dropRef   = useRef(null);

  const [user,     setUser]     = useState(initialUser ?? null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);

  useEffect(() => {
    if (!initialUser) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => setUser(user ?? null));
    }

    function onOutsideClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, [initialUser]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setMenuOpen(false);
    setDropOpen(false);
    router.push('/');
    router.refresh();
  }

  const role      = user?.user_metadata?.role ?? 'student';
  const fullName  = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '';
  const avatarURL = user?.user_metadata?.avatar_url ?? null;
  const destPath  = dashboardPath(role);

  const navLinks = [
    { href: '/dashboard', label: 'الرئيسية' },
    { href: '/library',   label: 'المكتبة'  },
    ...(role === 'admin' ? [{ href: '/admin', label: 'الإدارة' }] : []),
  ];

  return (
    <nav className="navbar">
      <div className="container navbar-inner">

        {/* ── الجانب الأيمن: الشعار + رابط تعريفي ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <Link href={user ? destPath : '/'} className="navbar-brand">
            <span>📚</span> أكاديمية عارم
          </Link>
          <Link
            href="/#about"
            style={{
              fontSize: '.78rem',
              color: 'rgba(255,255,255,.7)',
              textDecoration: 'none',
              borderRight: '1px solid rgba(255,255,255,.25)',
              paddingRight: 16,
              whiteSpace: 'nowrap',
              transition: 'color .2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.7)'}
            className="navbar-about-link"
          >
            تعرّف على أكاديمية عارم
          </Link>
        </div>

        {/* ── روابط التنقل (desktop) — تظهر فقط عند تسجيل الدخول ── */}
        {user && (
          <ul className="navbar-links navbar-links-desktop">
            {navLinks.map(l => (
              <li key={l.href}>
                <Link href={l.href} className={pathname.startsWith(l.href) ? 'active' : ''}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* ── الجانب الأيسر: أيقونات التواصل + أزرار الدخول/الحساب ── */}
        <div className="navbar-user">

          {/* أيقونات التواصل الاجتماعي — desktop فقط */}
          <div className="navbar-social-desktop">
            <SocialIcons />
          </div>

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
                    <div style={{ fontSize: '.78rem', opacity: .65 }}>{ROLE_LABELS[role] ?? 'طالب'}</div>
                  </div>
                  <Link href="/profile" className="nav-dropdown-item" onClick={() => setDropOpen(false)}>
                    👤 الملف الشخصي
                  </Link>
                  <Link href={destPath} className="nav-dropdown-item" onClick={() => setDropOpen(false)}>
                    🏠 لوحة التحكم
                  </Link>
                  <div className="nav-dropdown-divider" />
                  <button className="nav-dropdown-item nav-dropdown-logout" onClick={handleLogout}>
                    🚪 تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="nav-auth-btns">
              <Link href="/auth/login" className="btn btn-outline btn-sm nav-btn-ghost">دخول</Link>
              <Link href="/auth/register" className="btn btn-accent btn-sm">تسجيل</Link>
            </div>
          )}

          {/* ── Hamburger (mobile) ── */}
          <button
            className="nav-hamburger"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="القائمة"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* ── Mobile Menu ── */}
      {menuOpen && (
        <div className="nav-mobile-menu">
          {/* أيقونات التواصل في الموبايل */}
          <div style={{ borderBottom: '1px solid rgba(255,255,255,.1)', paddingBottom: 12, marginBottom: 4 }}>
            <div style={{ fontSize: '.75rem', color: 'rgba(255,255,255,.5)', textAlign: 'center', marginBottom: 8 }}>
              تواصل معنا
            </div>
            <SocialIcons mobile />
          </div>

          {user ? (
            <>
              <div className="nav-mobile-user">
                {avatarURL
                  ? <img src={avatarURL} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                  : <Initials name={fullName} size={40} />
                }
                <div>
                  <div style={{ fontWeight: 700 }}>{fullName}</div>
                  <div style={{ fontSize: '.8rem', opacity: .65 }}>{ROLE_LABELS[role] ?? 'طالب'}</div>
                </div>
              </div>
              {navLinks.map(l => (
                <Link key={l.href} href={l.href} className="nav-mobile-item" onClick={() => setMenuOpen(false)}>
                  {l.label}
                </Link>
              ))}
              <Link href="/profile" className="nav-mobile-item" onClick={() => setMenuOpen(false)}>
                👤 الملف الشخصي
              </Link>
              <div className="nav-mobile-divider" />
              <button className="nav-mobile-item nav-mobile-logout" onClick={handleLogout}>
                🚪 تسجيل الخروج
              </button>
            </>
          ) : (
            <>
              <Link href="/#about"        className="nav-mobile-item" onClick={() => setMenuOpen(false)}>تعرّف على أكاديمية عارم</Link>
              <Link href="/auth/login"    className="nav-mobile-item" onClick={() => setMenuOpen(false)}>تسجيل الدخول</Link>
              <Link href="/auth/register" className="nav-mobile-item" onClick={() => setMenuOpen(false)}>إنشاء حساب مجاناً</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
