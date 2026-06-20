'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const LEVELS = [
  { min: 0,    max: 99,   color: '#D97706', icon: '🌱', name: 'مبتدئ',   next: 100  },
  { min: 100,  max: 299,  color: '#94A3B8', icon: '⚡', name: 'مستكشف',  next: 300  },
  { min: 300,  max: 699,  color: '#F59E0B', icon: '⭐', name: 'بطل',      next: 700  },
  { min: 700,  max: 1499, color: '#A78BFA', icon: '💎', name: 'محترف',   next: 1500 },
  { min: 1500, max: Infinity, color: '#22D3EE', icon: '🚀', name: 'أسطورة', next: null },
];

const R    = 22;
const CIRC = 2 * Math.PI * R; // 138.2

function getLvl(pts) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (pts >= LEVELS[i].min) return { ...LEVELS[i], idx: i };
  }
  return { ...LEVELS[0], idx: 0 };
}

const ANIM_ID = 'pts-float-anim';
if (typeof document !== 'undefined' && !document.getElementById(ANIM_ID)) {
  const s = document.createElement('style');
  s.id = ANIM_ID;
  s.textContent = `
    @keyframes pfBounce { 0%{transform:translate(-50%,-50%)scale(1)} 40%{transform:translate(-50%,-50%)scale(1.6)} 70%{transform:translate(-50%,-50%)scale(.85)} 100%{transform:translate(-50%,-50%)scale(1)} }
    @keyframes pfRipple { 0%{transform:scale(.6);opacity:.8} 100%{transform:scale(2.4);opacity:0} }
    @keyframes pfFadeIn { from{opacity:0;transform:translateX(8px)} to{opacity:1;transform:translateX(0)} }
    @keyframes pfFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
    @keyframes pfPulse  { 0%,100%{box-shadow:0 0 0 0 transparent} 50%{box-shadow:0 0 0 6px var(--pf-glow)} }
    @keyframes pfSpin   { to{transform:rotate(360deg)} }
    @keyframes pfNum    { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
  `;
  document.head.appendChild(s);
}

