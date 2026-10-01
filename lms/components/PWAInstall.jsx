'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// Admin-area paths where the install prompt must not appear
const ADMIN_PATHS = ['/bogga', '/teacher', '/supervisor', '/dashboard', '/profile'];

export default function PWAInstall() {
  const pathname   = usePathname();
  const [prompt,      setPrompt]      = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showUpdate,  setShowUpdate]  = useState(false);
  const [isIOS,       setIsIOS]       = useState(false);
  const [visible,     setVisible]     = useState(false);
  const [isMobile,    setIsMobile]    = useState(false);
  const [mounted,     setMounted]     = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // تسجيل الـService Worker واكتشاف الإصدارات الجديدة — دائماً وبلا أي شرط.
    // (خلل سابق مُصلَح: كان هذا الجزء خلف شرط pwa-dismiss، فأي مستخدم أغلق
    // بطاقة التثبيت خلال 5 أيام لا يصله إشعار "يوجد إصدار جديد" إطلاقاً،
    // وتبقى تبويباته المفتوحة على نسخة قديمة بلا أي تنبيه)
    let swInterval;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        if (reg.waiting) { setShowUpdate(true); return; }
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          sw?.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              setShowUpdate(true);
            }
          });
        });
        swInterval = setInterval(() => reg.update(), 60_000);
      }).catch(() => {});
    }

    const baseCleanup = () => {
      window.removeEventListener('resize', checkMobile);
      if (swInterval) clearInterval(swInterval);
    };

    // Already installed as standalone — don't show the install UI
    if (window.matchMedia('(display-mode: standalone)').matches) return baseCleanup;

    // Dismissed within 5 days — skip the install prompt only (not SW updates)
    const ts = localStorage.getItem('pwa-dismiss');
    if (ts && Date.now() - Number(ts) < 5 * 864e5) return baseCleanup;

    // Detect iOS Safari (no beforeinstallprompt support)
    const ua     = navigator.userAgent;
    const ios    = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);
    const safari = ios && /Safari/i.test(ua) && !/CriOS|FxiOS/i.test(ua);
    setIsIOS(ios && safari);

    // Android/Desktop Chrome install prompt
    const handler = e => {
      e.preventDefault();
      setPrompt(e);
      setTimeout(() => { setShowInstall(true); setTimeout(() => setVisible(true), 30); }, 4000);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Show iOS prompt after delay
    if (ios && safari) {
      setTimeout(() => { setShowInstall(true); setTimeout(() => setVisible(true), 30); }, 5000);
    }

    return () => {
      baseCleanup();
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  async function handleInstall() {
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') close();
      setPrompt(null);
    }
  }

  function close() {
    setVisible(false);
    setTimeout(() => setShowInstall(false), 350);
    localStorage.setItem('pwa-dismiss', Date.now().toString());
  }

  function applyUpdate() {
    // الـSW الجديد يفعّل نفسه ذاتياً (skipWaiting في install)، فقد يكون
    // controllerchange وقع قبل الضغط — إعادة التحميل المباشرة هي الضمانة
    try { navigator.serviceWorker.controller?.postMessage('skipWaiting'); } catch {}
    setTimeout(() => window.location.reload(), 250);
  }

  // Don't render anything until client is mounted (prevents hydration mismatch)
  if (!mounted) return null;

  const onAdminPath = ADMIN_PATHS.some(p => pathname?.startsWith(p));

  return (
    <>
      <style>{`
        /* ── desktop card animations (keep translateX so centering is preserved) ── */
        @keyframes pwa-slide-up   { from { transform:translateX(-50%) translateY(100%); opacity:0; } to { transform:translateX(-50%) translateY(0); opacity:1; } }
        @keyframes pwa-slide-down { from { transform:translateX(-50%) translateY(0);    opacity:1; } to { transform:translateX(-50%) translateY(100%); opacity:0; } }
        /* ── mobile strip animations ── */
        @keyframes pwa-strip-up   { from { transform:translateY(100%); opacity:0; } to { transform:translateY(0); opacity:1; } }
        @keyframes pwa-strip-down { from { transform:translateY(0); opacity:1; } to { transform:translateY(100%); opacity:0; } }
        /* ── update banner ── */
        @keyframes pwa-banner-in  { from { transform:translateY(-100%); opacity:0; } to { transform:translateY(0); opacity:1; } }

        .pwa-card      { animation: pwa-slide-up   .4s  cubic-bezier(.34,1.56,.64,1) forwards; }
        .pwa-hide      { animation: pwa-slide-down .35s ease forwards; }
        .pwa-strip-in  { animation: pwa-strip-up   .35s cubic-bezier(.34,1.56,.64,1) forwards; }
        .pwa-strip-out { animation: pwa-strip-down .3s  ease forwards; }
        .pwa-banner    { animation: pwa-banner-in  .3s  ease forwards; }

        .pwa-btn-install:hover  { filter: brightness(1.1); }
        .pwa-btn-install:active { transform: scale(.97); }
        .pwa-btn-update:hover   { background: #1d4ed8 !important; }

        /* ── desktop floating card ── */
        .pwa-install-card {
          position: fixed; bottom: 28px; left: 50%;
          transform: translateX(-50%);
          width: min(92vw, 400px);
          background: #fff; border-radius: 24px;
          box-shadow: 0 20px 60px rgba(26,43,74,.22), 0 4px 16px rgba(0,0,0,.08);
          border: 1.5px solid rgba(26,43,74,.12);
          z-index: 99998; direction: rtl; overflow: hidden;
        }

        /* ── mobile compact strip (above bottom nav) ── */
        .pwa-mob-strip {
          position: fixed; bottom: 76px; left: 0; right: 0;
          z-index: 99998; background: #fff;
          border-top: 2px solid rgba(26,43,74,.18);
          box-shadow: 0 -6px 24px rgba(26,43,74,.14);
          border-radius: 16px 16px 0 0;
          overflow: hidden; direction: rtl;
        }
      `}</style>

      {/* ── Update Banner (top) ── */}
      {showUpdate && (
        <div className="pwa-banner" style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
          background: 'linear-gradient(135deg,#0d1f38,#1A2B4A)',
          color: '#fff', direction: 'rtl',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 14, padding: '10px 20px',
          boxShadow: '0 4px 20px rgba(26,43,74,.4)',
        }}>
          <span style={{ fontSize: '1.1rem' }}>🔄</span>
          <span style={{ fontWeight: 700, fontSize: '.92rem' }}>يوجد إصدار جديد من التطبيق</span>
          <button onClick={applyUpdate} className="pwa-btn-update" style={{
            background: '#fff', color: '#1A2B4A', border: 'none', borderRadius: 8,
            padding: '6px 16px', fontWeight: 800, fontSize: '.85rem',
            cursor: 'pointer', fontFamily: 'inherit', transition: 'background .15s',
          }}>تحديث الآن</button>
          <button onClick={() => setShowUpdate(false)} style={{
            background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff',
            borderRadius: 6, width: 26, height: 26, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', fontWeight: 700,
          }}>×</button>
        </div>
      )}

      {/* ── Install prompt (hidden on admin/authenticated paths) ── */}
      {showInstall && !onAdminPath && (
        isMobile ? (
          /* ── Mobile: compact strip above bottom nav ── */
          <div className={`pwa-mob-strip ${visible ? 'pwa-strip-in' : 'pwa-strip-out'}`}>
            {/* accent line */}
            <div style={{ height: 3, background: 'linear-gradient(90deg,#1A2B4A,#E8B84B,#1A2B4A)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px 13px' }}>
              {/* small app icon */}
              <div style={{
                width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                background: 'linear-gradient(135deg,#1A2B4A,#0d1f38)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 3px 10px rgba(26,43,74,.3)',
              }}>
                <img src="/logo.svg" alt="عارم" width={26} height={26} style={{ filter: 'brightness(1.1)' }} />
              </div>

              {/* text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '.88rem', color: '#0f172a' }}>أكاديمية عارم</div>
                <div style={{ fontSize: '.72rem', color: '#64748b', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isIOS
                    ? '⬆️ اضغط "مشاركة" ثم "أضف إلى الشاشة الرئيسية"'
                    : 'ثبّت التطبيق مجاناً على جهازك 📲'}
                </div>
              </div>

              {/* install / close */}
              {!isIOS && (
                <button onClick={handleInstall} className="pwa-btn-install" style={{
                  background: 'linear-gradient(135deg,#1A2B4A,#2d4373)',
                  color: '#fff', border: 'none', borderRadius: 10,
                  padding: '8px 14px', fontWeight: 800, fontSize: '.8rem',
                  cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                  transition: 'filter .15s, transform .1s',
                }}>تثبيت</button>
              )}
              <button onClick={close} style={{
                background: '#f1f5f9', border: 'none', borderRadius: 8,
                width: 30, height: 30, cursor: 'pointer', color: '#94a3b8',
                fontSize: '1.1rem', fontWeight: 700, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
            </div>
          </div>
        ) : (
          /* ── Desktop: floating card ── */
          <div className={`pwa-install-card ${visible ? 'pwa-card' : 'pwa-hide'}`}>

            {/* top gradient stripe */}
            <div style={{ height: 4, background: 'linear-gradient(90deg,#1A2B4A,#E8B84B,#1A2B4A)', backgroundSize: '200% 100%' }} />

            <div style={{ padding: '22px 24px 20px' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                <div style={{
                  width: 58, height: 58, borderRadius: 16, flexShrink: 0,
                  background: 'linear-gradient(135deg,#1A2B4A,#0d1f38)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(26,43,74,.35)',
                }}>
                  <img src="/logo.svg" alt="عارم" width={38} height={38} style={{ filter: 'brightness(1.1)' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a' }}>أكاديمية عارم</div>
                  <div style={{ fontSize: '.78rem', color: '#64748b', marginTop: 2, fontWeight: 500 }}>
                    {isIOS ? 'أضف التطبيق إلى الشاشة الرئيسية' : 'ثبّت التطبيق على جهازك'}
                  </div>
                </div>
                <button onClick={close} style={{
                  background: '#f1f5f9', border: 'none', borderRadius: 8,
                  width: 30, height: 30, cursor: 'pointer', color: '#94a3b8',
                  fontSize: '1.1rem', fontWeight: 700, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>×</button>
              </div>

              {/* Feature chips */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                {['⚡ سريع', '📶 بدون انترنت', '🔔 إشعارات'].map(f => (
                  <span key={f} style={{
                    background: '#f0f6ff', color: '#1A2B4A', borderRadius: 20,
                    padding: '4px 11px', fontSize: '.75rem', fontWeight: 700,
                    border: '1px solid #bfdbfe',
                  }}>{f}</span>
                ))}
              </div>

              {/* iOS instructions */}
              {isIOS ? (
                <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', marginBottom: 16, border: '1.5px solid #e2e8f0' }}>
                  <div style={{ fontSize: '.85rem', color: '#334155', lineHeight: 1.8 }}>
                    <div>١. اضغط زر <strong>المشاركة</strong> <span style={{ fontSize: '1.1rem' }}>⬆️</span> أسفل الشاشة</div>
                    <div>٢. اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong></div>
                    <div>٣. اضغط <strong>إضافة</strong> في الأعلى</div>
                  </div>
                </div>
              ) : (
                <button onClick={handleInstall} className="pwa-btn-install" style={{
                  width: '100%', background: 'linear-gradient(135deg,#1A2B4A,#2d4373)',
                  color: '#fff', border: 'none', borderRadius: 14,
                  padding: '13px 0', fontWeight: 800, fontSize: '1rem',
                  cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, boxShadow: '0 4px 18px rgba(26,43,74,.4)',
                  transition: 'filter .15s, transform .1s',
                }}>
                  <span style={{ fontSize: '1.15rem' }}>📲</span>
                  تثبيت التطبيق مجاناً
                </button>
              )}

              <button onClick={close} style={{
                width: '100%', background: 'none', border: 'none',
                color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '.83rem', fontWeight: 600, padding: '6px 0',
              }}>لاحقاً</button>
            </div>
          </div>
        )
      )}
    </>
  );
}
