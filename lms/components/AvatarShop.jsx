'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

/* ── Inject animations once ──────────────────────────────────────────────── */
if (typeof document !== 'undefined' && !document.getElementById('av-shop-anim')) {
  const s = document.createElement('style');
  s.id = 'av-shop-anim';
  s.textContent = `
    @keyframes avBounceIn { 0%{transform:scale(.55);opacity:0} 65%{transform:scale(1.07)} 100%{transform:scale(1);opacity:1} }
    @keyframes avFadeUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
    @keyframes avFloat    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
    @keyframes avPulse    { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
    @keyframes avSpin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes avGlowGold { 0%,100%{box-shadow:0 0 10px #f59e0b66} 50%{box-shadow:0 0 26px #f59e0bcc} }
    @keyframes avShake    { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-5px)} 40%,80%{transform:translateX(5px)} }
    @keyframes avToastIn  { from{opacity:0;transform:translate(-50%,-8px)} to{opacity:1;transform:translate(-50%,0)} }
  `;
  document.head.appendChild(s);
}

/* ── SVG overlay renderers ───────────────────────────────────────────────────
   Each receives avatarSize (number). Returns a positioned SVG element.
   Coordinates are proportional to avatarSize so they scale correctly. */

const overlay = {

  star_halo: (sz) => (
    <svg key="sh" style={{ position:'absolute', top:-sz*.30, left:-sz*.12,
        width:sz*1.24, height:sz*.50, pointerEvents:'none', overflow:'visible' }}
      viewBox="0 0 124 50">
      <defs>
        <filter id="sh-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* centre star */}
      <polygon points="62,4 66.5,17 80,17 69.5,25 73,38 62,30 51,38 54.5,25 44,17 57.5,17"
        fill="#FFD700" filter="url(#sh-glow)"/>
      {/* left star */}
      <polygon points="23,13 25.5,21 34,21 27.5,25.5 30,33 23,29 16,33 18.5,25.5 12,21 20.5,21"
        fill="#FBBF24" opacity=".9"/>
      {/* right star */}
      <polygon points="101,13 103.5,21 112,21 105.5,25.5 108,33 101,29 94,33 96.5,25.5 90,21 98.5,21"
        fill="#FBBF24" opacity=".9"/>
      <circle cx="42" cy="5" r="2.5" fill="#FFD700" opacity=".75"/>
      <circle cx="82" cy="5" r="2.5" fill="#FFD700" opacity=".75"/>
      <circle cx="9"  cy="42" r="1.8" fill="#FBBF24" opacity=".5"/>
      <circle cx="115" cy="42" r="1.8" fill="#FBBF24" opacity=".5"/>
    </svg>
  ),

  golden_crown: (sz) => (
    <svg key="gc" style={{ position:'absolute', top:-sz*.16, left:-sz*.06,
        width:sz*1.12, height:sz*.54, pointerEvents:'none', overflow:'visible' }}
      viewBox="0 0 112 54">
      <defs>
        <linearGradient id="cr-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FEF08A"/>
          <stop offset="100%" stopColor="#EAB308"/>
        </linearGradient>
        <filter id="cr-sh">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#78350f" floodOpacity=".3"/>
        </filter>
      </defs>
      <path d="M14 52 L14 22 L32 34 L56 4 L80 34 L98 22 L98 52 Z"
        fill="url(#cr-g)" filter="url(#cr-sh)"/>
      <path d="M14 52 L14 22 L32 34 L56 4 L80 34 L98 22 L98 52 Z"
        fill="none" stroke="#B45309" strokeWidth="1.5"/>
      <rect x="12" y="46" width="88" height="10" rx="5" fill="#EAB308"/>
      <rect x="12" y="46" width="88" height="10" rx="5" fill="none" stroke="#B45309" strokeWidth="1"/>
      {/* gems */}
      <ellipse cx="56" cy="30" rx="8" ry="7" fill="#EF4444"/>
      <ellipse cx="56" cy="30" rx="8" ry="7" fill="none" stroke="#991B1B" strokeWidth="1"/>
      <ellipse cx="27" cy="43" rx="6" ry="5" fill="#3B82F6"/>
      <ellipse cx="27" cy="43" rx="6" ry="5" fill="none" stroke="#1D4ED8" strokeWidth="1"/>
      <ellipse cx="85" cy="43" rx="6" ry="5" fill="#22C55E"/>
      <ellipse cx="85" cy="43" rx="6" ry="5" fill="none" stroke="#15803D" strokeWidth="1"/>
      {/* gem highlights */}
      <ellipse cx="53.5" cy="27" rx="2.5" ry="2" fill="white" opacity=".5"/>
      <ellipse cx="24.5" cy="41" rx="2"   ry="1.5" fill="white" opacity=".5"/>
      <ellipse cx="82.5" cy="41" rx="2"   ry="1.5" fill="white" opacity=".5"/>
    </svg>
  ),

  graduation_cap: (sz) => (
    <svg key="grad" style={{ position:'absolute', top:-sz*.16, left:-sz*.11,
        width:sz*1.22, height:sz*.60, pointerEvents:'none', overflow:'visible' }}
      viewBox="0 0 122 60">
      <defs>
        <filter id="grc-sh">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000" floodOpacity=".22"/>
        </filter>
      </defs>
      {/* board */}
      <rect x="28" y="8"  width="66" height="22" rx="3" fill="#1e1b4b" filter="url(#grc-sh)"/>
      {/* brim */}
      <rect x="16" y="27" width="90" height="11" rx="5.5" fill="#312e81"/>
      {/* gold band */}
      <rect x="28" y="31" width="66" height="6" rx="3" fill="#F59E0B"/>
      {/* button */}
      <circle cx="61" cy="12" r="6.5" fill="#F59E0B"/>
      <circle cx="61" cy="12" r="4.5" fill="#FCD34D"/>
      {/* tassel string */}
      <path d="M61 18 Q80 28 84 43" stroke="#F59E0B" strokeWidth="3.5"
        fill="none" strokeLinecap="round"/>
      {/* tassel body */}
      <rect x="80" y="41" width="9" height="17" rx="4.5" fill="#F59E0B"/>
      {/* tassel tip */}
      <ellipse cx="84.5" cy="58" rx="5.5" ry="3" fill="#D97706"/>
      {/* board shading */}
      <line x1="36" y1="15" x2="57" y2="15" stroke="#4c1d95" strokeWidth="2.5"
        strokeLinecap="round" opacity=".35"/>
      <line x1="36" y1="22" x2="52" y2="22" stroke="#4c1d95" strokeWidth="2.5"
        strokeLinecap="round" opacity=".35"/>
    </svg>
  ),

  wizard_hat: (sz) => (
    <svg key="wiz" style={{ position:'absolute', top:-sz*.45, left:-sz*.13,
        width:sz*1.26, height:sz*.84, pointerEvents:'none', overflow:'visible' }}
      viewBox="0 0 126 84">
      <defs>
        <linearGradient id="wh-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3b0764"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
        <filter id="wh-sh">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#1e1b4b" floodOpacity=".4"/>
        </filter>
      </defs>
      {/* cone */}
      <polygon points="63,3 24,70 102,70" fill="url(#wh-g)" filter="url(#wh-sh)"/>
      <polygon points="63,3 24,70 102,70" fill="none" stroke="#2e1065" strokeWidth="2"/>
      {/* brim */}
      <ellipse cx="63" cy="70" rx="50" ry="13" fill="#5b21b6"/>
      <ellipse cx="63" cy="70" rx="50" ry="13" fill="none" stroke="#2e1065" strokeWidth="1.5"/>
      {/* stars */}
      <polygon points="52,26 54,33 61,33 55.5,37 57.5,44 52,40 46.5,44 48.5,37 43,33 50,33"
        fill="#FCD34D" opacity=".95"/>
      <circle cx="78" cy="46" r="5"   fill="#FCD34D" opacity=".85"/>
      <circle cx="42" cy="54" r="3.5" fill="#FCD34D" opacity=".7"/>
      <circle cx="70" cy="32" r="2.2" fill="white"   opacity=".7"/>
      <circle cx="82" cy="58" r="1.8" fill="#FCD34D" opacity=".5"/>
      {/* band */}
      <line x1="32" y1="66" x2="94" y2="66" stroke="#FCD34D" strokeWidth="4.5" strokeLinecap="round"/>
      {/* buckle */}
      <rect x="51" y="62" width="24" height="10" rx="3" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5"/>
      <rect x="57" y="65" width="10" height="4" rx="1.5" fill="#D97706" opacity=".6"/>
    </svg>
  ),

  smart_glasses: (sz) => (
    <svg key="sg" style={{ position:'absolute', top:sz*.33, left:-sz*.07,
        width:sz*1.14, height:sz*.42, pointerEvents:'none', overflow:'visible' }}
      viewBox="0 0 114 42">
      <defs>
        <linearGradient id="sg-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#a5b4fc"/>
          <stop offset="100%" stopColor="#4f46e5"/>
        </linearGradient>
        <filter id="sg-gw" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.8" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* left lens */}
      <rect x="4"  y="5" width="44" height="28" rx="10" fill="url(#sg-g)" opacity=".58" filter="url(#sg-gw)"/>
      <rect x="4"  y="5" width="44" height="28" rx="10" fill="none" stroke="#3730a3" strokeWidth="2.5"/>
      {/* right lens */}
      <rect x="66" y="5" width="44" height="28" rx="10" fill="url(#sg-g)" opacity=".58" filter="url(#sg-gw)"/>
      <rect x="66" y="5" width="44" height="28" rx="10" fill="none" stroke="#3730a3" strokeWidth="2.5"/>
      {/* bridge */}
      <path d="M48 19 Q57 13 66 19" fill="none" stroke="#3730a3" strokeWidth="2.5" strokeLinecap="round"/>
      {/* temples */}
      <line x1="4"   y1="19" x2="0"   y2="24" stroke="#3730a3" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="110" y1="19" x2="114" y2="24" stroke="#3730a3" strokeWidth="2.5" strokeLinecap="round"/>
      {/* shine */}
      <line x1="10" y1="10" x2="18" y2="19" stroke="white" strokeWidth="2" opacity=".4" strokeLinecap="round"/>
      <line x1="72" y1="10" x2="80" y2="19" stroke="white" strokeWidth="2" opacity=".4" strokeLinecap="round"/>
    </svg>
  ),

  hero_scarf: (sz) => (
    <svg key="sc" style={{ position:'absolute', top:sz*.68, left:-sz*.14,
        width:sz*1.28, height:sz*.55, pointerEvents:'none', overflow:'visible' }}
      viewBox="0 0 128 55">
      <defs>
        <linearGradient id="sc-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#EF4444"/>
          <stop offset="100%" stopColor="#F97316"/>
        </linearGradient>
      </defs>
      {/* wrap body */}
      <path d="M20 9 Q64 0 108 9 Q112 28 64 32 Q16 28 20 9 Z" fill="url(#sc-g)"/>
      {/* wrap stripes */}
      <path d="M24 14 Q64 6 104 14" fill="none" stroke="white" strokeWidth="1.5" opacity=".2"/>
      <path d="M22 22 Q64 14 108 22" fill="none" stroke="white" strokeWidth="1.5" opacity=".15"/>
      {/* knot */}
      <circle cx="48" cy="23" r="14" fill="#DC2626"/>
      <circle cx="48" cy="23" r="14" fill="none" stroke="#991B1B" strokeWidth="1.5"/>
      <ellipse cx="44" cy="18" rx="4.5" ry="3.5" fill="#FCA5A5" opacity=".4"/>
      {/* tail 1 */}
      <path d="M42 34 Q28 46 20 55" stroke="url(#sc-g)" strokeWidth="17"
        fill="none" strokeLinecap="round"/>
      <path d="M40 36 Q26 48 18 57" stroke="white" strokeWidth="2"
        fill="none" strokeLinecap="round" opacity=".18"/>
      {/* tail 2 */}
      <path d="M54 34 Q62 46 56 55" stroke="#B91C1C" strokeWidth="12"
        fill="none" strokeLinecap="round"/>
    </svg>
  ),
};

