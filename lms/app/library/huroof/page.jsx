'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Navbar from '../../../components/Navbar';
import { createClient } from '../../../lib/supabase';
import { childFetch } from '../../../lib/child-fetch';
import { getRole } from '../../../lib/auth-role';
import { HUROOF_COUNT, HUROOF_DEFAULT_SETTINGS, mergeLetters, normalizeHuroofSettings, shuffledOrder } from '../../../lib/huroof';
import { PALETTE, ChallengeCard, FaheemPath, RiddleSheet, Confetti, CHALLENGE_CSS } from './Challenge';
import { LetterSheet, loadImage, SHEET_CSS } from './LetterSheet';

/* أدوات المعلم/المدير تُحمَّل عند فتحها فقط — لا تصل إلى حزمة الطالب */
const LetterEditor = dynamic(() => import('./LetterEditor'), { ssr: false, loading: () => null });
const HuroofAdmin  = dynamic(() => import('./HuroofAdmin'),  { ssr: false, loading: () => null });

const STAFF_ROLES = ['teacher', 'admin', 'super_admin'];
const ALPHA = Array.from({ length: HUROOF_COUNT }, (_, i) => i);

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

export default function HuroofPage() {
  const [user,     setUser]     = useState(null);
  const [active,   setActive]   = useState(null);   // بطاقة الحرف المفتوحة (LetterSheet)
  const [seen,     setSeen]     = useState(new Set());
  const [rows,     setRows]     = useState([]);     // تعديلات الإدارة من huroof_letters
  const [settings, setSettings] = useState(HUROOF_DEFAULT_SETTINGS);
  const [loaded,   setLoaded]   = useState(false);  // الحروف والإعدادات وصلت (لا نكشف الحروف قبل معرفة الوضع)
  const [prog,     setProg]     = useState(null);   // { epoch, solved: [{idx}], seed }
  const [editing,  setEditing]  = useState(null);   // فهرس الحرف المفتوح في المحرر
  const [adminOpen, setAdminOpen] = useState(false);
  // التحدّي
  const [riddle,   setRiddle]   = useState(null);   // فهرس اللغز المفتوح
  const [note,     setNote]     = useState(null);
  const [current,  setCurrent]  = useState(null);   // لغز بدأه الطفل ولم يحلّه بعد
  const [attempts, setAttempts] = useState({});
  const [hints,    setHints]    = useState({});
  const [pathCount, setPathCount] = useState(0);    // موضع فهيم المعروض (يتقدّم بعد إغلاق النافذة ليراه الطفل)
  const [burst,    setBurst]    = useState(0);
  const [finale,   setFinale]   = useState(false);
  const [cheer,    setCheer]    = useState(null);   // شريط «أحسنت» فوق صورة البطاقة لحظة كشف الحرف
  const pointsGivenRef     = useRef(new Set());
  const completionBonusRef = useRef(false);
  const audioRef           = useRef(null);

  const letters = useMemo(() => mergeLetters(rows), [rows]);
  const isStaff = STAFF_ROLES.includes(getRole(user) ?? '');
  const challenge = settings.mode === 'challenge';

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user: u } }) => setUser(u));
  }, []);

  // محتوى يتحكم فيه المعلم ويراه الطفل: يُجلب حيّاً بلا كاش وعند العودة للتبويب
  // (القسم 9.5)، وعند أي فشل يبقى المحتوى الافتراضي بصمت.
  useEffect(() => {
    let alive = true;
    const load = () => fetch(`/api/huroof?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (!alive) return;
        if (Array.isArray(j?.rows)) setRows(j.rows);
        if (j?.settings) setSettings(normalizeHuroofSettings(j.settings));
      })
      .catch(() => {})
      .finally(() => alive && setLoaded(true));
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    load();
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  // مسار الطالب في الجولة الحالية (حساب العائلة: الطفل النشط)
  const loadProgress = useCallback(() => childFetch(`/api/huroof/progress?t=${Date.now()}`, { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then(j => { setProg(j && Array.isArray(j.solved) ? j : { epoch: 0, solved: [], seed: 'guest' }); })
    .catch(() => setProg({ epoch: 0, solved: [], seed: 'guest' })), []);
  useEffect(() => { loadProgress(); }, [loadProgress, settings.epoch]);

  const solvedIdx = useMemo(() => (prog?.solved ?? []).map(s => s.idx), [prog]);
  const solvedSet = useMemo(() => new Set(solvedIdx), [solvedIdx]);
  const complete  = solvedIdx.length >= HUROOF_COUNT;
  const order = useMemo(
    () => (settings.shuffle && prog?.seed && !complete ? shuffledOrder(prog.seed) : ALPHA),
    [settings.shuffle, prog?.seed, complete],
  );
  const curKey = prog?.seed ? `huroof-current:${prog.seed}` : null;

  // اللغز الذي بدأه الطفل يبقى «مفتوحاً» حتى يحلّه — ولو أغلق الصفحة وعاد
  useEffect(() => {
    if (!curKey) return;
    try {
      const v = Number(localStorage.getItem(curKey));
      setCurrent(Number.isInteger(v) && v >= 0 && v < HUROOF_COUNT && !solvedSet.has(v) && localStorage.getItem(curKey) !== null ? v : null);
    } catch { setCurrent(null); }
  }, [curKey, solvedSet]);
  const remember = (idx) => {
    setCurrent(idx);
    try { if (curKey) { if (idx === null) localStorage.removeItem(curKey); else localStorage.setItem(curKey, String(idx)); } } catch {}
  };

  // فهيم يتقدّم على مساره حين تُغلق النوافذ — ليرى الطفل خطوته
  useEffect(() => {
    if (riddle !== null || active !== null) return;
    const t = setTimeout(() => setPathCount(solvedIdx.length), 180);
    return () => clearTimeout(t);
  }, [riddle, active, solvedIdx.length]);

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
    setCheer(null);
    if (challenge) setActive(i); else toggle(i);
  }

  function savedRow(idx, row) {
    setRows(prev => [...prev.filter(r => r.idx !== idx), ...(row ? [row] : [])]);
  }

  /* وضع الاستكشاف (القديم، يختاره المعلم): الحروف مكشوفة مرتبة، ونقاط لكل حرف يشاهده */
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

  /* وضع التحدّي: بطاقة مغلقة ← لغز فهيم. لا تُفتح بطاقة أخرى قبل حلّ اللغز المفتوح (إن طلب المعلم) */
  function openCard(idx) {
    if (solvedSet.has(idx)) { play(letters[idx].letter_audio_url); setActive(idx); return; }
    if (settings.lock_current && current !== null && current !== idx && !solvedSet.has(current)) {
      setNote('لِنُكْمِلْ هَذَا اللُّغْزَ أَوَّلًا، أَنْتَ قَادِرٌ! 💪');
      setRiddle(current);
      return;
    }
    remember(idx);
    setNote(null);
    setRiddle(idx);
  }
  /* الحلّ ← تُغلق نافذة اللغز وتظهر بطاقة الحرف التي صنعها المعلم مباشرة (صورته وكلمته وجملته وأصواته)
     مع شريط «أحسنت» صغير يختفي وحده — اختيار الأستاذ محمد بعد صفحة التجربة. فهيم يتقدّم حين تُغلق البطاقة */
  function solved(j, idx) {
    setProg(p => ({ ...(p || {}), solved: j.solved }));
    remember(null);
    setBurst(Date.now());
    setRiddle(null); setNote(null);
    setCheer(`🎉 أَحْسَنْتَ! كَشَفْتَ حَرْفَ «${letters[idx].name}»`);
    setActive(idx);
    if (j.complete) setFinale(true);
  }
  const closeRiddle = () => { audioRef.current?.pause(); setRiddle(null); setNote(null); };

  const progress = Math.round((seen.size / HUROOF_COUNT) * 100);
  const ready = loaded && (!challenge || prog);
  const cardState = (i) => (solvedSet.has(i) ? 'solved' : i === current ? 'current'
    : settings.lock_current && current !== null && !solvedSet.has(current) ? 'locked' : 'closed');

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap">
        <div className="container" dir="rtl">
          <style>{SHEET_CSS + CHALLENGE_CSS}</style>

          {/* Breadcrumb */}
          <div style={{ marginBottom: 18 }}>
            <Link href="/library"
              style={{ color: '#1A2B4A', fontSize: '.86rem', fontWeight: 700, textDecoration: 'none' }}>
              ← المكتبة
            </Link>
          </div>

          {/* Header */}
          <div style={{ marginBottom: 18 }}>
            <h1 style={{ fontWeight: 900, color: '#1e293b', fontSize: '1.55rem', margin: '0 0 5px' }}>
              🔤 الحروف الهجائية
            </h1>
            <p style={{ color: '#64748b', fontSize: '.92rem', margin: 0, lineHeight: 1.8 }}>
              {!ready ? '…'
                : challenge && !complete ? 'افتح بطاقة، وحُلَّ لغز فهيم، واكتب الكلمة صحيحة لتكشف الحرف ويتقدّم فهيم في مساره! 🧩'
                  : `اضغط على أي حرف لسماع نطقه واستكشاف كلمة جديدة — ${HUROOF_COUNT} حرفاً`}
            </p>
          </div>

          {/* للمعلم/المدير: لوحة التحكم + كيف يعدّل محتوى الحروف */}
          {isStaff && (
            <div style={{
              marginBottom: 18, background: '#FFFBEB', border: '2px solid #E8B84B', borderRadius: 14,
              padding: '10px 14px', color: '#1A2B4A', fontSize: '.85rem', fontWeight: 700, lineHeight: 1.8,
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between',
            }}>
              <span style={{ flex: '1 1 260px' }}>
                ✏️ وضع المعلم: من «لوحة التحكم» عدّل ألغاز فهيم وكلمات الإملاء وقواعده، واختر إظهار المسار أو إعادة ضبطه. وفي بطاقة أي حرف «تعديل الحرف» لصورته وأصواته وجملته.
              </span>
              <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setAdminOpen(true)} style={{
                  minHeight: 44, borderRadius: 12, border: 'none', background: '#1A2B4A', color: '#fff',
                  fontFamily: 'inherit', fontWeight: 800, fontSize: '.9rem', padding: '8px 16px', cursor: 'pointer',
                }}>⚙️ لوحة تحكم التحدي</button>
                {/* صفحة التجربة الجانبية: حرف واحد بلا نقاط ولا تقدّم (للمعلم فقط) */}
                <Link href="/library/huroof/try" style={{
                  minHeight: 44, borderRadius: 12, border: '2px solid #1A2B4A', background: '#fff', color: '#1A2B4A',
                  fontWeight: 800, fontSize: '.9rem', padding: '8px 16px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box',
                }}>🧪 تجربة حرف واحد</Link>
              </span>
            </div>
          )}

          {!ready ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b', fontWeight: 800 }}>
              <img src="/faheem.png" alt="" style={{ width: 70, height: 'auto', display: 'block', margin: '0 auto 10px' }} />
              فهيم يجهّز لك التحدي…
            </div>
          ) : challenge ? (
            <>
              {complete && (
                <div className="hc-done-banner">🏆 أحسنت! وصل فهيم إلى القمة — كشفتَ الحروف الثمانية والعشرين، وها هي مرتّبة. اضغط أي حرف لتراه وتسمعه.</div>
              )}
              {!settings.show_path && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', color: '#64748b', marginBottom: 5 }}>
                    <span>تقدّمك في التحدي</span><span style={{ fontWeight: 800 }}>{solvedIdx.length} / {HUROOF_COUNT}</span>
                  </div>
                  <div style={{ height: 9, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(solvedIdx.length / HUROOF_COUNT) * 100}%`, background: 'linear-gradient(90deg,#E8B84B,#1a7c40)', borderRadius: 99, transition: 'width .4s ease' }} />
                  </div>
                </div>
              )}
              <div className="hc-board">
                <div className="hc-grid">
                  {order.map((i, pos) => (
                    <ChallengeCard key={i} data={letters[i]} pos={complete ? i : pos} state={cardState(i)} onClick={() => openCard(i)} />
                  ))}
                </div>
                {settings.show_path && (
                  <FaheemPath count={pathCount} letters={solvedIdx.map(i => letters[i].l)} />
                )}
              </div>
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '.8rem', marginTop: 24, lineHeight: 1.8 }}>
                💡 لا تعرف الكلمة؟ اضغط «ساعدني» في نافذة اللغز
              </p>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </main>

      {/* بطاقة الحرف — خارج الشبكة كي لا تكسر التخطيط. في التحدّي: للحروف المحلولة، والسهمان بعد الإكمال فقط */}
      {active !== null && (
        <LetterSheet
          data={letters[active]}
          index={active}
          cheer={cheer}
          onClose={() => { audioRef.current?.pause(); setActive(null); setCheer(null); }}
          onPlay={play}
          onPrev={(!challenge || complete) && active > 0 ? () => goTo(active - 1) : null}
          onNext={(!challenge || complete) && active < letters.length - 1 ? () => goTo(active + 1) : null}
          onEdit={isStaff ? () => { audioRef.current?.pause(); setEditing(active); setActive(null); } : null}
        />
      )}

      {riddle !== null && (
        <RiddleSheet
          key={riddle}
          letter={letters[riddle]}
          pos={Math.max(0, order.indexOf(riddle))}
          settings={settings}
          solvedCount={solvedIdx.length}
          attempts={attempts[riddle] ?? 0}
          hintLevel={hints[riddle] ?? 0}
          note={note}
          onAttempt={() => setAttempts(a => ({ ...a, [riddle]: (a[riddle] ?? 0) + 1 }))}
          onHint={() => setHints(h => ({ ...h, [riddle]: Math.min(3, (h[riddle] ?? 0) + 1) }))}
          onSolved={(j) => solved(j, riddle)}
          onClose={closeRiddle}
          onEdit={isStaff ? () => { const i = riddle; closeRiddle(); setEditing(i); } : null}
          onPlay={play}
        />
      )}

      {finale && riddle === null && active === null && (
        <>
          <div className="hf-backdrop" onClick={() => setFinale(false)} />
          <div className="hf-card" role="dialog" aria-modal="true" aria-label="أكملت التحدي" style={{ '--pal': '#E8B84B', '--pal-l': '#FFF3D6', alignItems: 'center' }}>
            <img src="/faheem.png" alt="فهيم" style={{ width: 110, height: 'auto' }} />
            <div style={{ fontSize: '1.7rem', fontWeight: 900, color: '#1A2B4A' }}>🏆 وَصَلَ فَهِيمٌ إِلَى الْقِمَّةِ!</div>
            <p style={{ margin: 0, fontFamily: 'var(--font-naskh), serif', fontWeight: 700, fontSize: '1.2rem', lineHeight: 1.9, color: '#52627E' }}>
              كَشَفْتَ الْحُرُوفَ الثَّمَانِيَةَ وَالْعِشْرِينَ كُلَّهَا، وَكَتَبْتَ كَلِمَاتِهَا صَحِيحَةً. أَنْتَ بَطَلُ الْحُرُوفِ! ⭐
            </p>
            <button type="button" className="hc-btn hc-go" style={{ width: '100%' }} onClick={() => setFinale(false)}>🔤 شَاهِدْ حُرُوفَكَ كُلَّهَا</button>
          </div>
        </>
      )}

      <Confetti burst={burst} />

      {adminOpen && isStaff && (
        <HuroofAdmin
          letters={letters}
          settings={settings}
          onSettings={setSettings}
          onEdit={(i) => setEditing(i)}
          onProgressChanged={loadProgress}
          onClose={() => setAdminOpen(false)}
        />
      )}

      {editing !== null && (
        <LetterEditor
          key={editing}
          letter={letters[editing]}
          settings={settings}
          onClose={() => setEditing(null)}
          onSaved={(row) => savedRow(editing, row)}
        />
      )}
    </>
  );
}
