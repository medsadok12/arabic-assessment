'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

/* ── Inject animations once ──────────────────────────────────────────────── */
if (typeof document !== 'undefined' && !document.getElementById('hs-anim')) {
  const s = document.createElement('style');
  s.id = 'hs-anim';
  s.textContent = `
    @keyframes hsSpin    { to{transform:rotate(360deg)} }
    @keyframes hsPulse   { 0%,100%{opacity:.12;transform:scale(.82)} 50%{opacity:.5;transform:scale(1.08)} }
    @keyframes hsFadeIn  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    @keyframes hsGlow    { 0%,100%{box-shadow:0 0 20px rgba(139,92,246,.28)} 50%{box-shadow:0 0 52px rgba(139,92,246,.7)} }
    @keyframes hsShimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
    @keyframes hsHaloFloat { 0%,100%{transform:translate(-50%,0px)} 50%{transform:translate(-50%,-9px)} }
    @keyframes hsPetBounce { 0%,100%{transform:translateY(0)} 40%{transform:translateY(-10px)} 60%{transform:translateY(-4px)} }
    model-viewer { --progress-bar-color:#8b5cf6; --poster-color:transparent; }
  `;
  document.head.appendChild(s);
}

/* ── Load Google model-viewer v3.5 CDN script (ES module, runs once) ───── */
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

/* ══════════════════════════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════════════════════════ */

const HEROES = [
  {
    id: 'c1', name: 'البطل الفضائي', emoji: '🧑‍🚀', color: '#3B82F6',
    glb: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
  },
  {
    id: 'c2', name: 'الروبوت الذكي', emoji: '🤖', color: '#8B5CF6',
    glb: 'https://modelviewer.dev/shared-assets/models/RobotExpressive.glb',
  },
  /* Add more characters here — just drop a .glb URL and fill the fields */
];

const ACCS = {
  hat: [
    { id: 'wizard',     name: 'الساحر',    emoji: '🧙'  },
    { id: 'crown',      name: 'التاج',      emoji: '👑'  },
    { id: 'graduation', name: 'التخرج',     emoji: '🎓'  },
    { id: 'pirate',     name: 'القرصان',    emoji: '🏴‍☠️' },
    { id: 'cowboy',     name: 'الكاوبوي',   emoji: '🤠'  },
    { id: 'party',      name: 'الحفلة',     emoji: '🎉'  },
  ],
  halo: [
    { id: 'stars',   name: 'النجوم',  emoji: '⭐' },
    { id: 'fire',    name: 'النار',   emoji: '🔥' },
    { id: 'angel',   name: 'الملاك',  emoji: '😇' },
    { id: 'rainbow', name: 'قوس قزح', emoji: '🌈' },
  ],
  companion: [
    { id: 'cat',    name: 'القطة',   emoji: '🐱' },
    { id: 'dragon', name: 'التنين',  emoji: '🐲' },
    { id: 'star',   name: 'النجمة',  emoji: '⭐' },
    { id: 'robot',  name: 'الروبوت', emoji: '🤖' },
  ],
};

const PALETTE = [
  '#3B82F6', '#EF4444', '#22C55E', '#EAB308', '#8B5CF6',
  '#EC4899', '#F97316', '#06B6D4', '#F1F5F9', '#64748B',
];

/* ── hex → [0..1] RGBA for model-viewer material API ───────────────────── */
function hexToFactor(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255, 1.0];
}