/* ── Item catalog ────────────────────────────────────────────────────────── */
const ITEMS = [
  {
    id:'star_halo', name:'هالة النجوم', emoji:'⭐', price:30,
    desc:'تألّق كالنجوم!',
    badgeBg:'#FEF3C7', badgeTxt:'#92400E', accent:'#F59E0B',
  },
  {
    id:'smart_glasses', name:'نظارة ذكية', emoji:'🕶️', price:40,
    desc:'بطل مثير!',
    badgeBg:'#EDE9FE', badgeTxt:'#4C1D95', accent:'#7C3AED',
  },
  {
    id:'graduation_cap', name:'قبعة التخرج', emoji:'🎓', price:50,
    desc:'الطالب المتفوق!',
    badgeBg:'#EFF6FF', badgeTxt:'#1E3A8A', accent:'#2563EB',
  },
  {
    id:'hero_scarf', name:'وشاح البطل', emoji:'🧣', price:60,
    desc:'بطل الأكاديمية!',
    badgeBg:'#FEF2F2', badgeTxt:'#991B1B', accent:'#EF4444',
  },
  {
    id:'golden_crown', name:'تاج ذهبي', emoji:'👑', price:80,
    desc:'أمير المعرفة!',
    badgeBg:'#FFFBEB', badgeTxt:'#78350F', accent:'#D97706',
  },
  {
    id:'wizard_hat', name:'قبعة الساحر', emoji:'🧙', price:100,
    desc:'ساحر الكلمات!',
    badgeBg:'#F5F3FF', badgeTxt:'#3B0764', accent:'#7C3AED',
  },
];

