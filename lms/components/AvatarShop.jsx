'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

/* ── DiceBear URL params ─────────────────────────────────────────────────── */
/* Circle avatar (adventurer) — happy face + hair, for dashboard button */
const DB_ADV =
  '&eyes[]=variant01&eyes[]=variant04&eyes[]=variant06&eyes[]=variant09&eyes[]=variant10&eyes[]=variant11&eyes[]=variant14' +
  '&mouth[]=variant02&mouth[]=variant03&mouth[]=variant04&mouth[]=variant05' +
  '&hair[]=long01&hair[]=long02&hair[]=long04&hair[]=long05&hair[]=long06&hair[]=long07&hair[]=long08&hair[]=long09&hair[]=long10&hair[]=long11&hair[]=long12&hair[]=long13&hair[]=long14&hair[]=long15&hair[]=long16&hair[]=short01&hair[]=short02&hair[]=short03&hair[]=short05&hair[]=short07&hair[]=short09&hair[]=short10' +
  '&hairColor[]=0e0e0e&hairColor[]=3b1f0a&hairColor[]=6d4c41&hairColor[]=cc3f0c&hairColor[]=f5a623&hairColor[]=e91e8c&hairColor[]=9c27b0&hairColor[]=2196f3';

/* adventurer WITH background — for small circle avatar in dashboard */
export function dicebearUrl(seed) {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf${DB_ADV}`;
}

/* lorelei — stable portrait style (head + hair + shoulders), transparent bg */
export function dicebearUrlFull(seed) {
  return `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(seed)}`;
}

/* ── Inject animations once ─────────────────────────────────────────────── */
if (typeof document !== 'undefined' && !document.getElementById('av-shop-anim')) {
  const s = document.createElement('style');
  s.id = 'av-shop-anim';
  s.textContent = `
    @keyframes avFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
    @keyframes hsFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  `;
  document.head.appendChild(s);
}

/* ══════════════════════════════════════════════════════════════════════════
   All item overlays — keyed by item ID, render function receives avatar size
══════════════════════════════════════════════════════════════════════════ */
const OV = {

  /* ──── HALOS ──── */
  star_halo: (sz) => (
    <svg key="sh" style={{ position:'absolute', top:-sz*.30, left:-sz*.12, width:sz*1.24, height:sz*.50, pointerEvents:'none', overflow:'visible', zIndex:5 }} viewBox="0 0 124 50">
      <defs><filter id="sh-g2"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <polygon points="62,4 66.5,17 80,17 69.5,25 73,38 62,30 51,38 54.5,25 44,17 57.5,17" fill="#FFD700" filter="url(#sh-g2)"/>
      <polygon points="23,13 25.5,21 34,21 27.5,25.5 30,33 23,29 16,33 18.5,25.5 12,21 20.5,21" fill="#FBBF24" opacity=".9"/>
      <polygon points="101,13 103.5,21 112,21 105.5,25.5 108,33 101,29 94,33 96.5,25.5 90,21 98.5,21" fill="#FBBF24" opacity=".9"/>
      <circle cx="42" cy="5" r="2.5" fill="#FFD700" opacity=".75"/><circle cx="82" cy="5" r="2.5" fill="#FFD700" opacity=".75"/>
    </svg>
  ),

  rainbow_halo: (sz) => (
    <svg key="rh" style={{ position:'absolute', top:-sz*.36, left:-sz*.14, width:sz*1.28, height:sz*.38, pointerEvents:'none', overflow:'visible', zIndex:5 }} viewBox="0 0 128 38">
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
    <svg key="fc" style={{ position:'absolute', top:-sz*.32, left:-sz*.10, width:sz*1.20, height:sz*.42, pointerEvents:'none', overflow:'visible', zIndex:5 }} viewBox="0 0 120 42">
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
    <svg key="grad" style={{ position:'absolute', top:-sz*.16, left:-sz*.11, width:sz*1.22, height:sz*.60, pointerEvents:'none', overflow:'visible', zIndex:6 }} viewBox="0 0 122 60">
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
    <svg key="gc" style={{ position:'absolute', top:-sz*.16, left:-sz*.06, width:sz*1.12, height:sz*.54, pointerEvents:'none', overflow:'visible', zIndex:6 }} viewBox="0 0 112 54">
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
    <svg key="wiz" style={{ position:'absolute', top:-sz*.45, left:-sz*.13, width:sz*1.26, height:sz*.84, pointerEvents:'none', overflow:'visible', zIndex:6 }} viewBox="0 0 126 84">
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
    <svg key="nb" style={{ position:'absolute', top:sz*.22, left:-sz*.06, width:sz*1.12, height:sz*.32, pointerEvents:'none', overflow:'visible', zIndex:6 }} viewBox="0 0 112 32">
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
    <svg key="ph" style={{ position:'absolute', top:-sz*.24, left:-sz*.08, width:sz*1.16, height:sz*.52, pointerEvents:'none', overflow:'visible', zIndex:6 }} viewBox="0 0 116 52">
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
    </svg>
  ),

  /* ──── GLASSES ──── */
  smart_glasses: (sz) => (
    <svg key="sg" style={{ position:'absolute', top:sz*.33, left:-sz*.07, width:sz*1.14, height:sz*.42, pointerEvents:'none', overflow:'visible', zIndex:7 }} viewBox="0 0 114 42">
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
    <svg key="rg" style={{ position:'absolute', top:sz*.30, left:-sz*.08, width:sz*1.16, height:sz*.45, pointerEvents:'none', overflow:'visible', zIndex:7 }} viewBox="0 0 116 45">
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
    <svg key="hg" style={{ position:'absolute', top:sz*.28, left:-sz*.09, width:sz*1.18, height:sz*.46, pointerEvents:'none', overflow:'visible', zIndex:7 }} viewBox="0 0 118 46">
      <defs>
        <linearGradient id="hg-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbcfe8"/><stop offset="100%" stopColor="#f9a8d4" stopOpacity=".6"/></linearGradient>
        <filter id="hg-glow"><feGaussianBlur stdDeviation="1.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <path d="M30,36 C10,36 4,20 4,14 C4,6 10,4 16,4 C22,4 28,10 30,14 C32,10 38,4 44,4 C50,4 56,6 56,14 C56,20 50,36 30,36 Z" fill="url(#hg-g)" stroke="#DB2777" strokeWidth="2.2" filter="url(#hg-glow)"/>
      <path d="M88,36 C68,36 62,20 62,14 C62,6 68,4 74,4 C80,4 86,10 88,14 C90,10 96,4 102,4 C108,4 114,6 114,14 C114,20 108,36 88,36 Z" fill="url(#hg-g)" stroke="#DB2777" strokeWidth="2.2" filter="url(#hg-glow)"/>
      <path d="M56 20 Q59 14 62 20" fill="none" stroke="#DB2777" strokeWidth="2" strokeLinecap="round"/>
      <line x1="0"   y1="20" x2="4"   y2="24" stroke="#DB2777" strokeWidth="2" strokeLinecap="round"/>
      <line x1="118" y1="20" x2="114" y2="24" stroke="#DB2777" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),

  /* ──── SCARVES ──── */
  hero_scarf: (sz) => (
    <svg key="sc" style={{ position:'absolute', top:sz*.68, left:-sz*.14, width:sz*1.28, height:sz*.55, pointerEvents:'none', overflow:'visible', zIndex:4 }} viewBox="0 0 128 55">
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
    <svg key="bt" style={{ position:'absolute', top:sz*.70, left:sz*.06, width:sz*.88, height:sz*.36, pointerEvents:'none', overflow:'visible', zIndex:4 }} viewBox="0 0 88 36">
      <defs>
        <radialGradient id="bt-gl" cx="50%" cy="50%" r="70%"><stop offset="0%" stopColor="#F9A8D4"/><stop offset="100%" stopColor="#DB2777"/></radialGradient>
        <filter id="bt-sh"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#831843" floodOpacity=".3"/></filter>
      </defs>
      <path d="M44 18 L6 2 Q2 0 2 4 L2 32 Q2 36 6 34 Z" fill="url(#bt-gl)" filter="url(#bt-sh)"/>
      <path d="M44 18 L82 2 Q86 0 86 4 L86 32 Q86 36 82 34 Z" fill="url(#bt-gl)" filter="url(#bt-sh)"/>
      <circle cx="44" cy="18" r="7" fill="#DB2777"/>
      <circle cx="44" cy="18" r="5" fill="#EC4899"/>
      <circle cx="42" cy="15" r="2.5" fill="#FDE7F3" opacity=".6"/>
    </svg>
  ),

  medal: (sz) => (
    <svg key="med" style={{ position:'absolute', top:sz*.58, left:sz*.28, width:sz*.44, height:sz*.58, pointerEvents:'none', overflow:'visible', zIndex:4 }} viewBox="0 0 44 58">
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

  /* ──── COMPANIONS (float to the right) ──── */
  mini_star_pet: (sz) => (
    <svg key="msp" style={{ position:'absolute', top:sz*.25, left:sz*.82, width:sz*.50, height:sz*.50, pointerEvents:'none', overflow:'visible', zIndex:8, animation:'hsFloat 2.2s ease-in-out infinite' }} viewBox="0 0 50 50">
      <defs><filter id="sp-glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <polygon points="25,4 29,17 43,17 32,25 36,38 25,30 14,38 18,25 7,17 21,17" fill="#FCD34D" filter="url(#sp-glow)"/>
      <circle cx="20" cy="22" r="2.5" fill="#1F2937"/>
      <circle cx="30" cy="22" r="2.5" fill="#1F2937"/>
      <circle cx="21" cy="20.5" r="1" fill="white"/>
      <circle cx="31" cy="20.5" r="1" fill="white"/>
      <path d="M20 28 Q25 32 30 28" fill="none" stroke="#1F2937" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),

  baby_cat: (sz) => (
    <svg key="bc" style={{ position:'absolute', top:sz*.30, left:sz*.80, width:sz*.55, height:sz*.55, pointerEvents:'none', overflow:'visible', zIndex:8, animation:'hsFloat 2.8s ease-in-out infinite' }} viewBox="0 0 55 55">
      <defs><filter id="cat-sh"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity=".2"/></filter></defs>
      <path d="M8 18 L4 4 L18 12 Z" fill="#FB923C" filter="url(#cat-sh)"/>
      <path d="M47 18 L51 4 L37 12 Z" fill="#FB923C" filter="url(#cat-sh)"/>
      <circle cx="27" cy="32" r="22" fill="#FED7AA" filter="url(#cat-sh)"/>
      <circle cx="20" cy="30" r="5" fill="#1F2937"/>
      <circle cx="34" cy="30" r="5" fill="#1F2937"/>
      <circle cx="21.5" cy="28.5" r="2" fill="white"/>
      <circle cx="35.5" cy="28.5" r="2" fill="white"/>
      <ellipse cx="27" cy="37" rx="5" ry="3.5" fill="#F9A8D4"/>
      <path d="M27 40 L27 44" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M14 37 Q10 35 8 38" fill="none" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M40 37 Q44 35 46 38" fill="none" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),

  baby_dragon: (sz) => (
    <svg key="bd" style={{ position:'absolute', top:sz*.15, left:sz*.75, width:sz*.65, height:sz*.65, pointerEvents:'none', overflow:'visible', zIndex:8, animation:'hsFloat 3.2s ease-in-out infinite' }} viewBox="0 0 65 65">
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
      <path d="M26 42 Q32 48 38 42" fill="none" stroke="#15803D" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
};

/* ── Background renderer ─────────────────────────────────────────────────── */
function renderBg(id, sz) {
  if (id === 'space_bg') return (
    <svg key="sbg" style={{ position:'absolute', top:-sz*.15, left:-sz*.15, width:sz*1.3, height:sz*1.3, zIndex:0, borderRadius:'50%', overflow:'hidden' }} viewBox="0 0 130 130">
      <defs><radialGradient id="sp-bg" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#1E1B4B"/><stop offset="100%" stopColor="#0F0A1A"/></radialGradient></defs>
      <circle cx="65" cy="65" r="65" fill="url(#sp-bg)"/>
      {[[15,20],[40,8],[80,15],[110,30],[20,60],[100,55],[55,100],[30,90],[90,80],[120,70],[65,40],[45,45]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={i%3===0?2:1.2} fill="white" opacity={.4+i*.05}/>
      ))}
      <circle cx="95" cy="25" r="8" fill="none" stroke="#4338CA" strokeWidth="2" opacity=".5"/>
      <circle cx="95" cy="25" r="5" fill="#312E81" opacity=".7"/>
    </svg>
  );
  if (id === 'forest_bg') return (
    <svg key="fbg" style={{ position:'absolute', top:-sz*.15, left:-sz*.15, width:sz*1.3, height:sz*1.3, zIndex:0, borderRadius:'50%', overflow:'hidden' }} viewBox="0 0 130 130">
      <defs><radialGradient id="fo-bg" cx="50%" cy="30%" r="70%"><stop offset="0%" stopColor="#6EE7B7"/><stop offset="60%" stopColor="#059669"/><stop offset="100%" stopColor="#064E3B"/></radialGradient></defs>
      <circle cx="65" cy="65" r="65" fill="url(#fo-bg)"/>
      <polygon points="65,15 85,55 45,55" fill="#065F46" opacity=".7"/>
      <polygon points="30,40 48,75 12,75" fill="#065F46" opacity=".6"/>
      <polygon points="100,40 118,75 82,75" fill="#065F46" opacity=".6"/>
      <rect x="60" y="55" width="10" height="20" rx="3" fill="#78350F" opacity=".7"/>
    </svg>
  );
  if (id === 'sunset_bg') return (
    <svg key="ssbg" style={{ position:'absolute', top:-sz*.15, left:-sz*.15, width:sz*1.3, height:sz*1.3, zIndex:0, borderRadius:'50%', overflow:'hidden' }} viewBox="0 0 130 130">
      <defs>
        <radialGradient id="ss-bg" cx="50%" cy="70%" r="80%"><stop offset="0%" stopColor="#FED7AA"/><stop offset="50%" stopColor="#FB923C"/><stop offset="100%" stopColor="#C2410C"/></radialGradient>
        <radialGradient id="ss-sun" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#FEF08A"/><stop offset="100%" stopColor="#F59E0B"/></radialGradient>
      </defs>
      <circle cx="65" cy="65" r="65" fill="url(#ss-bg)"/>
      <circle cx="65" cy="48" r="20" fill="url(#ss-sun)" opacity=".9"/>
      <path d="M0,95 Q20,85 40,90 Q60,95 80,85 Q100,75 130,85 L130,130 L0,130 Z" fill="#7C2D12" opacity=".5"/>
    </svg>
  );
  return null;
}

/* ══════════════════════════════════════════════════════════════════════════
   AvatarWithAccessory — exported for use throughout the app
   - `equipped`: object { hat, glasses, scarf, halo, companion, background }
   - `equippedId`: legacy single-item string (backward compat)
══════════════════════════════════════════════════════════════════════════ */
export function AvatarWithAccessory({ name, avatarURL, equipped = {}, equippedId, size = 90, seed }) {
  /* Support both new multi-category object and legacy single-item string */
  const eq = (equipped && Object.values(equipped).some(Boolean))
    ? equipped
    : equippedId
      ? { hat: equippedId }
      : {};

  const avatarSeed  = seed || name || 'student';
  const url = dicebearUrl(avatarSeed);

  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0, overflow:'visible' }}>
      {/* Background layer */}
      {eq.background && renderBg(eq.background, size)}
      {/* Circle-clipped avatar */}
      <div style={{
        position:'absolute', width:size, height:size,
        borderRadius:'50%', overflow:'hidden', zIndex:1,
        background:'linear-gradient(135deg,#dbeafe,#ede9fe)',
        boxShadow:`0 3px 14px rgba(26,43,74,.28)`,
      }}>
        {avatarURL ? (
          <Image src={avatarURL} alt="" width={size} height={size} style={{ objectFit:'cover', display:'block' }}/>
        ) : (
          <img
            src={url}
            alt=""
            style={{ position:'absolute', width:size*1.35, height:size*1.35, top:-size*0.05, left:-size*0.18 }}
          />
        )}
      </div>
      {/* Accessories — rendered outside clip div to allow overflow */}
      {eq.scarf     && OV[eq.scarf]?.(size)}
      {eq.halo      && OV[eq.halo]?.(size)}
      {eq.hat       && OV[eq.hat]?.(size)}
      {eq.glasses   && OV[eq.glasses]?.(size)}
      {eq.companion && OV[eq.companion]?.(size)}
    </div>
  );
}

/* ── model-viewer script loader (shared with heroes-studio) ─────────────── */
function loadMvScript() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('script[data-mv]')) return;
  const s = document.createElement('script');
  s.type = 'module';
  s.src = '/vendor/model-viewer.min.js'; // مستضاف ذاتياً — لا اعتماد على CDN خارجي
  s.dataset.mv = '1';
  document.head.appendChild(s);
}

/* ══════════════════════════════════════════════════════════════════════════
   AvatarShop — small trigger card in the dashboard header
   When a 3D hero is saved: shows the preview image (emoji SVG) — no extra
   model-viewer here because DashboardHero3D already renders the full 3D hero.
   Otherwise: falls back to DiceBear 2D avatar.
══════════════════════════════════════════════════════════════════════════ */
export default function AvatarShop({ user, displayName }) {
  const [cfg, setCfg] = useState(null);

  const userId    = user?.id ?? null;
  const userAvURL = user?.user_metadata?.avatar_url ?? null;

  useEffect(() => {
    fetch('/api/hero-config')
      .then(r => r.json())
      .then(d => setCfg(d))
      .catch(() => {});
  }, []);

  const previewUrl = cfg?.preview_url ?? null;
  const equipped   = cfg?.equipped    ?? {};
  const baseSeed   = cfg?.base_seed   ?? null;
  const seed       = baseSeed || userId;
  const is3D       = cfg?.avatar_url?.endsWith?.('.glb');

  return (
    <Link
      href="/dashboard/heroes-studio"
      style={{
        display:'flex', flexDirection:'column', alignItems:'center', gap:4,
        background:'linear-gradient(160deg,#4f46e5 0%,#7c3aed 55%,#9333ea 100%)',
        color:'#fff', border:'2px solid rgba(255,255,255,.22)', borderRadius:22,
        padding:'8px 16px 12px', cursor:'pointer',
        fontFamily:"'Cairo','Tajawal',sans-serif",
        boxShadow:'0 6px 28px rgba(99,102,241,.5)',
        transition:'transform .2s, box-shadow .2s',
        animation:'avFloat 3s ease-in-out infinite',
        minWidth:110, textDecoration:'none',
        overflow:'visible',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px) scale(1.04)';
        e.currentTarget.style.boxShadow = '0 10px 36px rgba(99,102,241,.7)';
        e.currentTarget.style.animation = 'none';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 6px 28px rgba(99,102,241,.5)';
        e.currentTarget.style.animation = 'avFloat 3s ease-in-out infinite';
      }}
    >
      {/* ── Avatar display ── */}
      {is3D && previewUrl ? (
        /* Preview image (emoji SVG) — lightweight, no duplicate model-viewer */
        <img
          src={previewUrl}
          alt=""
          style={{ width:72, height:72, borderRadius:'50%', objectFit:'cover', display:'block' }}
        />
      ) : (
        /* 2D DiceBear fallback */
        <div style={{ overflow:'visible', position:'relative' }}>
          <AvatarWithAccessory
            name={displayName} avatarURL={userAvURL}
            equipped={equipped} size={72} seed={seed}
          />
        </div>
      )}

      <div style={{ fontSize:'.72rem', fontWeight:800, opacity:.9, marginTop:4, whiteSpace:'nowrap' }}>
        🎨 استوديو الأبطال
      </div>
      {is3D ? (
        <div style={{
          fontSize:'.62rem', fontWeight:700,
          background:'rgba(255,255,255,.2)', borderRadius:30,
          padding:'2px 8px', whiteSpace:'nowrap',
        }}>
          ✨ بطل 3D
        </div>
      ) : (
        <div style={{ fontSize:'.6rem', opacity:.65 }}>اضغط لزيّن شخصيتك</div>
      )}
    </Link>
  );
}
