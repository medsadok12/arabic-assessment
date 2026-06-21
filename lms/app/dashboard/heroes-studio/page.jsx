'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

/* ── Inject CSS animations once ─────────────────────────────────────────── */
if (typeof document !== 'undefined' && !document.getElementById('hs-anim')) {
  const s = document.createElement('style');
  s.id = 'hs-anim';
  s.textContent = `
    @keyframes hsSpin    { to { transform:rotate(360deg) } }
    @keyframes hsPulse   { 0%,100%{opacity:.15;transform:scale(.85)} 50%{opacity:.55;transform:scale(1.1)} }
    @keyframes hsFadeIn  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    @keyframes hsGlow    { 0%,100%{box-shadow:0 0 18px rgba(139,92,246,.3)} 50%{box-shadow:0 0 48px rgba(139,92,246,.7)} }
    @keyframes hsShimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
    @keyframes hsBounce  { 0%,100%{transform:translateY(0)} 40%{transform:translateY(-14px)} 60%{transform:translateY(-6px)} }
    model-viewer { --progress-bar-color: #8b5cf6; --poster-color: transparent; }
  `;
  document.head.appendChild(s);
}

/* ── Load @google/model-viewer script (once, as ES module) ──────────────── */
function loadModelViewerScript() {
  const MV_URL = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';
  if (document.querySelector(`script[data-mv]`)) return;
  const s = document.createElement('script');
  s.type = 'module'; s.src = MV_URL; s.dataset.mv = '1';
  document.head.appendChild(s);
}

/* ══════════════════════════════════════════════════════════════════════════
   HERO CHARACTERS — swap src to any .glb URL (Supabase Storage, CDN, etc.)
══════════════════════════════════════════════════════════════════════════ */
const HEROES = [
  {
    id: 'c1', name: 'البطل الفضائي', emoji: '🧑‍🚀',
    glb: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
    color: '#3B82F6',
  },
  {
    id: 'c2', name: 'الروبوت الذكي', emoji: '🤖',
    glb: 'https://modelviewer.dev/shared-assets/models/RobotExpressive.glb',
    color: '#8B5CF6',
  },
];

/* ── Colour palette ─────────────────────────────────────────────────────── */
const PALETTE = [
  { name:'أزرق',     hex:'#3B82F6' },
  { name:'أحمر',     hex:'#EF4444' },
  { name:'أخضر',     hex:'#22C55E' },
  { name:'أصفر',     hex:'#EAB308' },
  { name:'بنفسجي',  hex:'#8B5CF6' },
  { name:'وردي',     hex:'#EC4899' },
  { name:'برتقالي', hex:'#F97316' },
  { name:'سماوي',   hex:'#06B6D4' },
  { name:'أبيض',    hex:'#F8FAFC' },
  { name:'رمادي',   hex:'#64748B' },
];

/* ── Convert hex → [0..1] factors ─────────────────────────────────────── */
function hexToFactor(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b, 1.0];
}

