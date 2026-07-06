'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

/* ─────────────────────────────── Tokens ─────────────────────────────── */
const C = {
  primary:   '#1a3a6b',
  primary2:  '#185FA5',
  primaryLt: '#e8f0fb',
  accent:    '#c9952a',
  accentLt:  '#fef3c7',
  green:     '#25D366',
  text:      '#1e293b',
  muted:     '#64748b',
  border:    '#e2e8f0',
  bg:        '#f8fafc',
};
const WA = 'https://api.whatsapp.com/send/?phone=447400755914&text&type=phone_number&app_absent=0';

/* ─────────────────────────────── Keyframes ──────────────────────────── */
const KF = `
@keyframes fadeIn   { from{opacity:0} to{opacity:1} }
@keyframes slideUp  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
@keyframes spin     { to{transform:rotate(360deg)} }
@keyframes pricePop { 0%{transform:scale(0) rotate(-15deg);opacity:0} 70%{transform:scale(1.15) rotate(4deg);opacity:1} 100%{transform:scale(1) rotate(0);opacity:1} }
@keyframes heroWave { 0%,100%{opacity:.55} 50%{opacity:.9} }
@keyframes badgePulse { 0%,100%{box-shadow:0 0 0 0 rgba(201,149,42,.5)} 60%{box-shadow:0 0 0 7px rgba(201,149,42,0)} }

/* Preview banner */
.prev-banner{position:fixed;top:0;left:0;right:0;z-index:9999;background:linear-gradient(90deg,#f59e0b,#d97706);color:#fff;
  text-align:center;padding:8px 16px;font-size:.82rem;font-weight:700;direction:rtl;letter-spacing:.3px;}

/* Navbar */
.pnav{position:sticky;top:38px;left:0;right:0;z-index:900;background:${C.primary};
  box-shadow:0 2px 12px rgba(0,0,0,.2);}
.pnav-inner{max-width:1200px;margin:0 auto;padding:0 20px;
  display:flex;align-items:center;justify-content:space-between;height:64px;gap:12px;}
.pnav-brand{display:flex;align-items:center;gap:10px;text-decoration:none;}
.pnav-brand-logo{width:40px;height:40px;background:rgba(255,255,255,.18);border-radius:50%;
  display:flex;align-items:center;justify-content:center;font-size:1.3rem;}
.pnav-brand-name{color:#fff;font-weight:800;font-size:1rem;}
.pnav-spacer{flex:1;}
.pnav-about{color:rgba(255,255,255,.78);text-decoration:none;font-size:.88rem;font-weight:600;
  transition:.2s;white-space:nowrap;}
.pnav-about:hover{color:#fff;}
.pnav-socials{display:flex;gap:8px;align-items:center;border-left:1px solid rgba(255,255,255,.18);padding-left:16px;}
.pnav-social-btn{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.12);
  display:flex;align-items:center;justify-content:center;color:#fff;transition:.2s;border:none;cursor:pointer;}
.pnav-social-btn:hover{background:var(--hover-bg,rgba(255,255,255,.28));transform:scale(1.12);}
.pnav-cta{display:inline-flex;align-items:center;gap:7px;background:${C.accent};
  color:#fff;font-weight:800;font-size:.88rem;padding:9px 18px;border-radius:10px;
  border:none;cursor:pointer;font-family:inherit;min-height:44px;min-width:44px;
  transition:filter .2s,transform .15s;white-space:nowrap;}
.pnav-cta:hover{filter:brightness(1.1);transform:translateY(-1px);}
.pnav-lang{background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.3);
  border-radius:8px;color:#fff;font-weight:700;font-size:.8rem;padding:5px 10px;
  cursor:pointer;font-family:inherit;transition:.2s;}
.pnav-lang:hover{background:rgba(255,255,255,.24);}

/* Contact strip */
.pstrip{background:${C.primary};border-top:1px solid rgba(255,255,255,.15);}
.pstrip-inner{max-width:1200px;margin:0 auto;padding:8px 20px;
  display:flex;align-items:center;justify-content:center;gap:10px;
  color:rgba(255,255,255,.85);font-size:.83rem;font-weight:600;}
.pstrip-wa{display:inline-flex;align-items:center;gap:7px;color:#fff;
  font-weight:700;text-decoration:none;background:rgba(37,211,102,.25);
  border:1px solid rgba(37,211,102,.5);border-radius:20px;padding:5px 14px;
  font-size:.84rem;transition:background .2s;}
.pstrip-wa:hover{background:rgba(37,211,102,.42);}

/* Hero */
.phero{background:linear-gradient(140deg,${C.primary} 0%,${C.primary2} 100%);
  padding:80px 0 0;position:relative;overflow:hidden;min-height:520px;
  display:flex;align-items:center;}
.phero-inner{max-width:1200px;margin:0 auto;padding:0 20px;
  display:flex;gap:48px;align-items:center;flex-wrap:wrap;width:100%;}
.phero-content{flex:1 1 320px;min-width:0;text-align:right;}
.phero-content h1{font-size:clamp(2rem,4vw,2.8rem);font-weight:900;color:#fff;
  margin-bottom:16px;line-height:1.2;}
.phero-content p{color:rgba(255,255,255,.82);font-size:1.05rem;line-height:1.8;margin-bottom:28px;}
.phero-img{flex:0 1 400px;min-width:240px;}
.phero-img img{width:100%;border-radius:16px;display:block;
  box-shadow:0 8px 32px rgba(0,0,0,.25);}
.phero-wave{display:block;width:100%;margin-top:40px;}

/* Btn accent */
.btn-accent{display:inline-flex;align-items:center;gap:8px;background:${C.accent};
  color:#fff;font-weight:800;font-size:1rem;padding:13px 26px;border-radius:12px;
  text-decoration:none;border:2px solid rgba(0,0,0,.08);min-height:44px;
  box-shadow:0 4px 14px rgba(201,149,42,.3);transition:filter .2s,transform .15s;}
.btn-accent:hover{filter:brightness(1.1);transform:translateY(-2px);}

/* Features */
.pfeatures{padding:80px 0;background:#fff;}
.pfeatures-inner{max-width:1200px;margin:0 auto;padding:0 20px;}
.pfeatures h2{text-align:center;font-size:1.9rem;font-weight:900;color:${C.primary};margin-bottom:8px;}
.pfeatures-sub{text-align:center;color:${C.muted};margin-bottom:48px;font-size:.97rem;}
.feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
@media(max-width:900px){.feat-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:600px){.feat-grid{grid-template-columns:1fr;}}
.feat-card{background:#fff;border-radius:16px;padding:24px;
  border:2px solid ${C.border};
  box-shadow:0 2px 12px rgba(0,0,0,.07);
  transition:transform .2s,box-shadow .2s;}
.feat-card:hover{transform:translateY(-3px);box-shadow:0 6px 24px rgba(0,0,0,.1);}
.feat-card.highlight{border-color:${C.primary};}
.feat-icon{width:52px;height:52px;border-radius:14px;background:${C.primaryLt};
  display:flex;align-items:center;justify-content:center;margin-bottom:16px;}
.feat-card h3{font-size:1rem;font-weight:800;color:${C.primary};margin-bottom:8px;}
.feat-card p{font-size:.88rem;color:#475569;line-height:1.7;}

/* Pricing */
.ppricing{background:linear-gradient(160deg,#f0f4fc 0%,#fafbff 60%,#f0f0f0 100%);
  padding:80px 0;position:relative;}
.ppricing-inner{max-width:1100px;margin:0 auto;padding:0 20px;}
.ppricing h2{text-align:center;font-size:1.9rem;font-weight:900;color:${C.primary};margin-bottom:8px;}
.ppricing-sub{text-align:center;color:${C.muted};margin-bottom:36px;font-size:.97rem;}
.price-toggle-row{display:flex;align-items:center;justify-content:center;gap:20px;
  flex-wrap:wrap;margin-bottom:36px;}
.price-toggle{display:flex;align-items:center;gap:10px;}
.toggle-label{font-weight:600;font-size:.9rem;}
.toggle-btn{width:52px;height:28px;border-radius:99px;border:none;cursor:pointer;
  position:relative;transition:background .25s;}
.toggle-thumb{position:absolute;top:3px;width:22px;height:22px;border-radius:50%;
  background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2);transition:inset-inline-start .25s;}
.price-currency select{appearance:none;-webkit-appearance:none;background:#fff;
  border:2px solid ${C.border};border-radius:50px;padding:6px 32px 6px 14px;
  font-size:.88rem;font-weight:700;color:${C.text};cursor:pointer;font-family:inherit;}
.price-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:780px;margin:0 auto;}
@media(max-width:600px){.price-grid{grid-template-columns:1fr;}}
.price-card{background:#fff;border-radius:20px;padding:28px 24px 24px;
  display:flex;flex-direction:column;position:relative;
  box-shadow:0 4px 20px rgba(0,0,0,.07),4px 4px 0 rgba(0,0,0,.05);}
.price-card.popular{box-shadow:0 8px 32px rgba(24,95,165,.18),6px 6px 0 rgba(24,95,165,.12);}
.price-badge{position:absolute;top:-16px;inset-inline-end:20px;
  width:62px;height:62px;border-radius:50%;display:flex;flex-direction:column;
  align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.4);
  box-shadow:3px 3px 0 rgba(0,0,0,.18);animation:pricePop .5s cubic-bezier(.17,.67,.35,1.3) both;
  color:#fff;}
.popular-tag{position:absolute;top:-12px;inset-inline-start:20px;
  color:#fff;border-radius:20px;padding:3px 12px;font-size:.73rem;font-weight:800;
  border:2px solid rgba(255,255,255,.5);box-shadow:2px 2px 0 rgba(0,0,0,.12);
  animation:badgePulse 2s ease infinite;}
.price-name{font-weight:900;font-size:1.2rem;color:#1a1a2e;margin-bottom:18px;}
.price-features{display:flex;flex-direction:column;gap:8px;flex:1;margin-bottom:20px;}
.price-feat-row{display:flex;align-items:center;gap:8px;padding:7px 10px;
  background:#f8fafc;border-radius:8px;border:1.5px solid ${C.border};}
.check-ico{width:20px;height:20px;border-radius:6px;display:inline-flex;
  align-items:center;justify-content:center;color:#fff;font-size:.72rem;
  font-weight:900;flex-shrink:0;}
.price-btn{display:block;width:100%;padding:11px 16px;font-weight:800;font-size:.9rem;
  border-radius:12px;text-align:center;text-decoration:none;border:2px solid rgba(0,0,0,.1);
  box-shadow:4px 4px 0 rgba(0,0,0,.08);color:#fff;cursor:pointer;font-family:inherit;
  min-height:44px;transition:filter .2s;}
.price-btn:hover{filter:brightness(1.1);}

/* About */
.pabout{background:#f0f6ff;padding:80px 0;}
.pabout-inner{max-width:1200px;margin:0 auto;padding:0 20px;
  display:flex;gap:52px;align-items:center;flex-wrap:wrap;}
.pabout-text{flex:1 1 340px;min-width:0;text-align:right;}
.pabout-text h2{font-size:1.75rem;font-weight:800;color:${C.primary};margin-bottom:8px;}
.pabout-text .motto{font-size:1rem;font-weight:700;color:#1a3a5c;margin-bottom:20px;}
.pabout-text p{line-height:2;color:#2d3748;font-size:1rem;margin-bottom:16px;}
.pabout-video{flex:0 1 380px;min-width:260px;}
.pabout-video-placeholder{background:${C.primaryLt};border-radius:16px;
  aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;
  font-size:3rem;color:${C.primary2};border:2px dashed ${C.border};}

/* FAQ placeholder */
.pfaq{background:#fff;padding:80px 0;}
.pfaq-inner{max-width:800px;margin:0 auto;padding:0 20px;text-align:center;}
.pfaq h2{font-size:1.8rem;font-weight:900;color:${C.primary};margin-bottom:8px;}

/* Footer */
.pfooter{background:#0e3d70;color:rgba(255,255,255,.55);text-align:center;
  padding:22px;font-size:.88rem;}
.pfooter-teacher{margin-top:10px;font-size:.82rem;}
.pfooter-teacher a{color:rgba(255,255,255,.65);text-decoration:underline;margin:0 6px;
  transition:color .2s;}
.pfooter-teacher a:hover{color:#fff;}

/* Floating sidebar */
.pfsr{position:fixed;inset-block:50%;transform:translateY(-50%);
  inset-inline-end:0;display:flex;flex-direction:column;gap:2px;z-index:800;}
@media(max-width:767px){.pfsr{display:none;}}
.pfsr-item{display:flex;flex-direction:column;align-items:center;gap:4px;
  padding:12px 10px;cursor:pointer;color:#fff;border:none;font-family:inherit;
  font-size:.67rem;font-weight:700;min-width:60px;min-height:64px;
  transition:opacity .2s,transform .2s;text-decoration:none;}
.pfsr-item:hover{opacity:.9;transform:translateX(-3px);}
.pfsr-icon{font-size:1.3rem;line-height:1;}

/* Login Modal */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);
  backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
  display:flex;align-items:center;justify-content:center;
  z-index:1000;padding:16px;animation:fadeIn .2s ease;}
.modal-box{background:#fff;border-radius:20px;width:100%;max-width:420px;
  overflow:hidden;animation:slideUp .25s ease;box-shadow:0 24px 64px rgba(0,0,0,.22);}
.modal-hdr{background:linear-gradient(135deg,${C.primary} 0%,${C.primary2} 100%);
  padding:22px 24px 18px;}
.modal-hdr-row{display:flex;align-items:center;gap:10px;}
.modal-hdr-icon{width:44px;height:44px;background:rgba(255,255,255,.15);
  border-radius:12px;display:flex;align-items:center;justify-content:center;
  font-size:1.5rem;}
.modal-hdr-title{color:#fff;font-weight:800;font-size:1.05rem;}
.modal-hdr-sub{color:rgba(255,255,255,.72);font-size:.78rem;}
.modal-close{position:absolute;top:14px;inset-inline-end:14px;background:rgba(255,255,255,.18);
  border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;
  font-size:1.1rem;display:flex;align-items:center;justify-content:center;}
.modal-tabs{display:grid;grid-template-columns:1fr 1fr;background:${C.primaryLt};
  padding:6px;gap:4px;}
.modal-tab{padding:10px 0;border-radius:10px;border:none;cursor:pointer;
  font-family:inherit;font-weight:700;font-size:.9rem;transition:.2s;}
.modal-tab.active{background:#fff;color:${C.primary2};
  box-shadow:0 2px 10px rgba(24,95,165,.14);}
.modal-tab.inactive{background:transparent;color:#6b7280;}
.modal-body{padding:22px 24px 24px;}
.form-grp{margin-bottom:14px;}
.form-lbl{display:block;font-size:.85rem;font-weight:700;color:${C.primary};margin-bottom:6px;}
.form-ico{position:relative;}
.form-ico-span{position:absolute;right:12px;top:50%;transform:translateY(-50%);
  font-size:1rem;pointer-events:none;}
.form-inp{width:100%;padding:10px 12px;border:2px solid ${C.border};border-radius:10px;
  font-family:inherit;font-size:.95rem;color:${C.text};outline:none;box-sizing:border-box;
  transition:border-color .2s;}
.form-inp:focus{border-color:${C.primary2};}
.form-inp.with-ico{padding-right:38px;}
.form-row-between{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.form-forgot{font-size:.82rem;color:${C.primary2};text-decoration:none;}
.btn-primary{display:flex;align-items:center;justify-content:center;
  width:100%;padding:11px 16px;background:${C.primary2};color:#fff;
  font-weight:800;font-size:.95rem;border-radius:10px;border:none;cursor:pointer;
  font-family:inherit;min-height:44px;transition:filter .2s;margin-top:8px;}
.btn-primary:hover{filter:brightness(1.1);}
.divider{display:flex;align-items:center;gap:10px;margin:16px 0;color:#9ca3af;font-size:.85rem;}
.divider-line{flex:1;height:1px;background:${C.border};}
.google-btn{display:flex;align-items:center;justify-content:center;gap:10px;
  width:100%;padding:11px 16px;margin-bottom:18px;background:#fff;
  border:1.5px solid #dadce0;border-radius:10px;cursor:pointer;font-size:1rem;
  font-family:inherit;font-weight:600;color:#3c4043;min-height:44px;
  box-shadow:0 1px 3px rgba(0,0,0,.08);transition:box-shadow .15s;}
.google-btn:hover{box-shadow:0 2px 8px rgba(0,0,0,.18);}
.form-note{font-size:.78rem;color:#888;text-align:center;margin-top:14px;}
.form-code-note{font-size:.78rem;color:#888;margin-top:4px;}
.form-code-note a{color:#1a7c40;font-weight:700;}

/* Supervisor Modal */
.sup-modal-hdr{background:linear-gradient(135deg,${C.primary},${C.primary2});
  padding:18px 20px;display:flex;align-items:center;justify-content:space-between;}
.sup-modal-title{color:#fff;font-weight:800;font-size:1rem;}
.sup-modal-sub{color:rgba(255,255,255,.72);font-size:.78rem;margin-top:2px;}
.sup-modal-body{padding:18px 20px 20px;}
.sup-modal-close{background:rgba(255,255,255,.18);border:none;color:#fff;
  width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:1.1rem;
  display:flex;align-items:center;justify-content:center;}
`;

