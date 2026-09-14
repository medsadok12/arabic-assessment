'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';

const PLACEHOLDER_AVATAR = 'https://uqspozzkzyytwwidojxv.supabase.co/storage/v1/object/public/media/team/placeholder.png';

const COLORS = [
  { name: 'أزرق ملكي',   hex: '#1A2B4A', role: 'الهوية الأساسية / Navbar / عناوين' },
  { name: 'ذهبي دافئ',   hex: '#E8B84B', role: 'أزرار CTA / شعار "ع"' },
  { name: 'بنفسجي فهيم', hex: '#7C5CD9', role: 'شخصية فهيم حصراً' },
  { name: 'كريمي / ترابي',hex: '#F4EFE6', role: 'خلفية الصفحة' },
  { name: 'أخضر النجاح',  hex: '#2ABB7A', role: 'علامات الصح / الإنجاز' },
];

function AvatarDemo({ size, label }) {
  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size, borderRadius: '50%', overflow: 'hidden', border: '2px solid #1A2B4A' }}>
        <div style={{ width: size, height: size, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 800, color: '#1A2B4A' }}>م</div>
      </div>
      <span style={{ fontSize: '.72rem', color: '#64748b' }}>{label} ({size}px)</span>
    </div>
  );
}

function AccessibleButtonDemo({ label, ariaLabel, icon, variant = 'default' }) {
  const [hovered, setHovered] = useState(false);
  const base = {
    border: 'none', cursor: 'pointer', borderRadius: 10, padding: '8px 14px',
    display: 'flex', alignItems: 'center', gap: 6, fontSize: '.88rem', fontWeight: 700,
    transition: 'opacity .15s',
    opacity: hovered ? .8 : 1,
  };
  const styles = {
    default:   { ...base, background: '#f1f5f9', color: '#334155' },
    primary:   { ...base, background: '#1A2B4A', color: '#fff' },
    golden:    { ...base, background: '#E8B84B', color: '#1A2B4A' },
    danger:    { ...base, background: 'none', color: '#dc2626' },
    icon_only: { ...base, background: 'none', color: '#64748b', padding: '6px' },
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
      <button
        style={styles[variant]}
        aria-label={ariaLabel}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {icon && <span>{icon}</span>}
        {label}
      </button>
      <code style={{ fontSize: '.62rem', color: '#94a3b8', background: '#f8fafc', padding: '2px 6px', borderRadius: 5 }}>
        aria-label=&quot;{ariaLabel}&quot;
      </code>
    </div>
  );
}

