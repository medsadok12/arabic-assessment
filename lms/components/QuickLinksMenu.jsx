'use client';
import { useEffect, useRef, useState } from 'react';

// قائمة روابط المنصة السريعة — ثابتة في الكود عمداً (روابط بنية تحتية
// لا محتوى إداري متغيّر)، بنفس نمط الإغلاق عند النقر خارج القائمة والـz-index
// المعتمدَين فعلياً في NotificationBell.jsx المجاور لهذا الزر.
const LINKS = [
  { icon: '🌐', label: 'المنصة الرئيسية',                 url: 'https://www.aarem.net' },
  { icon: '🏰', label: 'حصن الإدارة',                     url: 'https://www.aarem.net/bogga' },
  { icon: '📝', label: 'نظام التقييم التشخيصي الرئيسي',    url: 'https://assessment.aarem.net' },
  { icon: '🐣', label: 'اختبار المهارات للمبتدئين',        url: 'https://assessment.aarem.net/?skills=beginner' },
  { icon: '⚡', label: 'التقييم السريع',                   url: 'https://assessment.aarem.net/?quick=1' },
  { icon: '📋', label: 'استبانة الاستشارة التعليمية',       url: 'https://www.aarem.net/survey' },
];

export default function QuickLinksMenu({ lang = 'ar' }) {
  const [open, setOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function copyLink(url) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(c => (c === url ? null : c)), 1600);
    } catch (_) {}
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* زر الوصول السريع */}
      <button
        onClick={() => setOpen(o => !o)}
        title={lang === 'ar' ? 'روابط المنصة السريعة' : 'Quick platform links'}
        style={{
          position: 'relative',
          background: open ? 'var(--primary)' : 'var(--accent)',
          border: '1.5px solid var(--accent)',
          borderRadius: 10, width: 40, height: 40,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', transition: 'all .15s',
          color: open ? '#fff' : 'var(--primary)',
        }}>
        🔗
      </button>

      <style>{`
        @media (max-width: 640px) {
          .quicklinks-dropdown {
            position: fixed !important;
            top: 70px !important;
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%);
            width: calc(100vw - 24px) !important;
            max-width: 360px !important;
            max-height: calc(100vh - 100px) !important;
          }
        }
      `}</style>

      {/* القائمة المنسدلة */}
      {open && (
        <div className="quicklinks-dropdown" style={{
          position: 'absolute', top: 46, left: 0,
          width: 320, maxHeight: 440, overflowY: 'auto',
          background: '#fff', borderRadius: 14,
          boxShadow: '0 8px 32px rgba(26,43,74,.18)',
          border: '1px solid var(--border)', zIndex: 9999,
          direction: 'rtl',
        }}>
          <div style={{
            padding: '14px 16px 10px',
            borderBottom: '1px solid var(--border)',
            position: 'sticky', top: 0, background: '#fff', zIndex: 1,
          }}>
            <span style={{ fontWeight: 800, fontSize: '.95rem', color: 'var(--primary)' }}>
              {lang === 'ar' ? '🔗 روابط المنصة السريعة' : '🔗 Quick Platform Links'}
            </span>
          </div>

          {LINKS.map(link => (
            <div
              key={link.url}
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1, minWidth: 0,
                  display: 'flex', alignItems: 'center', gap: 10,
                  textDecoration: 'none', color: 'var(--text)',
                }}
              >
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{link.icon}</span>
                <span style={{ fontSize: '.85rem', fontWeight: 600, wordBreak: 'break-word' }}>
                  {link.label}
                </span>
              </a>
              <button
                onClick={() => copyLink(link.url)}
                title={lang === 'ar' ? 'نسخ الرابط' : 'Copy link'}
                style={{
                  flexShrink: 0,
                  background: copiedUrl === link.url ? 'var(--accent)' : 'var(--primary-lt)',
                  border: 'none', borderRadius: 8,
                  width: 30, height: 30,
                  cursor: 'pointer', fontSize: '.85rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background .15s',
                }}
              >
                {copiedUrl === link.url ? '✅' : '📋'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
