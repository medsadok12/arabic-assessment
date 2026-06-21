'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

/* Dynamic import — avoids SSR issues with browser APIs inside HeroAvatarCreator */
const HeroAvatarCreator = dynamic(
  () => import('../../../components/HeroAvatarCreator'),
  { ssr: false, loading: () => null }
);

/* ── CSS animations (injected once) ─────────────────────────────────────── */
if (typeof document !== 'undefined' && !document.getElementById('hs-anim')) {
  const s = document.createElement('style');
  s.id = 'hs-anim';
  s.textContent = `
    @keyframes hsSpin    { to { transform: rotate(360deg) } }
    @keyframes hsFloat   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
    @keyframes hsPulse   { 0%,100%{opacity:.2;transform:scale(.85)} 50%{opacity:.65;transform:scale(1.1)} }
    @keyframes hsFadeIn  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
    @keyframes hsBounce  { 0%,100%{transform:translateY(0)} 40%{transform:translateY(-18px)} 60%{transform:translateY(-8px)} }
    @keyframes hsGlow    { 0%,100%{box-shadow:0 0 18px rgba(139,92,246,.3),0 0 0 1px rgba(139,92,246,.18)}
                           50%{box-shadow:0 0 50px rgba(139,92,246,.75),0 0 80px rgba(139,92,246,.2),0 0 0 1px rgba(139,92,246,.5)} }
    @keyframes hsShimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
  `;
  document.head.appendChild(s);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Heroes Studio — Ready Player Me 3D Avatar Integration
   Saves avatar_url (GLB) + preview_url (PNG) + avatar_id to Supabase hero_config
═══════════════════════════════════════════════════════════════════════════ */
export default function HeroesStudio() {
  const [cfg, setCfg]             = useState(null);   // hero_config from API
  const [showCreator, setShowCreator] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState(null);

  /* Fetch hero config on mount */
  useEffect(() => {
    fetch('/api/hero-config')
      .then(r => r.json())
      .then(setCfg)
      .catch(() => setCfg({ points: 0 }));
  }, []);

  /* Show a toast message */
  function showMsg(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3400);
  }

  /* Called by HeroAvatarCreator when RPM exports an avatar */
  const handleExported = useCallback(async ({ glbUrl, previewUrl, avatarId }) => {
    setShowCreator(false);
    setSaving(true);
    try {
      const res = await fetch('/api/hero-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: glbUrl, preview_url: previewUrl, avatar_id: avatarId }),
      });
      if (!res.ok) throw new Error();
      setCfg(prev => ({ ...prev, avatar_url: glbUrl, preview_url: previewUrl, avatar_id: avatarId }));
      showMsg('🎉 تم حفظ بطلك بنجاح!');
    } catch {
      showMsg('❌ خطأ أثناء الحفظ — حاول مرة أخرى', false);
    } finally {
      setSaving(false);
    }
  }, []);

  const coins      = cfg?.points      ?? 0;
  const previewUrl = cfg?.preview_url ?? null;
  const avatarId   = cfg?.avatar_id   ?? null;
  const isLoading  = cfg === null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #1a0533 0%, #020314 65%)',
      fontFamily: 'Cairo, Tajawal, sans-serif',
      color: 'white',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: 'clamp(14px,3vw,28px) 12px 48px',
      direction: 'rtl',
      boxSizing: 'border-box',
    }}>

      {/* ── Ambient star particles ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {Array.from({ length: 30 }, (_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${4 + i * 3.2}%`,
            top: `${3 + (i * 7 % 90)}%`,
            width: i % 4 === 0 ? 3 : 2,
            height: i % 4 === 0 ? 3 : 2,
            background: i % 5 === 0 ? '#a78bfa' : 'white',
            borderRadius: '50%',
            animation: `hsPulse ${2.2 + i * 0.28}s ease-in-out infinite`,
            animationDelay: `${i * 0.12}s`,
          }} />
        ))}
      </div>

      {/* ── Main content column ── */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 560,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 20,
      }}>

        {/* Top bar — back link + coins */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/dashboard" style={{
            color: '#475569', fontSize: 13, textDecoration: 'none',
            fontFamily: 'Cairo,sans-serif', display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 10px', borderRadius: 8,
            transition: 'color .2s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = '#94A3B8'}
            onMouseLeave={e => e.currentTarget.style.color = '#475569'}
          >
            → لوحتي
          </Link>

          <div style={{
            background: 'rgba(234,179,8,.1)',
            border: '1.5px solid rgba(234,179,8,.3)',
            borderRadius: 40, padding: '5px 16px',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <span style={{ fontSize: 16 }}>⭐</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#FCD34D' }}>
              {isLoading ? '...' : coins} نقطة
            </span>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', animation: 'hsFadeIn .5s ease-out' }}>
          <h1 style={{
            margin: 0,
            fontSize: 'clamp(22px, 5.5vw, 30px)',
            fontWeight: 900, letterSpacing: '-.5px',
            backgroundImage: 'linear-gradient(135deg, #c084fc 0%, #818cf8 50%, #38bdf8 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'hsShimmer 5s linear infinite',
          }}>
            ✨ استوديو الأبطال
          </h1>
          <p style={{ margin: '6px 0 0', color: '#94A3B8', fontSize: 13 }}>
            صمّم شخصيتك الكرتونية ثلاثية الأبعاد بكامل طولها
          </p>
        </div>

        {/* ── Avatar card ── */}
        <div style={{
          width: '100%',
          background: 'linear-gradient(160deg, rgba(30,27,75,.75), rgba(20,5,40,.8))',
          borderRadius: 24,
          border: '1px solid rgba(139,92,246,.22)',
          boxShadow: '0 20px 60px rgba(0,0,0,.5)',
          padding: '32px 24px 28px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
          animation: 'hsFadeIn .6s ease-out',
        }}>

          {/* Avatar image OR placeholder */}
          {previewUrl ? (
            /* ── RPM avatar portrait ── */
            <div style={{
              width: 'min(280px, 75vw)',
              height: 'min(360px, 96vw)',
              borderRadius: 20, overflow: 'hidden',
              border: '2px solid rgba(139,92,246,.45)',
              background: '#0f172a',
              animation: 'hsGlow 3s ease-in-out infinite',
              flexShrink: 0,
            }}>
              <img
                src={previewUrl}
                alt="بطلك"
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
              />
            </div>
          ) : (
            /* ── Placeholder ── */
            <div style={{
              width: 190, height: 230,
              borderRadius: 20,
              border: '2px dashed rgba(139,92,246,.32)',
              background: 'rgba(15,23,42,.5)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 10, flexShrink: 0,
            }}>
              <span style={{
                fontSize: 60,
                filter: 'drop-shadow(0 0 20px rgba(139,92,246,.55))',
                animation: isLoading ? undefined : 'hsBounce 2.5s ease-in-out infinite',
              }}>
                🦸
              </span>
              {!isLoading && (
                <p style={{ margin: 0, color: '#475569', fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>
                  شخصيتك لم تُصمَّم بعد<br />اضغط الزر أدناه للبدء
                </p>
              )}
            </div>
          )}

          {/* Status label */}
          {previewUrl && (
            <p style={{ margin: 0, color: '#C4B5FD', fontSize: 15, fontWeight: 700 }}>
              🦸 بطلك جاهز!
            </p>
          )}

          {/* CTA button */}
          <button
            onClick={() => !saving && !isLoading && setShowCreator(true)}
            disabled={saving || isLoading}
            style={{
              padding: '13px 38px',
              background: saving
                ? 'rgba(124,58,237,.35)'
                : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              border: 'none', borderRadius: 40,
              color: 'white', fontSize: 16, fontWeight: 700,
              cursor: saving || isLoading ? 'not-allowed' : 'pointer',
              fontFamily: 'Cairo,sans-serif',
              boxShadow: saving ? 'none' : '0 8px 28px rgba(124,58,237,.45)',
              transition: 'transform .15s, box-shadow .15s',
              animation: (!saving && !isLoading) ? 'hsGlow 2.5s ease-in-out infinite' : undefined,
            }}
            onMouseEnter={e => {
              if (!saving && !isLoading) {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 12px 36px rgba(124,58,237,.65)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = saving ? 'none' : '0 8px 28px rgba(124,58,237,.45)';
            }}
          >
            {saving ? '⏳ جاري الحفظ...' : previewUrl ? '✏️ عدّل بطلك' : '🎮 ابدأ وصمّم بطلك!'}
          </button>
        </div>

        {/* ── How-to card (shown only before first avatar) ── */}
        {!previewUrl && !isLoading && (
          <div style={{
            width: '100%',
            background: 'rgba(30,27,75,.35)',
            borderRadius: 16,
            border: '1px solid rgba(139,92,246,.12)',
            padding: '14px 18px',
            animation: 'hsFadeIn .75s ease-out',
          }}>
            <p style={{ margin: '0 0 8px', color: '#A78BFA', fontSize: 13, fontWeight: 700 }}>
              💡 كيف يعمل؟
            </p>
            {[
              '🎮 اضغط "صمّم بطلك" لفتح مصمّم الشخصية',
              '👗 اختر شكلك وملابسك وهيئتك بحرية كاملة',
              '✅ اضغط زر الحفظ داخل المصمّم لتصدير بطلك',
              '🌟 تظهر شخصيتك في لوحتك الرئيسية تلقائياً!',
            ].map((t, i) => (
              <p key={i} style={{ margin: '3px 0', color: '#94A3B8', fontSize: 12, lineHeight: 1.7 }}>{t}</p>
            ))}
          </div>
        )}
      </div>

      {/* ── RPM Creator overlay ── */}
      {showCreator && (
        <HeroAvatarCreator
          existingAvatarId={avatarId}
          onExported={handleExported}
          onClose={() => setShowCreator(false)}
        />
      )}

      {/* ── Toast notification ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: toast.ok ? 'rgba(5,46,22,.92)' : 'rgba(127,29,29,.92)',
          border: `1.5px solid ${toast.ok ? '#22C55E' : '#EF4444'}`,
          color: 'white', borderRadius: 14, padding: '12px 28px',
          fontFamily: 'Cairo,sans-serif', fontSize: 15, fontWeight: 700,
          boxShadow: '0 8px 32px rgba(0,0,0,.5)',
          zIndex: 300, animation: 'hsFadeIn .3s ease-out',
          whiteSpace: 'nowrap',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
