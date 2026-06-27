'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const LEVELS = [
  { min: 0,    color: '#D97706', icon: '🌱', name: 'مبتدئ'  },
  { min: 1000, color: '#94A3B8', icon: '⚡', name: 'مستكشف' },
  { min: 2000, color: '#F59E0B', icon: '⭐', name: 'بطل'     },
  { min: 3000, color: '#A78BFA', icon: '💎', name: 'محترف'  },
  { min: 4000, color: '#22D3EE', icon: '🚀', name: 'أسطورة' },
];
const PER_LVL = 1000;

function getLvl(earned) {
  const idx = Math.min(LEVELS.length - 1, Math.floor(earned / PER_LVL));
  return { ...LEVELS[idx], idx };
}

const R    = 22;
const CIRC = 2 * Math.PI * R;

const ANIM_CSS = `
  @keyframes pfBounce { 0%{transform:translate(-50%,-50%)scale(1)} 40%{transform:translate(-50%,-50%)scale(1.6)} 70%{transform:translate(-50%,-50%)scale(.85)} 100%{transform:translate(-50%,-50%)scale(1)} }
  @keyframes pfRipple { 0%{transform:scale(.6);opacity:.8} 100%{transform:scale(2.4);opacity:0} }
  @keyframes pfFadeIn { from{opacity:0;transform:translateX(8px)} to{opacity:1;transform:translateX(0)} }
  @keyframes pfFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
  @keyframes pfLvlUp  { 0%{transform:scale(1)} 30%{transform:scale(1.4)} 55%{transform:scale(.88)} 75%{transform:scale(1.1)} 100%{transform:scale(1)} }
  @keyframes pfNum    { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
`;

export default function PointsBadge() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted,  setMounted]  = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 769);
    check();
    setMounted(true);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Render nothing until client mounts — avoids server/client HTML mismatch
  if (!mounted) return null;

  // On mobile the bottom nav shows points — no floating badge needed
  if (isMobile) return null;

  return <PointsBadgeDesktop />;
}