export default function PointsBadge() {
  const [pts,   setPts]   = useState(0);
  const [shown, setShown] = useState(0);
  const [burst, setBurst] = useState(false);
  const [lvlUp, setLvlUp] = useState(false);
  const [open,  setOpen]  = useState(false);
  const prevRef  = useRef(0);
  const prevLvl  = useRef(0);
  const rafRef   = useRef(null);
  const wrapRef  = useRef(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/points');
      const j = await r.json();
      const newPts = j.points ?? 0;
      if (newPts === prevRef.current) return;

      if (newPts > prevRef.current) {
        setBurst(true);
        setTimeout(() => setBurst(false), 900);
        const ni = getLvl(newPts).idx;
        if (ni > prevLvl.current) { setLvlUp(true); setTimeout(() => setLvlUp(false), 1200); }
        prevLvl.current = ni;
      }

      const from = prevRef.current, to = newPts;
      const dur  = Math.min(1400, Math.abs(to - from) * 35);
      const t0   = performance.now();
      cancelAnimationFrame(rafRef.current);
      function tick(now) {
        const p    = Math.min((now - t0) / dur, 1);
        const ease = p < .5 ? 2*p*p : 1 - Math.pow(-2*p+2, 2)/2;
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

  useEffect(() => {
    if (!open) return;
    const fn = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const lvl      = getLvl(pts);
  const range    = lvl.max === Infinity ? 500 : lvl.max - lvl.min + 1;
  const progress = Math.min(100, ((pts - lvl.min) / range) * 100);
  const fill     = (progress / 100) * CIRC;

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'fixed',
        right: 18,
        top: 78,
        zIndex: 500,
        fontFamily: "'Cairo','Tajawal',sans-serif",
        direction: 'rtl',
        '--pf-glow': lvl.color + '55',
      }}
    >
      {/* ── Main floating badge ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          gap:            6,
          background:     'rgba(15,23,42,0.88)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border:         `2px solid ${burst ? lvl.color : lvl.color + '55'}`,
          borderRadius:   22,
          padding:        '12px 14px 10px',
          cursor:         'pointer',
          minWidth:       72,
          color:          '#fff',
          boxShadow:      burst
            ? `0 0 28px ${lvl.color}70, 0 8px 32px rgba(0,0,0,.5)`
            : `0 8px 32px rgba(0,0,0,.45), 0 0 12px ${lvl.color}20`,
          transition:     'border-color .4s, box-shadow .4s',
          animation:      lvlUp ? 'pfBounce .7s ease' : 'none',
          outline:        'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {/* SVG Ring */}
        <div style={{ position: 'relative', width: 54, height: 54, flexShrink: 0 }}>

          {burst && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: `2.5px solid ${lvl.color}`,
              animation: 'pfRipple .7s ease-out forwards',
              pointerEvents: 'none',
            }} />
          )}

          <svg
            width="54" height="54" viewBox="0 0 54 54"
            style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}
          >
            <circle cx="27" cy="27" r={R} fill="none"
              stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
            <circle cx="27" cy="27" r={R} fill="none"
              stroke={lvl.color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${fill} ${CIRC}`}
              style={{
                transition: 'stroke-dasharray 1.3s cubic-bezier(.4,0,.2,1), stroke .5s',
                filter: `drop-shadow(0 0 5px ${lvl.color}bb)`,
              }}
            />
          </svg>

          <span style={{
            position: 'absolute', top: '50%', left: '50%',
            fontSize: '1.5rem', lineHeight: 1,
            transform: 'translate(-50%,-50%)',
            animation: burst ? 'pfBounce .6s ease' : 'pfFloat 3s ease-in-out infinite',
          }}>
            {lvl.icon}
          </span>
        </div>

        {/* Points number */}
        <span style={{
          fontWeight: 900,
          fontSize:   '1.1rem',
          color:      lvl.color,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          animation:  burst ? 'pfNum .3s ease' : 'none',
        }}>
          {shown.toLocaleString()}
        </span>

        {/* Level name */}
        <span style={{
          fontSize:   '.65rem',
          color:      '#94a3b8',
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '.3px',
        }}>
          {lvl.name}
        </span>
      </button>

      {/* ── Expanded popup (opens to the LEFT) ── */}
      {open && (
        <div style={{
          position:   'absolute',
          right:      'calc(100% + 14px)',
          top:        0,
          background: 'linear-gradient(160deg,#0f172a,#1e293b)',
          border:     `1.5px solid ${lvl.color}45`,
          borderRadius: 22,
          padding:    '18px 20px',
          width:      240,
          boxShadow:  `0 16px 48px rgba(0,0,0,.6), 0 0 28px ${lvl.color}20`,
          animation:  'pfFadeIn .22s ease',
          color:      '#fff',
        }}>
          {/* Level header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
              background: `radial-gradient(circle,${lvl.color}28,transparent 70%)`,
              border: `2px solid ${lvl.color}70`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.8rem',
              boxShadow: `0 0 20px ${lvl.color}40`,
              animation: 'pfFloat 2.5s ease-in-out infinite',
            }}>
              {lvl.icon}
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1.1rem', color: lvl.color }}>{lvl.name}</div>
              <div style={{ fontSize: '.75rem', color: '#94a3b8', marginTop: 2 }}>
                {pts.toLocaleString()} نقطة
              </div>
            </div>
          </div>

          {/* Progress */}
          <div style={{ marginBottom: lvl.next ? 8 : 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: '#64748b', marginBottom: 5 }}>
              <span style={{ color: '#94a3b8' }}>
                {lvl.next ? `نحو "${LEVELS[lvl.idx + 1]?.name}"` : '🏆 أعلى مستوى!'}
              </span>
              <span style={{ fontWeight: 700, color: lvl.color }}>{Math.round(progress)}%</span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,.07)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: `linear-gradient(90deg,${lvl.color}70,${lvl.color})`,
                borderRadius: 99,
                boxShadow: `0 0 8px ${lvl.color}90`,
                transition: 'width 1.2s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
          </div>

          {lvl.next && (
            <div style={{ fontSize: '.7rem', color: '#475569', textAlign: 'center', marginBottom: 16 }}>
              {(lvl.next - pts).toLocaleString()} نقطة للمستوى التالي
            </div>
          )}

          {/* Levels mini-map */}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.07)',
          }}>
            {LEVELS.map((l, i) => {
              const reached = pts >= l.min;
              const current = i === lvl.idx;
              return (
                <div key={i} title={l.name} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: reached ? `${l.color}20` : 'rgba(255,255,255,.04)',
                    border: `1.5px solid ${reached ? l.color + (current ? 'ff' : '70') : 'rgba(255,255,255,.1)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem',
                    boxShadow: current ? `0 0 12px ${l.color}80` : 'none',
                    opacity: reached ? 1 : .3,
                    animation: current ? 'pfFloat 2s ease-in-out infinite' : 'none',
                    transition: 'all .3s',
                  }}>{l.icon}</div>
                  <span style={{
                    fontSize: '.56rem', fontWeight: current ? 800 : 500,
                    color: current ? l.color : reached ? '#64748b' : '#334155',
                  }}>{l.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
