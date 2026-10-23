'use client';
import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import LetterEditor from './LetterEditor';
import { createClient } from '../../../lib/supabase';
import { childFetch } from '../../../lib/child-fetch';
import { getRole } from '../../../lib/auth-role';
import { HUROOF_COUNT, mergeLetters, highlightLetter } from '../../../lib/huroof';

const STAFF_ROLES = ['teacher', 'admin', 'super_admin'];

const PALETTE = [
  { main: '#185FA5', light: '#dbeafe' },
  { main: '#1a7c40', light: '#dcfce7' },
  { main: '#b45309', light: '#fef3c7' },
  { main: '#7c3aed', light: '#ede9fe' },
  { main: '#be185d', light: '#fce7f3' },
  { main: '#0891b2', light: '#e0f2fe' },
  { main: '#b91c1c', light: '#fee2e2' },
  { main: '#065f46', light: '#d1fae5' },
  { main: '#1e40af', light: '#dbeafe' },
  { main: '#92400e', light: '#fef3c7' },
  { main: '#6b21a8', light: '#f3e8ff' },
  { main: '#166534', light: '#dcfce7' },
];

/* محتوى الحروف الافتراضي + تعديلات المعلم/الإدارة: lib/huroof.js (mergeLetters) */

function LetterCard({ data, index, active, onToggle, onPlay, showBadges }) {
  const pal = PALETTE[index % PALETTE.length];

  return (
    <button
      onClick={() => { onPlay(data.letter_audio_url); onToggle(index); }}
      style={{
        background: active
          ? `linear-gradient(145deg, ${pal.main}, ${pal.main}dd)`
          : pal.light,
        border: `2.5px solid ${pal.main}`,
        borderRadius: 16,
        padding: '22px 8px 14px',
        cursor: 'pointer',
        transition: 'all .22s ease',
        transform: active ? 'scale(1.06)' : 'scale(1)',
        boxShadow: active
          ? `0 8px 24px ${pal.main}55, inset 0 1px 0 rgba(255,255,255,.25)`
          : '0 2px 8px rgba(0,0,0,.07)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'inherit',
        width: '100%',
      }}
    >
      {active && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 14,
          background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,.22), transparent 70%)',
          pointerEvents: 'none',
        }} />
      )}
      <div style={{
        fontSize: '2.7rem', fontWeight: 900,
        color: active ? '#fff' : pal.main,
        lineHeight: 1, marginBottom: 7,
        textShadow: active ? '0 2px 8px rgba(0,0,0,.2)' : 'none',
        transition: 'color .22s',
      }}>
        {data.l}
      </div>
      <div style={{
        fontSize: '.68rem', color: active ? 'rgba(255,255,255,.88)' : '#64748b',
        fontWeight: 700, letterSpacing: '.01em', transition: 'color .22s',
      }}>
        {data.name}
      </div>
      {!active && (
        <div style={{
          position: 'absolute', top: 7, left: 8,
          width: 7, height: 7, borderRadius: '50%',
          background: pal.main, opacity: .35,
        }} />
      )}
      {/* للمعلم/المدير: علامة صغيرة على الحروف التي لها صوت مسجَّل أو صورة */}
      {showBadges && (data.letter_audio_url || data.sentence_audio_url || data.image_url) && (
        <div style={{ position: 'absolute', top: 4, right: 5, fontSize: '.62rem', lineHeight: 1 }}>
          {(data.letter_audio_url || data.sentence_audio_url) ? '🔊' : ''}{data.image_url ? '🖼️' : ''}
        </div>
      )}
    </button>
  );
}

/* ── بطاقة الحرف (اختيار الأستاذ محمد «الصورة أولاً» 2026-10-23): أرى ← أقرأ ← أسمع.
   صورة كبيرة في إطار أبيض، الكلمة والجملة بخط النسخ والحرف ملوّن فيهما، وثلاثة أزرار صوت.
   على الجوال تصعد من الأسفل، وعلى الحاسوب والآيباد نافذة في الوسط (التنسيق في <style> الصفحة) ── */
/* صور الحروف في الذاكرة: كل صورة تُجلب مرة واحدة وتُحفظ (رابط blob) فتظهر فوراً عند العودة إليها
   أو الانتقال بالسهمين — لا انتظار للشبكة ولا اعتماد على كاش المتصفح. إن تعذّر الجلب يُستعمل
   الرابط نفسه كما هو */
