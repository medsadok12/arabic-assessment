'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { dicebearUrl, dicebearUrlFull } from '../../../components/AvatarShop';

/* ═══════════════════════ CSS ANIMATIONS ══════════════════════════════════ */
if (typeof document !== 'undefined' && !document.getElementById('hs-anim')) {
  const s = document.createElement('style'); s.id = 'hs-anim';
  s.textContent = `
    @keyframes hsFloat   { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-8px)} }
    @keyframes hsPulse   { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.12)} }
    @keyframes hsSpin    { from{transform:rotate(0)} to{transform:rotate(360deg)} }
    @keyframes hsGlow    { 0%,100%{box-shadow:0 0 14px rgba(139,92,246,.5)} 50%{box-shadow:0 0 34px rgba(139,92,246,.9),0 0 60px rgba(139,92,246,.4)} }
    @keyframes hsShine   { 0%{background-position:200% center} 100%{background-position:-200% center} }
    @keyframes hsBounce  { 0%{transform:scale(1)} 30%{transform:scale(1.18)} 55%{transform:scale(.92)} 75%{transform:scale(1.07)} 100%{transform:scale(1)} }
    @keyframes hsFadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    @keyframes hsParticle{ 0%{opacity:0;transform:translateY(0) scale(0)} 20%{opacity:1} 100%{opacity:0;transform:translateY(-60px) scale(1.5)} }
    @keyframes hsEquip   { 0%,100%{box-shadow:0 0 0 0 transparent} 40%{box-shadow:0 0 0 8px rgba(139,92,246,.45)} }
    @keyframes hsRainbow { 0%{filter:hue-rotate(0deg)} 100%{filter:hue-rotate(360deg)} }
    @keyframes hsFlicker { 0%,100%{opacity:1} 50%{opacity:.7} }
  `;
  document.head.appendChild(s);
}

/* ═══════════════════════ SOUND HELPERS ══════════════════════════════════ */
function playChime(notes = [523,659,784], dur = 0.5) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = f;
      const t = ctx.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.6);
      osc.start(t); osc.stop(t + dur * 0.6);
    });
  } catch {}
}

/* ═══════════════════════ CHARACTERS ══════════════════════════════════════ */
const CHARACTERS = [
  { id:'c1', seed:'Ahmad-brave',   name:'الفارس',      color:'#3B82F6', bg:'linear-gradient(135deg,#1e3a8a,#3b82f6)' },
  { id:'c2', seed:'Leila-bright',  name:'الأميرة',     color:'#EC4899', bg:'linear-gradient(135deg,#831843,#ec4899)' },
  { id:'c3', seed:'Younes-bold',   name:'المغامر',     color:'#F59E0B', bg:'linear-gradient(135deg,#78350f,#f59e0b)' },
  { id:'c4', seed:'Nour-spark',    name:'المستكشفة',   color:'#10B981', bg:'linear-gradient(135deg,#064e3b,#10b981)' },
  { id:'c5', seed:'Karim-magic',   name:'الساحر',      color:'#8B5CF6', bg:'linear-gradient(135deg,#3b0764,#8b5cf6)' },
  { id:'c6', seed:'Rima-creative', name:'الفنانة',     color:'#F97316', bg:'linear-gradient(135deg,#7c2d12,#f97316)' },
  { id:'c7', seed:'Tarek-shadow',  name:'النينجا',     color:'#6B7280', bg:'linear-gradient(135deg,#111827,#374151)' },
  { id:'c8', seed:'Dina-star',     name:'نجمة العلم',  color:'#06B6D4', bg:'linear-gradient(135deg,#0e7490,#06b6d4)' },
];

/* ═══════════════════════ CATEGORIES ══════════════════════════════════════ */
const CATS = [
  { id:'halo',       label:'هالات',     emoji:'✨', color:'#F59E0B' },
  { id:'hat',        label:'قبعات',     emoji:'🎩', color:'#7C3AED' },
  { id:'glasses',    label:'نظارات',    emoji:'🕶️', color:'#3B82F6' },
  { id:'scarf',      label:'أوشحة',     emoji:'🧣', color:'#EF4444' },
  { id:'companion',  label:'مرافق',     emoji:'🐾', color:'#10B981' },
  { id:'background', label:'خلفية',     emoji:'🎨', color:'#F97316' },
];

/* ═══════════════════════ ITEM CATALOG ═══════════════════════════════════ */
const ITEMS = [
  /* ── HALOS ── */
  { id:'star_halo',    cat:'halo',    name:'هالة النجوم',    emoji:'⭐', price:30,  accent:'#F59E0B', bg:'#FEF3C7' },
  { id:'rainbow_halo', cat:'halo',    name:'قوس المجد',      emoji:'🌈', price:55,  accent:'#8B5CF6', bg:'#EDE9FE' },
  { id:'fire_crown',   cat:'halo',    name:'تاج النار',      emoji:'🔥', price:65,  accent:'#EF4444', bg:'#FEE2E2' },
  /* ── HATS ── */
  { id:'graduation_cap',cat:'hat',    name:'قبعة التخرج',    emoji:'🎓', price:50,  accent:'#2563EB', bg:'#EFF6FF' },
  { id:'golden_crown', cat:'hat',     name:'تاج الذهب',      emoji:'👑', price:80,  accent:'#CA8A04', bg:'#FEF9C3' },
  { id:'wizard_hat',   cat:'hat',     name:'قبعة الساحر',    emoji:'🧙', price:100, accent:'#7C3AED', bg:'#F5F3FF' },
  { id:'ninja_headband',cat:'hat',    name:'عصابة النينجا',  emoji:'🥷', price:60,  accent:'#DC2626', bg:'#FEF2F2' },
  { id:'pirate_hat',   cat:'hat',     name:'قبعة القرصان',   emoji:'🏴‍☠️', price:75,  accent:'#1F2937', bg:'#F9FAFB' },
  /* ── GLASSES ── */
  { id:'smart_glasses',cat:'glasses', name:'نظارة ذكية',     emoji:'🕶️', price:40,  accent:'#4F46E5', bg:'#EEF2FF' },
  { id:'round_glasses',cat:'glasses', name:'نظارة دائرية',   emoji:'🤓', price:35,  accent:'#92400E', bg:'#FFFBEB' },
  { id:'heart_glasses',cat:'glasses', name:'نظارة قلوب',     emoji:'💕', price:45,  accent:'#BE185D', bg:'#FDF2F8' },
  /* ── SCARVES ── */
  { id:'hero_scarf',   cat:'scarf',   name:'وشاح البطل',     emoji:'🧣', price:60,  accent:'#DC2626', bg:'#FEF2F2' },
  { id:'bow_tie',      cat:'scarf',   name:'فراشة أناقة',    emoji:'🎀', price:50,  accent:'#DB2777', bg:'#FDF2F8' },
  { id:'medal',        cat:'scarf',   name:'ميدالية الشرف',  emoji:'🏅', price:75,  accent:'#B45309', bg:'#FFFBEB' },
  /* ── COMPANIONS ── */
  { id:'mini_star_pet',cat:'companion',name:'نجمة الحظ',     emoji:'⭐', price:80,  accent:'#D97706', bg:'#FEF3C7' },
  { id:'baby_cat',     cat:'companion',name:'قطتي الصغيرة',  emoji:'🐱', price:90,  accent:'#EA580C', bg:'#FFF7ED' },
  { id:'baby_dragon',  cat:'companion',name:'التنين الصديق', emoji:'🐲', price:150, accent:'#16A34A', bg:'#F0FDF4' },
  /* ── BACKGROUNDS ── */
  { id:'space_bg',     cat:'background',name:'خلفية الفضاء', emoji:'🚀', price:100, accent:'#1D4ED8', bg:'#EFF6FF' },
  { id:'forest_bg',    cat:'background',name:'خلفية الغابة', emoji:'🌲', price:80,  accent:'#15803D', bg:'#F0FDF4' },
  { id:'sunset_bg',    cat:'background',name:'خلفية الغروب', emoji:'🌅', price:70,  accent:'#C2410C', bg:'#FFF7ED' },
];

