'use client';
import { useState, useEffect, useRef, Suspense, lazy, Component } from 'react';
const Spline = lazy(() =>
  import('@splinetool/react-spline').then(m => ({ default: m.default ?? m }))
);

class SplineErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  render() {
    if (this.state.err) {
      return (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(2,4,20,.85)',
        }}>
          <span style={{ fontSize: 72 }}>{this.props.emoji ?? '🦾'}</span>
          <p style={{ color: '#64748B', fontFamily: 'Cairo,sans-serif', marginTop: 12, fontSize: 13 }}>
            ⚠️ تعذّر تحميل المجسم التفاعلي
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
import Link from 'next/link';

/* ── Inject CSS animations once ─────────────────────────────────────────── */
if (typeof document !== 'undefined' && !document.getElementById('hs-anim')) {
  const s = document.createElement('style');
  s.id = 'hs-anim';
  s.textContent = `
    @keyframes hsSpin    { to{transform:rotate(360deg)} }
    @keyframes hsPulse   { 0%,100%{opacity:.12;transform:scale(.82)} 50%{opacity:.5;transform:scale(1.08)} }
    @keyframes hsFadeIn  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    @keyframes hsGlow    { 0%,100%{box-shadow:0 0 20px rgba(139,92,246,.28)} 50%{box-shadow:0 0 52px rgba(139,92,246,.7)} }
    @keyframes hsShimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
    @keyframes hsCardPop { from{transform:scale(.9);opacity:0} to{transform:scale(1);opacity:1} }
    model-viewer { --progress-bar-color:#8b5cf6; --poster-color:transparent; }
  `;
  document.head.appendChild(s);
}

function useModelViewerScript() {
  useEffect(() => {
    if (document.querySelector('script[data-mv]')) return;
    const s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';
    s.dataset.mv = '1';
    document.head.appendChild(s);
  }, []);
}

const HEROES = [
  {
    id: 'robot',
    name: 'الروبوت الذكي',
    emoji: '🤖',
    color: '#8B5CF6',
    price: 0,
    desc: 'بطلك المجاني — يتحرك ويتفاعل',
    glb:  'https://modelviewer.dev/shared-assets/models/RobotExpressive.glb',
    anim: 'Idle',
  },
  {
    id: 'whobee',
    name: 'ويبي التفاعلي',
    emoji: '🦾',
    color: '#F59E0B',
    price: 0,
    desc: 'روبوت ذكي — حرّك الماوس ليتفاعل معك!',
    glb:  null,
    splineUrl: 'https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode',
    anim: null,
  },
  {
    id: 'astronaut',
    name: 'رائد الفضاء',
    emoji: '🧑‍🚀',
    color: '#3B82F6',
    price: 1000,
    desc: 'يجوب النجوم بشجاعة',
    glb:  'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
    anim: null,
  },
  {
    id: 'fox',
    name: 'الثعلب الذكي',
    emoji: '🦊',
    color: '#F97316',
    price: 1000,
    desc: 'ماكر وسريع كالريح',
    glb:  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb',
    anim: 'Survey',
  },
  {
    id: 'duck',
    name: 'البطة الذهبية',
    emoji: '🦆',
    color: '#CA8A04',
    price: 1000,
    desc: 'طريفة ومحبوبة بالجميع',
    glb:  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Duck/glTF-Binary/Duck.glb',
    anim: null,
  },
  {
    id: 'parrot',
    name: 'الببغاء الملون',
    emoji: '🦜',
    color: '#16A34A',
    price: 1000,
    desc: 'طائر ذكي بألوان مبهجة',
    glb:  'https://threejs.org/examples/models/gltf/Parrot.glb',
    anim: null,
  },
  {
    id: 'flamingo',
    name: 'النحامة الوردية',
    emoji: '🦩',
    color: '#EC4899',
    price: 1000,
    desc: 'أنيقة وجميلة كالحلم',
    glb:  'https://threejs.org/examples/models/gltf/Flamingo.glb',
    anim: null,
  },
  {
    id: 'explorer',
    name: 'المستكشف',
    emoji: '🧭',
    color: '#22C55E',
    price: 1000,
    desc: 'يستكشف الآفاق بلا حدود',
    glb:  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CesiumMan/glTF-Binary/CesiumMan.glb',
    anim: 'Walk',
  },
  {
    id: 'cyborg',
    name: 'الآلة المُدرَّعة',
    emoji: '🦾',
    color: '#EF4444',
    price: 1000,
    desc: 'دروع مستقبلية وقوة هائلة',
    glb:  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/BrainStem/glTF-Binary/BrainStem.glb',
    anim: null,
  },
  {
    id: 'knight',
    name: 'الفارس',
    emoji: '⚔️',
    color: '#EAB308',
    price: 1000,
    desc: 'فارس الساحات والبطولات',
    glb:  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/RiggedFigure/glTF-Binary/RiggedFigure.glb',
    anim: null,
  },
  {
    id: 'ninja',
    name: 'النينجا',
    emoji: '🥷',
    color: '#1E293B',
    price: 1000,
    desc: 'خفي كالظلام وسريع كالبرق',
    glb: null, comingSoon: true,
  },
  {
    id: 'wizard',
    name: 'الساحر',
    emoji: '🧙',
    color: '#7C3AED',
    price: 1000,
    desc: 'يتقن فن السحر والأسرار',
    glb: null, comingSoon: true,
  },
  {
    id: 'scientist',
    name: 'العالم',
    emoji: '👨‍🔬',
    color: '#06B6D4',
    price: 1000,
    desc: 'عقل نابغة وروح مغامرة',
    glb: null, comingSoon: true,
  },
];

const PALETTE = [
  '#8B5CF6', '#3B82F6', '#EF4444', '#22C55E', '#EAB308',
  '#EC4899', '#F97316', '#06B6D4', '#F1F5F9', '#64748B',
];

function hexToFactor(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, 1.0];
}

