'use client';
import { useState, useEffect, Fragment } from 'react';
import { highlightLetter } from '../../../lib/huroof';
import { PALETTE } from './Challenge';

/* بطاقة الحرف «الصورة أولاً» — مشتركة بين صفحة الحروف الهجائية وصفحة التجربة */

/* ── بطاقة الحرف (اختيار الأستاذ محمد «الصورة أولاً» 2026-10-23): أرى ← أقرأ ← أسمع.
   صورة كبيرة في إطار أبيض، الكلمة والجملة بخط النسخ والحرف ملوّن فيهما، وثلاثة أزرار صوت.
   على الجوال تصعد من الأسفل، وعلى الحاسوب والآيباد نافذة في الوسط (التنسيق في <style> الصفحة) ── */
/* صور الحروف في الذاكرة: كل صورة تُجلب مرة واحدة وتُحفظ (رابط blob) فتظهر فوراً عند العودة إليها
   أو الانتقال بالسهمين — لا انتظار للشبكة ولا اعتماد على كاش المتصفح. إن تعذّر الجلب يُستعمل
   الرابط نفسه كما هو */
const imageCache = new Map();
export function loadImage(url) {
  if (!imageCache.has(url)) {
    imageCache.set(url, fetch(url)
      .then(r => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then(b => URL.createObjectURL(b))
      .catch(() => url));
  }
  return imageCache.get(url);
}

/* صورة الإطار بطبقتين: عند الانتقال لحرف آخر تبقى الصورة السابقة ظاهرة تحت الجديدة حتى تُرسم
   الجديدة كاملة، ثم تُزال — فلا وميض ولا إطار فارغ ولو للحظة */
function FrameImage({ src, alt }) {
  const [layers, setLayers] = useState([]);
  useEffect(() => {
    let alive = true;
    loadImage(src).then(u => {
      const img = new Image();
      img.src = u;
      const add = () => {
        if (alive) setLayers(ls => (ls.length && ls[ls.length - 1] === u ? ls : [...ls.slice(-1), u]));
      };
      if (img.decode) img.decode().then(add, add); else add();
    });
    return () => { alive = false; };
  }, [src]);
  const top = layers.length - 1;
  return layers.map((u, i) => (
    <img key={u} src={u} alt={i === top ? alt : ''} aria-hidden={i === top ? undefined : true} decoding="sync"
      onLoad={i === top && layers.length > 1 ? () => setLayers(ls => ls.slice(-1)) : undefined} />
  ));
}

/* cheer: نص احتفال قصير يظهر فوق الصورة لحظة كشف الحرف في التحدّي ثم يختفي (البطاقة نفسها هي المكافأة) */
export function LetterSheet({ data, index, onClose, onPlay, onEdit, onPrev, onNext, cheer }) {
  const pal = PALETTE[index % PALETTE.length];

  // Esc يغلق، وسهما لوحة المفاتيح ينتقلان بين الحروف (يسار = التالي في العربية)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && onNext) onNext();
      else if (e.key === 'ArrowRight' && onPrev) onPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  const colored = (text) => highlightLetter(text, data.l).map((part, i) => (
    part.hl ? <span key={i} style={{ color: pal.main }}>{part.t}</span> : <Fragment key={i}>{part.t}</Fragment>
  ));

  return (
    <>
      <div className="hf-backdrop" onClick={onClose} />
      <div className="hf-card" role="dialog" aria-modal="true" aria-label={`حرف ${data.name}`}
        style={{ '--pal': pal.main, '--pal-l': pal.light }}>
        <div className="hf-top">
          <span className="hf-chip">
            <span className="hf-chip-l">{data.l}</span>
            <span className="hf-chip-n">{data.name}</span>
          </span>
          <button className="hf-x" onClick={onClose} aria-label="إغلاق">✕</button>
        </div>

        {/* صورة الكلمة (إن رفعها المعلم) وإلا الرمز التعبيري — والسهمان للحرف السابق والتالي */}
        <div className="hf-frame">
          {cheer && <div className="hf-cheer" role="status">{cheer}</div>}
          {onPrev && <button className="hf-arrow hf-prev" onClick={onPrev} aria-label="الحرف السابق">→</button>}
          {data.image_url
            ? <FrameImage src={data.image_url} alt={data.word} />
            : <span className="hf-emoji" aria-hidden="true">{data.emoji}</span>}
          {onNext && <button className="hf-arrow hf-next" onClick={onNext} aria-label="الحرف التالي">←</button>}
        </div>

        <div className="hf-word">{colored(data.word)}</div>
        {data.sentence && <div className="hf-sent">{colored(data.sentence)}</div>}

        {/* أزرار الصوت لتسجيلات المعلم وحدها (طلب الأستاذ محمد): لا صوت آلي ولا صوت جهاز —
            الزر يظهر فقط إن رُفع تسجيله */}
        {(data.letter_audio_url || data.sentence_audio_url) && (
          <div className="hf-btns">
            {data.letter_audio_url && (
              <button className="hf-sb hf-sb-l" onClick={() => onPlay(data.letter_audio_url)}>
                الحرف
              </button>
            )}
            {data.sentence_audio_url && (
              <button className="hf-sb hf-sb-s" onClick={() => onPlay(data.sentence_audio_url)}>
                الجملة
              </button>
            )}
          </div>
        )}

        {onEdit && (
          <button className="hf-edit" onClick={onEdit}>✏️ تعديل الحرف — الصورة والأصوات والجملة</button>
        )}
      </div>
    </>
  );
}

/* بطاقة الحرف «الصورة أولاً» + شبكة وضع الاستكشاف */
export const SHEET_CSS = `
            @keyframes hfDown {
              from { opacity:0; transform:translateY(-8px); }
              to   { opacity:1; transform:translateY(0); }
            }
            @keyframes hfFadeIn {
              from { opacity:0; }
              to   { opacity:1; }
            }
            @keyframes hfSlideUp {
              from { transform:translateY(100%); }
              to   { transform:translateY(0); }
            }
            /* بطاقة الحرف «الصورة أولاً» */
            .hf-backdrop { position:fixed; inset:0; z-index:1200; background:rgba(15,23,42,.5);
              backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px); animation:hfFadeIn .2s ease; }
            .hf-card { position:fixed; z-index:1201; left:0; right:0; bottom:0; margin:0 auto; max-width:520px;
              max-height:94dvh; overflow-y:auto; overscroll-behavior:contain; background:#fff; color:#1A2B4A;
              border-radius:28px 28px 0 0; padding:14px 16px calc(18px + env(safe-area-inset-bottom, 0px));
              display:flex; flex-direction:column; gap:12px; direction:rtl; text-align:center;
              box-shadow:0 -8px 40px rgba(0,0,0,.18); animation:hfSlideUp .28s cubic-bezier(.4,0,.2,1); }
            @keyframes hfPop {
              from { opacity:0; transform:translate(-50%,-46%) scale(.96); }
              to   { opacity:1; transform:translate(-50%,-50%) scale(1); }
            }
            @media (min-width: 641px) {
              .hf-card { top:50%; bottom:auto; left:50%; right:auto; width:min(460px, 92vw); max-width:none;
                transform:translate(-50%,-50%); border-radius:28px; padding:18px 20px 20px;
                box-shadow:0 24px 60px rgba(15,23,42,.35); animation:hfPop .25s cubic-bezier(.34,1.56,.64,1); }
            }
            .hf-top { display:flex; align-items:center; justify-content:space-between; gap:8px; }
            .hf-chip { display:inline-flex; align-items:center; gap:10px; background:var(--pal); color:#fff;
              border-radius:999px; padding:4px 18px 4px 6px; font-family:var(--font-naskh), serif; font-weight:700; }
            .hf-chip-l { width:44px; height:44px; border-radius:50%; background:#fff; color:var(--pal);
              display:inline-flex; align-items:center; justify-content:center; font-size:1.9rem; line-height:1; }
            .hf-chip-n { font-size:1.35rem; line-height:1.3; }
            .hf-x { width:48px; height:48px; flex-shrink:0; border-radius:50%; border:none; background:#F1F5F9;
              color:#1A2B4A; font-family:inherit; font-size:1.2rem; font-weight:900; cursor:pointer; }
            .hf-frame { position:relative; flex-shrink:0; height:clamp(150px, 30vh, 250px); background:#fff; overflow:hidden;
              border:3px solid var(--pal-l); border-radius:24px; padding:10px 58px; box-shadow:0 6px 18px rgba(26,43,74,.08);
              display:flex; align-items:center; justify-content:center; }
            /* الصورة تملأ الإطار كله (طلب الأستاذ محمد) والسهمان فوقها في مكانهما */
            .hf-frame img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
            .hf-emoji { font-size:clamp(4.5rem, 13vh, 7rem); line-height:1; }
            .hf-arrow { position:absolute; z-index:2; top:50%; transform:translateY(-50%); width:46px; height:46px; border-radius:50%;
              border:none; background:var(--pal-l); color:var(--pal); font-family:inherit; font-size:1.55rem; font-weight:900; line-height:1;
              cursor:pointer; box-shadow:0 4px 10px rgba(26,43,74,.15); }
            .hf-prev { right:8px; } .hf-next { left:8px; }
            .hf-word { font-family:var(--font-naskh), serif; font-weight:700; font-size:clamp(2.3rem, 7vh, 3.1rem); line-height:1.45; }
            .hf-sent { font-family:var(--font-naskh), serif; font-weight:600; font-size:1.55rem; line-height:1.85;
              background:#F7FAFF; border:2px solid var(--pal-l); border-radius:18px; padding:8px 14px; }
            .hf-btns { display:grid; grid-auto-flow:column; grid-auto-columns:minmax(0, 1fr); gap:8px; }
            .hf-sb { min-height:60px; border-radius:16px; border:none; font-family:inherit; font-size:1.2rem; font-weight:800;
              display:flex; flex-direction:column; align-items:center; justify-content:center; line-height:1.3; cursor:pointer; }
            .hf-sb-l { background:var(--pal); color:#fff; border-bottom:5px solid rgba(0,0,0,.28); }
            .hf-sb-s { background:#2ABB7A; color:#fff; border-bottom:5px solid #17784C; }
            .hf-sb:active, .hf-arrow:active { transform:translateY(2px); }
            .hf-arrow:active { transform:translateY(calc(-50% + 2px)); }
            .hf-edit { min-height:46px; border-radius:14px; border:2px dashed #E8B84B; background:#FFFBEB; color:#1A2B4A;
              font-family:inherit; font-size:.9rem; font-weight:800; cursor:pointer; }
            .hf-x:focus-visible, .hf-arrow:focus-visible, .hf-sb:focus-visible, .hf-edit:focus-visible { outline:3px solid #1A2B4A; outline-offset:2px; }
            @media (prefers-reduced-motion: reduce) { .hf-card, .hf-backdrop { animation:none; } }
            /* 28 ÷ 7 = 4 equal rows on desktop, 28 ÷ 4 = 7 equal rows on mobile */
            /* لحظة الكشف في التحدّي: شريط ذهبي فوق الصورة يختفي وحده */
            .hf-cheer { position:absolute; z-index:3; top:10px; left:50%; transform:translateX(-50%); max-width:calc(100% - 20px);
              background:#E8B84B; color:#1A2B4A; border-radius:999px; padding:6px 16px; font-weight:900; font-size:1.05rem;
              white-space:nowrap; overflow:hidden; text-overflow:ellipsis; box-shadow:0 6px 16px rgba(26,43,74,.25);
              animation:hfCheer 3s ease forwards; pointer-events:none; }
            @keyframes hfCheer { 0% { opacity:0; transform:translate(-50%,-10px) scale(.9); } 10%, 80% { opacity:1; transform:translate(-50%,0) scale(1); } 100% { opacity:0; transform:translate(-50%,-6px); } }
            @media (prefers-reduced-motion: reduce) { .hf-cheer { animation:none; } }
            .huroof-grid { grid-template-columns: repeat(7, 1fr); }
            @media (max-width: 560px) { .huroof-grid { grid-template-columns: repeat(4, 1fr); } }
`;