const imageCache = new Map();
function loadImage(url) {
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

function LetterSheet({ data, index, onClose, onPlay, onEdit, onPrev, onNext }) {
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

export default function HuroofPage() {
  const [user,    setUser]    = useState(null);
  const [active,  setActive]  = useState(null);
  const [seen,    setSeen]    = useState(new Set());
  const [rows,    setRows]    = useState([]);     // تعديلات الإدارة من huroof_letters
  const [editing, setEditing] = useState(null);   // فهرس الحرف المفتوح في المحرر
  const pointsGivenRef     = useRef(new Set());
  const completionBonusRef = useRef(false);
  const audioRef           = useRef(null);

  const letters = useMemo(() => mergeLetters(rows), [rows]);
  const isStaff = STAFF_ROLES.includes(getRole(user) ?? '');

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user: u } }) => setUser(u));
  }, []);

  // محتوى يتحكم فيه المعلم ويراه الطفل: يُجلب حيّاً بلا كاش وعند العودة للتبويب
  // (القسم 9.5)، وعند أي فشل يبقى المحتوى الافتراضي بصمت.
  useEffect(() => {
    let alive = true;
    const load = () => fetch(`/api/huroof?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (alive && Array.isArray(j?.rows)) setRows(j.rows); })
      .catch(() => {});
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    load();
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  // تسجيلات المعلم وحدها (طلب الأستاذ محمد 2026-10-23): لا صوت آلي ولا صوت جهاز أبداً في هذا
  // التدريب. عنصر صوت واحد مشترك ← صوت واحد في كل لحظة: كل ضغطة توقف ما قبلها.
  // يُشغَّل داخل معالج اللمسة نفسه (شرط سفاري على آيباد/آيفون). بلا تسجيل = صمت.
  function play(url) {
    const el = audioRef.current || (audioRef.current = new Audio());
    el.pause();
    if (!url) return;
    el.src = url;
    el.play().catch(() => {});
  }
  useEffect(() => () => audioRef.current?.pause(), []);   // مغادرة الصفحة توقف الصوت

  // صور الحرفين قبل المفتوح وبعده أولاً — السهمان ينقلان فوراً بلا انتظار
  useEffect(() => {
    if (active === null) return;
    [active + 1, active - 1, active + 2, active - 2].forEach(i => {
      const url = letters[i]?.image_url;
      if (url) loadImage(url);
    });
  }, [active, letters]);
  // وبقية صور الحروف في الخلفية بعد أن تهدأ الصفحة، واحدة تلو الأخرى — فأول فتح لأي حرف فوري أيضاً
  useEffect(() => {
    const urls = letters.map(l => l.image_url).filter(Boolean);
    if (!urls.length) return;
    let alive = true;
    const t = setTimeout(async () => {
      for (const u of urls) { if (!alive) return; await loadImage(u); }
    }, 1500);
    return () => { alive = false; clearTimeout(t); };
  }, [letters]);

  // السهمان في البطاقة: الحرف التالي/السابق كأن الطفل ضغطه (نطقه + «شاهدته» + النقاط)
  function goTo(i) {
    const d = letters[i];
    if (!d) return;
    play(d.letter_audio_url);
    toggle(i);
  }

  function savedRow(idx, row) {
    setRows(prev => [...prev.filter(r => r.idx !== idx), ...(row ? [row] : [])]);
  }

  function toggle(i) {
    const isNew = !seen.has(i);
    setActive(p => (p === i ? null : i));
    setSeen(s => new Set([...s, i]));

    if (isNew && user && !pointsGivenRef.current.has(i)) {
      pointsGivenRef.current.add(i);
      childFetch('/api/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: `huroof_letter:${i}` }),
      }).catch(() => {});

      if (seen.size + 1 === HUROOF_COUNT && !completionBonusRef.current) {
        completionBonusRef.current = true;
        childFetch('/api/points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'huroof_all_complete' }),
        }).catch(() => {});
      }
    }
  }

  const progress = Math.round((seen.size / HUROOF_COUNT) * 100);

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap">
        <div className="container" dir="rtl">
          <style>{`
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
            .huroof-grid { grid-template-columns: repeat(7, 1fr); }
            @media (max-width: 560px) { .huroof-grid { grid-template-columns: repeat(4, 1fr); } }
          `}</style>

          {/* Breadcrumb */}
          <div style={{ marginBottom: 18 }}>
            <Link href="/library"
              style={{ color: '#1A2B4A', fontSize: '.86rem', fontWeight: 700, textDecoration: 'none' }}>
              ← المكتبة
            </Link>
          </div>

          {/* Header */}
          <div style={{ marginBottom: 22 }}>
            <h1 style={{ fontWeight: 900, color: '#1e293b', fontSize: '1.55rem', margin: '0 0 5px' }}>
              🔤 الحروف الهجائية
            </h1>
            <p style={{ color: '#64748b', fontSize: '.88rem', margin: 0 }}>
              اضغط على أي حرف لسماع نطقه واستكشاف كلمة جديدة — {HUROOF_COUNT} حرفاً
            </p>
          </div>

          {/* للمعلم/المدير: كيف يعدّل محتوى الحروف */}
          {isStaff && (
            <div style={{
              marginBottom: 18, background: '#FFFBEB', border: '2px solid #E8B84B', borderRadius: 14,
              padding: '10px 14px', color: '#1A2B4A', fontSize: '.85rem', fontWeight: 700, lineHeight: 1.8,
            }}>
              ✏️ وضع المعلم: اضغط أي حرف ثم «تعديل الحرف» لتغيير صورته وكلمته وجملته وتسجيل صوت نطقه وصوت جملته — يراه الطلاب فوراً.
            </div>
          )}

          {/* Progress bar */}
          {seen.size > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: '.76rem', color: '#64748b', marginBottom: 5,
              }}>
                <span>تقدمك في الرحلة</span>
                <span style={{ fontWeight: 700 }}>
                  {seen.size} / {HUROOF_COUNT} حرف ({progress}%)
                </span>
              </div>
              <div style={{ height: 9, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #1A2B4A, #1a7c40)',
                  borderRadius: 99,
                  transition: 'width .4s ease',
                  boxShadow: '0 2px 6px rgba(26,43,74,.35)',
                }} />
              </div>
              {progress === 100 && (
                <div style={{
                  marginTop: 10, textAlign: 'center',
                  background: 'linear-gradient(135deg,#1a7c40,#1A2B4A)',
                  color: '#fff', borderRadius: 12,
                  padding: '10px 16px', fontSize: '.88rem', fontWeight: 800,
                  animation: 'hfDown .3s ease',
                }}>
                  🎉 أحسنت! تعلمت الحروف الهجائية الثمانية والعشرين كاملة!
                </div>
              )}
            </div>
          )}

          {/* Letters grid — 7 per row → 4 equal rows of 7 */}
          <div className="huroof-grid" style={{ display: 'grid', gap: 12, alignItems: 'start' }}>
            {letters.map((data, i) => (
              <LetterCard
                key={data.l}
                data={data}
                index={i}
                active={active === i}
                onToggle={toggle}
                onPlay={play}
                showBadges={isStaff}
              />
            ))}
          </div>

          {/* Footer tip */}
          <p style={{
            textAlign: 'center', color: '#94a3b8',
            fontSize: '.76rem', marginTop: 30, lineHeight: 1.8,
          }}>
            💡 اضغط على أي حرف لتفتح بطاقته، واسمع الحرف والجملة
          </p>
        </div>
      </main>

      {/* Bottom sheet — rendered outside grid so it never breaks layout */}
      {active !== null && (
        <LetterSheet
          data={letters[active]}
          index={active}
          onClose={() => { audioRef.current?.pause(); setActive(null); }}
          onPlay={play}
          onPrev={active > 0 ? () => goTo(active - 1) : null}
          onNext={active < letters.length - 1 ? () => goTo(active + 1) : null}
          onEdit={isStaff ? () => { audioRef.current?.pause(); setEditing(active); setActive(null); } : null}
        />
      )}

      {editing !== null && (
        <LetterEditor
          key={editing}
          letter={letters[editing]}
          onClose={() => setEditing(null)}
          onSaved={(row) => savedRow(editing, row)}
        />
      )}
    </>
  );
}
