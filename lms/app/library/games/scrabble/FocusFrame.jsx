'use client';
import { useEffect } from 'react';
import Link from 'next/link';

export default function FocusFrame({ children }) {
  useEffect(() => {
    document.documentElement.classList.add('ss-focus');
    return () => document.documentElement.classList.remove('ss-focus');
  }, []);
  return <div className="ss-focus-screen" dir="rtl">
    <header className="ss-focus-header">
      <Link href="/library">✕ خروج</Link>
      <h1>سكرابل الصغار</h1>
    </header>
    <div className="ss-focus-content">{children}</div>
  </div>;
}
