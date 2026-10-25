'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Navbar from '../../../../components/Navbar';
import { createClient } from '../../../../lib/supabase';
import { HUROOF_COUNT, HUROOF_DEFAULT_SETTINGS, mergeLetters, normalizeHuroofSettings, huroofTarget } from '../../../../lib/huroof';
import { checkSpelling } from '../../../../lib/huroof-spell';
import { ChallengeCard, FaheemPath, RiddleSheet, Confetti, CHALLENGE_CSS } from '../Challenge';
import { LetterSheet, SHEET_CSS } from '../LetterSheet';

/* ════════════════════════════════════════════════════════════════
   صفحة تجربة جانبية لحرف واحد (طلب الأستاذ محمد 2026-10-25) — للمعلم ليجرّب ما يراه الطفل:
   عند كتابة الكلمة صحيحة تظهر مباشرة بطاقة الحرف التي صنعها المعلم (اعتُمد وعُمِّم على الصفحة الرئيسية).
   لا تُسجَّل نقاط ولا تقدّم هنا: التدقيق في المتصفح فقط.
════════════════════════════════════════════════════════════════ */

function TryOne() {
  const params = useSearchParams();
  const raw = params.get('l');
  const pick = raw === null || raw === '' ? NaN : Number(raw);   // Number(null) = 0 ← لا نريد الألف خطأً
  const [idx, setIdx] = useState(Number.isInteger(pick) && pick >= 0 && pick < HUROOF_COUNT ? pick : 1);   // الباء — بطاقة البيت
  const [user, setUser] = useState(null);
  const [rows, setRows] = useState([]);
  const [settings, setSettings] = useState(HUROOF_DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [riddle, setRiddle] = useState(false);
  const [card, setCard] = useState(null);       // { cheer } حين تظهر بطاقة الحرف
  const [solved, setSolved] = useState(false);
  const [pathCount, setPathCount] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [hint, setHint] = useState(0);
  const [burst, setBurst] = useState(0);
  const [round, setRound] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => { createClient().auth.getUser().then(({ data: { user: u } }) => setUser(u)); }, []);
  useEffect(() => {
    fetch(`/api/huroof?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (Array.isArray(j?.rows)) setRows(j.rows); if (j?.settings) setSettings(normalizeHuroofSettings(j.settings)); })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => () => audioRef.current?.pause(), []);

  const letters = useMemo(() => mergeLetters(rows), [rows]);
  const letter = letters[idx];

  // فهيم يتقدّم بعد إغلاق بطاقة الحرف — ليرى الطفل خطوته
  useEffect(() => {
    if (riddle || card) return;
    const t = setTimeout(() => setPathCount(solved ? 1 : 0), 200);
    return () => clearTimeout(t);
  }, [riddle, card, solved]);

  // تسجيلات المعلم وحدها، وصوت واحد في كل لحظة (القاعدة 7.2.1)
  function play(url) {
    const el = audioRef.current || (audioRef.current = new Audio());
    el.pause();
    if (!url) return;
    el.src = url;
    el.play().catch(() => {});
  }
  function reset(nextIdx = idx) {
    audioRef.current?.pause();
    setIdx(nextIdx); setRiddle(false); setCard(null); setSolved(false); setPathCount(0);
    setAttempts(0); setHint(0); setRound(r => r + 1);
  }

  return (
    <>
      <Navbar user={user} />
      <main className="page-wrap">
        <div className="container" dir="rtl" style={{ maxWidth: 720 }}>
          <style>{SHEET_CSS + CHALLENGE_CSS + `
            .ht-stage { display:flex; gap:14px; align-items:stretch; }
            .ht-center { flex:1; min-width:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px;
              background:linear-gradient(180deg,#FFFDF7,#F3EFFF); border:2px solid #EDE5D8; border-radius:24px; padding:20px 12px; }
            .ht-center .hc-card { width:min(46vw, 180px); }
            .ht-center .hc-q, .ht-center .hc-l { font-size:4.2rem; }
            .ht-center .hc-n { display:block; font-size:1rem; }
            .ht-hint { font-weight:800; color:#52627E; text-align:center; line-height:1.8; font-size:.95rem; }
            .ht-btn { min-height:48px; border-radius:14px; border:2px solid #E2D9FF; background:#fff; color:#7C5CD9; font-family:inherit; font-weight:800; font-size:.95rem; padding:8px 18px; cursor:pointer; }
            .ht-pick { min-height:46px; border-radius:12px; border:2px solid #EDE5D8; font-family:inherit; font-weight:700; padding:0 10px; background:#fff; }
          `}</style>

          <div style={{ marginBottom: 14 }}>
            <Link href="/library/huroof" style={{ color: '#1A2B4A', fontSize: '.86rem', fontWeight: 700, textDecoration: 'none' }}>← الحروف الهجائية</Link>
          </div>
          <h1 style={{ fontWeight: 900, color: '#1e293b', fontSize: '1.45rem', margin: '0 0 6px' }}>🧪 تجربة حرف واحد</h1>
          <p style={{ color: '#64748b', fontSize: '.9rem', margin: '0 0 14px', lineHeight: 1.8 }}>
            هنا ترى ما يراه الطفل مع حرف واحد: يحلّ لغز فهيم، فتظهر بطاقتك مباشرة. لا تُسجَّل نقاط ولا تقدّم في هذه الصفحة.
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontWeight: 800, color: '#1A2B4A', fontSize: '.9rem', marginBottom: 14 }}>
            الحرف:
            <select className="ht-pick" value={idx} onChange={e => reset(Number(e.target.value))}>
              {letters.map((l, i) => <option key={i} value={i}>{l.l} — {l.word}</option>)}
            </select>
          </label>

          {!loaded ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: '#64748b', fontWeight: 800 }}>فهيم يجهّز التجربة…</div>
          ) : (
            <div className="ht-stage">
              <div className="ht-center">
                <ChallengeCard key={round} data={letter} pos={idx} state={solved ? 'solved' : 'closed'}
                  onClick={() => (solved ? (play(letter.letter_audio_url), setCard({ cheer: null })) : setRiddle(true))} />
                <div className="ht-hint">{solved ? '✅ كُشف الحرف وتقدّم فهيم محطة — اضغط البطاقة لتراها مرة أخرى' : '👆 اضغط البطاقة لتفتح لغز فهيم'}</div>
                {solved && <button type="button" className="ht-btn" onClick={() => reset()}>↺ أعد التجربة</button>}
              </div>
              <FaheemPath count={pathCount} letters={[letter.l]} />
            </div>
          )}
        </div>
      </main>

      {riddle && letter && (
        <RiddleSheet
          key={`${round}-${idx}`}
          letter={letter}
          pos={idx}
          settings={settings}
          solvedCount={solved ? 1 : 0}
          attempts={attempts}
          hintLevel={hint}
          onAttempt={() => setAttempts(a => a + 1)}
          onHint={() => setHint(h => Math.min(3, h + 1))}
          verify={async (value) => {
            const r = checkSpelling(value, huroofTarget(letter), { allowAl: settings.accept_al });
            return r.ok ? { ok: true } : { ok: false, result: r };
          }}
          onSolved={() => {
            setRiddle(false); setSolved(true); setBurst(Date.now());
            setCard({ cheer: `🎉 أَحْسَنْتَ! كَشَفْتَ حَرْفَ «${letter.name}»` });
          }}
          onClose={() => { audioRef.current?.pause(); setRiddle(false); }}
          onPlay={play}
        />
      )}

      {card && letter && (
        <LetterSheet data={letter} index={idx} cheer={card.cheer} onPlay={play}
          onClose={() => { audioRef.current?.pause(); setCard(null); }} />
      )}

      <Confetti burst={burst} />
    </>
  );
}

export default function HuroofTryPage() {
  return <Suspense fallback={null}><TryOne /></Suspense>;
}