export default function UIPreviewPage() {
  return (
    <>
      <main style={{ minHeight: '100vh', background: '#F4EFE6', padding: '28px 0', direction: 'rtl' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/dashboard" className="btn btn-outline btn-sm">← لوحتي</Link>
            <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1A2B4A' }}>
              🎨 معاينة مرئية — UI Preview
            </h1>
            <span style={{ background: '#fef9c3', color: '#854d0e', borderRadius: 20, padding: '2px 12px', fontSize: '.72rem', fontWeight: 700, border: '1px solid #fde68a' }}>
              صفحة داخلية مؤقتة
            </span>
          </div>

          {/* ─── لوحة الألوان ─── */}
          <section style={{ background: '#fff', borderRadius: 18, padding: '20px 22px', boxShadow: '0 2px 12px rgba(26,43,74,.08)' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '.95rem', fontWeight: 800, color: '#1A2B4A' }}>🎨 لوحة الألوان الرسمية</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {COLORS.map(c => (
                <div key={c.hex} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', borderRadius: 12, padding: '10px 14px', minWidth: 200 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: c.hex, border: c.hex === '#F4EFE6' ? '1.5px solid #d1c4ad' : 'none', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.82rem', color: '#1e293b' }}>{c.name}</div>
                    <div style={{ fontSize: '.7rem', color: '#64748b', fontFamily: 'monospace' }}>{c.hex}</div>
                    <div style={{ fontSize: '.68rem', color: '#94a3b8', marginTop: 2 }}>{c.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ─── next/image — أحجام الأفاتار ─── */}
          <section style={{ background: '#fff', borderRadius: 18, padding: '20px 22px', boxShadow: '0 2px 12px rgba(26,43,74,.08)' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '.95rem', fontWeight: 800, color: '#1A2B4A' }}>🖼️ next/image — أحجام الأفاتار</h2>
            <p style={{ margin: '0 0 16px', fontSize: '.78rem', color: '#64748b' }}>
              جميع وسوم <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>&lt;img&gt;</code> التالية محوَّلة لـ <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>next/image</code> مع lazy loading وتحويل AVIF/WebP تلقائي.
            </p>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <AvatarDemo size={34} label="Navbar" />
              <AvatarDemo size={46} label="قائمة الدردشة" />
              <AvatarDemo size={80} label="صفحة الملف" />
              <AvatarDemo size={96} label="صفحة الفريق" />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 96, height: 96, borderRadius: 18, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', border: '2px solid #1A2B4A' }}>👤</div>
                <span style={{ fontSize: '.72rem', color: '#64748b' }}>بديل نصي (Initials)</span>
              </div>
            </div>
            <div style={{ marginTop: 14, padding: '10px 14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0', fontSize: '.74rem', color: '#166534' }}>
              ✅ المجالات المسموح بها في <code>next.config.js</code>: <strong>*.supabase.co</strong> · <strong>*.supabase.in</strong> · <strong>lh3.googleusercontent.com</strong> (Google OAuth)
            </div>
          </section>

          {/* ─── Accessibility — aria-label ─── */}
          <section style={{ background: '#fff', borderRadius: 18, padding: '20px 22px', boxShadow: '0 2px 12px rgba(26,43,74,.08)' }}>
            <h2 style={{ margin: '0 0 6px', fontSize: '.95rem', fontWeight: 800, color: '#1A2B4A' }}>♿ سهولة الوصول — aria-label</h2>
            <p style={{ margin: '0 0 16px', fontSize: '.78rem', color: '#64748b' }}>
              الأزرار التي تحتوي أيقونات فقط تحتاج <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4 }}>aria-label</code> حتى يفهمها قارئ الشاشة.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
              <AccessibleButtonDemo icon="‹"  label="" ariaLabel="العودة للمحادثات" variant="icon_only" />
              <AccessibleButtonDemo icon="🗑️" label="" ariaLabel="محو الرسائل" variant="icon_only" />
              <AccessibleButtonDemo icon="✕"  label="" ariaLabel="إغلاق نافذة الدردشة" variant="icon_only" />
              <AccessibleButtonDemo icon="✕"  label="" ariaLabel="إلغاء الرد" variant="icon_only" />
              <AccessibleButtonDemo icon="✕"  label="" ariaLabel="إلغاء وضع المهمة" variant="icon_only" />
            </div>
            <div style={{ marginTop: 16, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
              <p style={{ margin: '0 0 10px', fontSize: '.78rem', fontWeight: 700, color: '#475569' }}>أنواع الأزرار حسب لوحة الألوان:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <AccessibleButtonDemo label="ابدأ الآن" icon="▶" ariaLabel="ابدأ الآن" variant="golden" />
                <AccessibleButtonDemo label="حفظ" ariaLabel="حفظ التعديلات" variant="primary" />
                <AccessibleButtonDemo label="إلغاء" ariaLabel="إلغاء العملية" variant="default" />
                <AccessibleButtonDemo label="حذف" ariaLabel="حذف العنصر" variant="danger" />
              </div>
            </div>
          </section>

          {/* ─── ملخص التغييرات ─── */}
          <section style={{ background: '#fff', borderRadius: 18, padding: '20px 22px', boxShadow: '0 2px 12px rgba(26,43,74,.08)' }}>
            <h2 style={{ margin: '0 0 14px', fontSize: '.95rem', fontWeight: 800, color: '#1A2B4A' }}>📋 ملخص التغييرات المنفَّذة</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { file: 'next.config.js',              change: 'أضيف lh3.googleusercontent.com لـ remotePatterns (صور Google OAuth)' },
                { file: 'components/Navbar.jsx',        change: 'Avatar 34×34 → next/image مع lazy loading تلقائي' },
                { file: 'components/TeamShowcase.jsx',  change: 'صور الفريق → next/image مع fill + objectFit: cover' },
                { file: 'components/TeamChat.jsx',      change: 'Avatar ديناميكي → next/image · 5 أزرار أُضيف لها aria-label' },
                { file: 'components/AvatarShop.jsx',    change: 'معاينة الأفاتار الرئيسية → next/image (sprite الجسم يبقى img — لا يدعم next/image الإزاحة السالبة)' },
                { file: 'app/profile/page.jsx',         change: 'Avatar 80×80 مع onError → next/image' },
              ].map(({ file, change }) => (
                <div key={file} style={{ display: 'flex', gap: 12, padding: '8px 12px', borderRadius: 10, background: '#f8fafc', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '.75rem', fontWeight: 800, color: '#1A2B4A', background: '#dbeafe', borderRadius: 6, padding: '2px 8px', flexShrink: 0, marginTop: 1, fontFamily: 'monospace' }}>{file}</span>
                  <span style={{ fontSize: '.78rem', color: '#475569' }}>{change}</span>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>
    </>
  );
}
