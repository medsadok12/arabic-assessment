'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

/* ─── Levels ─── */
const LEVELS = [
  { min: 0,    max: 99,   color: '#CD8B3A', glow: '#CD8B3A', icon: '🌱', name: 'مبتدئ',   next: 'مستكشف'  },
  { min: 100,  max: 299,  color: '#94A3B8', glow: '#94A3B8', icon: '⚡', name: 'مستكشف',  next: 'بطل'     },
  { min: 300,  max: 699,  color: '#F59E0B', glow: '#F59E0B', icon: '⭐', name: 'بطل',      next: 'محترف'   },
  { min: 700,  max: 1499, color: '#A78BFA', glow: '#A78BFA', icon: '💎', name: 'محترف',   next: 'أسطورة'  },
  { min: 1500, max: Infinity, color: '#22D3EE', glow: '#22D3EE', icon: '🚀', name: 'أسطورة', next: null },
];

const R    = 15;            // SVG ring radius
const CIRC = 2 * Math.PI * R; // ≈ 94.2

function getLvl(pts) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (pts >= LEVELS[i].min) return { ...LEVELS[i], idx: i };
  }
  return { ...LEVELS[0], idx: 0 };
}

function getProgress(pts, lvl) {
  if (lvl.max === Infinity) return Math.min(100, ((pts - lvl.min) / 500) * 100);
  return ((pts - lvl.min) / (lvl.max - lvl.min + 1)) * 100;
}

/* ─── Keyframes injected once ─── */
const ANIM_ID = 'pts-badge-anim';
if (typeof document !== 'undefined' && !document.getElementById(ANIM_ID)) {
  const s = document.createElement('style');
  s.id = ANIM_ID;
  s.textContent = `
    @keyframes ptsBounce  { 0%{transform:translate(-50%,-50%) scale(1)} 40%{transform:translate(-50%,-50%) scale(1.5)} 70%{transform:translate(-50%,-50%) scale(.88)} 100%{transform:translate(-50%,-50%) scale(1)} }
    @keyframes ptsPop     { 0%{transform:translate(-50%,-50%) scale(0);opacity:0} 60%{transform:translate(-50%,-50%) scale(1.2);opacity:1} 100%{transform:translate(-50%,-50%) scale(1);opacity:1} }
    @keyframes ptsFadeIn  { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
    @keyframes ptsGlow    { 0%,100%{box-shadow:0 0 0 0 transparent} 50%{box-shadow:0 0 18px 4px var(--pts-glow)} }
    @keyframes ptsFloat   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
    @keyframes ptsCount   { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
    @keyframes ptsLvlUp   { 0%{transform:scale(1)} 30%{transform:scale(1.35)} 55%{transform:scale(.9)} 75%{transform:scale(1.12)} 100%{transform:scale(1)} }
    @keyframes ptsSpin    { to{transform:rotate(360deg)} }
    @keyframes ptsRipple  { 0%{transform:translate(-50%,-50%) scale(.5);opacity:.9} 100%{transform:translate(-50%,-50%) scale(2.2);opacity:0} }
  `;
  document.head.appendChild(s);
}