/* Extra vertical space each item needs (in px, for size=70 preview) */
const ITEM_PAD = {
  star_halo:      { top: 32, bottom: 4  },
  golden_crown:   { top: 26, bottom: 4  },
  graduation_cap: { top: 26, bottom: 4  },
  wizard_hat:     { top: 46, bottom: 4  },
  smart_glasses:  { top: 4,  bottom: 4  },
  hero_scarf:     { top: 4,  bottom: 44 },
};

/* ── AvatarWithAccessory ─────────────────────────────────────────────────── */
export function AvatarWithAccessory({ name, avatarURL, equippedId, size = 90, seed }) {
  const item      = ITEMS.find(i => i.id === equippedId);
  const avatarSeed = seed || name || 'student';
  const dicebearUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0, overflow:'visible' }}>
      {/* Circle-clipped avatar */}
      <div style={{
        position:'relative', width:size, height:size,
        borderRadius:'50%', overflow:'hidden',
        background:'linear-gradient(135deg,#dbeafe,#ede9fe)',
        boxShadow:`0 3px 14px rgba(24,95,165,.28)`,
      }}>
        {avatarURL ? (
          <img src={avatarURL} alt="" style={{
            width:size, height:size, objectFit:'cover', display:'block',
          }}/>
        ) : (
          <img
            src={dicebearUrl}
            alt=""
            style={{
              position:'absolute',
              width: size * 1.5,
              height: size * 1.5,
              top: -size * 0.07,
              left: -size * 0.25,
            }}
          />
        )}
      </div>
      {/* Accessories rendered OUTSIDE the clip div so they extend beyond the circle */}
      {item && overlay[item.id]?.(size)}
    </div>
  );
}

