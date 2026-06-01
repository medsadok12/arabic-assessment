'use client';
import { useState } from 'react';
import Link from 'next/link';

const WHATSAPP_HREF = 'https://api.whatsapp.com/send/?phone=447400755914&text&type=phone_number&app_absent=0';

const items = [
  { type: 'a',    href: WHATSAPP_HREF, external: true,  icon: '💬', label: 'تواصل مع الإدارة',       cls: 'fside-item-wa'  },
  { type: 'link', href: '/auth/register/teacher',        icon: '👨‍🏫', label: 'تسجيل حساب معلم',        cls: ''               },
  { type: 'link', href: '/auth/login',                   icon: '🔑', label: 'دخول المعلم',             cls: ''               },
  { type: 'a',    href: '/#about',                       icon: '🌱', label: 'تعرّف على أكاديمية عارم', cls: ''               },
];

export default function FloatingSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <div className={`fside ${open ? 'fside--open' : ''}`} aria-label="قائمة روابط سريعة">

      {/* ── Tab handle — amber colour, always readable ── */}
      <button className="fside-handle" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="fside-handle-icon">◁</span>
        <span className="fside-handle-label">روابط سريعة</span>
      </button>

      {/* ── Sliding panel ── */}
      <div className="fside-panel" aria-hidden={!open}>
        <p className="fside-panel-title">🔗 روابط سريعة</p>
        {items.map(item =>
          item.type === 'link'
            ? (
              <Link key={item.label} href={item.href} className={`fside-item ${item.cls}`}
                onClick={() => setOpen(false)}>
                <span className="fside-item-icon">{item.icon}</span>
                {item.label}
              </Link>
            ) : (
              <a key={item.label} href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className={`fside-item ${item.cls}`}
                onClick={() => setOpen(false)}>
                <span className="fside-item-icon">{item.icon}</span>
                {item.label}
              </a>
            )
        )}
      </div>
    </div>
  );
}
