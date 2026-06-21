'use client';
import { useEffect, useState } from 'react';

/*
  Ready Player Me avatar creator wrapped in an overlay modal.

  Setup (one-time):
  1. Sign up free at https://readyplayer.me → create an application → note your subdomain
  2. Add NEXT_PUBLIC_RPM_SUBDOMAIN=yoursubdomain in Vercel env vars
  3. Default fallback is "demo" which works for testing only

  RPM postMessage contract:
    { source: 'readyplayerme', eventName: 'v1.avatar.exported', data: { url: '...ID.glb' } }

  Preview PNG (fullbody portrait):
    https://models.readyplayer.me/ID.png?scene=fullbody-portrait-v1&quality=high
*/

const SUBDOMAIN = process.env.NEXT_PUBLIC_RPM_SUBDOMAIN || 'demo';

export default function HeroAvatarCreator({ existingAvatarId, onExported, onClose }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  /* Detect load failure after 8 seconds (DNS error fires onLoad but page is blank) */
  useEffect(() => {
    const t = setTimeout(() => { if (!loaded) setFailed(true); }, 8000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iframeUrl = [
    `https://${SUBDOMAIN}.readyplayer.me/avatar`,
    '?frameApi',
    '&bodyType=fullbody',
    '&language=ar',
    existingAvatarId ? `&avatarId=${existingAvatarId}` : '',
  ].join('');

  useEffect(() => {
    function handleMessage(e) {
      if (!String(e.origin).includes('readyplayer.me')) return;
      try {
        const msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (msg?.source !== 'readyplayerme' || msg?.eventName !== 'v1.avatar.exported') return;
        const glbUrl = msg?.data?.url ?? '';
        if (!glbUrl.endsWith('.glb')) return;
        const avatarId = glbUrl.split('/').pop().replace('.glb', '');
        const previewUrl =
          `https://models.readyplayer.me/${avatarId}.png?scene=fullbody-portrait-v1&quality=high`;
        onExported({ glbUrl, previewUrl, avatarId });
      } catch {}
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onExported]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(2,4,20,.95)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 'min(960px, 97vw)',
        height: 'min(720px, 94vh)',
        background: '#0f172a', borderRadius: 20,
        border: '1px solid rgba(139,92,246,.35)',
        boxShadow: '0 30px 80px rgba(0,0,0,.8)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          height: 48, flexShrink: 0,
          background: 'linear-gradient(90deg, #1e1b4b, #3b0764)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 18px',
        }}>
          <span style={{ color: 'white', fontFamily: 'Cairo,sans-serif', fontWeight: 700, fontSize: 15 }}>
            🎮 مصمّم شخصيتك ثلاثي الأبعاد
          </span>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,.1)', border: '1.5px solid rgba(255,255,255,.18)',
            color: 'white', borderRadius: 8, padding: '4px 16px',
            cursor: 'pointer', fontFamily: 'Cairo,sans-serif', fontSize: 13,
          }}>
            ✕ إغلاق
          </button>
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, position: 'relative' }}>

          {/* Loading overlay */}
          {!loaded && !failed && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: '#0f172a', zIndex: 1, pointerEvents: 'none',
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                border: '4px solid #3b0764', borderTopColor: '#8b5cf6',
                animation: 'hsSpin 1s linear infinite',
              }} />
              <p style={{ color: '#a78bfa', fontFamily: 'Cairo,sans-serif', marginTop: 18, fontSize: 15 }}>
                جاري تحميل مصمّم الأبطال...
              </p>
              <p style={{ color: '#475569', fontFamily: 'Cairo,sans-serif', marginTop: 6, fontSize: 12 }}>
                يتطلب اتصال إنترنت جيد
              </p>
            </div>
          )}

          {/* Setup instructions — shown if subdomain not configured */}
          {failed && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: '#0f172a', zIndex: 1, padding: '24px',
              fontFamily: 'Cairo,sans-serif', direction: 'rtl',
            }}>
              <span style={{ fontSize: 48, marginBottom: 16 }}>⚙️</span>
              <h3 style={{ color: '#C4B5FD', margin: '0 0 8px', fontSize: 18 }}>
                إعداد مصمّم الشخصيات مطلوب
              </h3>
              <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', lineHeight: 1.8, maxWidth: 420, margin: '0 0 24px' }}>
                يتطلب مصمّم الشخصيات ثلاثي الأبعاد حساباً مجانياً في Ready Player Me.
                الخطوات بسيطة وتستغرق 5 دقائق فقط:
              </p>
              {[
                ['1', 'سجّل مجاناً في readyplayer.me', 'https://readyplayer.me'],
                ['2', 'أنشئ Application واحصل على Subdomain خاص', null],
                ['3', 'أضف في Vercel: NEXT_PUBLIC_RPM_SUBDOMAIN=yoursubdomain', null],
              ].map(([n, t, link]) => (
                <div key={n} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  marginBottom: 10, width: '100%', maxWidth: 420,
                }}>
                  <span style={{
                    minWidth: 26, height: 26, borderRadius: '50%',
                    background: '#3b0764', color: '#a78bfa',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                  }}>{n}</span>
                  <p style={{ margin: 0, color: '#CBD5E1', fontSize: 13, lineHeight: 1.6 }}>
                    {link ? <a href={link} target="_blank" rel="noreferrer" style={{ color: '#818CF8', textDecoration: 'none' }}>{t} ↗</a> : t}
                  </p>
                </div>
              ))}
              <button onClick={onClose} style={{
                marginTop: 20, padding: '10px 28px',
                background: 'rgba(124,58,237,.2)', border: '1.5px solid rgba(124,58,237,.5)',
                color: '#C4B5FD', borderRadius: 10, cursor: 'pointer',
                fontFamily: 'Cairo,sans-serif', fontSize: 14,
              }}>
                إغلاق
              </button>
            </div>
          )}

          <iframe
            src={iframeUrl}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            allow="camera *; microphone *"
            onLoad={() => setLoaded(true)}
            title="مصمّم الشخصية"
          />
        </div>
      </div>
    </div>
  );
}