/* ══════════════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function HeroesStudio() {
  const mvRef      = useRef(null);
  const [cfg,      setCfg]      = useState(null);
  const [hero,     setHero]     = useState(HEROES[0]);
  const [tint,     setTint]     = useState(HEROES[0].color);
  const [ready,    setReady]    = useState(false);   // model-viewer loaded model
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);

  /* Load model-viewer script + fetch hero config */
  useEffect(() => {
    loadModelViewerScript();
    fetch('/api/hero-config')
      .then(r => r.json()).then(setCfg)
      .catch(() => setCfg({ points: 0 }));
  }, []);

  /* Re-attach 'load' listener whenever the GLB src changes */
  useEffect(() => {
    const mv = mvRef.current;
    if (!mv) return;
    setReady(false);
    function onLoad() { setReady(true); }
    mv.addEventListener('load', onLoad);
    return () => mv.removeEventListener('load', onLoad);
  }, [hero.glb]);

  /* ── Material colour swap via model-viewer JS API ────────────────────── */
  useEffect(() => {
    if (!ready) return;
    const mv = mvRef.current;
    if (!mv?.model?.materials?.length) return;
    const factor = hexToFactor(tint);
    /* Change the primary material (index 0 = main suit/body colour).
       For multi-material models you can target specific indices here. */
    mv.model.materials[0].pbrMetallicRoughness.setBaseColorFactor(factor);
  }, [ready, tint]);

  /* ── Switch hero: change GLB src (model-viewer handles lazy loading) ── */
  function selectHero(h) {
    setHero(h);
    setTint(h.color);
    setReady(false);
  }

  /* ── Generate preview SVG data-URI (no storage needed) ──────────────── */
  function buildPreview(h, hex) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="50" fill="${hex}"/>
      <text y="70" x="50" text-anchor="middle" font-size="52" font-family="sans-serif">${h.emoji}</text>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /* ── Save to Supabase ─────────────────────────────────────────────────── */
  async function handleSave() {
    setSaving(true);
    try {
      const avatarId   = `${hero.id}-${tint.replace('#', '')}`;
      const previewUrl = buildPreview(hero, tint);

      const res = await fetch('/api/hero-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar_url:  hero.glb,
          preview_url: previewUrl,
          avatar_id:   avatarId,
        }),
      });
      if (!res.ok) throw new Error();
      setCfg(p => ({ ...p, avatar_url: hero.glb, preview_url: previewUrl, avatar_id: avatarId }));
      setToast({ msg: '🎉 تم حفظ مظهرك!', ok: true });
    } catch {
      setToast({ msg: '❌ خطأ أثناء الحفظ', ok: false });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3200);
    }
  }

  const coins     = cfg?.points ?? 0;
  const isLoading = cfg === null;
  const isMobile  = typeof window !== 'undefined' && window.innerWidth < 700;

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #1a0533 0%, #020314 65%)',
      fontFamily: 'Cairo, Tajawal, sans-serif',
      color: 'white', direction: 'rtl',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: 'clamp(12px,2.5vw,24px) 10px 40px',
    }}>

      {/* ── Star particles ── */}
      <div style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
        {Array.from({ length:28 }, (_,i) => (
          <div key={i} style={{
            position:'absolute',
            left:`${4+i*3.3}%`, top:`${3+(i*7%90)}%`,
            width: i%4===0 ? 3 : 2, height: i%4===0 ? 3 : 2,
            background: i%5===0 ? '#a78bfa' : 'white',
            borderRadius:'50%',
            animation:`hsPulse ${2.2+i*.26}s ease-in-out infinite`,
            animationDelay:`${i*.1}s`,
          }}/>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{
        position:'relative', zIndex:1,
        width:'100%', maxWidth:900,
        display:'flex', flexDirection:'column', gap:18,
      }}>

        {/* Top bar */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <Link href="/dashboard" style={{
            color:'#475569', fontSize:13, textDecoration:'none',
            fontFamily:'Cairo,sans-serif', padding:'4px 8px', borderRadius:6,
          }}>→ لوحتي</Link>

          <div style={{
            background:'rgba(234,179,8,.1)', border:'1.5px solid rgba(234,179,8,.28)',
            borderRadius:40, padding:'5px 16px',
            display:'flex', alignItems:'center', gap:7,
          }}>
            <span style={{ fontSize:16 }}>⭐</span>
            <span style={{ fontWeight:700, fontSize:14, color:'#FCD34D' }}>
              {isLoading ? '...' : coins} نقطة
            </span>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign:'center', animation:'hsFadeIn .5s ease-out' }}>
          <h1 style={{
            margin:0, fontSize:'clamp(22px,5vw,30px)', fontWeight:900,
            backgroundImage:'linear-gradient(135deg,#c084fc,#818cf8,#38bdf8)',
            backgroundSize:'200% auto',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            animation:'hsShimmer 5s linear infinite',
          }}>✨ استوديو الأبطال</h1>
          <p style={{ margin:'5px 0 0', color:'#94A3B8', fontSize:13 }}>
            دوّر بطلك 360° • اسحب للتحكم • اختر لونك
          </p>
        </div>

        {/* ── Main grid ── */}
        <div style={{
          display:'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 300px',
          gap:16, alignItems:'stretch',
        }}>

          {/* ═══ 3D Viewer ═══ */}
          <div style={{
            background:'linear-gradient(160deg,rgba(30,27,75,.7),rgba(10,5,30,.8))',
            borderRadius:22, border:'1px solid rgba(139,92,246,.2)',
            boxShadow:'0 20px 60px rgba(0,0,0,.5)',
            overflow:'hidden', position:'relative',
            minHeight: isMobile ? 320 : 480,
            display:'flex', alignItems:'center', justifyContent:'center',
            animation:'hsGlow 4s ease-in-out infinite',
          }}>

            {/* Loading spinner (shown before model loads) */}
            {!ready && (
              <div style={{
                position:'absolute', inset:0, zIndex:2,
                display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center',
                background:'rgba(2,4,20,.6)', pointerEvents:'none',
              }}>
                <div style={{
                  width:44, height:44, borderRadius:'50%',
                  border:'3px solid #3b0764', borderTopColor:'#8b5cf6',
                  animation:'hsSpin 1s linear infinite',
                }}/>
                <p style={{ color:'#a78bfa', fontFamily:'Cairo,sans-serif', marginTop:14, fontSize:14 }}>
                  جاري تحميل البطل...
                </p>
              </div>
            )}

            {/*
              <model-viewer> web component — loaded via Google CDN script.
              camera-controls  : drag to orbit, pinch to zoom
              auto-rotate      : spins automatically (stops on interaction)
              shadow-intensity : realistic ground shadow
              animation-name   : plays embedded GLB animation if present
            */}
            <model-viewer
              ref={mvRef}
              src={hero.glb}
              camera-controls=""
              auto-rotate=""
              auto-rotate-delay="1000"
              shadow-intensity="1"
              shadow-softness="0.7"
              animation-name="Idle"
              style={{
                width:'100%', height: isMobile ? '320px' : '480px',
                background:'transparent',
              }}
            />

            {/* Hint label */}
            <div style={{
              position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)',
              background:'rgba(0,0,0,.45)', borderRadius:20, padding:'4px 14px',
              fontSize:11, color:'#94A3B8', whiteSpace:'nowrap', pointerEvents:'none',
            }}>
              🖱️ اسحب للتدوير • اسحب للتكبير
            </div>
          </div>

          {/* ═══ Shop panel ═══ */}
          <div style={{
            display:'flex', flexDirection:'column', gap:14,
          }}>

            {/* Character selector */}
            <div style={{
              background:'rgba(30,27,75,.5)', borderRadius:16,
              border:'1px solid rgba(139,92,246,.15)',
              padding:'14px 14px 10px',
            }}>
              <p style={{ margin:'0 0 10px', color:'#A78BFA', fontSize:13, fontWeight:700 }}>
                🦸 اختر بطلك
              </p>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                {HEROES.map(h => (
                  <button key={h.id} onClick={() => selectHero(h)} style={{
                    flex:'1 1 auto',
                    padding:'10px 8px',
                    background: hero.id === h.id
                      ? `linear-gradient(135deg,${h.color}33,${h.color}22)`
                      : 'rgba(15,23,42,.5)',
                    border: `2px solid ${hero.id === h.id ? h.color : 'rgba(139,92,246,.18)'}`,
                    borderRadius:12, cursor:'pointer',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                    transition:'all .2s',
                  }}>
                    <span style={{ fontSize:28, lineHeight:1 }}>{h.emoji}</span>
                    <span style={{ color: hero.id===h.id ? '#C4B5FD' : '#64748B', fontSize:11, fontFamily:'Cairo,sans-serif' }}>
                      {h.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Colour palette — changes primary material via model-viewer API */}
            <div style={{
              background:'rgba(30,27,75,.5)', borderRadius:16,
              border:'1px solid rgba(139,92,246,.15)',
              padding:'14px',
              flex:1,
            }}>
              <p style={{ margin:'0 0 10px', color:'#A78BFA', fontSize:13, fontWeight:700 }}>
                🎨 لون الزي
              </p>
              <div style={{
                display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8,
              }}>
                {PALETTE.map(c => (
                  <button key={c.hex} onClick={() => setTint(c.hex)}
                    title={c.name}
                    style={{
                      width:'100%', aspectRatio:'1/1',
                      background: c.hex,
                      borderRadius:10,
                      border: tint===c.hex
                        ? '3px solid white'
                        : '2px solid rgba(255,255,255,.12)',
                      cursor:'pointer',
                      boxShadow: tint===c.hex ? `0 0 0 3px ${c.hex}88` : 'none',
                      transform: tint===c.hex ? 'scale(1.15)' : 'scale(1)',
                      transition:'all .15s',
                    }}
                  />
                ))}
              </div>
              {!ready && (
                <p style={{ margin:'8px 0 0', color:'#475569', fontSize:11, textAlign:'center' }}>
                  يُطبَّق اللون بعد تحميل المجسم
                </p>
              )}
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving || isLoading}
              style={{
                padding:'14px',
                background: saving ? 'rgba(124,58,237,.3)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                border:'none', borderRadius:14,
                color:'white', fontSize:15, fontWeight:700,
                cursor: saving||isLoading ? 'not-allowed' : 'pointer',
                fontFamily:'Cairo,sans-serif',
                boxShadow: saving ? 'none' : '0 8px 24px rgba(124,58,237,.4)',
                transition:'transform .15s, box-shadow .15s',
              }}
              onMouseEnter={e => { if(!saving&&!isLoading){ e.currentTarget.style.transform='scale(1.03)'; e.currentTarget.style.boxShadow='0 12px 32px rgba(124,58,237,.6)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow=saving?'none':'0 8px 24px rgba(124,58,237,.4)'; }}
            >
              {saving ? '⏳ جاري الحفظ...' : '💾 احفظ مظهرك'}
            </button>

            {/* Tip */}
            <p style={{ margin:0, color:'#334155', fontSize:11, textAlign:'center', lineHeight:1.7 }}>
              المزيد من الأبطال قادم قريباً ✨
            </p>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position:'fixed', bottom:26, left:'50%', transform:'translateX(-50%)',
          background: toast.ok ? 'rgba(5,46,22,.93)' : 'rgba(127,29,29,.93)',
          border:`1.5px solid ${toast.ok ? '#22C55E' : '#EF4444'}`,
          color:'white', borderRadius:14, padding:'12px 28px',
          fontFamily:'Cairo,sans-serif', fontSize:15, fontWeight:700,
          boxShadow:'0 8px 32px rgba(0,0,0,.5)',
          zIndex:300, animation:'hsFadeIn .3s ease-out',
          whiteSpace:'nowrap',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