/* ══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENT — accessory grid section (defined outside page to avoid
   remounting on every render)
══════════════════════════════════════════════════════════════════════════ */
function AccSection({ cat, label, items, equipped, onToggle }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ margin: '0 0 7px', color: '#94A3B8', fontSize: 12, fontWeight: 700 }}>
        {label}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
        {items.map(item => {
          const on = equipped[cat] === item.id;
          return (
            <button key={item.id} onClick={() => onToggle(cat, item.id)} style={{
              padding: '8px 4px',
              background: on ? 'rgba(139,92,246,.28)' : 'rgba(15,23,42,.55)',
              border: `1.5px solid ${on ? '#8B5CF6' : 'rgba(139,92,246,.15)'}`,
              borderRadius: 10, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              transition: 'all .15s',
              transform: on ? 'scale(1.06)' : 'scale(1)',
            }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{item.emoji}</span>
              <span style={{ color: on ? '#C4B5FD' : '#475569', fontSize: 9, fontFamily: 'Cairo,sans-serif' }}>
                {item.name}
              </span>
              {on && <span style={{ color: '#A78BFA', fontSize: 8 }}>✓ مرتدٍ</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function HeroesStudio() {
  useModelViewerScript();

  const mvRef = useRef(null);

  const [cfg,      setCfg]      = useState(null);
  const [hero,     setHero]     = useState(HEROES[0]);
  const [tint,     setTint]     = useState(HEROES[0].color);
  const [equipped, setEquipped] = useState({ hat: null, halo: null, companion: null });
  const [ready,    setReady]    = useState(false);
  const [tab,      setTab]      = useState('chars');
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  /* Detect mobile once on client */
  useEffect(() => { setIsMobile(window.innerWidth < 700); }, []);

  /* Fetch config */
  useEffect(() => {
    fetch('/api/hero-config').then(r => r.json()).then(d => {
      setCfg(d);
      if (d.equipped) {
        setEquipped({
          hat:       d.equipped.hat       ?? null,
          halo:      d.equipped.halo      ?? null,
          companion: d.equipped.companion ?? null,
        });
      }
    }).catch(() => setCfg({ points: 0 }));
  }, []);

  /* Re-attach load listener when GLB changes */
  useEffect(() => {
    const mv = mvRef.current;
    if (!mv) return;
    setReady(false);
    const onLoad = () => setReady(true);
    mv.addEventListener('load', onLoad);
    return () => mv.removeEventListener('load', onLoad);
  }, [hero.glb]);

  /* ── Colour swap via model-viewer materials JS API ─────────────────── */
  useEffect(() => {
    if (!ready) return;
    const mv = mvRef.current;
    if (!mv?.model?.materials?.length) return;
    /* Apply tint to primary material (index 0 = main suit/body).
       For multi-material models, iterate all or target by material.name. */
    mv.model.materials[0].pbrMetallicRoughness.setBaseColorFactor(hexToFactor(tint));
  }, [ready, tint]);

  /* ── GLB variant switching (KHR_materials_variants extension) ───────
     If the loaded GLB was authored with variants (e.g. "hat-crown"),
     this switches to that variant automatically. Falls back silently
     for models without variants — CSS emoji overlay takes over. */
  useEffect(() => {
    if (!ready) return;
    const mv = mvRef.current;
    const variants = mv?.availableVariants ?? [];
    if (!variants.length) return;
    const target = equipped.hat ? `hat-${equipped.hat}` : 'default';
    if (variants.includes(target)) mv.variantName = target;
  }, [ready, equipped.hat]);

  /* Toggle accessory (equip if different, unequip if same) */
  const toggleAcc = useCallback((cat, id) => {
    setEquipped(prev => ({ ...prev, [cat]: prev[cat] === id ? null : id }));
  }, []);

  /* Switch character */
  function selectHero(h) {
    setHero(h);
    setTint(h.color);
    setReady(false);
  }

  /* Save */
  async function handleSave() {
    setSaving(true);
    try {
      const avatarId   = `${hero.id}-${tint.replace('#', '')}`;
      const previewSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="${tint}"/>
        <text y="70" x="50" text-anchor="middle" font-size="50">${hero.emoji}</text>
      </svg>`;
      const previewUrl = `data:image/svg+xml;base64,${btoa(previewSvg)}`;

      const res = await fetch('/api/hero-config', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar_url:  hero.glb,
          preview_url: previewUrl,
          avatar_id:   avatarId,
          hat:         equipped.hat,
          halo:        equipped.halo,
          companion:   equipped.companion,
        }),
      });
      if (!res.ok) throw new Error();
      setCfg(p => ({ ...p, avatar_url: hero.glb, preview_url: previewUrl }));
      setToast({ msg: '🎉 تم حفظ مظهرك!', ok: true });
    } catch {
      setToast({ msg: '❌ خطأ أثناء الحفظ', ok: false });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3200);
    }
  }

  const coins  = cfg?.points ?? 0;
  const isLoad = cfg === null;

  /* Helpers for accessory emoji lookup */
  const getEmoji = (cat, id) => ACCS[cat]?.find(a => a.id === id)?.emoji ?? '';

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, #1a0533 0%, #020314 65%)',
      fontFamily: 'Cairo, Tajawal, sans-serif',
      color: 'white', direction: 'rtl',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: 'clamp(10px,2vw,20px) 10px 36px',
    }}>

      {/* ── Stars ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {Array.from({ length: 28 }, (_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${4 + i * 3.3}%`, top: `${3 + (i * 7 % 90)}%`,
            width: i % 4 === 0 ? 3 : 2, height: i % 4 === 0 ? 3 : 2,
            background: i % 5 === 0 ? '#a78bfa' : 'white', borderRadius: '50%',
            animation: `hsPulse ${2.2 + i * 0.26}s ease-in-out infinite`,
            animationDelay: `${i * 0.1}s`,
          }} />
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 980, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/dashboard" style={{ color: '#475569', fontSize: 13, textDecoration: 'none', fontFamily: 'Cairo,sans-serif', padding: '4px 8px' }}>
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
            margin: 0, fontSize: 'clamp(20px,5vw,28px)', fontWeight: 900,
            backgroundImage: 'linear-gradient(135deg,#c084fc,#818cf8,#38bdf8)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            animation: 'hsShimmer 5s linear infinite',
          }}>
            ✨ استوديو الأبطال
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748B', fontSize: 12 }}>
            اسحب البطل لتدويره 360° — اختر شخصيتك وأكسسواراتك
          </p>
        </div>

        {/* ── MAIN GRID ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 290px',
          gap: 14,
          alignItems: 'start',
        }}>

          {/* ═════════════════ 3-D VIEWER ═════════════════ */}
          <div style={{
            position: 'relative', borderRadius: 22, overflow: 'hidden',
            background: 'linear-gradient(160deg,rgba(18,12,55,.85),rgba(4,2,18,.9))',
            border: '1px solid rgba(139,92,246,.22)',
            boxShadow: '0 20px 60px rgba(0,0,0,.6)',
            animation: 'hsGlow 4s ease-in-out infinite',
            minHeight: isMobile ? 300 : 520,
          }}>

            {/* Spinner while GLB loads */}
            {!ready && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 3,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(2,4,20,.7)', pointerEvents: 'none',
              }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #3b0764', borderTopColor: '#8b5cf6', animation: 'hsSpin 1s linear infinite' }} />
                <p style={{ color: '#a78bfa', fontFamily: 'Cairo,sans-serif', marginTop: 12, fontSize: 14 }}>
                  جاري تحميل {hero.emoji}...
                </p>
              </div>
            )}

            {/*
              model-viewer attributes:
              ┌──────────────────────────────────────────────────────────┐
              │ camera-controls   → drag / pinch to orbit & zoom        │
              │ auto-rotate       → gentle idle spin                    │
              │ shadow-intensity  → realistic ground contact shadow     │
              │ environment-image → stable neutral studio lighting      │
              │ exposure          → consistent brightness across models │
              │ tone-mapping      → commerce = rich, stable colours     │
              │ animation-name    → plays "Idle" anim if GLB has it     │
              └──────────────────────────────────────────────────────────┘
            */}
            <model-viewer
              ref={mvRef}
              src={hero.glb}
              camera-controls=""
              auto-rotate=""
              auto-rotate-delay="1000"
              shadow-intensity="1"
              shadow-softness="0.85"
              environment-image="neutral"
              exposure="1"
              tone-mapping="commerce"
              animation-name="Idle"
              style={{
                width: '100%',
                height: isMobile ? '300px' : '520px',
                background: 'transparent',
              }}
            />

            {/* ── Accessory OVERLAYS ───────────────────────────────────
                Halo   → floats above head (top ~−3%)
                Hat    → sits on head crown (top ~2%)
                Pet    → bottom-right corner
                Note: overlays are 2D emoji. They appear instantly and
                complement the 3D scene. For fully-attached 3D accessories,
                the GLB must include them as variant materials or extra meshes.
            ────────────────────────────────────────────────────────── */}

            {equipped.halo && (
              <div style={{
                position: 'absolute', top: '-3%', left: '50%',
                animation: 'hsHaloFloat 2.5s ease-in-out infinite',
                fontSize: 'clamp(42px,13%,68px)', lineHeight: 1,
                zIndex: 5, pointerEvents: 'none', userSelect: 'none',
              }}>
                {getEmoji('halo', equipped.halo)}
              </div>
            )}

            {equipped.hat && (
              <div style={{
                position: 'absolute', top: '2%', left: '50%',
                transform: 'translateX(-50%)',
                fontSize: 'clamp(40px,12%,64px)', lineHeight: 1,
                zIndex: 5, pointerEvents: 'none', userSelect: 'none',
              }}>
                {getEmoji('hat', equipped.hat)}
              </div>
            )}

            {equipped.companion && (
              <div style={{
                position: 'absolute', bottom: '8%', right: '4%',
                animation: 'hsPetBounce 2.2s ease-in-out infinite',
                fontSize: 'clamp(40px,12%,60px)', lineHeight: 1,
                zIndex: 5, pointerEvents: 'none', userSelect: 'none',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.5))',
              }}>
                {getEmoji('companion', equipped.companion)}
              </div>
            )}

            {/* Orbit hint */}
            <div style={{
              position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,.42)', borderRadius: 20, padding: '3px 12px',
              fontSize: 10, color: '#475569', pointerEvents: 'none', whiteSpace: 'nowrap',
            }}>
              🖱️ اسحب لتدوير البطل • اسحب للتكبير
            </div>
          </div>

          {/* ═════════════════ SHOP PANEL ═════════════════ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Tab strip */}
            <div style={{ display: 'flex', gap: 5 }}>
              {[
                { key: 'chars',  label: '🦸 شخصيات' },
                { key: 'acc',    label: '🎩 أكسسوار' },
                { key: 'colors', label: '🎨 ألوان' },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  flex: 1, padding: '8px 2px',
                  background: tab === t.key ? 'rgba(139,92,246,.3)' : 'rgba(15,23,42,.5)',
                  border: `1.5px solid ${tab === t.key ? '#8B5CF6' : 'rgba(139,92,246,.15)'}`,
                  borderRadius: 10,
                  color: tab === t.key ? '#C4B5FD' : '#475569',
                  cursor: 'pointer', fontSize: 11, fontFamily: 'Cairo,sans-serif',
                  fontWeight: tab === t.key ? 700 : 400,
                  transition: 'all .18s',
                }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab body */}
            <div style={{
              background: 'rgba(22,18,60,.5)',
              borderRadius: 16, border: '1px solid rgba(139,92,246,.14)',
              padding: '13px',
              maxHeight: isMobile ? 'none' : 400,
              overflowY: 'auto',
            }}>

              {/* ─ CHARACTERS ─ */}
              {tab === 'chars' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ margin: '0 0 6px', color: '#A78BFA', fontSize: 13, fontWeight: 700 }}>🦸 اختر بطلك</p>
                  {HEROES.map(h => (
                    <button key={h.id} onClick={() => selectHero(h)} style={{
                      padding: '10px 12px',
                      background: hero.id === h.id
                        ? `linear-gradient(135deg,${h.color}20,${h.color}0d)`
                        : 'rgba(15,23,42,.5)',
                      border: `2px solid ${hero.id === h.id ? h.color : 'rgba(139,92,246,.15)'}`,
                      borderRadius: 12, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      transition: 'all .18s',
                    }}>
                      <span style={{ fontSize: 26 }}>{h.emoji}</span>
                      <span style={{ color: hero.id === h.id ? '#C4B5FD' : '#64748B', fontSize: 13, fontFamily: 'Cairo,sans-serif', fontWeight: 600 }}>
                        {h.name}
                      </span>
                      {hero.id === h.id && (
                        <span style={{ marginRight: 'auto', color: '#8B5CF6', fontSize: 10 }}>✓ مختار</span>
                      )}
                    </button>
                  ))}
                  <p style={{ margin: '6px 0 0', color: '#1E293B', fontSize: 11, textAlign: 'center' }}>
                    ✨ المزيد قادم قريباً
                  </p>
                </div>
              )}

              {/* ─ ACCESSORIES ─ */}
              {tab === 'acc' && (
                <>
                  <AccSection cat="hat"       label="🎩 قبعات"    items={ACCS.hat}       equipped={equipped} onToggle={toggleAcc} />
                  <AccSection cat="halo"      label="✨ هالات"    items={ACCS.halo}      equipped={equipped} onToggle={toggleAcc} />
                  <AccSection cat="companion" label="🐾 مرافقون"  items={ACCS.companion}  equipped={equipped} onToggle={toggleAcc} />
                </>
              )}

              {/* ─ COLOURS ─ */}
              {tab === 'colors' && (
                <>
                  <p style={{ margin: '0 0 10px', color: '#A78BFA', fontSize: 13, fontWeight: 700 }}>🎨 لون الزي</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
                    {PALETTE.map(c => (
                      <button key={c} onClick={() => setTint(c)} style={{
                        aspectRatio: '1/1', background: c, borderRadius: 10,
                        border: tint === c ? '3px solid white' : '2px solid rgba(255,255,255,.1)',
                        cursor: 'pointer',
                        transform: tint === c ? 'scale(1.18)' : 'scale(1)',
                        boxShadow: tint === c ? `0 0 0 3px ${c}88` : 'none',
                        transition: 'all .15s',
                      }} />
                    ))}
                  </div>
                  {!ready && (
                    <p style={{ margin: '8px 0 0', color: '#334155', fontSize: 11, textAlign: 'center' }}>
                      يُطبَّق اللون بعد اكتمال التحميل
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Active accessories summary */}
            {(equipped.hat || equipped.halo || equipped.companion) && (
              <div style={{
                background: 'rgba(139,92,246,.1)', borderRadius: 10,
                border: '1px solid rgba(139,92,246,.2)',
                padding: '8px 12px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center',
              }}>
                <span style={{ color: '#64748B', fontSize: 11, fontFamily: 'Cairo,sans-serif' }}>مرتدٍ:</span>
                {equipped.hat      && <span style={{ fontSize: 18 }}>{getEmoji('hat',       equipped.hat)}</span>}
                {equipped.halo     && <span style={{ fontSize: 18 }}>{getEmoji('halo',      equipped.halo)}</span>}
                {equipped.companion && <span style={{ fontSize: 18 }}>{getEmoji('companion', equipped.companion)}</span>}
              </div>
            )}

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving || isLoad}
              style={{
                padding: '13px',
                background: saving ? 'rgba(124,58,237,.3)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                border: 'none', borderRadius: 14,
                color: 'white', fontSize: 15, fontWeight: 700,
                cursor: saving || isLoad ? 'not-allowed' : 'pointer',
                fontFamily: 'Cairo,sans-serif',
                boxShadow: saving ? 'none' : '0 8px 24px rgba(124,58,237,.4)',
                transition: 'transform .15s, box-shadow .15s',
              }}
              onMouseEnter={e => {
                if (!saving && !isLoad) {
                  e.currentTarget.style.transform = 'scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(124,58,237,.6)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = saving ? 'none' : '0 8px 24px rgba(124,58,237,.4)';
              }}
            >
              {saving ? '⏳ جاري الحفظ...' : '💾 احفظ مظهرك'}
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 26, left: '50%', transform: 'translateX(-50%)',
          background: toast.ok ? 'rgba(5,46,22,.93)' : 'rgba(127,29,29,.93)',
          border: `1.5px solid ${toast.ok ? '#22C55E' : '#EF4444'}`,
          color: 'white', borderRadius: 14, padding: '12px 28px',
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
