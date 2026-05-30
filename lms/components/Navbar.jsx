'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase';

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
    // إذا لم يُمرَّر user من الـ server، نجلبه من Supabase
    if (!initialUser) {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => setUser(user ?? null));
    }

    // إغلاق الـ dropdown عند النقر خارجه
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

        {/* ── الشعار ── */}
        <Link href={user ? destPath : '/'} className="navbar-brand">
          <span>📚</span> أكاديمية عارم
        </Link>

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

        {/* ── الجانب الأيسر ── */}
        <div className="navbar-user">
          {user ? (
            <>
              {/* Profile dropdown */}
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
            </>
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
              <Link href="/auth/login"    className="nav-mobile-item" onClick={() => setMenuOpen(false)}>تسجيل الدخول</Link>
              <Link href="/auth/register" className="nav-mobile-item" onClick={() => setMenuOpen(false)}>إنشاء حساب مجاناً</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