/* ═══════════════════════ SVG OVERLAYS ═══════════════════════════════════ */
/*
 * open-peeps proportions (sz × sz container, objectFit:contain):
 *   head top      ≈ sz*0.04   head bottom/chin ≈ sz*0.32
 *   eye level     ≈ sz*0.18   forehead         ≈ sz*0.10
 *   head L edge   ≈ sz*0.27   head R edge      ≈ sz*0.73  (width ≈ sz*0.46)
 *   neck/collar   ≈ sz*0.32   shoulders        ≈ sz*0.37
 *   feet          ≈ sz*0.90
 */
const OV = {

  /* ──── HALOS ──── */
  star_halo: (sz) => (
    <svg key="sh" style={{ position:'absolute', top:-sz*.05, left:sz*.18, width:sz*.64, height:sz*.26, pointerEvents:'none', overflow:'visible', zIndex:5 }} viewBox="0 0 124 50">
      <defs><filter id="sh-g2"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <polygon points="62,4 66.5,17 80,17 69.5,25 73,38 62,30 51,38 54.5,25 44,17 57.5,17" fill="#FFD700" filter="url(#sh-g2)"/>
      <polygon points="23,13 25.5,21 34,21 27.5,25.5 30,33 23,29 16,33 18.5,25.5 12,21 20.5,21" fill="#FBBF24" opacity=".9"/>
      <polygon points="101,13 103.5,21 112,21 105.5,25.5 108,33 101,29 94,33 96.5,25.5 90,21 98.5,21" fill="#FBBF24" opacity=".9"/>
      <circle cx="42" cy="5" r="2.5" fill="#FFD700" opacity=".75"/><circle cx="82" cy="5" r="2.5" fill="#FFD700" opacity=".75"/>
    </svg>
  ),

  rainbow_halo: (sz) => (
    <svg key="rh" style={{ position:'absolute', top:-sz*.07, left:sz*.14, width:sz*.72, height:sz*.20, pointerEvents:'none', overflow:'visible', zIndex:5 }} viewBox="0 0 128 38">
      <defs><filter id="rh-glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <path d="M10,36 Q64,-10 118,36" fill="none" stroke="#EF4444" strokeWidth="5" strokeLinecap="round" filter="url(#rh-glow)"/>
      <path d="M16,36 Q64,-2 112,36"  fill="none" stroke="#F97316" strokeWidth="5" strokeLinecap="round" filter="url(#rh-glow)"/>
      <path d="M22,36 Q64,6 106,36"   fill="none" stroke="#EAB308" strokeWidth="5" strokeLinecap="round" filter="url(#rh-glow)"/>
      <path d="M28,36 Q64,12 100,36"  fill="none" stroke="#22C55E" strokeWidth="5" strokeLinecap="round" filter="url(#rh-glow)"/>
      <path d="M34,36 Q64,18 94,36"   fill="none" stroke="#3B82F6" strokeWidth="5" strokeLinecap="round" filter="url(#rh-glow)"/>
      <path d="M40,36 Q64,23 88,36"   fill="none" stroke="#8B5CF6" strokeWidth="4" strokeLinecap="round" filter="url(#rh-glow)"/>
    </svg>
  ),

  fire_crown: (sz) => (
    <svg key="fc" style={{ position:'absolute', top:-sz*.05, left:sz*.16, width:sz*.68, height:sz*.24, pointerEvents:'none', overflow:'visible', zIndex:5 }} viewBox="0 0 120 42">
      <defs>
        <radialGradient id="fc-g" cx="50%" cy="100%" r="80%">
          <stop offset="0%"  stopColor="#FEF08A"/>
          <stop offset="40%" stopColor="#F97316"/>
          <stop offset="100%" stopColor="#DC2626"/>
        </radialGradient>
        <filter id="fc-glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <path d="M22 42 Q18 28 26 16 Q24 28 32 22 Q28 12 36 4 Q38 18 44 14 Q42 24 50 20 Q46 10 52 2 Q58 14 56 22 Q62 16 62 8 Q68 18 66 28 Q72 20 76 10 Q80 22 78 32 Q84 22 88 14 Q94 26 90 38 Q80 32 74 38 Q68 30 62 38 Q56 28 50 38 Q44 28 38 38 Q32 30 26 38 Z" fill="url(#fc-g)" filter="url(#fc-glow)"/>
      <path d="M42 42 Q40 34 46 26 Q46 32 50 28 Q50 20 54 16 Q56 24 54 30 Q58 24 60 18 Q64 26 62 36 Z" fill="#FEF08A" opacity=".8"/>
    </svg>
  ),

  /* ──── HATS ──── */
  graduation_cap: (sz) => (
    <svg key="grad" style={{ position:'absolute', top:sz*.02, left:sz*.23, width:sz*.54, height:sz*.26, pointerEvents:'none', overflow:'visible', zIndex:6 }} viewBox="0 0 122 60">
      <defs><filter id="grc-sh2"><feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000" floodOpacity=".22"/></filter></defs>
      <rect x="28" y="8" width="66" height="22" rx="3" fill="#1e1b4b" filter="url(#grc-sh2)"/>
      <rect x="16" y="27" width="90" height="11" rx="5.5" fill="#312e81"/>
      <rect x="28" y="31" width="66" height="6" rx="3" fill="#F59E0B"/>
      <circle cx="61" cy="12" r="6.5" fill="#F59E0B"/>
      <circle cx="61" cy="12" r="4.5" fill="#FCD34D"/>
      <path d="M61 18 Q80 28 84 43" stroke="#F59E0B" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <rect x="80" y="41" width="9" height="17" rx="4.5" fill="#F59E0B"/>
      <ellipse cx="84.5" cy="58" rx="5.5" ry="3" fill="#D97706"/>
    </svg>
  ),

  golden_crown: (sz) => (
    <svg key="gc" style={{ position:'absolute', top:sz*.04, left:sz*.26, width:sz*.48, height:sz*.24, pointerEvents:'none', overflow:'visible', zIndex:6 }} viewBox="0 0 112 54">
      <defs>
        <linearGradient id="cr-g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FEF08A"/><stop offset="100%" stopColor="#EAB308"/></linearGradient>
        <filter id="cr-sh2"><feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#78350f" floodOpacity=".3"/></filter>
      </defs>
      <path d="M14 52 L14 22 L32 34 L56 4 L80 34 L98 22 L98 52 Z" fill="url(#cr-g2)" filter="url(#cr-sh2)"/>
      <path d="M14 52 L14 22 L32 34 L56 4 L80 34 L98 22 L98 52 Z" fill="none" stroke="#B45309" strokeWidth="1.5"/>
      <rect x="12" y="46" width="88" height="10" rx="5" fill="#EAB308"/>
      <rect x="12" y="46" width="88" height="10" rx="5" fill="none" stroke="#B45309" strokeWidth="1"/>
      <ellipse cx="56" cy="30" rx="8" ry="7" fill="#EF4444"/>
      <ellipse cx="27" cy="43" rx="6" ry="5" fill="#3B82F6"/>
      <ellipse cx="85" cy="43" rx="6" ry="5" fill="#22C55E"/>
      <ellipse cx="53.5" cy="27" rx="2.5" ry="2" fill="white" opacity=".5"/>
    </svg>
  ),

  wizard_hat: (sz) => (
    <svg key="wiz" style={{ position:'absolute', top:-sz*.10, left:sz*.21, width:sz*.58, height:sz*.40, pointerEvents:'none', overflow:'visible', zIndex:6 }} viewBox="0 0 126 84">
      <defs>
        <linearGradient id="wh-g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b0764"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient>
        <filter id="wh-sh2"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#1e1b4b" floodOpacity=".4"/></filter>
      </defs>
      <polygon points="63,3 24,70 102,70" fill="url(#wh-g2)" filter="url(#wh-sh2)"/>
      <polygon points="63,3 24,70 102,70" fill="none" stroke="#2e1065" strokeWidth="2"/>
      <ellipse cx="63" cy="70" rx="50" ry="13" fill="#5b21b6"/>
      <polygon points="52,26 54,33 61,33 55.5,37 57.5,44 52,40 46.5,44 48.5,37 43,33 50,33" fill="#FCD34D" opacity=".95"/>
      <circle cx="78" cy="46" r="5" fill="#FCD34D" opacity=".85"/>
      <line x1="32" y1="66" x2="94" y2="66" stroke="#FCD34D" strokeWidth="4.5" strokeLinecap="round"/>
      <rect x="51" y="62" width="24" height="10" rx="3" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5"/>
    </svg>
  ),

  ninja_headband: (sz) => (
    <svg key="nb" style={{ position:'absolute', top:sz*.10, left:sz*.16, width:sz*.68, height:sz*.18, pointerEvents:'none', overflow:'visible', zIndex:6 }} viewBox="0 0 112 32">
      <defs><filter id="nb-sh"><feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#7f1d1d" floodOpacity=".4"/></filter></defs>
      <rect x="2" y="6" width="108" height="20" rx="10" fill="#DC2626" filter="url(#nb-sh)"/>
      <rect x="2" y="6" width="108" height="20" rx="10" fill="none" stroke="#991B1B" strokeWidth="1.5"/>
      <rect x="8" y="9" width="96" height="2.5" rx="1.25" fill="#EF4444" opacity=".5"/>
      <text x="56" y="21.5" textAnchor="middle" fontSize="11" fontFamily="serif" fill="white" fontWeight="bold" opacity=".9">忍</text>
      <path d="M108 14 Q118 16 122 24 L112 22" fill="#DC2626" stroke="#991B1B" strokeWidth="1"/>
      <path d="M4 14 Q-6 16 -10 24 L0 22" fill="#DC2626" stroke="#991B1B" strokeWidth="1"/>
    </svg>
  ),

  pirate_hat: (sz) => (
    <svg key="ph" style={{ position:'absolute', top:sz*.02, left:sz*.24, width:sz*.52, height:sz*.24, pointerEvents:'none', overflow:'visible', zIndex:6 }} viewBox="0 0 116 52">
      <defs><filter id="ph-sh"><feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity=".35"/></filter></defs>
      <path d="M8 48 Q8 30 58 26 Q108 30 108 48 Z" fill="#1F2937" filter="url(#ph-sh)"/>
      <path d="M12 40 L18 14 Q20 4 58 6 Q96 4 98 14 L104 40 Z" fill="#111827" filter="url(#ph-sh)"/>
      <path d="M12 40 L18 14 Q20 4 58 6 Q96 4 98 14 L104 40 Z" fill="none" stroke="#374151" strokeWidth="1.5"/>
      <rect x="14" y="36" width="88" height="8" rx="4" fill="#DC2626"/>
      <rect x="14" y="36" width="88" height="8" rx="4" fill="none" stroke="#991B1B" strokeWidth="1"/>
      <circle cx="58" cy="23" r="9" fill="white" opacity=".9"/>
      <line x1="52" y1="17" x2="64" y2="29" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="64" y1="17" x2="52" y2="29" stroke="#1F2937" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="58" cy="23" r="4" fill="#1F2937"/>
      <ellipse cx="30" cy="44" rx="5" ry="2.5" fill="#EF4444" opacity=".4"/>
      <ellipse cx="86" cy="44" rx="5" ry="2.5" fill="#EF4444" opacity=".4"/>
    </svg>
  ),

  /* ──── GLASSES (eye level ≈ sz*0.18) ──── */
  smart_glasses: (sz) => (
    <svg key="sg" style={{ position:'absolute', top:sz*.17, left:sz*.18, width:sz*.64, height:sz*.22, pointerEvents:'none', overflow:'visible', zIndex:7 }} viewBox="0 0 114 42">
      <defs>
        <linearGradient id="sg-g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a5b4fc"/><stop offset="100%" stopColor="#4f46e5"/></linearGradient>
        <filter id="sg-gw2"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect x="4"  y="5" width="44" height="28" rx="10" fill="url(#sg-g2)" opacity=".58" filter="url(#sg-gw2)"/>
      <rect x="4"  y="5" width="44" height="28" rx="10" fill="none" stroke="#3730a3" strokeWidth="2.5"/>
      <rect x="66" y="5" width="44" height="28" rx="10" fill="url(#sg-g2)" opacity=".58" filter="url(#sg-gw2)"/>
      <rect x="66" y="5" width="44" height="28" rx="10" fill="none" stroke="#3730a3" strokeWidth="2.5"/>
      <path d="M48 19 Q57 13 66 19" fill="none" stroke="#3730a3" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="4"   y1="19" x2="0"   y2="24" stroke="#3730a3" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="110" y1="19" x2="114" y2="24" stroke="#3730a3" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="10" y1="10" x2="18" y2="19" stroke="white" strokeWidth="2" opacity=".4" strokeLinecap="round"/>
    </svg>
  ),

  round_glasses: (sz) => (
    <svg key="rg" style={{ position:'absolute', top:sz*.16, left:sz*.18, width:sz*.64, height:sz*.23, pointerEvents:'none', overflow:'visible', zIndex:7 }} viewBox="0 0 116 45">
      <defs><linearGradient id="rg-gl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fef9c3"/><stop offset="100%" stopColor="#fde68a" stopOpacity=".4"/></linearGradient></defs>
      <circle cx="30" cy="22" r="20" fill="url(#rg-gl)" stroke="#B45309" strokeWidth="2.8"/>
      <circle cx="86" cy="22" r="20" fill="url(#rg-gl)" stroke="#B45309" strokeWidth="2.8"/>
      <line x1="50" y1="22" x2="66" y2="22" stroke="#B45309" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="0"   y1="22" x2="10"  y2="26" stroke="#B45309" strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="116" y1="22" x2="106" y2="26" stroke="#B45309" strokeWidth="2.2" strokeLinecap="round"/>
      <circle cx="22" cy="15" r="4" fill="white" opacity=".35"/>
      <circle cx="78" cy="15" r="4" fill="white" opacity=".35"/>
    </svg>
  ),

  heart_glasses: (sz) => (
    <svg key="hg" style={{ position:'absolute', top:sz*.16, left:sz*.18, width:sz*.64, height:sz*.24, pointerEvents:'none', overflow:'visible', zIndex:7 }} viewBox="0 0 118 46">
      <defs>
        <linearGradient id="hg-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbcfe8"/><stop offset="100%" stopColor="#f9a8d4" stopOpacity=".6"/></linearGradient>
        <filter id="hg-glow"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <path d="M30,36 C10,36 4,20 4,14 C4,6 10,4 16,4 C22,4 28,10 30,14 C32,10 38,4 44,4 C50,4 56,6 56,14 C56,20 50,36 30,36 Z" fill="url(#hg-g)" stroke="#DB2777" strokeWidth="2.2" filter="url(#hg-glow)"/>
      <path d="M88,36 C68,36 62,20 62,14 C62,6 68,4 74,4 C80,4 86,10 88,14 C90,10 96,4 102,4 C108,4 114,6 114,14 C114,20 108,36 88,36 Z" fill="url(#hg-g)" stroke="#DB2777" strokeWidth="2.2" filter="url(#hg-glow)"/>
      <path d="M56 20 Q59 14 62 20" fill="none" stroke="#DB2777" strokeWidth="2" strokeLinecap="round"/>
      <line x1="0"   y1="20" x2="4"   y2="24" stroke="#DB2777" strokeWidth="2" strokeLinecap="round"/>
      <line x1="118" y1="20" x2="114" y2="24" stroke="#DB2777" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="16" cy="12" r="4" fill="white" opacity=".4"/>
      <circle cx="74" cy="12" r="4" fill="white" opacity=".4"/>
    </svg>
  ),

  /* ──── SCARVES (neck/collar ≈ sz*0.31) ──── */
  hero_scarf: (sz) => (
    <svg key="sc" style={{ position:'absolute', top:sz*.30, left:sz*.06, width:sz*.88, height:sz*.36, pointerEvents:'none', overflow:'visible', zIndex:4 }} viewBox="0 0 128 55">
      <defs><linearGradient id="sc-g2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#EF4444"/><stop offset="100%" stopColor="#F97316"/></linearGradient></defs>
      <path d="M20 9 Q64 0 108 9 Q112 28 64 32 Q16 28 20 9 Z" fill="url(#sc-g2)"/>
      <path d="M24 14 Q64 6 104 14" fill="none" stroke="white" strokeWidth="1.5" opacity=".2"/>
      <circle cx="48" cy="23" r="14" fill="#DC2626"/>
      <circle cx="48" cy="23" r="14" fill="none" stroke="#991B1B" strokeWidth="1.5"/>
      <ellipse cx="44" cy="18" rx="4.5" ry="3.5" fill="#FCA5A5" opacity=".4"/>
      <path d="M42 34 Q28 46 20 55" stroke="url(#sc-g2)" strokeWidth="17" fill="none" strokeLinecap="round"/>
      <path d="M54 34 Q62 46 56 55" stroke="#B91C1C" strokeWidth="12" fill="none" strokeLinecap="round"/>
    </svg>
  ),

  bow_tie: (sz) => (
    <svg key="bt" style={{ position:'absolute', top:sz*.32, left:sz*.22, width:sz*.56, height:sz*.22, pointerEvents:'none', overflow:'visible', zIndex:4 }} viewBox="0 0 88 36">
      <defs>
        <radialGradient id="bt-gl" cx="50%" cy="50%" r="70%"><stop offset="0%" stopColor="#F9A8D4"/><stop offset="100%" stopColor="#DB2777"/></radialGradient>
        <filter id="bt-sh"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#831843" floodOpacity=".3"/></filter>
      </defs>
      <path d="M44 18 L6 2 Q2 0 2 4 L2 32 Q2 36 6 34 Z" fill="url(#bt-gl)" filter="url(#bt-sh)"/>
      <path d="M44 18 L82 2 Q86 0 86 4 L86 32 Q86 36 82 34 Z" fill="url(#bt-gl)" filter="url(#bt-sh)"/>
      <circle cx="44" cy="18" r="7" fill="#DB2777"/>
      <circle cx="44" cy="18" r="5" fill="#EC4899"/>
      <circle cx="42" cy="15" r="2.5" fill="#FDE7F3" opacity=".6"/>
      <circle cx="20" cy="8" r="3" fill="white" opacity=".25"/>
      <circle cx="70" cy="8" r="3" fill="white" opacity=".25"/>
    </svg>
  ),

  medal: (sz) => (
    <svg key="med" style={{ position:'absolute', top:sz*.28, left:sz*.40, width:sz*.28, height:sz*.38, pointerEvents:'none', overflow:'visible', zIndex:4 }} viewBox="0 0 44 58">
      <defs>
        <linearGradient id="med-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EF4444"/><stop offset="50%" stopColor="#1D4ED8"/><stop offset="100%" stopColor="#EF4444"/></linearGradient>
        <linearGradient id="med-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FEF08A"/><stop offset="100%" stopColor="#CA8A04"/></linearGradient>
        <filter id="med-sh"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity=".25"/></filter>
      </defs>
      <rect x="17" y="0" width="10" height="24" rx="3" fill="url(#med-r)"/>
      <circle cx="22" cy="38" r="18" fill="url(#med-g)" filter="url(#med-sh)"/>
      <circle cx="22" cy="38" r="16" fill="none" stroke="#B45309" strokeWidth="2"/>
      <polygon points="22,24 24.5,31 32,31 26,35.5 28.5,43 22,38.5 15.5,43 18,35.5 12,31 19.5,31" fill="#B45309" opacity=".8"/>
      <circle cx="18" cy="32" r="3" fill="white" opacity=".35"/>
    </svg>
  ),

  /* ──── COMPANIONS (right of character, foot level ≈ sz*0.70) ──── */
  mini_star_pet: (sz) => (
    <svg key="msp" style={{ position:'absolute', top:sz*.68, left:sz*.76, width:sz*.36, height:sz*.36, pointerEvents:'none', overflow:'visible', zIndex:8, animation:'hsFloat 2.2s ease-in-out infinite' }} viewBox="0 0 50 50">
      <defs><filter id="sp-glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <polygon points="25,4 29,17 43,17 32,25 36,38 25,30 14,38 18,25 7,17 21,17" fill="#FCD34D" filter="url(#sp-glow)"/>
      <circle cx="20" cy="22" r="2.5" fill="#1F2937"/>
      <circle cx="30" cy="22" r="2.5" fill="#1F2937"/>
      <circle cx="21" cy="20.5" r="1" fill="white"/>
      <circle cx="31" cy="20.5" r="1" fill="white"/>
      <path d="M20 28 Q25 32 30 28" fill="none" stroke="#1F2937" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="36" cy="12" r="3" fill="#FDE68A" opacity=".7"/>
      <circle cx="14" cy="38" r="2" fill="#FDE68A" opacity=".5"/>
    </svg>
  ),

  baby_cat: (sz) => (
    <svg key="bc" style={{ position:'absolute', top:sz*.65, left:sz*.72, width:sz*.40, height:sz*.40, pointerEvents:'none', overflow:'visible', zIndex:8, animation:'hsFloat 2.8s ease-in-out infinite' }} viewBox="0 0 55 55">
      <defs><filter id="cat-sh"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity=".2"/></filter></defs>
      <path d="M8 18 L4 4 L18 12 Z" fill="#FB923C" filter="url(#cat-sh)"/>
      <path d="M47 18 L51 4 L37 12 Z" fill="#FB923C" filter="url(#cat-sh)"/>
      <circle cx="27" cy="32" r="22" fill="#FED7AA" filter="url(#cat-sh)"/>
      <path d="M8 18 L4 4 L18 12 Z" fill="none" stroke="#EA580C" strokeWidth="1"/>
      <path d="M47 18 L51 4 L37 12 Z" fill="none" stroke="#EA580C" strokeWidth="1"/>
      <path d="M12 22 L9 8 L20 14 Z" fill="#FDBA74"/>
      <path d="M43 22 L46 8 L35 14 Z" fill="#FDBA74"/>
      <circle cx="20" cy="30" r="5" fill="#1F2937"/>
      <circle cx="34" cy="30" r="5" fill="#1F2937"/>
      <circle cx="21.5" cy="28.5" r="2" fill="white"/>
      <circle cx="35.5" cy="28.5" r="2" fill="white"/>
      <ellipse cx="27" cy="37" rx="5" ry="3.5" fill="#F9A8D4"/>
      <path d="M27 40 L27 44" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M14 37 Q10 35 8 38" fill="none" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M16 40 Q12 39 10 42" fill="none" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M40 37 Q44 35 46 38" fill="none" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M38 40 Q42 39 44 42" fill="none" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),

  baby_dragon: (sz) => (
    <svg key="bd" style={{ position:'absolute', top:sz*.60, left:sz*.68, width:sz*.44, height:sz*.44, pointerEvents:'none', overflow:'visible', zIndex:8, animation:'hsFloat 3.2s ease-in-out infinite' }} viewBox="0 0 65 65">
      <defs>
        <linearGradient id="dr-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4ADE80"/><stop offset="100%" stopColor="#15803D"/></linearGradient>
        <filter id="dr-sh"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity=".2"/></filter>
      </defs>
      <path d="M50 20 Q62 12 58 28 Q65 24 60 38 Z" fill="#86EFAC" filter="url(#dr-sh)"/>
      <path d="M15 20 Q3 12 7 28 Q0 24 5 38 Z" fill="#86EFAC" filter="url(#dr-sh)"/>
      <path d="M25 8 L30 2 L32 8 Z" fill="#16A34A"/>
      <path d="M35 6 L40 0 L42 6 Z" fill="#16A34A"/>
      <circle cx="32" cy="34" r="24" fill="url(#dr-g)" filter="url(#dr-sh)"/>
      <circle cx="24" cy="28" r="6" fill="#1F2937"/>
      <circle cx="40" cy="28" r="6" fill="#1F2937"/>
      <circle cx="25.5" cy="26.5" r="2.5" fill="white"/>
      <circle cx="41.5" cy="26.5" r="2.5" fill="white"/>
      <ellipse cx="32" cy="36" rx="6" ry="4" fill="#86EFAC"/>
      <path d="M26 42 Q32 48 38 42" fill="none" stroke="#15803D" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="28" cy="34" r="3" fill="#4ADE80" opacity=".5"/>
      <circle cx="36" cy="34" r="3" fill="#4ADE80" opacity=".5"/>
      <path d="M32 52 L28 62 M32 52 L36 62" stroke="#15803D" strokeWidth="3" strokeLinecap="round"/>
      <path d="M36 62 Q38 65 40 62" fill="#4ADE80"/>
      <path d="M28 62 Q26 65 24 62" fill="#4ADE80"/>
    </svg>
  ),
};

/* ═══════════════════════ BACKGROUND RENDERERS ═══════════════════════════ */
function renderBg(id, sz) {
  const r = sz * 0.65;
  const cx = sz / 2, cy = sz / 2;
  if (id === 'space_bg') return (
    <svg key="sbg" style={{ position:'absolute', top:0, left:0, width:sz, height:sz, zIndex:0, borderRadius:14, overflow:'hidden' }} viewBox="0 0 130 130">
      <defs><radialGradient id="sp-bg" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#1E1B4B"/><stop offset="100%" stopColor="#0F0A1A"/></radialGradient></defs>
      <circle cx="65" cy="65" r="65" fill="url(#sp-bg)"/>
      {[[15,20],[40,8],[80,15],[110,30],[20,60],[100,55],[55,100],[30,90],[90,80],[120,70],[65,40],[45,45]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={i%3===0?2:1.2} fill="white" opacity={.4+i*.05}/>
      ))}
      <circle cx="95" cy="25" r="8" fill="none" stroke="#4338CA" strokeWidth="2" opacity=".5"/>
      <circle cx="95" cy="25" r="5" fill="#312E81" opacity=".7"/>
      <circle cx="30" cy="80" r="5" fill="#7C3AED" opacity=".4"/>
      <circle cx="30" cy="80" r="3" fill="#A78BFA" opacity=".5"/>
    </svg>
  );
  if (id === 'forest_bg') return (
    <svg key="fbg" style={{ position:'absolute', top:0, left:0, width:sz, height:sz, zIndex:0, borderRadius:14, overflow:'hidden' }} viewBox="0 0 130 130">
      <defs><radialGradient id="fo-bg" cx="50%" cy="30%" r="70%"><stop offset="0%" stopColor="#6EE7B7"/><stop offset="60%" stopColor="#059669"/><stop offset="100%" stopColor="#064E3B"/></radialGradient></defs>
      <circle cx="65" cy="65" r="65" fill="url(#fo-bg)"/>
      <polygon points="65,15 85,55 45,55" fill="#065F46" opacity=".7"/>
      <polygon points="65,25 80,55 50,55" fill="#34D399" opacity=".5"/>
      <polygon points="30,40 48,75 12,75" fill="#065F46" opacity=".6"/>
      <polygon points="100,40 118,75 82,75" fill="#065F46" opacity=".6"/>
      <rect x="60" y="55" width="10" height="20" rx="3" fill="#78350F" opacity=".7"/>
      <circle cx="35" cy="90" r="8" fill="#34D399" opacity=".4"/>
      <circle cx="95" cy="85" r="6" fill="#34D399" opacity=".4"/>
    </svg>
  );
  if (id === 'sunset_bg') return (
    <svg key="ssbg" style={{ position:'absolute', top:0, left:0, width:sz, height:sz, zIndex:0, borderRadius:14, overflow:'hidden' }} viewBox="0 0 130 130">
      <defs>
        <radialGradient id="ss-bg" cx="50%" cy="70%" r="80%"><stop offset="0%" stopColor="#FED7AA"/><stop offset="50%" stopColor="#FB923C"/><stop offset="100%" stopColor="#C2410C"/></radialGradient>
        <radialGradient id="ss-sun" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#FEF08A"/><stop offset="100%" stopColor="#F59E0B"/></radialGradient>
      </defs>
      <circle cx="65" cy="65" r="65" fill="url(#ss-bg)"/>
      <circle cx="65" cy="48" r="20" fill="url(#ss-sun)" opacity=".9"/>
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((a,i)=>(
        <line key={i} x1={65+20*Math.cos(a*Math.PI/180)} y1={48+20*Math.sin(a*Math.PI/180)} x2={65+28*Math.cos(a*Math.PI/180)} y2={48+28*Math.sin(a*Math.PI/180)} stroke="#FEF08A" strokeWidth="2" opacity=".6" strokeLinecap="round"/>
      ))}
      <path d="M0,95 Q20,85 40,90 Q60,95 80,85 Q100,75 130,85 L130,130 L0,130 Z" fill="#7C2D12" opacity=".5"/>
      <ellipse cx="25" cy="78" rx="16" ry="7" fill="white" opacity=".3"/>
      <ellipse cx="100" cy="68" rx="12" ry="5" fill="white" opacity=".25"/>
    </svg>
  );
  return null;
}

