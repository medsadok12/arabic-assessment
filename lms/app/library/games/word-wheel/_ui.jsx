'use client';
import { useCallback, useEffect, useRef } from 'react';
import { speakArabic } from '../../../../lib/speak-arabic';

/* ════════════════════════════════════════════════════════════════
   عجلة الكلمات — قطع الواجهة المشتركة بين الأنماط الثلاثة:
   الأنماط (CSS)، متغيّرات الألوان، نطق الكلمة، بطاقة التعلّم، الاحتفال.
════════════════════════════════════════════════════════════════ */

/* ألوان العجلة (resolveTheme) ← متغيّرات CSS للصفحة */
export function themeVars(t) {
  return {
    '--bg1': t.bg1, '--bg2': t.bg2, '--btn': t.button_bg, '--btn-text': t.button_text, '--btn-dark': t.button_dark,
    '--accent': t.center_bg, '--accent-text': t.center_text, '--accent-light': t.center_light,
    '--outer': t.outer_bg, '--outer-text': t.outer_text, '--outer-light': t.outer_light,
  };
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];
export const GOOD_MSGS = ['أحسنت يا بطل! 🎉', 'رائع جداً! 🌟', 'ممتاز! أنت قارئ ماهر 👏', 'عمل جميل! 💫', 'برافو! استمر 🚀'];
export const TRY_MSGS  = ['قريب جداً! جرّب حرفاً آخر 💪', 'ليس هذا الحرف — أنت تقدر! 🌟', 'فكّر قليلاً وجرّب مرة أخرى 😊', 'محاولة جميلة! جرّب غيره 🍀'];
export const goodMsg = () => pick(GOOD_MSGS);
export const tryMsg  = () => pick(TRY_MSGS);

/* نطق الكلمة: التسجيل المرفوع، وإلا صوت الجهاز (إن سمحت الإعدادات).
   عنصر Audio واحد يُشغَّل داخل معالج اللمسة نفسه — شرط سفاري على آيباد/آيفون */
export function useWordVoice() {
  const ref = useRef(null);
  useEffect(() => () => {
    ref.current?.pause();
    try { window.speechSynthesis?.cancel(); } catch {}
  }, []);
  return useCallback((card, { fallback = true } = {}) => {
    if (!card) return;
    const say = () => { if (fallback) speakArabic(card.vocalized || card.word); };
    if (!card.audio_url) { say(); return; }
    const a = ref.current || (ref.current = new Audio());
    try { a.pause(); window.speechSynthesis?.cancel(); } catch {}
    a.src = card.audio_url;
    a.play().catch(say);
  }, []);
}

/* شكل الكلمة: الصورة، وإلا الإيموجي، وإلا أول حرف */
export function WordVisual({ card, size = 'lg' }) {
  if (card?.image_url) return <img src={card.image_url} alt={card.word} className={`ww-visual ww-visual-${size}`} />;
  if (card?.emoji) return <span className={`ww-visual ww-visual-${size} ww-visual-emoji`} aria-hidden="true">{card.emoji}</span>;
  return <span className={`ww-visual ww-visual-${size} ww-visual-letter`} aria-hidden="true">{(card?.word || '؟')[0]}</span>;
}

const CONFETTI_COLORS = ['#F59E0B', '#8B5CF6', '#10B981', '#3B82F6', '#EC4899', '#FACC15'];
export function Confetti({ count = 22 }) {
  return (
    <div className="ww-confetti" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{
          left: `${(i * 37) % 100}%`, background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          animationDelay: `${(i % 7) * 70}ms`, animationDuration: `${1300 + (i % 5) * 180}ms`,
          borderRadius: i % 3 === 0 ? '50%' : 3,
        }} />
      ))}
    </div>
  );
}

