'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase';

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
    { href: '/dashboard',  label: 'الرئيسية' },
    { href: '/assessment', label: 'التقييم' },
    { href: '/library',    label: 'المكتبة' },
  ];

  if (user?.user_metadata?.role === 'admin') {
    links.push({ href: '/admin', label: 'الإدارة' });
  }

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
        <div className="navbar-user">
          <span>{user?.user_metadata?.full_name ?? user?.email?.split('@')[0]}</span>
          <button className="btn-logout" onClick={handleLogout}>خروج</button>
        </div>
      </div>
    </nav>
  );
}
