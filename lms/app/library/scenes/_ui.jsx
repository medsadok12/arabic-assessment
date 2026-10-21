'use client';
import { useEffect, useRef, useState } from 'react';
import { CRITERIA, STICKERS, FEELINGS, reviewStars } from '../../../lib/scene-story';

/* ════════════════════════════════════════════════════════════════
   «مشهدٌ وحكاية» — الأنماط والقطع المشتركة لشاشات الطفل
   هوية عارم (كحلي + ذهبي + كريمي) مع فيروزي النشاط. أزرار كبيرة (≥48px)
   للمس على الآيباد والجوال، وخط مدرسي واضح، وبلا أحمر على أخطاء الطفل.
════════════════════════════════════════════════════════════════ */

/* الصورة مع «عدسات المحقّق»: كل عدسة سؤال صغير على جزء من المشهد */
export function SceneImage({ scene, onLens }) {
  const [tip, setTip] = useState(null);
  const [seen, setSeen] = useState({});
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const open = (h, i) => {
    setTip(h.q);
    setSeen(s => ({ ...s, [i]: true }));
    onLens?.(h);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setTip(null), 5000);
  };
  const lenses = Array.isArray(scene.hotspots) ? scene.hotspots : [];
  return (
    <div className="sc-scene">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={scene.image_url} alt={scene.title} />
      {lenses.map((h, i) => (
        <button key={i} type="button" className={`sc-lens${seen[i] ? ' seen' : ''}`}
          style={{ left: `${h.x}%`, top: `${h.y}%` }} onClick={() => open(h, i)} aria-label={`عدسة المحقّق: ${h.q}`}>
          🔍
        </button>
      ))}
      {tip && (
        <button type="button" className="sc-lens-tip" onClick={() => setTip(null)}>🔍 {tip}</button>
      )}
    </div>
  );
}

export function StarRow({ value = 0, max = 3 }) {
  return (
    <span className="sc-star-row" aria-label={`${value} من ${max} نجوم`}>
      {Array.from({ length: max }, (_, i) => <span key={i} className={i < value ? 'on' : ''}>★</span>)}
    </span>
  );
}

/* تقييم المعلم كما يراه الطفل: نجوم المعايير + الملصقات + كلمة المعلم */
export function ReviewCard({ review }) {
  if (!review) return null;
  const stickers = STICKERS.filter(s => (review.stickers || []).includes(s.id));
  return (
    <section className="sc-review" aria-label="تقييم معلمك">
      <div className="sc-review-head">
        <span className="sc-review-big" aria-hidden="true">🌟</span>
        <div>
          <h2>قرأ معلمك حكايتك!</h2>
          <p>{reviewStars(review)} نجوم من 9 — أحسنت يا حكّاءنا</p>
        </div>
      </div>
      <div className="sc-crit-grid">
        {CRITERIA.map(c => (
          <div key={c.id} className="sc-crit">
            <b>{c.icon} {c.label}</b>
            <StarRow value={review[c.id] || 0} />
          </div>
        ))}
      </div>
      {stickers.length > 0 && (
        <div className="sc-stickers">{stickers.map(s => <span key={s.id} className="sc-sticker">{s.label}</span>)}</div>
      )}
      {review.comment && <p className="sc-comment">💬 {review.comment}</p>}
    </section>
  );
}

export const feelingOf = (id) => FEELINGS.find(f => f.id === id) || null;

/* مشغّل تسجيلات المتصفح: ملفات MediaRecorder (webm) لا تحمل مدّتها، فيُظهر
   المتصفح «0:00 /» كأنه فارغ. نقفز لنهاية الملف مرة واحدة ليحسب المدة ثم نعود */
export function RecordingPlayer({ src, className }) {
  const ref = useRef(null);
  useEffect(() => {
    const a = ref.current;
    if (!a) return undefined;
    const fix = () => {
      if (Number.isFinite(a.duration)) return;
      const back = () => { a.removeEventListener('timeupdate', back); a.currentTime = 0; };
      a.addEventListener('timeupdate', back);
      try { a.currentTime = 1e101; } catch { a.removeEventListener('timeupdate', back); }
    };
    a.addEventListener('loadedmetadata', fix);
    return () => a.removeEventListener('loadedmetadata', fix);
  }, [src]);
  return <audio ref={ref} controls preload="metadata" src={src} className={className} />;
}