export function Stars({ count, size = '1.6rem' }) {
  return (
    <span className="ww-stars" style={{ fontSize: size }} aria-label={`${count} من 3 نجوم`}>
      {[0, 1, 2].map(i => <span key={i} className={i < count ? 'on' : 'off'}>{i < count ? '⭐' : '☆'}</span>)}
    </span>
  );
}

/* بطاقة التعلّم عند اكتشاف الكلمة — صورة + الكلمة مشكولة + نطق + شرح مبسّط.
   revealed: كُشفت بعد نفاد المحاولات (بلا احتفال ولا نقاط). */
export function WordCard({ card, points = 0, revealed = false, autoSeconds = 0, onClose, onReplay }) {
  const btnRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => { btnRef.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => {
    if (!autoSeconds) return;
    const t = setTimeout(() => closeRef.current(), autoSeconds * 1000);
    return () => clearTimeout(t);
  }, [autoSeconds]);
  return (
    <div className="ww-overlay" role="dialog" aria-modal="true" aria-label={`بطاقة كلمة ${card.word}`} onClick={onClose}>
      <div className="ww-card" onClick={e => e.stopPropagation()}>
        {!revealed && <Confetti />}
        <div className="ww-card-head">{revealed ? '🌱 تعلّمنا كلمة جديدة' : '🎉 اكتشفت كلمة!'}</div>
        <WordVisual card={card} size="xl" />
        <div className="ww-card-word" lang="ar" dir="rtl">{card.vocalized || card.word}</div>
        <button type="button" className="ww-listen" onClick={onReplay}>🔊 استمع إلى الكلمة</button>
        {card.definition && <p className="ww-card-def" lang="ar" dir="rtl">{card.definition}</p>}
        {points > 0 && !revealed && <div className="ww-card-points">+{points} نقطة ⭐</div>}
        <button ref={btnRef} type="button" className="ww-btn ww-btn-wide" onClick={onClose}>
          {revealed ? 'نكمل معاً ←' : 'رائع! تابع ←'}
        </button>
      </div>
    </div>
  );
}