/* ─────────────────────────────── Icons ─────────────────────────────── */
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function WaIcon({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} style={{ flexShrink: 0 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

/* بديل أيقونة الجوال → متعدد الأجهزة */
function DevicesIcon({ size = 28, color = C.primary2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="14" height="10" rx="1.5"/>
      <path d="M16 8h4a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-4"/>
      <line x1="9" y1="13" x2="9" y2="17"/>
      <line x1="6" y1="17" x2="12" y2="17"/>
      <line x1="19" y1="12" x2="19" y2="15"/>
    </svg>
  );
}

/* بديل أيقونة الكرة الأرضية → أشخاص متعددون */
function UsersIcon({ size = 28, color = C.primary2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}

function TargetIcon({ size = 28, color = C.primary2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  );
}

function ChartIcon({ size = 28, color = C.primary2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6"  y1="20" x2="6"  y2="14"/>
      <line x1="2"  y1="20" x2="22" y2="20"/>
    </svg>
  );
}

function LockIcon({ size = 28, color = C.primary2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

function ZapIcon({ size = 28, color = C.primary2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
}

/* ─────────────────────────────── Data ─────────────────────────────── */
const FEATURES = [
  { id: 'diag',    title: 'تقييم تشخيصي ذكي',       desc: 'قياس مستوى الطالب في القراءة والكتابة والاستماع والتحدث عبر 10 تدريبات تشخيصية متنوعة.', Icon: TargetIcon, highlight: true },
  { id: 'rep',     title: 'تقارير تفصيلية',           desc: 'تقارير تفصيلية فورية تُرسل تلقائياً لولي الأمر لمتابعة مستوى الطالب وتطوره أولاً بأول.',  Icon: ChartIcon  },
  { id: 'lang',    title: 'للناطقين وغير الناطقين',   desc: 'مناهج مُصمَّمة لفئتين: الناطقون باللغة العربية وغير الناطقين بها.',                        Icon: UsersIcon  },   // ← أيقونة أشخاص
  { id: 'dev',     title: 'يعمل على جميع الأجهزة',    desc: 'واجهة متجاوبة تعمل على الحاسوب والجهاز اللوحي والهاتف الذكي.',                             Icon: DevicesIcon },  // ← أيقونة متعددة الأجهزة
  { id: 'sec',     title: 'آمن وخاص',                 desc: 'بيانات الطلاب محمية بالكامل وسرية تامة، لضمان خصوصية وبيئة تعلم آمنة لكل طالب.',           Icon: LockIcon   },
  { id: 'fast',    title: 'سريع وسهل الاستخدام',      desc: 'أدِرْ تقييمات متعددة في وقت واحد مع واجهة بسيطة وسهلة.',                                    Icon: ZapIcon    },
];

const CURRENCIES = [
  { code: 'QAR', symbol: 'ر.ق', label: 'ريال قطري'     },
  { code: 'SAR', symbol: 'ر.س', label: 'ريال سعودي'    },
  { code: 'AED', symbol: 'د.إ', label: 'درهم إماراتي'  },
  { code: 'KWD', symbol: 'د.ك', label: 'دينار كويتي'   },
  { code: 'USD', symbol: '$',   label: 'دولار أمريكي'  },
  { code: 'EUR', symbol: '€',   label: 'يورو'           },
  { code: 'GBP', symbol: '£',   label: 'جنيه إسترليني' },
];

const PLANS = [
  {
    id: 'basic',
    nameAr: 'الأساسية',
    color: '#475569',
    isPopular: false,
    monthly: { QAR: 280, SAR: 280, AED: 280, KWD: 85,  USD: 75,  EUR: 70,  GBP: 65  },
    yearly:  { QAR: 2240,SAR: 2240,AED: 2240,KWD: 680, USD: 600, EUR: 560, GBP: 520 },
    features: ['نظام التقييم الذكي', 'تقارير فورية'],
  },
  {
    id: 'premium',
    nameAr: 'المميزة',
    color: C.primary2,
    isPopular: true,
    monthly: { QAR: 560, SAR: 560, AED: 560, KWD: 170, USD: 145, EUR: 135, GBP: 130 },
    yearly:  { QAR: 4480,SAR: 4480,AED: 4480,KWD: 1360,USD: 1160,EUR: 1080,GBP: 1040},
    features: [
      'نظام التقييم الذكي',
      'تقارير فورية',
      'حصص مباشرة مع معلمين',
      'متابعة شخصية مستمرة',
      'بنك الكلمات الذكي',
    ],
  },
];

/* ─────────────────────────────── Components ─────────────────────────────── */

function CheckIcon({ color }) {
  return (
    <span className="check-ico" style={{ background: color }}>✓</span>
  );
}

/* ── Login / Register Modal ── */
function LoginModal({ onClose }) {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm:'', code:'' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" dir="rtl" style={{ position:'relative' }}>
        <button className="modal-close" onClick={onClose} aria-label="إغلاق">×</button>

        {/* Header */}
        <div className="modal-hdr">
          <div className="modal-hdr-row">
            <div className="modal-hdr-icon">📚</div>
            <div>
              <div className="modal-hdr-title">أكاديمية عارم</div>
              <div className="modal-hdr-sub">
                {tab === 'login' ? 'دخول الطالب' : 'إنشاء حساب طالب جديد'}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button className={`modal-tab ${tab === 'login' ? 'active' : 'inactive'}`} onClick={() => setTab('login')}>
            🔑 دخول
          </button>
          <button className={`modal-tab ${tab === 'register' ? 'active' : 'inactive'}`} onClick={() => setTab('register')}>
            ✨ تسجيل جديد
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {tab === 'login' ? (
            <>
              {/* Google */}
              <button className="google-btn">
                <GoogleLogo />
                <span>تسجيل الدخول بواسطة Google</span>
              </button>

              {/* Divider */}
              <div className="divider">
                <div className="divider-line"/>
                <span>أو بالبريد الإلكتروني</span>
                <div className="divider-line"/>
              </div>

              {/* Email */}
              <div className="form-grp">
                <label className="form-lbl">البريد الإلكتروني</label>
                <div className="form-ico">
                  <span className="form-ico-span">📧</span>
                  <input className="form-inp with-ico" type="email" placeholder="example@email.com" dir="ltr"
                    value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
              </div>

              {/* Password */}
              <div className="form-grp">
                <div className="form-row-between">
                  <label className="form-lbl" style={{ margin:0 }}>كلمة المرور</label>
                  <a href="/auth/forgot-password" className="form-forgot">نسيت كلمة المرور؟</a>
                </div>
                <div className="form-ico">
                  <span className="form-ico-span">🔒</span>
                  <input className="form-inp with-ico" type="password" placeholder="••••••••" dir="ltr"
                    value={form.password} onChange={e => set('password', e.target.value)} />
                </div>
              </div>

              <button className="btn-primary">دخول ←</button>

              <p className="form-note">
                هل تواجه مشكلة؟{' '}
                <a href="/auth/fix" style={{ color: C.muted, textDecoration:'underline' }}>اضغط هنا</a>
              </p>
            </>
          ) : (
            <>
              {/* Name */}
              <div className="form-grp">
                <label className="form-lbl">الاسم الكامل</label>
                <div className="form-ico">
                  <span className="form-ico-span">👤</span>
                  <input className="form-inp with-ico" type="text" placeholder="أدخل الاسم الكامل"
                    value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
              </div>

              {/* Email */}
              <div className="form-grp">
                <label className="form-lbl">البريد الإلكتروني</label>
                <div className="form-ico">
                  <span className="form-ico-span">📧</span>
                  <input className="form-inp with-ico" type="email" placeholder="example@email.com" dir="ltr"
                    value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
              </div>

              {/* Password */}
              <div className="form-grp">
                <label className="form-lbl">كلمة المرور</label>
                <div className="form-ico">
                  <span className="form-ico-span">🔒</span>
                  <input className="form-inp with-ico" type="password" placeholder="6 أحرف على الأقل" dir="ltr"
                    value={form.password} onChange={e => set('password', e.target.value)} />
                </div>
              </div>

              {/* Confirm */}
              <div className="form-grp">
                <label className="form-lbl">تأكيد كلمة المرور</label>
                <div className="form-ico">
                  <span className="form-ico-span">🔒</span>
                  <input className="form-inp with-ico" type="password" placeholder="أعد كتابة كلمة المرور" dir="ltr"
                    value={form.confirm} onChange={e => set('confirm', e.target.value)} />
                </div>
              </div>

              {/* Academy code */}
              <div className="form-grp">
                <label className="form-lbl">
                  كود الأكاديمية <span style={{ color:'#e53935',fontSize:'.85em' }}>*</span>
                </label>
                <div className="form-ico">
                  <span className="form-ico-span">🎓</span>
                  <input className="form-inp with-ico" type="text" placeholder="أدخل كود الأكاديمية" dir="ltr"
                    style={{ letterSpacing:2, textTransform:'uppercase', border:`2px solid ${C.accent}` }}
                    value={form.code} onChange={e => set('code', e.target.value)} />
                </div>
                <p className="form-code-note">
                  يُوفَّر الكود من إدارة أكاديمية عارم —{' '}
                  <a href={WA} target="_blank" rel="noopener noreferrer">تواصل معنا</a>
                </p>
              </div>

              <button className="btn-primary">إنشاء الحساب ←</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Supervisor Contact Modal ── */
function SupervisorModal({ onClose }) {
  const [form, setForm] = useState({ parent_name:'', student_name:'', phone:'', message:'' });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" dir="rtl" style={{ position:'relative' }}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="sup-modal-hdr">
          <div>
            <div className="sup-modal-title">📩 رسالة للمرشد التربوي</div>
            <div className="sup-modal-sub">سيردّ عليك المرشد أو الإدارة في أقرب وقت</div>
          </div>
        </div>
        <div className="sup-modal-body">
          <div className="form-grp">
            <label className="form-lbl">اسم ولي الأمر <span style={{ color:'#e53935' }}>*</span></label>
            <input className="form-inp" type="text" placeholder="اسمك الكامل"
              value={form.parent_name} onChange={e => set('parent_name', e.target.value)} />
          </div>
          <div className="form-grp">
            <label className="form-lbl">اسم الطالب</label>
            <input className="form-inp" type="text" placeholder="اسم ابنك / ابنتك (اختياري)"
              value={form.student_name} onChange={e => set('student_name', e.target.value)} />
          </div>
          <div className="form-grp">
            <label className="form-lbl">رسالتك <span style={{ color:'#e53935' }}>*</span></label>
            <textarea className="form-inp" placeholder="اكتب ما تودّ إيصاله للمرشد..."
              rows={4} style={{ resize:'none' }}
              value={form.message} onChange={e => set('message', e.target.value)} />
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn-primary" style={{ flex:1 }}>📩 إرسال الرسالة</button>
            <button onClick={onClose}
              style={{ flex:1, padding:'11px 16px', border:`2px solid ${C.border}`, borderRadius:10,
                background:'#fff', color:C.primary, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
                minHeight:44, transition:'.2s' }}>
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Pricing Card ── */
function PriceCard({ plan, currency, isYearly }) {
  const curr = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];
  const price = isYearly ? plan.yearly[currency] : plan.monthly[currency];
  const period = isYearly ? '/سنة' : '/شهر';

  return (
    <div className={`price-card ${plan.isPopular ? 'popular' : ''}`}
      style={{ border: `2px solid ${plan.isPopular ? plan.color : C.border}` }}>

      {/* Price badge */}
      <div className="price-badge" style={{ background: plan.color }}>
        <span style={{ fontSize: '.62rem', fontWeight: 700, opacity: .85 }}>{curr.symbol}</span>
        <span style={{ fontSize: '1.1rem', fontWeight: 900, lineHeight: 1 }}>{price}</span>
        <span style={{ fontSize: '.55rem', fontWeight: 700, opacity: .85 }}>{period}</span>
      </div>

      {/* Popular badge */}
      {plan.isPopular && (
        <div className="popular-tag" style={{ background: plan.color }}>
          ⭐ الأكثر طلباً
        </div>
      )}

      <h3 className="price-name" style={{ marginTop: plan.isPopular ? 20 : 12 }}>{plan.nameAr}</h3>

      <div className="price-features">
        {plan.features.map((f, i) => (
          <div key={i} className="price-feat-row">
            <CheckIcon color={plan.color} />
            <span style={{ fontSize: '.88rem', fontWeight: 600, color: '#334155' }}>{f}</span>
          </div>
        ))}
      </div>

      <a href={WA} target="_blank" rel="noopener noreferrer"
        className="price-btn" style={{ background: plan.color }}>
        اشترك الآن ←
      </a>
    </div>
  );
}

/* ─────────────────────────────── Main Page ─────────────────────────────── */
export default function PreviewPage() {
  const [loginOpen,    setLoginOpen]    = useState(false);
  const [supOpen,      setSupOpen]      = useState(false);
  const [currency,     setCurrency]     = useState('QAR');
  const [isYearly,     setIsYearly]     = useState(false);

  /* close on Escape */
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { setLoginOpen(false); setSupOpen(false); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const currData = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0];

  return (
    <div dir="rtl" style={{ fontFamily: "'Cairo','Tajawal',sans-serif", minHeight: '100vh', background: '#fff' }}>
      <style>{KF}</style>

      {/* ══ Preview Banner ══ */}
      <div style={{
        background: 'linear-gradient(90deg,#f59e0b,#d97706)',
        color: '#fff', textAlign: 'center', padding: '9px 16px',
        fontSize: '.82rem', fontWeight: 700, position: 'sticky', top: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        <span>🎨</span>
        <span>صفحة معاينة التحسينات — للمراجعة فقط، لا تؤثر على الموقع الحالي</span>
        <Link href="/" style={{ color:'#fff', textDecoration:'underline', fontSize:'.78rem', marginRight:'auto' }}>
          ← للموقع الرسمي
        </Link>
      </div>

      {/* ══ Navbar (تحسين: لوحة الطالب تفتح modal) ══ */}
      <nav style={{
        background: C.primary, boxShadow: '0 2px 12px rgba(0,0,0,.2)',
        position: 'sticky', top: 38, zIndex: 900,
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 20px',
          display: 'flex', alignItems: 'center', height: 64, gap: 14,
        }}>
          {/* Brand */}
          <div style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none', flexShrink:0 }}>
            <div style={{
              width:40, height:40, background:'rgba(255,255,255,.18)', borderRadius:'50%',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.25rem',
            }}>🎓</div>
            <span style={{ color:'#fff', fontWeight:800, fontSize:'1rem' }}>أكاديمية عارم</span>
          </div>

          <div style={{ flex:1 }} />

          {/* About link */}
          <a href="#about" style={{
            color:'rgba(255,255,255,.78)', textDecoration:'none', fontSize:'.88rem',
            fontWeight:600, whiteSpace:'nowrap',
          }}>
            تعرّف على أكاديمية عارم
          </a>

          {/* Social icons */}
          <div style={{ display:'flex', gap:8, borderLeft:'1px solid rgba(255,255,255,.18)', paddingLeft:14 }}>
            {[
              { href: WA, color:'#25D366', icon: <WaIcon size={17}/> },
              { href:'#', color:'#E1306C', icon: <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> },
              { href:'#', color:'#1877F2', icon: <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
            ].map((s, i) => (
              <a key={i} href={s.href} target="_blank" rel="noopener noreferrer"
                style={{
                  width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,.12)',
                  display:'flex', alignItems:'center', justifyContent:'center', color:'#fff',
                  transition:'.2s', textDecoration:'none',
                }}
                onMouseEnter={e => { e.currentTarget.style.background=s.color; e.currentTarget.style.transform='scale(1.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.12)'; e.currentTarget.style.transform='scale(1)'; }}>
                {s.icon}
              </a>
            ))}
          </div>

          {/* Lang */}
          <button style={{
            background:'rgba(255,255,255,.12)', border:'1.5px solid rgba(255,255,255,.3)',
            borderRadius:8, color:'#fff', fontWeight:700, fontSize:'.8rem', padding:'5px 10px',
            cursor:'pointer', fontFamily:'inherit',
          }}>EN</button>

          {/* ← التحسين: "لوحة الطالب" تفتح modal */}
          <button
            onClick={() => setLoginOpen(true)}
            style={{
              display:'inline-flex', alignItems:'center', gap:7,
              background: C.accent, color:'#fff', fontWeight:800, fontSize:'.88rem',
              padding:'9px 18px', borderRadius:10, border:'none', cursor:'pointer',
              fontFamily:'inherit', minHeight:44, whiteSpace:'nowrap',
              boxShadow:'0 2px 8px rgba(201,149,42,.35)', transition:'filter .2s',
            }}
            onMouseEnter={e => e.currentTarget.style.filter='brightness(1.1)'}
            onMouseLeave={e => e.currentTarget.style.filter='brightness(1)'}
          >
            👤 لوحة الطالب
          </button>
        </div>
      </nav>

      {/* ══ Contact Strip (مبسّط: أيقونة واتساب + رقم + "تواصل معنا") ══ */}
      <div style={{ background: C.primary, borderTop:'1px solid rgba(255,255,255,.15)' }}>
        <div style={{
          maxWidth:1200, margin:'0 auto', padding:'7px 20px',
          display:'flex', alignItems:'center', justifyContent:'center', gap:12,
        }}>
          <span style={{ color:'rgba(255,255,255,.75)', fontSize:'.83rem', fontWeight:600 }}>
            تواصل معنا
          </span>
          <a href={WA} target="_blank" rel="noopener noreferrer" style={{
            display:'inline-flex', alignItems:'center', gap:7, color:'#fff',
            fontWeight:700, textDecoration:'none', background:'rgba(37,211,102,.22)',
            border:'1px solid rgba(37,211,102,.45)', borderRadius:20,
            padding:'5px 14px', fontSize:'.84rem', transition:'background .2s',
          }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(37,211,102,.4)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(37,211,102,.22)'}
          >
            <WaIcon size={16}/> <bdi dir="ltr">+44 7400 755914</bdi>
          </a>
        </div>
      </div>

      {/* ══ Hero ══ */}
      <section style={{
        background: `linear-gradient(140deg,${C.primary} 0%,${C.primary2} 100%)`,
        padding:'80px 0 0', position:'relative', overflow:'hidden',
      }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 20px',
          display:'flex', gap:48, alignItems:'center', flexWrap:'wrap' }}>

          <div style={{ flex:'1 1 320px', minWidth:0, textAlign:'right' }}>
            <h1 style={{ fontSize:'clamp(2rem,4vw,2.8rem)', fontWeight:900, color:'#fff',
              marginBottom:16, lineHeight:1.2 }}>نظام التقييم الذكي</h1>
            <p style={{ color:'rgba(255,255,255,.82)', fontSize:'1.05rem', lineHeight:1.8, marginBottom:28 }}>
              منصتكم التعليمية لتقييم وتطوير مهارات الطلاب<br/>
              في اللغة العربية بأساليب ذكية وتفاعلية.
            </p>
            <a href="/auth/register" style={{
              display:'inline-flex', alignItems:'center', gap:8, background:C.accent,
              color:'#fff', fontWeight:800, fontSize:'1rem', padding:'13px 26px',
              borderRadius:12, textDecoration:'none', border:'2px solid rgba(0,0,0,.08)',
              minHeight:44, boxShadow:'0 4px 14px rgba(201,149,42,.3)',
            }}>
              ابدأ تحديد مستوى طفلك — مجاناً ▷
            </a>
          </div>

          <div style={{ flex:'0 1 400px', minWidth:240 }}>
            <div style={{
              background:'rgba(255,255,255,.08)', borderRadius:20,
              aspectRatio:'4/3', display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:'5rem', border:'2px solid rgba(255,255,255,.15)',
            }}>🎓</div>
          </div>
        </div>

        <svg style={{ display:'block', width:'100%', marginTop:40 }}
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0,80 L0,44 C240,80 480,8 720,44 C960,80 1200,8 1440,44 L1440,80 Z" fill="#ffffff"/>
        </svg>
      </section>

      {/* ══ Features (مع ظل + تمييز البطاقة الأولى + أيقونات محسّنة) ══ */}
      <section style={{ padding:'80px 0', background:'#fff' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 20px' }}>
          <h2 style={{ textAlign:'center', fontSize:'1.9rem', fontWeight:900,
            color:C.primary, marginBottom:8 }}>لماذا أكاديمية عارم؟</h2>
          <p style={{ textAlign:'center', color:C.muted, marginBottom:48, fontSize:'.97rem' }}>
            نظام متكامل يجمع بين الدقة العلمية وسهولة الاستخدام
          </p>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
            {FEATURES.map(f => (
              <div key={f.id} style={{
                background:'#fff', borderRadius:16, padding:24,
                border: f.highlight ? `2px solid ${C.primary}` : `2px solid ${C.border}`,
                /* ← التحسين: ظل خفيف على جميع البطاقات */
                boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                transition:'transform .2s,box-shadow .2s',
                cursor:'default',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform='translateY(-3px)';
                  e.currentTarget.style.boxShadow='0 6px 24px rgba(0,0,0,.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform='translateY(0)';
                  e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.07)';
                }}
              >
                <div style={{
                  width:52, height:52, borderRadius:14, background:C.primaryLt,
                  display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16,
                }}>
                  <f.Icon size={28} color={C.primary2} />
                </div>
                <h3 style={{ fontSize:'1rem', fontWeight:800, color:C.primary, marginBottom:8 }}>
                  {f.highlight && (
                    <span style={{ display:'inline-block', background:C.primaryLt, color:C.primary2,
                      fontSize:'.65rem', fontWeight:800, padding:'2px 8px', borderRadius:99,
                      border:`1px solid ${C.primary2}30`, marginLeft:6, verticalAlign:'middle',
                    }}>مميّزة</span>
                  )}
                  {f.title}
                </h3>
                <p style={{ fontSize:'.88rem', color:'#475569', lineHeight:1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ About ══ */}
      <section id="about" style={{ background:'#f0f6ff', padding:'80px 0' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 20px',
          display:'flex', gap:52, alignItems:'center', flexWrap:'wrap' }}>

          <div style={{ flex:'1 1 340px', minWidth:0, textAlign:'right' }}>
            <div style={{ fontSize:'2rem', marginBottom:12 }}>🌱</div>
            <h2 style={{ fontSize:'1.75rem', fontWeight:800, color:C.primary, marginBottom:8 }}>
              تعرّف على أكاديمية عارم
            </h2>
            <p style={{ fontSize:'1rem', fontWeight:700, color:'#1a3a5c', marginBottom:20 }}>
              نبني بذور المستقبل بلغة عربية أصيلة
            </p>
            <div style={{ lineHeight:2, color:'#2d3748', fontSize:'1rem' }}>
              <p style={{ marginBottom:16 }}>
                نحن نؤمن بأن كل طفل يحمل في داخله شغفاً للتعلم. في «أكاديمية عارم»، لا نكتفي بالتعليم التقليدي، بل نمنح طفلك بيئة تفاعلية وذكية، تُحببه في لغته الأم، وتنمي مهاراته بدقة واحترافية.
              </p>
              <p>
                هدفنا أن نكون الشريك الموثوق لك في رحلة طفلك نحو التميز، لنصنع معاً جيلاً يعتز بهويته، ويفكر بوضوح، ويبدع بلغته العربية.
              </p>
            </div>
          </div>

          <div style={{ flex:'0 1 380px', minWidth:260 }}>
            <div style={{
              background:C.primaryLt, borderRadius:16, aspectRatio:'16/9',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'3.5rem', border:'2px dashed #c5d9f2',
            }}>🎬</div>
            <p style={{ textAlign:'center', fontSize:'.8rem', color:C.muted, marginTop:8 }}>
              فيديو تعريفي عن الأكاديمية
            </p>
          </div>
        </div>
      </section>

      {/* ══ Pricing (باقتان: الأساسية + المميزة) ══ */}
      <section style={{
        background:'linear-gradient(160deg,#f0f4fc 0%,#fafbff 60%,#f0f0f0 100%)',
        padding:'80px 0', position:'relative',
      }}>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 20px' }}>
          <h2 style={{ textAlign:'center', fontSize:'1.9rem', fontWeight:900,
            color:C.primary, marginBottom:8 }}>الاشتراكات والأسعار</h2>
          <p style={{ textAlign:'center', color:C.muted, marginBottom:36, fontSize:'.97rem' }}>
            اختر الخطة المناسبة لك — يمكنك إلغاء الاشتراك في أي وقت
          </p>

          {/* Controls */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
            gap:20, flexWrap:'wrap', marginBottom:36 }}>

            {/* Monthly/Yearly toggle */}
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontWeight:600, fontSize:'.9rem',
                color: !isYearly ? C.primary2 : '#94a3b8' }}>شهري</span>
              <button
                onClick={() => setIsYearly(v => !v)}
                style={{
                  width:52, height:28, borderRadius:99,
                  background: isYearly ? C.primary2 : '#cbd5e1',
                  border:'none', cursor:'pointer', position:'relative', transition:'background .25s',
                }}
                aria-label="تبديل الفترة">
                <span style={{
                  position:'absolute', top:3, width:22, height:22, borderRadius:'50%',
                  background:'#fff', boxShadow:'0 1px 4px rgba(0,0,0,.2)',
                  transition:'inset-inline-start .25s',
                  insetInlineStart: isYearly ? 26 : 3,
                }}/>
              </button>
              <span style={{ fontWeight:600, fontSize:'.9rem',
                color: isYearly ? C.primary2 : '#94a3b8' }}>سنوي</span>
              {isYearly && (
                <span style={{
                  background:'#dcfce7', color:'#166534', fontSize:'.78rem',
                  fontWeight:800, padding:'3px 10px', borderRadius:99,
                  border:'1px solid #bbf7d0',
                }}>🎁 وفّر حتى 20%</span>
              )}
            </div>

            {/* Currency selector */}
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:'.85rem', fontWeight:600, color:'#475569' }}>العملة:</span>
              <div style={{ position:'relative' }}>
                <select value={currency} onChange={e => setCurrency(e.target.value)}
                  style={{
                    appearance:'none', WebkitAppearance:'none', background:'#fff',
                    border:`2px solid ${C.border}`, borderRadius:50,
                    padding:'6px 32px 6px 14px', fontSize:'.88rem', fontWeight:700,
                    color:C.text, cursor:'pointer', fontFamily:'inherit', direction:'ltr',
                    boxShadow:'0 1px 4px rgba(0,0,0,.07)',
                  }}>
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code} — {c.label}
                    </option>
                  ))}
                </select>
                <span style={{ position:'absolute', left:10, top:'50%',
                  transform:'translateY(-50%)', pointerEvents:'none',
                  fontSize:'.75rem', color:'#64748b' }}>▾</span>
              </div>
            </div>
          </div>

          {/* Cards grid */}
          <div style={{
            display:'grid', gridTemplateColumns:'1fr 1fr',
            gap:24, maxWidth:780, margin:'0 auto',
          }}>
            {PLANS.map(plan => (
              <PriceCard key={plan.id} plan={plan} currency={currency} isYearly={isYearly} />
            ))}
          </div>

          <p style={{ textAlign:'center', marginTop:32, fontSize:'.8rem', color:'#94a3b8' }}>
            * جميع الباقات تشمل الدعم الفني · يمكن الإلغاء في أي وقت
          </p>
        </div>
      </section>

      {/* ══ FAQ Placeholder ══ */}
      <section style={{ background:'#fff', padding:'80px 0' }}>
        <div style={{ maxWidth:800, margin:'0 auto', padding:'0 20px', textAlign:'center' }}>
          <h2 style={{ fontSize:'1.8rem', fontWeight:900, color:C.primary, marginBottom:8 }}>
            🤖 فهيم يجيب على أسئلتكم
          </h2>
          <p style={{ color:C.muted, marginBottom:32, fontSize:'.97rem' }}>
            اسأل مساعدنا الذكي عن أي شيء يخص الأكاديمية
          </p>
          <div style={{
            background:C.primaryLt, borderRadius:16, padding:32,
            border:`2px dashed ${C.primary2}30`,
          }}>
            <p style={{ color:C.primary, fontWeight:600, fontSize:'.95rem' }}>
              قسم الأسئلة الشائعة — نفس المحتوى الحالي
            </p>
          </div>
        </div>
      </section>

      {/* ══ Footer (← التحسين: بدون قسم "جاهز للبدء؟"، مع رابط معلمين صغير) ══ */}
      <footer style={{
        background:'#0e3d70', color:'rgba(255,255,255,.55)',
        textAlign:'center', padding:'28px 20px', fontSize:'.88rem',
      }}>
        <p>© 2026 أكاديمية عارم — جميع الحقوق محفوظة</p>
        {/* ← التحسين: روابط المعلم نقلت هنا من CTA section */}
        <p style={{ marginTop:12, fontSize:'.82rem' }}>
          <span style={{ opacity:.6 }}>للمعلمين: </span>
          <a href="/auth/login?for=teacher" style={{
            color:'rgba(255,255,255,.65)', textDecoration:'underline', margin:'0 6px',
          }}>دخول المعلم</a>
          ·
          <a href="/auth/register/teacher" style={{
            color:'rgba(255,255,255,.65)', textDecoration:'underline', margin:'0 6px',
          }}>تسجيل حساب معلم</a>
          ·
          <a href={WA} target="_blank" rel="noopener noreferrer" style={{
            color:'rgba(255,255,255,.65)', textDecoration:'underline', margin:'0 6px',
          }}>سجّل ترشحك كمعلم</a>
        </p>
      </footer>

      {/* ══ Floating Sidebar (← التحسين: زرّان فقط، يختفي على الجوال) ══ */}
      <nav aria-label="روابط سريعة" style={{
        position:'fixed',
        top:'50%', transform:'translateY(-50%)',
        insetInlineEnd:0,
        display:'flex', flexDirection:'column', gap:2,
        zIndex:800,
      }}
        /* يختفي على شاشات < 768px عبر CSS inline */
      >
        <style>{`@media(max-width:767px){.pv-fsr{display:none !important;}}`}</style>
        <div className="pv-fsr" style={{ display:'flex', flexDirection:'column', gap:2 }}>
          {/* تواصل معنا */}
          <a href={WA} target="_blank" rel="noopener noreferrer" style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:4,
            padding:'12px 10px', background:C.green, color:'#fff', textDecoration:'none',
            fontSize:'.67rem', fontWeight:700, minWidth:62, minHeight:64,
            borderRadius:'10px 0 0 0', transition:'opacity .2s',
          }}
            onMouseEnter={e => e.currentTarget.style.opacity='.88'}
            onMouseLeave={e => e.currentTarget.style.opacity='1'}
          >
            <WaIcon size={22}/>
            <span style={{ lineHeight:1.25, textAlign:'center' }}>تواصل{'\n'}معنا</span>
          </a>

          {/* راسل المرشد */}
          <button onClick={() => setSupOpen(true)} style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:4,
            padding:'12px 10px', background:C.primary2, color:'#fff',
            fontSize:'.67rem', fontWeight:700, minWidth:62, minHeight:64,
            border:'none', cursor:'pointer', fontFamily:'inherit',
            borderRadius:'0 0 0 10px', transition:'opacity .2s',
          }}
            onMouseEnter={e => e.currentTarget.style.opacity='.88'}
            onMouseLeave={e => e.currentTarget.style.opacity='1'}
          >
            <span style={{ fontSize:'1.3rem', lineHeight:1 }}>📖</span>
            <span style={{ lineHeight:1.25, textAlign:'center' }}>راسل{'\n'}المرشد</span>
          </button>
        </div>
      </nav>

      {/* ══ Login Modal ══ */}
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}

      {/* ══ Supervisor Modal ══ */}
      {supOpen   && <SupervisorModal onClose={() => setSupOpen(false)} />}
    </div>
  );
}