/* ── ItemPreview — neutral silhouette, no initials ───────────────────────── */
function ItemPreview({ item, size = 70 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Neutral face circle — gradient only, no text */}
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'linear-gradient(135deg, #dbeafe 0%, #c7d2fe 100%)',
        border: '2.5px solid #a5b4fc',
        boxShadow: 'inset 0 2px 8px rgba(99,102,241,.12)',
      }}/>
      {overlay[item.id]?.(size)}
    </div>
  );
}


function ItemCard({ item, isOwned, isEquipped, balance, onBuy, onEquip, onUnequip, buying }) {
  const [hov, setHov] = useState(false);
  const canAfford = balance >= item.price;
  const isBuying  = buying === item.id;
  const pad       = ITEM_PAD[item.id] ?? { top:4, bottom:4 };

  let label, action, btnBg, btnCursor, disabled;
  if (!isOwned) {
    label     = isBuying ? '...' : canAfford ? `${item.price} ⭐ شراء` : `${item.price} ⭐`;
    action    = canAfford && !isBuying ? onBuy : null;
    btnBg     = canAfford ? item.accent : '#94A3B8';
    btnCursor = canAfford ? 'pointer' : 'not-allowed';
    disabled  = !canAfford || isBuying;
  } else if (isEquipped) {
    label = '✓ مرتدٍ — نزع'; action = onUnequip;
    btnBg = '#10B981'; btnCursor = 'pointer'; disabled = false;
  } else {
    label = 'ارتداء'; action = onEquip;
    btnBg = item.accent; btnCursor = 'pointer'; disabled = false;
  }

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? item.badgeBg : '#fff',
        border: `2px solid ${isEquipped ? item.accent : hov ? item.accent+'66' : '#e2e8f0'}`,
        borderRadius: 20, padding: '12px 10px 14px',
        display:'flex', flexDirection:'column', alignItems:'center', gap:8,
        transition: 'all .22s', cursor:'default',
        transform: hov ? 'translateY(-4px)' : 'none',
        boxShadow: hov ? `0 10px 28px ${item.accent}30` : '0 2px 8px rgba(0,0,0,.06)',
        position:'relative',
      }}
    >
      {/* Equipped ribbon */}
      {isEquipped && (
        <div style={{
          position:'absolute', top:-1, right:-1,
          background: item.accent, color:'#fff',
          fontSize:'.6rem', fontWeight:800,
          padding:'3px 8px', borderRadius:'0 18px 0 12px',
        }}>✨ ترتديه</div>
      )}

      {/* Preview */}
      <div style={{
        position:'relative', width:70, height: 70 + pad.top + pad.bottom,
        display:'flex', alignItems:'flex-end', justifyContent:'center',
        paddingBottom: pad.bottom,
        overflow:'visible',
      }}>
        <ItemPreview item={item} size={70}/>
      </div>

      {/* Name */}
      <div style={{ fontWeight:800, fontSize:'.88rem', color:'#1e293b', textAlign:'center', lineHeight:1.3 }}>
        {item.emoji} {item.name}
      </div>

      {/* Description */}
      <div style={{ fontSize:'.7rem', color:'#64748b', textAlign:'center' }}>
        {item.desc}
      </div>

      {/* Status badge */}
      <div style={{
        fontSize:'.68rem', fontWeight:800,
        color: isOwned ? (isEquipped ? '#fff' : '#065F46') : (canAfford ? item.badgeTxt : '#64748b'),
        background: isOwned ? (isEquipped ? item.accent : '#D1FAE5') : (canAfford ? item.badgeBg : '#f1f5f9'),
        padding:'3px 10px', borderRadius:99,
      }}>
        {isOwned ? (isEquipped ? 'ترتديه الآن' : '✓ مملوك') : `${item.price} نقطة`}
      </div>

      {/* Action button */}
      <button
        onClick={() => action?.()}
        disabled={disabled}
        style={{
          width:'100%', padding:'8px 0', borderRadius:12, border:'none',
          background: btnBg, color:'#fff', fontWeight:800, fontSize:'.82rem',
          fontFamily:'inherit', cursor:btnCursor,
          opacity: disabled && !isOwned && !canAfford ? .65 : 1,
          transition:'all .18s',
          animation: !isOwned && !canAfford ? 'none'
            : hov && !disabled ? 'avPulse .65s ease infinite' : 'none',
        }}
      >
        {label}
      </button>
    </div>
  );
}