export const WW_CSS = `
  .ww{ min-height:100vh; width:100%; box-sizing:border-box; overflow-x:hidden; direction:rtl;
    background:linear-gradient(150deg,var(--bg1),var(--bg2)); font-family:inherit;
    display:flex; flex-direction:column; align-items:center; gap:14px; padding:14px 14px 48px; color:#1F2937; }
  .ww *{ box-sizing:border-box; }
  .ww-wrap{ width:100%; max-width:720px; display:flex; flex-direction:column; gap:14px; }
  .ww-top{ display:flex; align-items:center; gap:10px; color:#fff; }
  .ww-top-title{ flex:1; min-width:0; text-align:center; font-weight:900; font-size:1rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .ww-back{ color:rgba(255,255,255,.9); text-decoration:none; font-weight:800; font-size:.9rem; background:rgba(255,255,255,.16);
    border:none; border-radius:999px; padding:8px 14px; cursor:pointer; font-family:inherit; min-height:40px; white-space:nowrap; }
  .ww-pill{ background:rgba(255,255,255,.2); color:#fff; border-radius:999px; padding:6px 12px; font-weight:900; font-size:.9rem; white-space:nowrap; }
  .ww-hero{ text-align:center; color:#fff; }
  .ww-hero h1{ margin:4px 0 2px; font-size:2rem; font-weight:900; }
  .ww-hero p{ margin:0; opacity:.85; font-size:.95rem; }
  .ww-hero-icon{ font-size:3.2rem; display:inline-block; animation:wwSpin 12s linear infinite; }
  .ww-panel{ background:#fff; border-radius:24px; padding:18px 16px; box-shadow:0 14px 40px rgba(0,0,0,.22); display:flex; flex-direction:column; align-items:center; gap:12px; }

  /* الأزرار — كبيرة وسهلة اللمس */
  .ww-btn{ border:none; cursor:pointer; font-family:inherit; font-weight:900; font-size:1.05rem; min-height:52px; padding:0 22px; border-radius:16px;
    background:var(--btn); color:var(--btn-text); box-shadow:0 5px 0 var(--btn-dark), 0 8px 18px rgba(0,0,0,.18); transition:transform .1s, box-shadow .1s; }
  .ww-btn:active:not(:disabled){ transform:translateY(4px); box-shadow:0 1px 0 var(--btn-dark), 0 3px 8px rgba(0,0,0,.18); }
  .ww-btn:disabled{ opacity:.5; cursor:not-allowed; }
  .ww-btn-wide{ width:100%; }
  .ww-btn-soft{ border:2px solid #E5E7EB; background:#F9FAFB; color:#374151; font-family:inherit; font-weight:800; font-size:.95rem;
    min-height:48px; padding:0 16px; border-radius:14px; cursor:pointer; }
  .ww-btn-soft:disabled{ opacity:.45; cursor:not-allowed; }
  .ww-btn-hint{ border:none; background:#E0F2FE; color:#075985; box-shadow:0 4px 0 #7DD3FC; }
  .ww-btn-hint:active:not(:disabled){ transform:translateY(3px); box-shadow:0 1px 0 #7DD3FC; }
  .ww-controls{ display:flex; gap:10px; width:100%; justify-content:center; flex-wrap:wrap; }
  .ww-controls > *{ flex:1 1 120px; }

  /* اللوبي: الأنماط الثلاثة */
  .ww-modes{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; }
  .ww-mode{ border:none; cursor:pointer; font-family:inherit; color:#fff; text-align:center; border-radius:24px; padding:20px 14px 18px;
    display:flex; flex-direction:column; align-items:center; gap:6px; box-shadow:0 10px 0 rgba(0,0,0,.14), 0 14px 30px rgba(0,0,0,.2);
    transition:transform .15s; min-height:220px; }
  .ww-mode:hover{ transform:translateY(-3px); }
  .ww-mode:active{ transform:translateY(3px); }
  .ww-mode.m-picture{ background:linear-gradient(150deg,#38BDF8,#0284C7); }
  .ww-mode.m-complete{ background:linear-gradient(150deg,#A78BFA,#7C3AED); }
  .ww-mode.m-challenge{ background:linear-gradient(150deg,#FBBF24,#EA580C); }
  .ww-mode-icon{ font-size:3rem; line-height:1.1; }
  .ww-mode-stage{ background:rgba(255,255,255,.25); border-radius:999px; padding:2px 12px; font-size:.78rem; font-weight:900; }
  .ww-mode-title{ font-size:1.15rem; font-weight:900; line-height:1.4; }
  .ww-mode-desc{ font-size:.85rem; opacity:.92; line-height:1.6; }
  .ww-mode-progress{ margin-top:auto; background:rgba(0,0,0,.14); border-radius:12px; padding:4px 10px; font-size:.8rem; font-weight:800; }
  .ww-admin-link{ display:flex; align-items:center; justify-content:center; gap:8px; min-height:48px; background:rgba(255,255,255,.16); color:#fff;
    border:1.5px solid rgba(255,255,255,.3); border-radius:14px; text-decoration:none; font-weight:800; font-size:.9rem; padding:0 14px; text-align:center; }

  /* قائمة العجلات */
  .ww-level{ display:flex; align-items:center; gap:8px; color:#fff; font-weight:900; font-size:1rem; margin-top:4px; }
  .ww-wheels{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
  .ww-wheel{ border:none; cursor:pointer; font-family:inherit; background:#fff; border-radius:20px; padding:14px 10px 12px; text-align:center;
    display:flex; flex-direction:column; align-items:center; gap:6px; box-shadow:0 6px 0 rgba(0,0,0,.08), 0 10px 22px rgba(0,0,0,.16); transition:transform .12s; }
  .ww-wheel:active{ transform:translateY(3px); }
  .ww-wheel-art{ display:flex; gap:4px; justify-content:center; align-items:center; min-height:56px; }
  .ww-wheel-art .ww-visual-sm{ width:44px; height:44px; font-size:2rem; }
  .ww-wheel-center{ width:52px; height:52px; border-radius:50%; background:radial-gradient(circle at 40% 35%,var(--accent-light),var(--accent));
    color:var(--accent-text); font-size:1.5rem; font-weight:900; display:flex; align-items:center; justify-content:center; }
  .ww-wheel-name{ font-weight:900; color:#1F2937; font-size:.95rem; line-height:1.4; }
  .ww-wheel-meta{ font-size:.75rem; color:#6B7280; font-weight:700; }

  /* الشكل: صورة/إيموجي */
  .ww-visual{ display:flex; align-items:center; justify-content:center; border-radius:18px; object-fit:cover; background:#F5F3FF; }
  .ww-visual-sm{ width:40px; height:40px; border-radius:12px; font-size:1.6rem; }
  .ww-visual-lg{ width:170px; height:170px; font-size:6rem; box-shadow:0 8px 20px rgba(0,0,0,.12); }
  .ww-visual-xl{ width:190px; height:190px; font-size:6.5rem; box-shadow:0 8px 22px rgba(0,0,0,.14); }
  .ww-visual-letter{ font-weight:900; color:var(--accent); font-size:4rem; }
  .ww-instr{ margin:0; font-weight:900; color:#374151; font-size:1.05rem; text-align:center; }
  .ww-hint-bubble{ width:100%; background:#FFFBEB; border:2px dashed #F59E0B; color:#92400E; border-radius:16px; padding:12px 14px;
    font-weight:800; font-size:1.05rem; line-height:1.8; text-align:center; }

  /* خانات الكلمة */
  .ww-tiles{ display:grid; grid-template-columns:repeat(var(--n),minmax(0,54px)); gap:8px; justify-content:center; width:100%; direction:rtl; }
  .ww-tile{ aspect-ratio:1/1.12; border-radius:14px; border:3px dashed #CBD5E1; background:#F8FAFC; display:flex; align-items:center; justify-content:center;
    font-size:clamp(1.4rem,6vw,2rem); font-weight:900; color:#1F2937; }
  .ww-tile.filled{ border-style:solid; border-color:var(--accent); background:var(--accent-light); color:var(--accent-text); animation:wwPop .35s cubic-bezier(.34,1.56,.64,1); }
  .ww-tile.next{ border-color:var(--accent); animation:wwBlink 1.2s ease-in-out infinite; }
  .ww-tile.missing{ border-color:var(--accent); color:var(--accent); background:#fff; }
  .ww-tile.revealed{ border-style:solid; border-color:#93C5FD; background:#EFF6FF; color:#1E3A8A; }
  .ww-tiles.solved .ww-tile{ border-color:#22C55E; background:#DCFCE7; color:#166534; }
  .ww-shake{ animation:wwShake .45s cubic-bezier(.36,.07,.19,.97) both; }

  /* رسائل ودّية — بلا أحمر (قاعدة «صفر إحباط») */
  .ww-msg{ width:100%; border-radius:14px; padding:9px 14px; font-weight:800; font-size:.95rem; text-align:center; animation:wwFadeIn .2s ease-out; }
  .ww-msg.good{ background:#DCFCE7; color:#166534; }
  .ww-msg.try{ background:#FEF3C7; color:#92400E; }
  .ww-msg.hint{ background:#E0F2FE; color:#075985; }
  .ww-msg.calm{ background:#EFF6FF; color:#1E3A8A; }

  .ww-dots{ display:flex; gap:6px; justify-content:center; flex-wrap:wrap; }
  .ww-dot{ width:12px; height:12px; border-radius:50%; background:rgba(255,255,255,.35); }
  .ww-dot.cur{ background:#fff; transform:scale(1.25); }
  .ww-dot.ok{ background:#4ADE80; }
  .ww-dot.rev{ background:#93C5FD; }

  .ww-wheel-box{ width:100%; max-width:330px; position:relative; }

  /* التحدي المفتوح */
  .ww-timer{ width:100%; height:8px; border-radius:6px; background:rgba(255,255,255,.25); overflow:hidden; }
  .ww-timer span{ display:block; height:100%; border-radius:6px; transition:width 1s linear, background .5s; }
  .ww-input{ width:100%; min-height:58px; border:3px solid var(--outer-light); border-radius:16px; display:flex; align-items:center; justify-content:center;
    font-size:1.9rem; font-weight:900; letter-spacing:3px; color:var(--outer-text); background:#fff; }
  .ww-input.empty{ color:#CBD5E1; font-size:1.1rem; letter-spacing:0; }
  .ww-found{ width:100%; display:flex; flex-wrap:wrap; gap:8px; justify-content:center; }
  .ww-chip{ border:2px solid var(--outer-light); background:#fff; color:#1F2937; border-radius:999px; padding:4px 12px 4px 6px; font-family:inherit;
    font-weight:900; font-size:.95rem; cursor:pointer; display:inline-flex; align-items:center; gap:6px; min-height:40px; animation:wwPop .35s ease-out; }
  .ww-chip .ww-visual-sm{ width:30px; height:30px; font-size:1.3rem; border-radius:50%; }
  .ww-fly{ position:absolute; top:42%; left:50%; z-index:3; pointer-events:none; white-space:nowrap; font-size:1.9rem; font-weight:900; color:#059669;
    text-shadow:0 2px 0 #fff, 0 0 12px #fff; animation:wwFly .9s ease-out forwards; }
  .ww-rules{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; width:100%; }
  .ww-rule{ background:#FFFBEB; border:1.5px solid #FDE68A; border-radius:12px; padding:8px 4px; display:flex; flex-direction:column; align-items:center; font-size:.8rem; }
  .ww-rule b{ color:#92400E; } .ww-rule span{ color:#D97706; font-weight:800; }

  /* النتائج */
  .ww-result-emoji{ font-size:4rem; animation:wwPop .6s cubic-bezier(.34,1.56,.64,1); }
  .ww-result-title{ margin:0; font-size:1.6rem; font-weight:900; color:#1F2937; }
  .ww-stats{ display:flex; gap:12px; justify-content:center; width:100%; }
  .ww-stat{ flex:1; background:#F9FAFB; border-radius:16px; padding:10px 6px; display:flex; flex-direction:column; align-items:center; }
  .ww-stat b{ font-size:1.7rem; font-weight:900; color:var(--accent); line-height:1.3; }
  .ww-stat span{ font-size:.8rem; color:#6B7280; font-weight:700; }
  .ww-stars .on{ display:inline-block; animation:wwPop .5s cubic-bezier(.34,1.56,.64,1) both; }
  .ww-stars .on:nth-child(2){ animation-delay:.15s; } .ww-stars .on:nth-child(3){ animation-delay:.3s; }
  .ww-stars .off{ opacity:.35; }

  /* بطاقة التعلّم — فوق الشريطين (طبقة 300، القسم 12.1) */
  .ww-overlay{ position:fixed; inset:0; z-index:300; background:rgba(15,23,42,.55); display:flex; align-items:center; justify-content:center; padding:16px;
    animation:wwFadeIn .2s ease-out; }
  .ww-card{ position:relative; overflow:hidden; width:100%; max-width:380px; max-height:calc(100vh - 32px); overflow-y:auto; background:#fff; border-radius:28px;
    padding:20px 18px 18px; display:flex; flex-direction:column; align-items:center; gap:10px; text-align:center; direction:rtl;
    box-shadow:0 24px 60px rgba(0,0,0,.35); animation:wwCardIn .45s cubic-bezier(.34,1.56,.64,1); font-family:inherit; }
  .ww-card-head{ font-weight:900; font-size:1.05rem; color:#6B7280; }
  .ww-card-word{ font-size:2.6rem; font-weight:900; line-height:1.5; color:var(--accent,#7C3AED);
    background:linear-gradient(90deg,#F59E0B,#10B981,#3B82F6,#8B5CF6,#F59E0B); background-size:300% auto;
    -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; animation:wwShimmer 3s linear infinite; }
  .ww-listen{ border:none; cursor:pointer; font-family:inherit; font-weight:900; font-size:1rem; min-height:48px; padding:0 20px; border-radius:999px;
    background:#E0F2FE; color:#075985; box-shadow:0 4px 0 #7DD3FC; }
  .ww-listen:active{ transform:translateY(3px); box-shadow:0 1px 0 #7DD3FC; }
  .ww-card-def{ margin:0; background:#F8FAFC; border-radius:16px; padding:10px 14px; font-size:1.05rem; line-height:1.9; color:#334155; font-weight:700; width:100%; }
  .ww-card-points{ background:#FEF3C7; color:#92400E; border-radius:999px; padding:4px 14px; font-weight:900; }
  .ww-confetti{ position:absolute; inset:0; pointer-events:none; overflow:hidden; }
  .ww-confetti span{ position:absolute; top:-12px; width:9px; height:12px; animation-name:wwConfetti; animation-timing-function:ease-in; animation-fill-mode:forwards; }

  @keyframes wwSpin{ to{ transform:rotate(360deg) } }
  @keyframes wwPop{ 0%{ transform:scale(.6); opacity:0 } 70%{ transform:scale(1.12); opacity:1 } 100%{ transform:scale(1) } }
  @keyframes wwBlink{ 0%,100%{ box-shadow:0 0 0 0 rgba(0,0,0,0) } 50%{ box-shadow:0 0 0 5px var(--accent-light) } }
  @keyframes wwShake{ 0%,100%{ transform:translateX(0) } 20%{ transform:translateX(-8px) } 40%{ transform:translateX(8px) } 60%{ transform:translateX(-5px) } 80%{ transform:translateX(5px) } }
  @keyframes wwFadeIn{ from{ opacity:0; transform:translateY(6px) } to{ opacity:1; transform:none } }
  @keyframes wwCardIn{ 0%{ opacity:0; transform:scale(.7) translateY(30px) } 100%{ opacity:1; transform:none } }
  @keyframes wwShimmer{ 0%{ background-position:200% center } 100%{ background-position:-200% center } }
  @keyframes wwConfetti{ 0%{ transform:translateY(0) rotate(0); opacity:1 } 100%{ transform:translateY(520px) rotate(540deg); opacity:0 } }
  @keyframes wwFly{ 0%{ opacity:1; transform:translate(-50%,-50%) scale(1) } 100%{ opacity:0; transform:translate(-50%,-140%) scale(1.4) } }
  @media (prefers-reduced-motion: reduce){ .ww *, .ww-card, .ww-overlay{ animation:none !important; } .ww-confetti{ display:none; } }

  @media (max-width:640px){
    .ww{ padding:10px 10px 40px; }
    .ww-hero h1{ font-size:1.6rem; }
    .ww-modes{ grid-template-columns:minmax(0,1fr); gap:12px; }
    .ww-mode{ min-height:0; flex-direction:row; flex-wrap:wrap; justify-content:center; text-align:center; padding:16px 12px; }
    .ww-mode-icon{ font-size:2.4rem; }
    .ww-mode-title{ width:100%; }
    .ww-wheels{ grid-template-columns:repeat(2,minmax(0,1fr)); }
    .ww-visual-lg{ width:140px; height:140px; font-size:5rem; }
    .ww-visual-xl{ width:150px; height:150px; font-size:5.2rem; }
    .ww-card-word{ font-size:2.2rem; }
    .ww-tiles{ gap:6px; }
  }
`;