function PointsBadgeDesktop() {
  const [pts,    setPts]    = useState(0);
  const [earned, setEarned] = useState(0);
  const [shownE, setShownE] = useState(0);
  const [burst,  setBurst]  = useState(false);
  const [lvlUp,  setLvlUp]  = useState(false);
  const [open,   setOpen]   = useState(false);
  const prevEarned = useRef(0);
  const prevLvlIdx = useRef(0);
  const rafRef     = useRef(null);
  const wrapRef    = useRef(null);

  useEffect(() => {
    if (document.getElementById('pts-float-anim')) return;
    const s = document.createElement('style');
    s.id = 'pts-float-anim';
    s.textContent = ANIM_CSS;
    document.head.appendChild(s);
  }, []);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/points');
      const j = await r.json();
      const newPts    = j.points ?? 0;
      const newEarned = j.earned ?? 0;

      setPts(newPts);

      if (newEarned === prevEarned.current) return;

      if (newEarned > prevEarned.current) {
        setBurst(true);
        setTimeout(() => setBurst(false), 900);
        const ni = getLvl(newEarned).idx;
        if (ni > prevLvlIdx.current) {
          setLvlUp(true);
          setTimeout(() => setLvlUp(false), 1200);
        }
        prevLvlIdx.current = ni;
      }

      const from = prevEarned.current, to = newEarned;
      const dur  = Math.min(1400, Math.abs(to - from) * 35);
      const t0   = performance.now();
      cancelAnimationFrame(rafRef.current);
      function tick(now) {
        const p    = Math.min((now - t0) / dur, 1);
        const ease = p < .5 ? 2*p*p : 1 - Math.pow(-2*p+2, 2)/2;
        setShownE(Math.round(from + (to - from) * ease));
        if (p < 1) rafRef.current = requestAnimationFrame(tick);
      }
      rafRef.current = requestAnimationFrame(tick);
      prevEarned.current = newEarned;
      setEarned(newEarned);
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

  const lvl      = getLvl(earned);
  const inLevel  = earned - lvl.idx * PER_LVL;
  const progress = Math.min(100, (inLevel / PER_LVL) * 100);
  const fill     = (progress / 100) * CIRC;
  const toNext   = PER_LVL - inLevel;

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'fixed', right: 18, top: 78,
        zIndex: 500,
        fontFamily: "'Cairo','Tajawal',sans-serif",
        direction: 'rtl',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          background: 'rgba(15,23,42,0.90)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          border: `2px solid ${burst ? lvl.color : lvl.color + '55'}`,
          borderRadius: 22, padding: '12px 14px 10px',
          cursor: 'pointer', minWidth: 72, color: '#fff',
          boxShadow: burst
            ? `0 0 28px ${lvl.color}70, 0 8px 32px rgba(0,0,0,.5)`
            : `0 8px 32px rgba(0,0,0,.45), 0 0 12px ${lvl.color}20`,
          transition: 'border-color .4s, box-shadow .4s',
          animation: lvlUp ? 'pfLvlUp .7s ease' : 'none',
          outline: 'none', WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div style={{ position: 'relative', width: 54, height: 54, flexShrink: 0 }}>
          {burst && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: `2.5px solid ${lvl.color}`,
              animation: 'pfRipple .7s ease-out forwards',
              pointerEvents: 'none',
            }} />
          )}
          <svg width="54" height="54" viewBox="0 0 54 54"
            style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
            <circle cx="27" cy="27" r={R} fill="none"
              stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
            <circle cx="27" cy="27" r={R} fill="none"
              stroke={lvl.color} strokeWidth="4" strokeLinecap="round"
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
          }}>{lvl.icon}</span>
        </div>

        <span style={{
          fontWeight: 900, fontSize: '1.1rem',
          color: lvl.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1,
          animation: burst ? 'pfNum .3s ease' : 'none',
        }}>{shownE.toLocaleString('en-US')}</span>

        <span style={{ fontSize: '.65rem', color: '#94a3b8', fontWeight: 700, lineHeight: 1, letterSpacing: '.3px' }}>
          {lvl.name}
        </span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 'calc(100% + 14px)', top: 0,
          background: 'linear-gradient(160deg,#0f172a,#1e293b)',
          border: `1.5px solid ${lvl.color}45`, borderRadius: 22,
          padding: '18px 20px', width: 248,
          boxShadow: `0 16px 48px rgba(0,0,0,.6), 0 0 28px ${lvl.color}20`,
          animation: 'pfFadeIn .22s ease', color: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
              background: `radial-gradient(circle,${lvl.color}28,transparent 70%)`,
              border: `2px solid ${lvl.color}70`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.8rem', boxShadow: `0 0 20px ${lvl.color}40`,
              animation: 'pfFloat 2.5s ease-in-out infinite',
            }}>{lvl.icon}</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1.1rem', color: lvl.color }}>{lvl.name}</div>
              <div style={{ fontSize: '.73rem', color: '#94a3b8', marginTop: 2 }}>
                {earned.toLocaleString('en-US')} نقطة مكتسبة
              </div>
              <div style={{ fontSize: '.7rem', color: '#475569', marginTop: 1 }}>
                رصيد متاح: <span style={{ color: '#F59E0B', fontWeight: 700 }}>{pts.toLocaleString('en-US')}</span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', marginBottom: 5 }}>
              <span style={{ color: '#94a3b8' }}>
                {lvl.idx < LEVELS.length - 1
                  ? `نحو "${LEVELS[lvl.idx + 1].name}"`
                  : '🏆 أعلى مستوى!'}
              </span>
              <span style={{ fontWeight: 700, color: lvl.color }}>
                {inLevel.toLocaleString('en-US')} / {PER_LVL.toLocaleString('en-US')}
              </span>
            </div>
            <div style={{ height: 8, background: 'rgba(255,255,255,.07)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: `linear-gradient(90deg,${lvl.color}70,${lvl.color})`,
                borderRadius: 99, boxShadow: `0 0 8px ${lvl.color}90`,
                transition: 'width 1.2s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
          </div>

          {lvl.idx < LEVELS.length - 1 && (
            <div style={{ fontSize: '.7rem', color: '#475569', textAlign: 'center', marginBottom: 14 }}>
              {toNext.toLocaleString('en-US')} نقطة إضافية للمستوى التالي
            </div>
          )}

          <div style={{
            display: 'flex', justifyContent: 'space-between',
            paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.07)',
          }}>
            {LEVELS.map((l, i) => {
              const reached = earned >= l.min;
              const current = i === lvl.idx;
              return (
                <div key={i} title={`${l.name} (${l.min.toLocaleString('en-US')} نقطة)`} style={{
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