/* ═══════════════════════ HERO PREVIEW ═══════════════════════════════════ */
function HeroPreview({ config = {}, size = 200 }) {
  const { base_seed = 'default', equipped = {} } = config;
  /* NO backgroundColor → transparent SVG, character floats on dark panel */
  const url = dicebearUrlFull(base_seed);

  return (
    <div style={{ position:'relative', width:size, height:size, overflow:'visible' }}>
      {/* Background fills the full square */}
      {equipped.background && renderBg(equipped.background, size)}

      {/* Full-body character — transparent background, no clip, floats on dark panel */}
      <img
        src={url} alt=""
        style={{
          position:'absolute', width:size, height:size, top:0, left:0, zIndex:1,
          objectFit:'contain',
          filter:'drop-shadow(0 12px 32px rgba(0,0,0,.6)) drop-shadow(0 0 16px rgba(139,92,246,.3))',
        }}
      />

      {/* Accessories layered over full body */}
      {equipped.scarf     && OV[equipped.scarf]?.(size)}
      {equipped.halo      && OV[equipped.halo]?.(size)}
      {equipped.hat       && OV[equipped.hat]?.(size)}
      {equipped.glasses   && OV[equipped.glasses]?.(size)}
      {equipped.companion && OV[equipped.companion]?.(size)}
    </div>
  );
}

