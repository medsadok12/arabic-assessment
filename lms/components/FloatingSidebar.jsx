'use client';
import Link from 'next/link';
import { MessageCircle, UserPlus, LogIn } from 'lucide-react';

const WHATSAPP_HREF = 'https://api.whatsapp.com/send/?phone=447400755914&text&type=phone_number&app_absent=0';

const ITEMS = [
  {
    type: 'link', href: '/auth/register',
    Icon: UserPlus, label: 'تسجيل\nالطالب', cls: 'fsr-reg',
  },
  {
    type: 'link', href: '/auth/login',
    Icon: LogIn, label: 'دخول\nالطالب', cls: 'fsr-login',
  },
  {
    type: 'a', href: WHATSAPP_HREF, external: true,
    Icon: MessageCircle, label: 'تواصل\nمعنا', cls: 'fsr-wa',
  },
];

function RailItem({ type, href, external, Icon, label, cls }) {
  const inner = (
    <>
      <span className="fsr-icon"><Icon size={22} strokeWidth={1.7} /></span>
      <span className="fsr-label">{label}</span>
    </>
  );
  const shared = { className: `fsr-item ${cls}` };

  if (type === 'link') return <Link href={href} {...shared}>{inner}</Link>;
  return (
    <a href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      {...shared}>
      {inner}
    </a>
  );
}

export default function FloatingSidebar() {
  return (
    <nav className="fsr" aria-label="روابط الطالب السريعة">
      {ITEMS.map(item => <RailItem key={item.label} {...item} />)}
    </nav>
  );
}