export default function HeroesStudio() {
  useModelViewerScript();
  const mvRef = useRef(null);

  const [cfg,       setCfg]       = useState(null);
  const [hero,      setHero]      = useState(HEROES[0]);
  const [tint,      setTint]      = useState(HEROES[0].color);
  const [owned,     setOwned]     = useState([]);
  const [ready,     setReady]     = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [tab,       setTab]       = useState('chars');
  const [saving,    setSaving]    = useState(false);
  const [buying,    setBuying]    = useState(null);
  const [toast,     setToast]     = useState(null);
  const [isMobile,  setIsMobile]  = useState(false);

  useEffect(() => { setIsMobile(window.innerWidth < 700); }, []);

  useEffect(() => {
    fetch('/api/hero-config').then(r => r.json()).then(d => {
      setCfg(d);
      setOwned(d.owned ?? []);
      if (d.avatar_id) {
        const saved = HEROES.find(h => h.id === d.avatar_id);
        if (saved?.glb) { setHero(saved); setTint(saved.color); }
      }
    }).catch(() => setCfg({ points: 0 }));
  }, []);

  useEffect(() => {
    const mv = mvRef.current;
    if (!mv) return;
    setReady(false);
    setLoadError(false);
    const onLoad  = () => setReady(true);
    const onError = () => { setReady(true); setLoadError(true); };
    mv.addEventListener('load', onLoad);
    mv.addEventListener('error', onError);
    return () => { mv.removeEventListener('load', onLoad); mv.removeEventListener('error', onError); };
  }, [hero.glb]);

  useEffect(() => {
    if (!ready || loadError) return;
    const mv = mvRef.current;
    if (!mv?.model?.materials?.length) return;
    mv.model.materials[0].pbrMetallicRoughness.setBaseColorFactor(hexToFactor(tint));
  }, [ready, tint, loadError]);

  function isOwned(h) { return h.price === 0 || owned.includes(h.id); }

  function selectHero(h) {
    if ((!h.glb && !h.splineUrl) || h.comingSoon) return;
    setHero(h);
    setTint(h.color);
    setReady(false);
    setLoadError(false);
  }

  async function handleBuy(h) {
    if (buying || isOwned(h) || (!h.glb && !h.splineUrl) || h.comingSoon) return;
    setBuying(h.id);
    try {
      const res = await fetch('/api/hero-config/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: h.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'فشل الشراء');
      }
      setOwned(prev => [...prev, h.id]);
      setCfg(p => ({ ...p, points: (p?.points ?? 0) - h.price }));
      selectHero(h);
      setToast({ msg: `🎉 اشتريت ${h.name}!`, ok: true });
    } catch (e) {
      setToast({ msg: `❌ ${e.message}`, ok: false });
    } finally {
      setBuying(null);
      setTimeout(() => setToast(null), 3200);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const previewSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="${tint}"/>
        <text y="70" x="50" text-anchor="middle" font-size="54">${hero.emoji}</text>
      </svg>`;
      const previewUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(previewSvg)))}`;
      const res = await fetch('/api/hero-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar_url:  hero.splineUrl ?? hero.glb,
          preview_url: previewUrl,
          avatar_id:   hero.id,
          tint:        tint,
          hat:         null,
          halo:        null,
          companion:   null,
        }),
      });
      if (!res.ok) throw new Error();
      setCfg(p => ({ ...p, avatar_url: hero.glb, preview_url: previewUrl, avatar_id: hero.id }));
      setToast({ msg: '🎉 تم حفظ بطلك!', ok: true });
    } catch {
      setToast({ msg: '❌ خطأ أثناء الحفظ', ok: false });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3200);
    }
  }

  const coins  = cfg?.points ?? 0;
  const isLoad = cfg === null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #1a0533 0%, #020314 65%)',
      fontFamily: 'Cairo, Tajawal, sans-serif',
      color: 'white', direction: 'rtl',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: 'clamp(10px,2vw,20px) 10px 40px',
    }}>

      {/* Starfield */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {Array.from({ length: 30 }, (_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${3 + i * 3.2}%`, top: `${2 + (i * 7 % 92)}%`,
            width: i % 4 === 0 ? 3 : 2, height: i % 4 === 0 ? 3 : 2,
            background: i % 5 === 0 ? '#a78bfa' : '#fff', borderRadius: '50%',
            animation: `hsPulse ${2.2 + i * 0.25}s ease-in-out infinite`,
            animationDelay: `${i * 0.1}s`,
          }} />
        ))}
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 980, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/dashboard" style={{ color: '#475569', fontSize: 13, textDecoration: 'none', padding: '4px 8px', fontFamily: 'Cairo,sans-serif' }}>
            → لوحتي
          </Link>
          <div style={{ background: 'rgba(234,179,8,.1)', border: '1.5px solid rgba(234,179,8,.28)', borderRadius: 40, padding: '5px 16px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 16 }}>⭐</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#FCD34D' }}>{isLoad ? '...' : coins} نقطة</span>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', animation: 'hsFadeIn .5s ease-out' }}>
          <h1 style={{
            margin: 0, fontSize: 'clamp(20px,5vw,30px)', fontWeight: 900,
            backgroundImage: 'linear-gradient(135deg,#c084fc,#818cf8,#38bdf8)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            animation: 'hsShimmer 5s linear infinite',
          }}>
            ✨ استوديو الأبطال
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 12 }}>
            اختر بطلك من مجموعتك — اسحبه لتدويره 360°
          </p>
        </div>

        {/* MAIN GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 310px',
          gap: 14, alignItems: 'start',
        }}>

          {/* 3D VIEWER */}
          <div style={{
            position: 'relative', borderRadius: 24, overflow: 'hidden',
            background: 'linear-gradient(160deg,rgba(18,12,55,.9),rgba(4,2,18,.95))',
            border: `2px solid ${hero.color}44`,
            boxShadow: `0 24px 64px rgba(0,0,0,.7), 0 0 50px ${hero.color}18`,
            animation: 'hsGlow 4s ease-in-out infinite',
            minHeight: isMobile ? 300 : 520,
            transition: 'border-color .4s, box-shadow .5s',
          }}>
            <div style={{
              position: 'absolute', top: 12, right: 14, zIndex: 6,
              background: `${hero.color}22`, border: `1px solid ${hero.color}44`,
              borderRadius: 20, padding: '4px 14px',
              display: 'flex', alignItems: 'center', gap: 7,
              backdropFilter: 'blur(6px)',
            }}>
              <span style={{ fontSize: 18 }}>{hero.emoji}</span>
              <span style={{ color: 'white', fontSize: 12, fontFamily: 'Cairo,sans-serif', fontWeight: 700 }}>{hero.name}</span>
            </div>

            {!ready && !hero.splineUrl && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 3,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(2,4,20,.75)', pointerEvents: 'none',
              }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid #3b0764', borderTopColor: '#8b5cf6', animation: 'hsSpin 1s linear infinite' }} />
                <p style={{ color: '#a78bfa', fontFamily: 'Cairo,sans-serif', marginTop: 14, fontSize: 14 }}>
                  تحميل {hero.emoji}...
                </p>
              </div>
            )}

            {ready && loadError && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 4,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(2,4,20,.85)',
              }}>
                <span style={{ fontSize: 64 }}>{hero.emoji}</span>
                <p style={{ color: '#64748B', fontFamily: 'Cairo,sans-serif', marginTop: 12, fontSize: 13 }}>
                  ⚠️ تعذّر تحميل المجسم ثلاثي الأبعاد
                </p>
              </div>
            )}

            {hero.splineUrl ? (
              <SplineErrorBoundary emoji={hero.emoji}>
                <Suspense fallback={null}>
                  <Spline
                    scene={hero.splineUrl}
                    onLoad={() => setReady(true)}
                    style={{ width: '100%', height: isMobile ? '300px' : '520px', background: 'transparent' }}
                  />
                </Suspense>
              </SplineErrorBoundary>
            ) : (
              <model-viewer
                ref={mvRef}
                src={hero.glb}
                camera-controls=""
                auto-rotate=""
                auto-rotate-delay="1200"
                shadow-intensity="1"
                shadow-softness="0.8"
                environment-image="neutral"
                exposure="1"
                tone-mapping="commerce"
                animation-name={hero.anim ?? undefined}
                style={{ width: '100%', height: isMobile ? '300px' : '520px', background: 'transparent' }}
              />
            )}

            <div style={{
              position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,.45)', borderRadius: 20, padding: '3px 14px',
              fontSize: 10, color: '#475569', pointerEvents: 'none', whiteSpace: 'nowrap',
            }}>
              {hero.splineUrl ? '🖱️ حرّك الماوس للتفاعل مع البطل' : '🖱️ اسحب لتدوير البطل'}
            </div>
          </div>

          {/* SHOP PANEL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { key: 'chars',  label: '🦸 الشخصيات' },
                { key: 'colors', label: '🎨 الألوان'  },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  flex: 1, padding: '10px 2px',
                  background: tab === t.key ? 'rgba(139,92,246,.32)' : 'rgba(15,23,42,.5)',
                  border: `1.5px solid ${tab === t.key ? '#8B5CF6' : 'rgba(139,92,246,.15)'}`,
                  borderRadius: 12, color: tab === t.key ? '#C4B5FD' : '#475569',
                  cursor: 'pointer', fontSize: 13, fontFamily: 'Cairo,sans-serif',
                  fontWeight: tab === t.key ? 700 : 400, transition: 'all .18s',
                }}>
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{
              background: 'rgba(22,18,60,.55)',
              borderRadius: 18, border: '1px solid rgba(139,92,246,.14)',
              padding: '13px',
              maxHeight: isMobile ? 'none' : 450,
              overflowY: 'auto',
            }}>

              {/* CHARACTERS GRID */}
              {tab === 'chars' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <p style={{ margin: 0, color: '#A78BFA', fontSize: 13, fontWeight: 700 }}>🦸 مجموعة أبطالك</p>
                    <span style={{ color: '#64748B', fontSize: 11 }}>رصيدك: <strong style={{ color: '#FCD34D' }}>{coins}</strong> ⭐</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                    {HEROES.map((h, idx) => {
                      const owned_h   = isOwned(h);
                      const active    = hero.id === h.id;
                      const isBuying_ = buying === h.id;
                      const locked    = !owned_h && !h.comingSoon;
                      const canBuy    = locked && coins >= h.price;
                      const hasModel  = !!(h.glb || h.splineUrl);

                      return (
                        <div
                          key={h.id}
                          onClick={() => owned_h && !h.comingSoon && hasModel ? selectHero(h) : null}
                          style={{
                            borderRadius: 14, overflow: 'hidden', position: 'relative',
                            background: active
                              ? `linear-gradient(160deg,${h.color}28,${h.color}10)`
                              : h.comingSoon
                                ? 'rgba(15,23,42,.3)'
                                : 'rgba(15,23,42,.6)',
                            border: `2px solid ${
                              active       ? h.color :
                              owned_h      ? 'rgba(139,92,246,.28)' :
                              h.comingSoon ? 'rgba(71,85,105,.15)' :
                                             'rgba(71,85,105,.2)'
                            }`,
                            cursor: owned_h && !h.comingSoon && hasModel ? 'pointer' : 'default',
                            opacity: h.comingSoon ? 0.5 : 1,
                            transition: 'all .2s',
                            animation: idx < 9 ? `hsCardPop .3s ease-out ${idx * 0.05}s both` : 'none',
                            boxShadow: active ? `0 0 18px ${h.color}33` : 'none',
                          }}
                        >
                          <div style={{
                            height: 86,
                            background: `radial-gradient(circle at 50% 65%, ${h.color}25, transparent 72%)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            position: 'relative',
                          }}>
                            <span style={{
                              fontSize: 48, lineHeight: 1,
                              filter: h.comingSoon ? 'grayscale(.7) opacity(.7)' : 'none',
                            }}>
                              {h.emoji}
                            </span>

                            {h.comingSoon && (
                              <div style={{
                                position: 'absolute', top: 6, left: 6,
                                background: 'rgba(71,85,105,.8)', borderRadius: 6,
                                padding: '2px 7px', fontSize: 9, color: '#94A3B8',
                              }}>
                                🔜 قريباً
                              </div>
                            )}

                            {owned_h && !h.comingSoon && (
                              <div style={{
                                position: 'absolute', top: 6, right: 6,
                                background: 'rgba(34,197,94,.25)', border: '1px solid #22C55E',
                                borderRadius: 6, padding: '2px 6px', fontSize: 9, color: '#22C55E',
                              }}>
                                ✓ مملوك
                              </div>
                            )}
                            {h.splineUrl && (
                              <div style={{
                                position: 'absolute', bottom: 6, left: 6,
                                background: 'rgba(245,158,11,.22)', border: '1px solid rgba(245,158,11,.5)',
                                borderRadius: 6, padding: '2px 6px', fontSize: 9, color: '#FCD34D',
                              }}>
                                ✨ تفاعلي
                              </div>
                            )}
                          </div>

                          <div style={{ padding: '8px 10px 10px' }}>
                            <div style={{
                              color: active ? '#C4B5FD' : '#CBD5E1',
                              fontSize: 12, fontWeight: 700, fontFamily: 'Cairo,sans-serif', marginBottom: 2,
                            }}>
                              {h.name}
                            </div>
                            <div style={{ color: '#475569', fontSize: 10, fontFamily: 'Cairo,sans-serif', marginBottom: 8 }}>
                              {h.desc}
                            </div>

                            {h.comingSoon ? null : owned_h ? (
                              active ? (
                                <div style={{ color: h.color, fontSize: 10, fontWeight: 700 }}>▶ مختار الآن</div>
                              ) : (
                                <div style={{
                                  textAlign: 'center', background: 'rgba(139,92,246,.12)',
                                  border: '1px solid rgba(139,92,246,.2)',
                                  borderRadius: 8, padding: '5px', fontSize: 10, color: '#A78BFA',
                                }}>
                                  انقر للتجهيز
                                </div>
                              )
                            ) : (
                              <button
                                onClick={e => { e.stopPropagation(); handleBuy(h); }}
                                disabled={isBuying_ || !canBuy}
                                style={{
                                  width: '100%', padding: '6px 0',
                                  background: canBuy
                                    ? `linear-gradient(135deg,${h.color}dd,${h.color}99)`
                                    : 'rgba(71,85,105,.2)',
                                  border: 'none', borderRadius: 8,
                                  color: canBuy ? 'white' : '#64748B',
                                  cursor: canBuy && !isBuying_ ? 'pointer' : 'not-allowed',
                                  fontSize: 11, fontFamily: 'Cairo,sans-serif', fontWeight: 700,
                                  transition: 'all .15s',
                                }}>
                                {isBuying_ ? '⏳' : canBuy ? `⭐ ${h.price.toLocaleString('en-US')} نجمة` : `🔒 ${h.price.toLocaleString('en-US')} ⭐`}
                              </button>
                            )}
                          </div>

                          {active && (
                            <div style={{
                              position: 'absolute', inset: -1, borderRadius: 15,
                              border: `2px solid ${h.color}`,
                              boxShadow: `0 0 20px ${h.color}44, inset 0 0 12px ${h.color}11`,
                              pointerEvents: 'none',
                            }} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* COLOURS */}
              {tab === 'colors' && (
                <>
                  <p style={{ margin: '0 0 12px', color: '#A78BFA', fontSize: 13, fontWeight: 700 }}>🎨 لون زي البطل</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
                    {PALETTE.map(c => (
                      <button key={c} onClick={() => setTint(c)} style={{
                        aspectRatio: '1/1', background: c, borderRadius: 12,
                        border: tint === c ? '3px solid white' : '2px solid rgba(255,255,255,.1)',
                        cursor: 'pointer',
                        transform: tint === c ? 'scale(1.2)' : 'scale(1)',
                        boxShadow: tint === c ? `0 0 0 3px ${c}88, 0 0 16px ${c}66` : 'none',
                        transition: 'all .15s',
                      }} />
                    ))}
                  </div>
                  <p style={{ margin: '10px 0 0', color: '#334155', fontSize: 11, textAlign: 'center' }}>
                    {ready && !loadError ? '✓ اللون مطبّق على المجسم' : 'يُطبَّق اللون بعد اكتمال التحميل'}
                  </p>
                </>
              )}
            </div>

            {/* Current hero card */}
            <div style={{
              background: `linear-gradient(135deg,${hero.color}18,${hero.color}0a)`,
              border: `1px solid ${hero.color}33`, borderRadius: 14,
              padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 32 }}>{hero.emoji}</span>
              <div>
                <div style={{ color: '#C4B5FD', fontSize: 14, fontWeight: 700, fontFamily: 'Cairo,sans-serif' }}>
                  {hero.name}
                </div>
                <div style={{ color: '#475569', fontSize: 11, fontFamily: 'Cairo,sans-serif' }}>
                  {hero.desc}
                </div>
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving || isLoad || loadError}
              style={{
                padding: '14px',
                background: saving || loadError ? 'rgba(124,58,237,.3)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                border: 'none', borderRadius: 14, color: 'white',
                fontSize: 15, fontWeight: 700, fontFamily: 'Cairo,sans-serif',
                cursor: saving || isLoad || loadError ? 'not-allowed' : 'pointer',
                boxShadow: saving || loadError ? 'none' : '0 8px 24px rgba(124,58,237,.45)',
                transition: 'transform .15s, box-shadow .15s',
              }}
              onMouseEnter={e => {
                if (!saving && !isLoad && !loadError) {
                  e.currentTarget.style.transform = 'scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(124,58,237,.65)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = saving || loadError ? 'none' : '0 8px 24px rgba(124,58,237,.45)';
              }}
            >
              {saving ? '⏳ جاري الحفظ...' : '💾 احفظ بطلك'}
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: toast.ok ? 'rgba(5,46,22,.93)' : 'rgba(127,29,29,.93)',
          border: `1.5px solid ${toast.ok ? '#22C55E' : '#EF4444'}`,
          color: 'white', borderRadius: 14, padding: '12px 30px',
          fontFamily: 'Cairo,sans-serif', fontSize: 15, fontWeight: 700,
          boxShadow: '0 8px 32px rgba(0,0,0,.5)',
          zIndex: 300, animation: 'hsFadeIn .3s ease-out', whiteSpace: 'nowrap',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