/* ═══════════════════════ ITEM CARD ══════════════════════════════════════ */
function ItemCard({ item, isOwned, isEquipped, balance, onBuy, onEquip, onUnequip, buying }) {
  const [hov, setHov] = useState(false);
  const canAfford = balance >= item.price;
  const isBuying  = buying === item.id;
  const previewSz = 56;
  const equippedId = isEquipped ? item.id : null;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: isEquipped
          ? `linear-gradient(135deg,${item.bg},white)`
          : hov ? item.bg : 'rgba(255,255,255,.85)',
        border: `2px solid ${isEquipped ? item.accent : hov ? item.accent+'66' : '#e2e8f0'}`,
        borderRadius:18, padding:'10px 8px 12px',
        display:'flex', flexDirection:'column', alignItems:'center', gap:6,
        cursor:'pointer', transition:'all .2s',
        transform: hov ? 'translateY(-4px) scale(1.03)' : isEquipped ? 'scale(1.02)' : 'none',
        boxShadow: isEquipped
          ? `0 0 0 2px ${item.accent}, 0 8px 24px ${item.accent}30`
          : hov ? `0 8px 22px ${item.accent}30` : '0 2px 6px rgba(0,0,0,.06)',
        position:'relative',
        animation: isEquipped ? 'hsEquip .6s ease' : 'none',
      }}
    >
      {isEquipped && (
        <div style={{ position:'absolute', top:-1, right:-1, background:item.accent, color:'#fff', fontSize:'.55rem', fontWeight:800, padding:'2px 7px', borderRadius:'0 16px 0 10px' }}>
          ✨ مرتدٍ
        </div>
      )}

      {/* accessory preview — clean emoji tile, no circle */}
      <div style={{
        width: previewSz, height: previewSz, flexShrink: 0,
        background: `linear-gradient(135deg, ${item.bg}, #fff)`,
        borderRadius: 12,
        border: `1.5px solid ${item.accent}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(previewSz * 0.52),
        boxShadow: isEquipped ? `0 0 0 2px ${item.accent}` : 'none',
        transition: 'box-shadow .2s',
      }}>
        {item.emoji}
      </div>

      <div style={{ fontWeight:800, fontSize:'.78rem', color:'#1e293b', textAlign:'center', lineHeight:1.3 }}>
        {item.emoji} {item.name}
      </div>

      {isOwned ? (
        <button
          onClick={isEquipped ? onUnequip : onEquip}
          style={{
            width:'100%', padding:'6px 0', borderRadius:10, border:'none',
            background: isEquipped ? '#10B981' : item.accent,
            color:'#fff', fontWeight:800, fontSize:'.72rem',
            fontFamily:"'Cairo','Tajawal',sans-serif", cursor:'pointer',
            transition:'all .18s',
          }}
        >{isEquipped ? '✓ نزع' : 'ارتداء'}</button>
      ) : (
        <button
          onClick={canAfford && !isBuying ? onBuy : undefined}
          disabled={!canAfford || isBuying}
          style={{
            width:'100%', padding:'6px 0', borderRadius:10, border:'none',
            background: canAfford ? item.accent : '#94A3B8',
            color:'#fff', fontWeight:800, fontSize:'.72rem',
            fontFamily:"'Cairo','Tajawal',sans-serif",
            cursor: canAfford ? 'pointer' : 'not-allowed', opacity: canAfford ? 1 : .7,
            transition:'all .18s',
          }}
        >{isBuying ? '...' : `⭐ ${item.price}`}</button>
      )}
    </div>
  );
}

/* ═══════════════════════ MAIN PAGE ════════════════════════════════════ */
export default function HeroesStudio() {
  const [config,   setConfig]   = useState({ base_seed: null, equipped: {} });
  const [owned,    setOwned]    = useState([]);
  const [balance,  setBalance]  = useState(0);
  const [activeCat,setActiveCat]= useState('hat');
  const [loading,  setLoading]  = useState(true);
  const [buying,   setBuying]   = useState(null);
  const [toast,    setToast]    = useState(null);
  const [saved,    setSaved]    = useState(false);
  const [mobile,   setMobile]   = useState(false);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r  = await fetch('/api/hero-config');
      const d  = await r.json();
      setConfig({ base_seed: d.base_seed ?? 'default', equipped: d.equipped ?? {} });
      setOwned(d.owned ?? []);
      setBalance(d.points ?? 0);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function flash(msg, type = 'ok') {
    setToast({ msg, type });
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setToast(null), 2600);
  }

  async function patchConfig(patch) {
    setConfig(prev => {
      const next = { ...prev, equipped: { ...prev.equipped, ...patch.equipped }, base_seed: patch.base_seed ?? prev.base_seed };
      return next;
    });
    try {
      await fetch('/api/hero-config', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch {}
  }

  function selectCharacter(char) {
    patchConfig({ base_seed: char.seed });
    playChime([440, 554, 659], 0.35);
    flash(`✨ اخترت ${char.name}!`, 'ok');
  }

  async function handleBuy(item) {
    if (buying) return;
    setBuying(item.id);
    try {
      const res = await fetch('/api/avatar/buy', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ itemId: item.id, price: item.price }),
      });
      const j = await res.json();
      if (!res.ok) { flash(j.error ?? 'فشل الشراء', 'err'); }
      else {
        setOwned(o => [...o, item.id]);
        setBalance(j.newBalance);
        playChime([523, 659, 784, 1047], 0.5);
        flash(`🎉 اشتريت ${item.emoji} ${item.name}!`, 'ok');
        await handleEquip(item);
      }
    } catch { flash('تعذّر الاتصال', 'err'); }
    setBuying(null);
  }

  async function handleEquip(item) {
    const catKey = item.cat;
    await patchConfig({ equipped: { [catKey]: item.id } });
    playChime([659, 784], 0.3);
    flash(`✨ ارتديت ${item.emoji} ${item.name}!`, 'ok');
  }

  async function handleUnequip(item) {
    const catKey = item.cat;
    await patchConfig({ equipped: { [catKey]: null } });
    flash('تم النزع ✓', 'info');
  }

  async function handleSave() {
    setSaved(true);
    playChime([523, 659, 784, 1047, 1319], 0.6);
    flash('🏆 تم حفظ مظهرك بنجاح!', 'ok');
    setTimeout(() => setSaved(false), 2500);
  }

  const catItems   = ITEMS.filter(i => i.cat === activeCat);
  const charName   = CHARACTERS.find(c => c.seed === config.base_seed)?.name ?? 'بطلي';

  /* ─── PREVIEW PANEL ─── */
  const previewSize = mobile ? 160 : 220;

  const panelLeft = (
    <div style={{
      flex: mobile ? 'none' : '0 0 42%',
      background: 'linear-gradient(160deg,#0f0a1e 0%,#1a1040 45%,#0e1629 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: mobile ? '28px 20px' : '40px 30px',
      position: 'relative', overflow: 'hidden',
      minHeight: mobile ? 320 : 'auto',
    }}>
      {/* Animated background particles */}
      {[...Array(12)].map((_,i) => (
        <div key={i} style={{
          position:'absolute',
          width: 3+i%3*2, height: 3+i%3*2,
          borderRadius:'50%',
          background: ['#F59E0B','#8B5CF6','#3B82F6','#10B981','#EC4899'][i%5],
          top: `${8+i*7}%`, left: `${5+i*8}%`,
          opacity: .35 + i*.04,
          animation: `hsPulse ${1.8+i*.3}s ease-in-out infinite`,
          animationDelay: `${i*.22}s`,
        }}/>
      ))}

      {/* Spotlight glow */}
      <div style={{
        position:'absolute', width: previewSize*2.2, height: previewSize*2.2,
        borderRadius:'50%',
        background: 'radial-gradient(circle, rgba(139,92,246,.18) 0%, transparent 70%)',
        top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        pointerEvents:'none',
      }}/>

      {/* Hero preview */}
      <div style={{ animation:'hsFloat 3s ease-in-out infinite', position:'relative', zIndex:2 }}>
        {loading
          ? <div style={{ width:previewSize, height:previewSize, borderRadius:'50%', background:'rgba(255,255,255,.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ fontSize:'2rem', animation:'hsSpin 1.2s linear infinite' }}>⭐</div>
            </div>
          : <HeroPreview config={config} size={previewSize} />
        }
      </div>

      {/* Character name badge */}
      <div style={{
        marginTop: 24, position:'relative', zIndex:2,
        background:'rgba(255,255,255,.1)', backdropFilter:'blur(12px)',
        border:'1.5px solid rgba(255,255,255,.2)', borderRadius:50,
        padding:'8px 22px', color:'#fff', fontWeight:800, fontSize:'1rem',
        textAlign:'center',
      }}>
        {charName} ✨
        <div style={{ fontSize:'.72rem', color:'rgba(255,255,255,.65)', fontWeight:600, marginTop:2 }}>
          {balance.toLocaleString()} نقطة ⭐
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        style={{
          marginTop:18, padding:'12px 36px', borderRadius:50,
          border:'none', cursor:'pointer',
          fontFamily:"'Cairo','Tajawal',sans-serif",
          fontWeight:900, fontSize:'1rem', color:'#fff',
          background: saved
            ? 'linear-gradient(135deg,#10B981,#059669)'
            : 'linear-gradient(90deg,#F59E0B 0%,#8B5CF6 50%,#3B82F6 100%)',
          backgroundSize: '200% auto',
          animation: saved ? 'hsBounce .5s ease' : 'hsShine 3s linear infinite',
          boxShadow: saved ? '0 6px 20px rgba(16,185,129,.5)' : '0 6px 28px rgba(139,92,246,.55)',
          transition:'all .3s', zIndex:2, position:'relative',
          transform: saved ? 'scale(1.06)' : 'none',
        }}
      >
        {saved ? '✅ تم الحفظ!' : '💾 احفظ مظهرك'}
      </button>

      <Link href="/dashboard" style={{ marginTop:14, color:'rgba(255,255,255,.45)', fontSize:'.8rem', textDecoration:'none', zIndex:2, position:'relative' }}>
        ← العودة للوحة الطالب
      </Link>
    </div>
  );

  /* ─── CONTROLS PANEL ─── */
  const panelRight = (
    <div style={{
      flex:1, overflowY:'auto',
      background:'linear-gradient(160deg,#f8faff 0%,#f0f4ff 100%)',
      padding: mobile ? '20px 16px' : '28px 26px',
      display:'flex', flexDirection:'column', gap:22,
    }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div>
          <div style={{ fontSize: mobile ? '1.3rem' : '1.6rem', fontWeight:900, color:'#1e293b', lineHeight:1.2 }}>
            🎭 استوديو الأبطال
          </div>
          <div style={{ fontSize:'.8rem', color:'#64748b', fontWeight:600 }}>صمّم شخصيتك الكرتونية</div>
        </div>
        <div style={{
          background:'linear-gradient(135deg,#fef3c7,#fde68a)',
          border:'1.5px solid #f59e0b', borderRadius:50,
          padding:'6px 16px', fontWeight:800, fontSize:'.88rem', color:'#92400e',
          whiteSpace:'nowrap', flexShrink:0,
          animation:'hsGlow 2.5s ease-in-out infinite',
        }}>
          ⭐ {balance.toLocaleString()}
        </div>
      </div>

      {/* Character Selector */}
      <div>
        <div style={{ fontWeight:800, color:'#374151', fontSize:'.9rem', marginBottom:10 }}>
          🦸 اختر بطلك
        </div>
        <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:6 }}>
          {CHARACTERS.map(char => {
            const isActive = config.base_seed === char.seed;
            return (
              <button
                key={char.id}
                onClick={() => selectCharacter(char)}
                style={{
                  flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                  background: isActive ? char.bg : 'rgba(255,255,255,.8)',
                  border: `2px solid ${isActive ? char.color : '#e2e8f0'}`,
                  borderRadius:16, padding:'8px 12px', cursor:'pointer',
                  transition:'all .2s', fontFamily:"'Cairo','Tajawal',sans-serif",
                  transform: isActive ? 'scale(1.08)' : 'none',
                  boxShadow: isActive ? `0 6px 20px ${char.color}40` : '0 2px 6px rgba(0,0,0,.06)',
                  animation: isActive ? 'hsBounce .4s ease' : 'none',
                }}
              >
                <div style={{ width:52, height:64, borderRadius:10, overflow:'hidden', border:`2px solid ${isActive ? 'rgba(255,255,255,.5)' : '#e2e8f0'}`, background: isActive ? 'rgba(0,0,0,.15)' : '#f1f5f9', position:'relative' }}>
                  <img
                    src={dicebearUrlFull(char.seed)}
                    alt={char.name}
                    style={{ width:52, height:64, objectFit:'contain' }}
                  />
                </div>
                <div style={{ fontSize:'.65rem', fontWeight:800, color: isActive ? '#fff' : '#374151', whiteSpace:'nowrap' }}>
                  {char.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category Tabs */}
      <div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {CATS.map(cat => {
            const isActive = activeCat === cat.id;
            const equippedInCat = config.equipped?.[cat.id];
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.id)}
                style={{
                  display:'flex', alignItems:'center', gap:4,
                  padding:'7px 14px', borderRadius:50, border:'none',
                  background: isActive ? cat.color : 'rgba(255,255,255,.8)',
                  color: isActive ? '#fff' : '#475569',
                  fontWeight:800, fontSize:'.78rem',
                  fontFamily:"'Cairo','Tajawal',sans-serif", cursor:'pointer',
                  transition:'all .2s',
                  boxShadow: isActive ? `0 4px 14px ${cat.color}45` : '0 1px 4px rgba(0,0,0,.06)',
                  transform: isActive ? 'scale(1.05)' : 'none',
                  position:'relative',
                }}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
                {equippedInCat && (
                  <span style={{ position:'absolute', top:-3, right:-3, width:9, height:9, borderRadius:'50%', background:'#10B981', border:'1.5px solid white' }}/>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Item Grid */}
      <div>
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(3, 1fr)',
          gap:10,
        }}>
          {catItems.map(item => {
            const isOwned    = owned.includes(item.id);
            const isEquipped = config.equipped?.[item.cat] === item.id;
            return (
              <ItemCard
                key={item.id}
                item={item}
                isOwned={isOwned}
                isEquipped={isEquipped}
                balance={balance}
                onBuy={()   => handleBuy(item)}
                onEquip={()  => handleEquip(item)}
                onUnequip={() => handleUnequip(item)}
                buying={buying}
              />
            );
          })}
        </div>
      </div>

      {/* Tip */}
      <div style={{
        background:'linear-gradient(135deg,#ede9fe,#f5f3ff)',
        border:'1.5px solid #c4b5fd', borderRadius:14,
        padding:'12px 16px', fontSize:'.78rem', color:'#5b21b6', fontWeight:600,
        lineHeight:1.8,
      }}>
        💡 <strong>تلميح:</strong> العب الألعاب واكسب النقاط لفتح إكسسوارات جديدة. كل فئة لها عنصر مرتدٍ واحد فقط — يمكنك التغيير في أي وقت!
      </div>
    </div>
  );

  return (
    <div style={{
      display:'flex', flexDirection: mobile ? 'column' : 'row',
      height: mobile ? 'auto' : '100vh',
      minHeight: mobile ? '100vh' : 'auto',
      fontFamily:"'Cairo','Tajawal',sans-serif",
      direction:'rtl', overflow: mobile ? 'auto' : 'hidden',
    }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', top:20, left:'50%', transform:'translateX(-50%)',
          background: toast.type==='err' ? '#DC2626' : toast.type==='info' ? '#3B82F6' : '#065F46',
          color:'#fff', padding:'10px 24px', borderRadius:50,
          fontWeight:800, fontSize:'.88rem', zIndex:9999, whiteSpace:'nowrap',
          boxShadow:'0 8px 28px rgba(0,0,0,.3)',
          animation:'hsFadeUp .28s ease',
        }}>{toast.msg}</div>
      )}

      {panelLeft}
      {panelRight}
    </div>
  );
}