export default function PointsBadge() {
  const [pts,    setPts]    = useState(0);
  const [shown,  setShown]  = useState(0);   // displayed (animated) value
  const [burst,  setBurst]  = useState(false);
  const [lvlUp,  setLvlUp]  = useState(false);
  const [open,   setOpen]   = useState(false);
  const prevRef  = useRef(0);
  const prevLvl  = useRef(0);
  const rafRef   = useRef(null);
  const popRef   = useRef(null);

  /* ─── fetch & animate ─── */
  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/points');
      const j = await r.json();
      const newPts = j.points ?? 0;
      if (newPts === prevRef.current) return;

      const gained = newPts > prevRef.current;
      if (gained) {
        setBurst(true);
        setTimeout(() => setBurst(false), 900);
        const newLvlIdx = getLvl(newPts).idx;
        if (newLvlIdx > prevLvl.current) {
          setLvlUp(true);
          setTimeout(() => setLvlUp(false), 1400);
        }
        prevLvl.current = newLvlIdx;
      }

      /* animate counter */
      const from = prevRef.current;
      const to   = newPts;
      const dur  = Math.min(1400, Math.abs(to - from) * 40);
      const t0   = performance.now();
      cancelAnimationFrame(rafRef.current);
      function tick(now) {
        const p = Math.min((now - t0) / dur, 1);
        const ease = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        setShown(Math.round(from + (to - from) * ease));
        if (p < 1) rafRef.current = requestAnimationFrame(tick);
      }
      rafRef.current = requestAnimationFrame(tick);
      prevRef.current = newPts;
      setPts(newPts);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => { clearInterval(id); cancelAnimationFrame(rafRef.current); };
  }, [load]);

  /* close popup on outside click */
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (popRef.current && !popRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const lvl      = getLvl(pts);
  const progress = getProgress(pts, lvl);
  const dashFill = (progress / 100) * CIRC;

  return (
    <div ref={popRef} style={{ position: 'relative', '--pts-glow': lvl.glow + '60' }}>

      {/* ── Trigger Button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: burst
            ? `linear-gradient(135deg,${lvl.color}25,${lvl.color}10)`
            : 'rgba(255,255,255,0.10)',
          border: `1.5px solid ${burst ? lvl.color + 'AA' : 'rgba(255,255,255,0.25)'}`,
          borderRadius: 50,
          padding: '3px 12px 3px 3px',
          cursor: 'pointer',
          color: '#fff',
          fontFamily: "'Cairo','Tajawal',sans-serif",
          transition: 'background .35s, border-color .35s, box-shadow .35s',
          boxShadow: burst ? `0 0 18px ${lvl.color}60, 0 0 6px ${lvl.color}30` : 'none',
          animation: lvlUp ? 'ptsLvlUp .8s ease' : 'none',
          flexShrink: 0,
          outline: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = `${lvl.color}22`;
          e.currentTarget.style.borderColor = lvl.color + '88';
        }}
        onMouseLeave={e => {
          if (!burst) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.10)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
          }
        }}
      >
        {/* ── SVG ring + icon ── */}
        <div style={{ position: 'relative', width: 34, height: 34, flexShrink: 0 }}>

          {/* ripple on burst */}
          {burst && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: 34, height: 34, borderRadius: '50%',
              border: `2px solid ${lvl.color}`,
              animation: 'ptsRipple .7s ease-out forwards',
              pointerEvents: 'none',
            }} />
          )}

          <svg width="34" height="34" viewBox="0 0 38 38"
            style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
            {/* track */}
            <circle cx="19" cy="19" r={R} fill="none"
              stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
            {/* fill */}
            <circle cx="19" cy="19" r={R} fill="none"
              stroke={lvl.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${dashFill} ${CIRC}`}
              style={{
                transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1), stroke .5s ease',
                filter: `drop-shadow(0 0 3px ${lvl.color}99)`,
              }}
            />
          </svg>

          {/* icon in center */}
          <span style={{
            position: 'absolute', top: '50%', left: '50%',
            fontSize: '1rem', lineHeight: 1,
            transform: 'translate(-50%,-50%)',
            animation: burst ? 'ptsBounce .6s ease' : lvlUp ? 'ptsPop .7s ease' : 'none',
          }}>{lvl.icon}</span>
        </div>

        {/* ── Points counter ── */}
        <span style={{
          fontWeight: 900,
          fontSize: '.85rem',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '.3px',
          color: burst ? lvl.color : '#fff',
          transition: 'color .3s',
          animation: burst ? 'ptsCount .3s ease' : 'none',
          minWidth: 28,
          textAlign: 'center',
        }}>
          {shown.toLocaleString('ar-EG')}
        </span>
      </button>

      {/* ── Popup card ── */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(160deg,#0f172a,#1e293b)',
          border: `1.5px solid ${lvl.color}40`,
          borderRadius: 20,
          padding: '18px 20px',
          minWidth: 230,
          boxShadow: `0 12px 40px rgba(0,0,0,.55), 0 0 0 1px ${lvl.color}20, 0 0 24px ${lvl.color}20`,
          zIndex: 9999,
          color: '#fff',
          fontFamily: "'Cairo','Tajawal',sans-serif",
          direction: 'rtl',
          animation: 'ptsFadeIn .22s ease',
        }}>
          {/* triangle pointer */}
          <div style={{
            position: 'absolute', top: -7, left: '50%', transform: 'translateX(-50%)',
            width: 14, height: 7,
            overflow: 'hidden',
          }}>
            <div style={{
              width: 10, height: 10, background: '#1e293b',
              border: `1px solid ${lvl.color}40`,
              transform: 'rotate(45deg)', margin: '3px auto 0',
            }} />
          </div>

          {/* Level header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: `radial-gradient(circle,${lvl.color}30,${lvl.color}08)`,
              border: `2px solid ${lvl.color}60`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.7rem',
              boxShadow: `0 0 18px ${lvl.color}40`,
              flexShrink: 0,
              animation: 'ptsFloat 2.5s ease-in-out infinite',
            }}>
              {lvl.icon}
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1.05rem', color: lvl.color }}>{lvl.name}</div>
              <div style={{ fontSize: '.75rem', color: '#94a3b8', marginTop: 1 }}>
                {pts.toLocaleString('ar-EG')} نقطة مجموع
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: '#64748b', marginBottom: 5 }}>
              <span style={{ color: '#94a3b8' }}>
                {lvl.next ? `نحو "${lvl.next}"` : '🏆 أعلى مستوى!'}
              </span>
              <span style={{ fontWeight: 700, color: lvl.color }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ height: 7, background: 'rgba(255,255,255,.07)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: `linear-gradient(90deg,${lvl.color}70,${lvl.color})`,
                borderRadius: 99,
                boxShadow: `0 0 8px ${lvl.color}80`,
                transition: 'width 1s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
          </div>

          {lvl.max !== Infinity && (
            <div style={{ fontSize: '.7rem', color: '#475569', textAlign: 'center', marginBottom: 12 }}>
              {(lvl.max + 1 - pts).toLocaleString('ar-EG')} نقطة للمستوى التالي
            </div>
          )}

          {/* All levels mini-map */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.07)' }}>
            {LEVELS.map((l, i) => {
              const reached = pts >= l.min;
              const current = i === lvl.idx;
              return (
                <div key={i} title={l.name} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  flex: 1,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: reached ? `${l.color}25` : 'rgba(255,255,255,.05)',
                    border: `1.5px solid ${reached ? l.color + (current ? 'ff' : '80') : 'rgba(255,255,255,.1)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.9rem',
                    boxShadow: current ? `0 0 10px ${l.color}70` : 'none',
                    transition: 'all .3s',
                    opacity: reached ? 1 : .35,
                    animation: current ? 'ptsFloat 2s ease-in-out infinite' : 'none',
                  }}>{l.icon}</div>
                  <span style={{ fontSize: '.55rem', color: reached ? l.color : '#475569', fontWeight: current ? 800 : 500 }}>
                    {l.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
