'use client';
import { useEffect, useState } from 'react';

export default function PWAInstall() {
  const [prompt,      setPrompt]      = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showUpdate,  setShowUpdate]  = useState(false);
  const [isIOS,       setIsIOS]       = useState(false);
  const [visible,     setVisible]     = useState(false); // animation trigger

  useEffect(() => {
    // Already installed as standalone — don't show
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Dismissed within 5 days — skip
    const ts = localStorage.getItem('pwa-dismiss');
    if (ts && Date.now() - Number(ts) < 5 * 864e5) return;

    // Detect iOS Safari (no beforeinstallprompt support)
    const ua  = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);
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

    // Register Service Worker + detect updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        // Check if there's already a waiting SW
        if (reg.waiting) { setShowUpdate(true); return; }

        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          sw?.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              setShowUpdate(true);
            }
          });
        });

        // Periodic update check every 60s
        setInterval(() => reg.update(), 60_000);
      }).catch(() => {});
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
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
    navigator.serviceWorker.controller?.postMessage('skipWaiting');
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
  }

  return (
    <>
      <style>{`
        @keyframes pwa-slide-up   { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pwa-slide-down { from { transform: translateY(0);    opacity: 1; } to { transform: translateY(100%); opacity: 0; } }
        @keyframes pwa-banner-in  { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pwa-pulse      { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .pwa-card  { animation: pwa-slide-up   .4s cubic-bezier(.34,1.56,.64,1) forwards; }
        .pwa-hide  { animation: pwa-slide-down .35s ease forwards; }
        .pwa-banner{ animation: pwa-banner-in  .3s ease forwards; }
        .pwa-btn-install:hover { transform: scale(1.03); filter: brightness(1.08); }
        .pwa-btn-install:active{ transform: scale(.97); }
        .pwa-btn-update:hover  { background: #1d4ed8 !important; }
      `}</style>

      {/* ── Update Banner (top) ── */}
      {showUpdate && (
        <div className="pwa-banner" style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
          background: 'linear-gradient(135deg, #1e40af, #185FA5)',
          color: '#fff', direction: 'rtl',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 14, padding: '10px 20px',
          boxShadow: '0 4px 20px rgba(24,95,165,.4)',
        }}>
          <span style={{ fontSize: '1.1rem' }}>🔄</span>
          <span style={{ fontWeight: 700, fontSize: '.92rem' }}>
            يوجد إصدار جديد من التطبيق
          </span>
          <button
            onClick={applyUpdate}
            className="pwa-btn-update"
            style={{
              background: '#fff', color: '#185FA5',
              border: 'none', borderRadius: 8,
              padding: '6px 16px', fontWeight: 800,
              fontSize: '.85rem', cursor: 'pointer',
              fontFamily: 'inherit', transition: 'background .15s',
            }}>
            تحديث الآن
          </button>
          <button onClick={() => setShowUpdate(false)} style={{
            background: 'rgba(255,255,255,.2)', border: 'none',
            color: '#fff', borderRadius: 6,
            width: 26, height: 26, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', fontWeight: 700,
          }}>×</button>
        </div>
      )}

      {/* ── Install Card (bottom) ── */}
      {showInstall && (
        <div
          className={visible ? 'pwa-card' : 'pwa-hide'}
          style={{
            position: 'fixed', bottom: 24, left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(92vw, 400px)',
            background: '#fff',
            borderRadius: 24,
            boxShadow: '0 20px 60px rgba(24,95,165,.22), 0 4px 16px rgba(0,0,0,.08)',
            border: '1.5px solid rgba(24,95,165,.12)',
            zIndex: 99998,
            direction: 'rtl',
            overflow: 'hidden',
          }}>

          {/* Top gradient stripe */}
          <div style={{
            height: 4,
            background: 'linear-gradient(90deg, #185FA5, #d4952a, #185FA5)',
            backgroundSize: '200% 100%',
          }} />

          <div style={{ padding: '22px 24px 20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              {/* App icon */}
              <div style={{
                width: 58, height: 58, borderRadius: 16,
                background: 'linear-gradient(135deg, #185FA5, #0d3d6e)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(24,95,165,.35)',
              }}>
                <img src="/logo.svg" alt="عارم" width={38} height={38}
                  style={{ filter: 'brightness(1.1)' }} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a' }}>
                  أكاديمية عارم
                </div>
                <div style={{ fontSize: '.78rem', color: '#64748b', marginTop: 2, fontWeight: 500 }}>
                  {isIOS
                    ? 'أضف التطبيق إلى الشاشة الرئيسية'
                    : 'ثبّت التطبيق على جهازك'}
                </div>
              </div>

              <button onClick={close} style={{
                background: '#f1f5f9', border: 'none',
                borderRadius: 8, width: 30, height: 30,
                cursor: 'pointer', color: '#94a3b8',
                fontSize: '1.1rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>×</button>
            </div>

            {/* Features */}
            <div style={{
              display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap',
            }}>
              {['⚡ سريع', '📶 بدون انترنت', '🔔 إشعارات'].map(f => (
                <span key={f} style={{
                  background: '#f0f6ff', color: '#185FA5',
                  borderRadius: 20, padding: '4px 11px',
                  fontSize: '.75rem', fontWeight: 700,
                  border: '1px solid #bfdbfe',
                }}>{f}</span>
              ))}
            </div>

            {/* iOS instructions */}
            {isIOS ? (
              <div style={{
                background: '#f8fafc', borderRadius: 12,
                padding: '14px 16px', marginBottom: 16,
                border: '1.5px solid #e2e8f0',
              }}>
                <div style={{ fontSize: '.85rem', color: '#334155', lineHeight: 1.8 }}>
                  <div>١. اضغط زر <strong>المشاركة</strong> <span style={{ fontSize: '1.1rem' }}>⬆️</span> أسفل الشاشة</div>
                  <div>٢. اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong></div>
                  <div>٣. اضغط <strong>إضافة</strong> في الأعلى</div>
                </div>
              </div>
            ) : (
              /* Install button */
              <button
                onClick={handleInstall}
                className="pwa-btn-install"
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #185FA5, #1d4ed8)',
                  color: '#fff', border: 'none', borderRadius: 14,
                  padding: '13px 0', fontWeight: 800,
                  fontSize: '1rem', cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, marginBottom: 10,
                  boxShadow: '0 4px 18px rgba(24,95,165,.4)',
                  transition: 'transform .15s, filter .15s',
                }}>
                <span style={{ fontSize: '1.15rem' }}>📲</span>
                تثبيت التطبيق مجاناً
              </button>
            )}

            <button onClick={close} style={{
              width: '100%', background: 'none', border: 'none',
              color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: '.83rem', fontWeight: 600, padding: '6px 0',
            }}>
              لاحقاً
            </button>
          </div>
        </div>
      )}
    </>
  );
}
