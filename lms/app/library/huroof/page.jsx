'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import LetterEditor from './LetterEditor';
import { createClient } from '../../../lib/supabase';
import { childFetch } from '../../../lib/child-fetch';
import { getRole } from '../../../lib/auth-role';
import { HUROOF_COUNT, mergeLetters } from '../../../lib/huroof';

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

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  let done = false;
  function go() {
    if (done) return;
    done = true;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ar-SA';
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  }
  if (window.speechSynthesis.getVoices().length > 0) go();
  else {
    window.speechSynthesis.addEventListener('voiceschanged', go, { once: true });
    setTimeout(go, 600);
  }
}

function LetterCard({ data, index, active, onToggle, onPlay, showBadges }) {
  const pal = PALETTE[index % PALETTE.length];

  return (
    <button
      onClick={() => { onPlay(data.letter_audio_url, data.name); onToggle(index); }}
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

/* ── Bottom sheet shown when a letter is selected ── */
function LetterSheet({ data, index, onClose, onPlay, onEdit }) {
  const pal = PALETTE[index % PALETTE.length];
  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1200,
          background: 'rgba(0,0,0,.45)',
          backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
          animation: 'hfFadeIn .2s ease',
        }}
      />
      {/* sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1201,
        background: '#fff',
        borderRadius: '24px 24px 0 0',
        padding: '20px 24px calc(40px + env(safe-area-inset-bottom, 0px))',
        textAlign: 'center',
        fontFamily: "'Cairo','Tajawal',sans-serif",
        direction: 'rtl',
        animation: 'hfSlideUp .28s cubic-bezier(.4,0,.2,1)',
        boxShadow: '0 -8px 40px rgba(0,0,0,.18)',
        maxWidth: 520,
        margin: '0 auto',
      }}>
        {/* drag handle */}
        <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 99, margin: '0 auto 20px' }} />

        {/* letter badge */}
        <div style={{
          width: 88, height: 88, borderRadius: '50%', margin: '0 auto 16px',
          background: `linear-gradient(145deg, ${pal.main}, ${pal.main}cc)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '3rem', fontWeight: 900, color: '#fff',
          boxShadow: `0 8px 24px ${pal.main}50`,
        }}>
          {data.l}
        </div>
        <div style={{ fontSize: '.9rem', color: pal.main, fontWeight: 700, marginBottom: 18 }}>
          {data.name}
        </div>

        {/* صورة الكلمة (إن رفعها المعلم) وإلا الإيموجي */}
        {data.image_url ? (
          <img
            src={data.image_url}
            alt={data.word}
            style={{
              display: 'block', width: 120, height: 120, objectFit: 'contain', margin: '0 auto 12px',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.12))',
            }}
          />
        ) : (
          <div style={{
            fontSize: '4rem', lineHeight: 1, marginBottom: 12,
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.12))',
          }}>
            {data.emoji}
          </div>
        )}

        {/* word */}
        <div style={{
          fontSize: '1.7rem', fontWeight: 900, color: pal.main, marginBottom: 12,
        }}>
          {data.word}
        </div>

        {/* sentence */}
        <div style={{
          fontSize: '.88rem', color: '#475569', lineHeight: 2,
          background: '#f8faff', borderRadius: 12,
          padding: '12px 16px', marginBottom: 20,
          border: `1.5px solid ${pal.main}20`,
        }}>
          {data.sentence}
        </div>

        {/* listen button */}
        <button
          onClick={() => onPlay(data.sentence_audio_url, `${data.word}. ${data.sentence}`)}
          style={{
            background: `linear-gradient(135deg, ${pal.main}, ${pal.main}cc)`,
            color: '#fff', border: 'none', borderRadius: 14,
            padding: '13px 32px', fontSize: '1rem', fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: `0 4px 14px ${pal.main}50`,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            width: '100%', justifyContent: 'center',
          }}
        >
          🔊 استمع
        </button>

        {onEdit && (
          <button
            onClick={onEdit}
            style={{
              marginTop: 10, width: '100%', minHeight: 46, borderRadius: 14,
              border: '2px dashed #E8B84B', background: '#FFFBEB', color: '#1A2B4A',
              fontSize: '.9rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            ✏️ تعديل الحرف — الصورة والأصوات والجملة
          </button>
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

  // صوت مسجَّل إن رفعه المعلم، وإلا قراءة الجهاز الآلية. عنصر صوت واحد مشترك،
  // يُشغَّل داخل معالج اللمسة نفسه (شرط سفاري على آيباد/آيفون).
  function play(url, fallbackText) {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    const el = audioRef.current || (audioRef.current = new Audio());
    el.pause();
    if (!url) { speak(fallbackText); return; }
    el.src = url;
    el.play().catch(() => speak(fallbackText));
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
            💡 اضغط على أي حرف لفتح التفاصيل · زر 🔊 يقرأ الكلمة والجملة كاملة
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