export const SC_CSS = `
  .sc{ min-height:100vh; background:#F4EFE6; direction:rtl; color:#1A2B4A; padding-bottom:calc(40px + env(safe-area-inset-bottom));
    font-family:var(--font-cairo),var(--font-tajawal),'Cairo','Tajawal',sans-serif; }
  .sc *{ box-sizing:border-box; }
  .sc [hidden]{ display:none !important; }
  .sc button{ font-family:inherit; }
  .sc :focus-visible{ outline:3px solid #E8B84B; outline-offset:2px; }

  .sc-top{ position:sticky; top:0; z-index:20; background:rgba(244,239,230,.94); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
    border-bottom:1px solid #EDE5D8; }
  .sc-top-in{ max-width:1100px; margin:0 auto; display:flex; align-items:center; gap:8px; padding:10px 16px; }
  .sc-top h1{ margin:0; flex:1; font-size:1.15rem; font-weight:900; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .sc-back{ display:inline-flex; align-items:center; justify-content:center; min-height:44px; padding:0 14px; border-radius:999px; background:#fff;
    color:#1A2B4A; text-decoration:none; font-weight:800; font-size:.9rem; box-shadow:0 2px 6px rgba(26,43,74,.08); white-space:nowrap; border:none; cursor:pointer; }
  .sc-pill{ display:inline-flex; align-items:center; gap:4px; min-height:40px; padding:0 12px; border-radius:999px; background:#fff; font-weight:900; font-size:.9rem;
    box-shadow:0 2px 6px rgba(26,43,74,.08); white-space:nowrap; color:#1A2B4A; text-decoration:none; }
  .sc-pill.gold{ background:#E8B84B; }
  .sc-main{ max-width:1100px; margin:0 auto; padding:16px; display:flex; flex-direction:column; gap:16px; }

  /* القائمة */
  .sc-hero{ background:linear-gradient(135deg,#3FA796,#2B7E71); color:#fff; border-radius:26px; padding:22px 20px; display:flex; gap:16px; align-items:center;
    box-shadow:0 10px 26px rgba(43,126,113,.25); }
  .sc-hero-ico{ font-size:3rem; line-height:1; }
  .sc-hero h2{ margin:0; font-size:1.5rem; font-weight:900; }
  .sc-hero p{ margin:4px 0 0; font-size:1rem; opacity:.95; line-height:1.7; }
  .sc-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:16px; }
  .sc-card{ background:#fff; border-radius:24px; overflow:hidden; text-decoration:none; color:#1A2B4A; display:flex; flex-direction:column;
    box-shadow:0 6px 18px rgba(26,43,74,.08); border:2px solid transparent; transition:transform .15s, border-color .15s; }
  .sc-card:hover{ transform:translateY(-3px); border-color:#3FA796; }
  .sc-card-img{ aspect-ratio:16/10; background:#DDF3EF; position:relative; overflow:hidden; }
  .sc-card-img img{ width:100%; height:100%; object-fit:cover; display:block; }
  .sc-card-body{ padding:12px 14px 14px; display:flex; flex-direction:column; gap:6px; flex:1; }
  .sc-card-body h3{ margin:0; font-size:1.12rem; font-weight:900; line-height:1.5; }
  .sc-card-body p{ margin:0; color:#5D6B82; font-size:.9rem; line-height:1.7; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .sc-chip{ position:absolute; top:10px; right:10px; border-radius:999px; padding:4px 12px; font-weight:900; font-size:.82rem; background:#fff; color:#1A2B4A;
    box-shadow:0 3px 10px rgba(0,0,0,.15); }
  .sc-chip.new{ background:#E8B84B; }
  .sc-chip.sent{ background:#DDF3EF; color:#1F6E62; }
  .sc-chip.done{ background:#1A2B4A; color:#FFE6A6; }
  .sc-chip.soon{ background:#EEF2FF; color:#3730A3; }
  .sc-chip.star{ background:#E8B84B; color:#1A2B4A; animation:scBeat 1.6s ease-in-out infinite; }
  .sc-modes{ display:flex; gap:6px; flex-wrap:wrap; margin-top:auto; }
  .sc-mode-tag{ font-size:.78rem; font-weight:800; border-radius:999px; padding:2px 10px; background:#F4EFE6; }
  .sc-empty{ background:#fff; border-radius:24px; padding:32px 20px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:10px;
    box-shadow:0 6px 18px rgba(26,43,74,.06); }
  .sc-empty .big{ font-size:3.2rem; line-height:1; }
  .sc-empty h3{ margin:0; font-size:1.2rem; font-weight:900; }
  .sc-empty p{ margin:0; color:#5D6B82; line-height:1.8; }
  .sc-note{ border-radius:16px; padding:12px 16px; font-weight:700; font-size:.92rem; line-height:1.7; background:#EFF6FF; color:#1E3A8A; border:1.5px solid #BFDBFE; }
  .sc-note.warn{ background:#FFFBEB; color:#92400E; border-color:#FDE68A; }
  .sc-note.ok{ background:#ECFDF5; color:#065F46; border-color:#A7F3D0; }
  .sc-skel{ background:linear-gradient(90deg,#EDE5D8 25%,#F6F1E8 50%,#EDE5D8 75%); background-size:200% 100%; animation:scShimmer 1.3s linear infinite; border-radius:24px; }

  /* شاشة المشهد */
  .sc-layout{ display:grid; grid-template-columns:minmax(0,1fr); gap:14px; align-items:start; }
  .sc-col{ display:flex; flex-direction:column; gap:12px; min-width:0; }
  .sc-scene{ position:relative; border-radius:24px; overflow:hidden; border:5px solid #fff; box-shadow:0 10px 24px rgba(26,43,74,.14); background:#DDF3EF; }
  .sc-scene img{ display:block; width:100%; height:auto; max-height:62vh; object-fit:contain; background:#fff; }
  .sc-lens{ position:absolute; transform:translate(-50%,-50%); width:48px; height:48px; border-radius:50%; border:3px solid #fff; background:#E8B84B;
    font-size:1.25rem; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,.25); animation:scPulse 2.2s ease-in-out infinite; display:grid; place-items:center; padding:0; }
  .sc-lens.seen{ background:#fff; animation:none; }
  .sc-lens-tip{ position:absolute; left:10px; right:10px; bottom:10px; background:rgba(26,43,74,.95); color:#fff; border:none; border-radius:16px; padding:12px 14px;
    font-weight:800; font-size:1.05rem; line-height:1.6; text-align:center; cursor:pointer; animation:scFade .2s ease; }
  .sc-prompt{ display:flex; gap:10px; align-items:center; background:#fff; border-radius:20px; padding:12px 14px; box-shadow:0 3px 10px rgba(26,43,74,.06); }
  .sc-prompt p{ margin:0; flex:1; font-weight:900; font-size:1.15rem; line-height:1.6; }
  .sc-listen{ width:54px; height:54px; border-radius:50%; border:none; background:#3FA796; color:#fff; font-size:1.4rem; cursor:pointer; flex-shrink:0;
    box-shadow:0 4px 0 #2B7E71; }
  .sc-listen.playing{ background:#E8B84B; box-shadow:0 4px 0 #C99A2E; animation:scBeat 1s ease-in-out infinite; }

  .sc-box{ background:#fff; border-radius:22px; padding:14px; display:flex; flex-direction:column; gap:12px; box-shadow:0 3px 12px rgba(26,43,74,.06); }
  .sc-box h3{ margin:0; font-size:1rem; font-weight:900; }
  .sc-feel{ display:flex; gap:8px; justify-content:center; flex-wrap:wrap; }
  .sc-feel button{ width:64px; min-height:72px; border-radius:18px; border:3px solid transparent; background:#FAF7F2; cursor:pointer; display:flex; flex-direction:column;
    align-items:center; justify-content:center; gap:2px; color:#1A2B4A; }
  .sc-feel button span{ font-size:1.8rem; line-height:1.1; }
  .sc-feel button small{ font-size:.72rem; font-weight:800; }
  .sc-feel button[aria-pressed="true"]{ border-color:#3FA796; background:#DDF3EF; transform:scale(1.05); }
  .sc-feel-q{ text-align:center; font-weight:900; font-size:1rem; margin:0; }

  .sc-tabs{ display:grid; grid-auto-flow:column; grid-auto-columns:minmax(0,1fr); gap:8px; }
  .sc-tab{ border:none; border-radius:18px; padding:10px 4px; background:#fff; color:#1A2B4A; font-weight:900; font-size:1rem; cursor:pointer; min-height:70px;
    display:flex; flex-direction:column; align-items:center; gap:2px; box-shadow:0 4px 0 #E3DACB; position:relative; }
  .sc-tab span{ font-size:1.6rem; line-height:1.1; }
  .sc-tab[aria-selected="true"]{ background:#3FA796; color:#fff; box-shadow:0 4px 0 #2B7E71; }
  .sc-tab i{ position:absolute; top:6px; left:8px; width:22px; height:22px; border-radius:50%; background:#2ABB7A; color:#fff; font-style:normal; font-size:.75rem;
    display:grid; place-items:center; border:2px solid #fff; }

  .sc-help{ display:flex; flex-wrap:wrap; gap:8px; }
  .sc-tiles{ min-height:56px; padding:8px; border-radius:16px; background:#FAF7F2; border:2px dashed #E3DACB; }
  .sc-tile{ border:none; border-radius:14px; padding:10px 14px; font-weight:900; font-size:1.15rem; cursor:pointer; background:#fff; color:#1A2B4A;
    box-shadow:0 3px 0 #E3DACB; min-height:48px; }
  .sc-tile.used{ background:#3FA796; color:#fff; box-shadow:0 3px 0 #2B7E71; }
  .sc-starter{ border:2px dashed #3FA796; background:#F3FBF9; color:#2B7E71; border-radius:14px; padding:8px 12px; font-weight:800; cursor:pointer; font-size:1rem; min-height:46px; }
  .sc-map{ display:grid; grid-template-columns:1fr 1fr; gap:8px; }
  .sc-map button{ border:none; border-radius:14px; padding:10px; background:#FFF6DF; color:#7A5B12; font-weight:900; cursor:pointer; font-size:1rem; min-height:48px; }
  .sc-hint{ margin:0; font-size:.88rem; color:#5D6B82; font-weight:700; }
  .sc-text{ width:100%; min-height:170px; border:3px solid #E3DACB; border-radius:18px; padding:12px 14px; font-family:var(--font-tajawal),'Tajawal',var(--font-cairo),sans-serif;
    font-size:1.25rem; line-height:2; color:#1A2B4A; background:#FFFDF8; resize:vertical; outline:none; }
  .sc-text:focus{ border-color:#3FA796; box-shadow:0 0 0 4px rgba(63,167,150,.15); }
  .sc-text:disabled{ background:#FAF7F2; }
  .sc-basket-title{ font-size:.88rem; font-weight:900; color:#5D6B82; margin:0; }
  .sc-word{ border:none; border-radius:999px; padding:8px 14px; background:#FFF6DF; color:#7A5B12; font-weight:900; cursor:pointer; font-size:1.08rem; min-height:44px; }
  .sc-word.gold{ background:#E8B84B; color:#1A2B4A; box-shadow:0 3px 0 #C99A2E; }
  .sc-word.used{ outline:3px solid #2ABB7A; outline-offset:1px; }
  .sc-meter{ display:flex; align-items:center; gap:10px; font-size:.92rem; font-weight:800; color:#5D6B82; }
  .sc-bar{ flex:1; height:12px; border-radius:99px; background:#EDE5D8; overflow:hidden; }
  .sc-bar div{ height:100%; background:linear-gradient(90deg,#3FA796,#2ABB7A); transition:width .25s; }
  .sc-star-row{ letter-spacing:2px; color:#D9CFBE; font-size:1.15rem; white-space:nowrap; }
  .sc-star-row .on{ color:#E8B84B; }

  .sc-rec{ display:flex; flex-direction:column; align-items:center; gap:10px; padding:6px 0; }
  .sc-rec-btn{ width:112px; height:112px; border-radius:50%; border:8px solid #DDF3EF; background:#3FA796; color:#fff; font-size:2.6rem; cursor:pointer; }
  .sc-rec-btn.on{ background:#F59E0B; border-color:#FEF3C7; animation:scBeat 1.2s ease-in-out infinite; }
  .sc-rec-btn:disabled{ opacity:.5; cursor:not-allowed; }
  .sc-rec-time{ font-weight:900; font-size:1.5rem; font-variant-numeric:tabular-nums; direction:ltr; }
  .sc-rec audio, .sc-box audio{ width:100%; }
  .sc-row{ display:flex; gap:8px; flex-wrap:wrap; justify-content:center; }
  .sc-soft{ border:2px solid #EDE5D8; background:#fff; color:#1A2B4A; border-radius:14px; padding:0 16px; min-height:48px; font-weight:800; font-size:.95rem; cursor:pointer; }
  .sc-soft:disabled, .sc-soft.off{ opacity:.5; cursor:not-allowed; }
  .sc-soft.del{ background:#FFFBEB; border-color:#FDE68A; color:#92400E; }
  .sc-file-btn{ display:inline-flex; align-items:center; position:relative; }
  .sc-file{ position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; overflow:hidden; }
  .sc-photo-drop{ position:relative; }
  .sc-photo-drop{ display:flex; flex-direction:column; align-items:center; gap:8px; border:3px dashed #3FA796; border-radius:20px; padding:22px 16px; background:#F3FBF9;
    text-align:center; cursor:pointer; font-weight:900; font-size:1.05rem; color:#2B7E71; }
  .sc-photo-drop span{ font-size:2.6rem; line-height:1; }
  .sc-photo-drop.off{ opacity:.55; cursor:not-allowed; }
  .sc-photo-prev{ width:100%; border-radius:16px; border:4px solid #fff; box-shadow:0 6px 16px rgba(0,0,0,.12); display:block; }
  .sc-progress{ height:10px; border-radius:99px; background:#EDE5D8; overflow:hidden; width:100%; }
  .sc-progress div{ height:100%; background:#3FA796; transition:width .2s; }
  .sc-small{ margin:0; font-size:.82rem; color:#5D6B82; text-align:center; line-height:1.7; }
  .sc-msg{ border-radius:14px; padding:10px 14px; font-weight:800; font-size:.95rem; line-height:1.7; background:#FFF6DF; color:#7A5B12; text-align:center; }
  .sc-msg.ok{ background:#ECFDF5; color:#065F46; }

  .sc-send{ width:100%; min-height:62px; border:none; border-radius:20px; background:#E8B84B; color:#1A2B4A; font-weight:900; font-size:1.25rem; cursor:pointer;
    box-shadow:0 6px 0 #C99A2E; }
  .sc-send:active:not(:disabled){ transform:translateY(3px); box-shadow:0 3px 0 #C99A2E; }
  .sc-send:disabled{ opacity:.5; cursor:not-allowed; }
  .sc-banner{ border-radius:18px; padding:12px 16px; font-weight:800; line-height:1.7; display:flex; gap:10px; align-items:center; }
  .sc-banner.sent{ background:#DDF3EF; color:#1F6E62; }
  .sc-banner.preview{ background:#EEF2FF; color:#3730A3; }
  .sc-banner span{ font-size:1.5rem; }

  .sc-review{ background:#fff; border-radius:24px; padding:16px; border:3px solid #E8B84B; display:flex; flex-direction:column; gap:12px; box-shadow:0 8px 22px rgba(232,184,75,.25); }
  .sc-review-head{ display:flex; gap:12px; align-items:center; }
  .sc-review-big{ font-size:2.6rem; line-height:1; }
  .sc-review h2{ margin:0; font-size:1.25rem; font-weight:900; }
  .sc-review-head p{ margin:2px 0 0; color:#5D6B82; font-weight:700; }
  .sc-crit-grid{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
  .sc-crit{ background:#FAF7F2; border-radius:16px; padding:8px; text-align:center; display:flex; flex-direction:column; gap:2px; }
  .sc-crit b{ font-size:.88rem; }
  .sc-stickers{ display:flex; flex-wrap:wrap; gap:8px; }
  .sc-sticker{ background:#FFF6DF; color:#7A5B12; border-radius:999px; padding:6px 14px; font-weight:900; font-size:.95rem; }
  .sc-comment{ margin:0; background:#F3FBF9; border-radius:16px; padding:12px 14px; font-size:1.05rem; line-height:1.8; font-weight:700; color:#1F6E62; }
  .sc-mywork{ display:flex; flex-direction:column; gap:10px; }
  .sc-mywork-text{ margin:0; font-family:var(--font-tajawal),'Tajawal',sans-serif; font-size:1.2rem; line-height:2; white-space:pre-wrap; background:#FFFDF8;
    border-radius:16px; padding:12px 14px; border:2px solid #EDE5D8; }

  .sc-done{ position:fixed; inset:0; z-index:300; background:rgba(14,22,38,.6); display:grid; place-items:center; padding:20px; overflow:hidden; }
  .sc-done-card{ background:#fff; border-radius:28px; padding:26px 20px; text-align:center; display:flex; flex-direction:column; gap:10px; align-items:center;
    max-width:360px; width:100%; animation:scPop .35s ease; position:relative; z-index:1; }
  .sc-done-card .big{ font-size:3.6rem; line-height:1; }
  .sc-done-card h2{ margin:0; font-size:1.4rem; font-weight:900; }
  .sc-done-card p{ margin:0; color:#5D6B82; line-height:1.8; font-weight:600; }
  .sc-done-card .pts{ background:#FFF6DF; color:#7A5B12; border-radius:999px; padding:6px 16px; font-weight:900; font-size:1.1rem; }
  .sc-done-card .sc-send{ min-height:54px; font-size:1.05rem; }
  .sc-confetti{ position:absolute; inset:0; pointer-events:none; }
  .sc-confetti span{ position:absolute; top:-14px; width:10px; height:14px; animation:scFall 1.8s ease-in forwards; }

  @keyframes scPulse{ 0%,100%{ transform:translate(-50%,-50%) scale(1) } 50%{ transform:translate(-50%,-50%) scale(1.12) } }
  @keyframes scBeat{ 0%,100%{ transform:scale(1) } 50%{ transform:scale(1.08) } }
  @keyframes scFade{ from{ opacity:0 } to{ opacity:1 } }
  @keyframes scPop{ 0%{ transform:scale(.7); opacity:0 } 70%{ transform:scale(1.06); opacity:1 } 100%{ transform:scale(1) } }
  @keyframes scFall{ to{ transform:translateY(110vh) rotate(540deg); } }
  @keyframes scShimmer{ to{ background-position:-200% 0 } }
  @media (prefers-reduced-motion: reduce){ .sc *{ animation:none !important; } .sc-confetti{ display:none; } }

  @media (min-width: 980px){
    .sc-layout{ grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr); gap:20px; }
    .sc-layout .sc-col.stick{ position:sticky; top:76px; }
  }
  @media (max-width: 640px){
    .sc-main{ padding:12px; gap:12px; }
    .sc-top-in{ padding:8px 12px; }
    .sc-top h1{ font-size:1rem; }
    .sc-hero{ padding:16px; border-radius:22px; }
    .sc-hero h2{ font-size:1.25rem; }
    .sc-hero-ico{ font-size:2.4rem; }
    .sc-grid{ grid-template-columns:minmax(0,1fr); }
    .sc-scene{ border-width:4px; border-radius:20px; }
    .sc-prompt p{ font-size:1.05rem; }
    .sc-feel button{ width:56px; min-height:66px; }
    .sc-crit-grid{ grid-template-columns:minmax(0,1fr); }
    .sc-crit{ flex-direction:row; justify-content:space-between; align-items:center; padding:8px 12px; }
    .sc-text{ font-size:1.15rem; }
  }
`;