/* ── AvatarShop (main export) ────────────────────────────────────────────── */
export default function AvatarShop({ user, displayName }) {
  const [open,    setOpen]    = useState(false);
  const [owned,   setOwned]   = useState([]);
  const [equipped,setEquipped]= useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [buying,  setBuying]  = useState(null);
  const [toast,   setToast]   = useState(null);
  const overlayRef = useRef(null);
  const avatarURL  = user?.user_metadata?.avatar_url ?? null;
  const userId     = user?.id ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [avRes, ptRes] = await Promise.all([fetch('/api/avatar'), fetch('/api/points')]);
      const av = await avRes.json();
      const pt = await ptRes.json();
      setOwned(av.owned ?? []);
      setEquipped(av.equipped ?? null);
      setBalance(pt.points ?? 0);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  // Load equipped item on mount so trigger button shows it immediately
  useEffect(() => {
    fetch('/api/avatar')
      .then(r => r.json())
      .then(av => setEquipped(av.equipped ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const fn = e => { if (overlayRef.current && !overlayRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  function flash(msg, type = 'ok') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  }

  async function handleBuy(item) {
    if (buying) return;
    setBuying(item.id);
    try {
      const res = await fetch('/api/avatar/buy', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ itemId:item.id, price:item.price }),
      });
      const j = await res.json();
      if (!res.ok) {
        flash(j.error ?? 'فشل الشراء', 'err');
        if (j.error?.includes('نقاط')) {
          // friendly motivational shake
          document.getElementById('av-bal-chip')?.setAttribute(
            'style', 'animation:avShake .5s ease; ' +
            document.getElementById('av-bal-chip')?.getAttribute('style'));
        }
      } else {
        setOwned(o => [...o, item.id]);
        setBalance(j.newBalance);
        flash(`🎉 اشتريت ${item.emoji} ${item.name}!`, 'ok');
      }
    } catch { flash('تعذّر الاتصال', 'err'); }
    setBuying(null);
  }

  async function handleEquip(itemId) {
    try {
      await fetch('/api/avatar', {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ itemId }),
      });
      setEquipped(itemId);
      const it = ITEMS.find(i => i.id === itemId);
      flash(`✨ ارتديت ${it?.emoji} ${it?.name}!`, 'ok');
    } catch {}
  }

  async function handleUnequip() {
    try {
      await fetch('/api/avatar', {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ itemId:null }),
      });
      setEquipped(null);
      flash('تم النزع ✓', 'info');
    } catch {}
  }

  /* ── Trigger (avatar card shown in dashboard) ── */
  const equippedItem = ITEMS.find(i => i.id === equipped);
  const hatPad = equipped === 'wizard_hat' ? 32
    : equipped === 'star_halo' ? 24
    : (equipped === 'graduation_cap' || equipped === 'golden_crown') ? 20
    : 6;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display:'flex', flexDirection:'column', alignItems:'center', gap:4,
          background:'linear-gradient(160deg,#4f46e5 0%,#7c3aed 55%,#9333ea 100%)',
          color:'#fff', border:'2px solid rgba(255,255,255,.22)', borderRadius:22,
          padding:`${hatPad}px 20px 12px`, cursor:'pointer',
          fontFamily:"'Cairo','Tajawal',sans-serif",
          boxShadow:'0 6px 28px rgba(99,102,241,.5)',
          transition:'transform .2s, box-shadow .2s',
          animation:'avFloat 3s ease-in-out infinite',
          minWidth:110,
          overflow:'visible',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform='translateY(-3px) scale(1.04)';
          e.currentTarget.style.boxShadow='0 10px 36px rgba(99,102,241,.7)';
          e.currentTarget.style.animation='none';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform='none';
          e.currentTarget.style.boxShadow='0 6px 28px rgba(99,102,241,.5)';
          e.currentTarget.style.animation='avFloat 3s ease-in-out infinite';
        }}
      >
        {/* Avatar */}
        <div style={{ overflow:'visible', position:'relative' }}>
          <AvatarWithAccessory
            name={displayName} avatarURL={avatarURL}
            equippedId={equipped} size={72} seed={userId}
          />
        </div>
        {/* Label */}
        <div style={{ fontSize:'.72rem', fontWeight:800, opacity:.9, marginTop:2, whiteSpace:'nowrap' }}>
          🛍️ متجر الأفاتار
        </div>
        {/* Equipped item name */}
        {equippedItem ? (
          <div style={{
            fontSize:'.62rem', fontWeight:700,
            background:'rgba(255,255,255,.2)', borderRadius:30,
            padding:'2px 8px', whiteSpace:'nowrap',
          }}>
            {equippedItem.emoji} {equippedItem.name}
          </div>
        ) : (
          <div style={{ fontSize:'.6rem', opacity:.65 }}>اضغط لزيّن شخصيتك</div>
        )}
      </button>

      {/* ── Modal ── */}
      {open && (
        <div style={{
          position:'fixed', inset:0,
          background:'rgba(15,23,42,.72)',
          backdropFilter:'blur(7px)', WebkitBackdropFilter:'blur(7px)',
          zIndex:900,
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:14,
          fontFamily:"'Cairo','Tajawal',sans-serif",
          direction:'rtl',
        }}>
          <div
            ref={overlayRef}
            style={{
              background:'#f8faff',
              borderRadius:28, width:'100%', maxWidth:680,
              maxHeight:'92vh', overflowY:'auto',
              boxShadow:'0 28px 80px rgba(0,0,0,.55)',
              animation:'avBounceIn .38s cubic-bezier(.34,1.56,.64,1)',
            }}
          >
            {/* Header */}
            <div style={{
              background:'linear-gradient(135deg,#4f46e5,#7c3aed,#9333ea)',
              borderRadius:'28px 28px 0 0',
              padding:'20px 22px 16px',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              gap:12,
            }}>
              <div>
                <div style={{ fontSize:'1.35rem', fontWeight:900, color:'#fff', lineHeight:1.25 }}>
                  🛍️ متجر الأفاتار
                </div>
                <div style={{ fontSize:'.78rem', color:'#c4b5fd', marginTop:4 }}>
                  اجمع النقاط وزيّن شخصيتك!
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                {/* Balance */}
                <div
                  id="av-bal-chip"
                  style={{
                    background:'rgba(255,255,255,.18)',
                    border:'1.5px solid rgba(255,255,255,.35)',
                    borderRadius:50, padding:'7px 16px',
                    display:'flex', alignItems:'center', gap:6,
                    fontWeight:800, color:'#fff', fontSize:'.88rem',
                    animation:'avGlowGold 2.5s ease-in-out infinite',
                    whiteSpace:'nowrap',
                  }}
                >
                  <span style={{ fontSize:'1.05rem' }}>⭐</span>
                  {balance.toLocaleString()} نقطة
                </div>
                {/* Close */}
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    background:'rgba(255,255,255,.18)', border:'none',
                    width:36, height:36, borderRadius:'50%',
                    color:'#fff', fontSize:'1.1rem', cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    transition:'background .18s', flexShrink:0,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.32)'}
                  onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,.18)'}
                >✕</button>
              </div>
            </div>

            {/* Preview */}
            <div style={{ padding:'22px 22px 14px', textAlign:'center' }}>
              <div style={{
                display:'inline-flex', flexDirection:'column', alignItems:'center', gap:10,
                background:'linear-gradient(135deg,#eef2ff,#ede9fe)',
                borderRadius:22, padding:'20px 44px 16px',
                border:'2px dashed #a78bfa44',
              }}>
                <div style={{ fontSize:'.78rem', color:'#7c3aed', fontWeight:700 }}>
                  شخصيتك الآن
                </div>
                <div style={{ paddingTop: equipped === 'wizard_hat' ? 48
                  : equipped === 'star_halo' ? 32
                  : equipped === 'graduation_cap' || equipped === 'golden_crown' ? 28
                  : 8 }}>
                  <AvatarWithAccessory
                    name={displayName} avatarURL={avatarURL}
                    equippedId={equipped} size={110} seed={userId}
                  />
                </div>
                <div style={{ fontSize:'.78rem', color:'#64748b', marginTop:4,
                  paddingTop: equipped === 'hero_scarf' ? 36 : 0 }}>
                  {equipped
                    ? `${ITEMS.find(i=>i.id===equipped)?.emoji} ${ITEMS.find(i=>i.id===equipped)?.name}`
                    : 'لا يوجد إكسسوار حالياً'}
                </div>
              </div>
            </div>

            {/* Grid */}
            <div style={{ padding:'0 22px 22px' }}>
              <div style={{ fontWeight:800, color:'#1e293b', fontSize:'.93rem', marginBottom:12,
                display:'flex', alignItems:'center', gap:8 }}>
                <span>🎁</span> الإكسسوارات المتاحة
              </div>

              {loading ? (
                <div style={{ textAlign:'center', padding:'48px 0', color:'#94a3b8' }}>
                  <div style={{ fontSize:'2.2rem', display:'inline-block',
                    animation:'avSpin 1s linear infinite' }}>⭐</div>
                  <div style={{ marginTop:8, fontSize:'.85rem' }}>جارٍ التحميل…</div>
                </div>
              ) : (
                <div style={{
                  display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12,
                }}>
                  {ITEMS.map(item => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      isOwned={owned.includes(item.id)}
                      isEquipped={equipped === item.id}
                      balance={balance}
                      buying={buying}
                      onBuy={() => handleBuy(item)}
                      onEquip={() => handleEquip(item.id)}
                      onUnequip={handleUnequip}
                    />
                  ))}
                </div>
              )}

              {/* Tip */}
              <div style={{
                marginTop:14, padding:'11px 16px',
                background:'#FFF7ED', borderRadius:14,
                border:'1.5px solid #FDE68A',
                display:'flex', alignItems:'center', gap:10,
                fontSize:'.78rem', color:'#92400E',
              }}>
                <span style={{ fontSize:'1.15rem', flexShrink:0 }}>💡</span>
                العب الألعاب وراجع البطاقات والأحاجي لجمع نقاط أكثر وشراء إكسسوارات أجمل!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', top:22, left:'50%',
          transform:'translateX(-50%)',
          zIndex:1100,
          background: toast.type==='ok' ? '#10B981' : toast.type==='err' ? '#EF4444' : '#6366F1',
          color:'#fff', padding:'11px 26px', borderRadius:50,
          fontWeight:800, fontSize:'.88rem',
          fontFamily:"'Cairo','Tajawal',sans-serif",
          boxShadow:'0 8px 28px rgba(0,0,0,.28)',
          animation:'avToastIn .24s ease',
          whiteSpace:'nowrap', direction:'rtl',
        }}>
          {toast.msg}
        </div>
      )}
    </>
  );
}
