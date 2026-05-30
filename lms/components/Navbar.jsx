'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase';

function Initials({ name }) {
  const letters = (name ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%',
      background: 'linear-gradient(135deg,#185FA5,#1e88e5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
    }}>
      {letters}
    </div>
  );
}

export default function Navbar({ user }) {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const links = [
    { href: '/dashboard', label: 'الرئيسية' },
    { href: '/library',   label: 'المكتبة'  },
  ];

  if (user?.user_metadata?.role === 'admin') {
    links.push({ href: '/admin', label: 'الإدارة' });
  }

  const fullName  = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '';
  const avatarURL = user?.user_metadata?.avatar_url ?? null;

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link href="/dashboard" className="navbar-brand">
          <span>📚</span> أكاديمية عارم
        </Link>
        <ul className="navbar-links">
          {links.map(l => (
            <li key={l.href}>
              <Link href={l.href} className={pathname.startsWith(l.href) ? 'active' : ''}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="navbar-user" style={{ gap: 10 }}>
          <Link href="/profile" title="الملف الشخصي" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            {avatarURL
              ? <img src={avatarURL} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,.5)' }} />
              : <Initials name={fullName} />
            }
          </Link>
          <button className="btn-logout" onClick={handleLogout}>خروج</button>
        </div>
      </div>
    </nav>
  );
}
