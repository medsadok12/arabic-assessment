'use client';
import { useEffect, useRef, useState } from 'react';
import { childFetch } from '../../../lib/child-fetch';
import { HUROOF_COUNT, huroofTarget } from '../../../lib/huroof';
import { checkSpelling, normalizeArabic, displayAnswer } from '../../../lib/huroof-spell';

/* ════════════════════════════════════════════════════════════════
   تحدّي «الحروف الهجائية» (طلب الأستاذ محمد 2026-10-25):
   بطاقات مغلقة مخلوطة ← لغز فهيم ← الطفل يكتب الكلمة صحيحة إملاءً ← يُكشف الحرف
   ويصعد فهيم محطة في مساره (28 محطة على يسار الشاشة).
   المدقق (lib/huroof-spell.js) يعمل هنا للتغذية الراجعة الفورية، والخادم يعيد التدقيق
   قبل تسجيل الحرف ومنح نقاطه. الصوت: تسجيلات المعلم وحدها (القاعدة 7.2.1).
════════════════════════════════════════════════════════════════ */

export const PALETTE = [
  { main: '#185FA5', light: '#dbeafe' }, { main: '#1a7c40', light: '#dcfce7' }, { main: '#b45309', light: '#fef3c7' },
  { main: '#7c3aed', light: '#ede9fe' }, { main: '#be185d', light: '#fce7f3' }, { main: '#0891b2', light: '#e0f2fe' },
  { main: '#4338ca', light: '#e0e7ff' }, { main: '#065f46', light: '#d1fae5' }, { main: '#1e40af', light: '#dbeafe' },
  { main: '#92400e', light: '#fef3c7' }, { main: '#6b21a8', light: '#f3e8ff' }, { main: '#166534', light: '#dcfce7' },
];

/* ── بطاقة في لوحة التحدي: مغلقة «؟» / اللغز المفتوح / مقفلة حتى يُحلّ المفتوح / محلولة بحرفها ── */
export function ChallengeCard({ data, pos, state, onClick }) {
  const pal = PALETTE[pos % PALETTE.length];
  const solved = state === 'solved';
  const label = solved ? `حرف ${data.name}` : state === 'current' ? 'لغز فهيم المفتوح — أكمله' : state === 'locked' ? 'بطاقة مغلقة — أكمل اللغز المفتوح أولاً' : 'بطاقة مغلقة — افتح لغز فهيم';
  return (
    <button type="button" className={`hc-card hc-${state}`} onClick={onClick} aria-label={label}
      style={{ '--pal': pal.main, '--pal-l': pal.light }}>
      {solved ? (
        <>
          <span className="hc-l">{data.l}</span>
          <span className="hc-n">{data.name}</span>
          <span className="hc-ok" aria-hidden="true">✓</span>
        </>
      ) : (
        <>
          <span className="hc-q" aria-hidden="true">{state === 'current' ? '🧩' : '؟'}</span>
          {state === 'locked' && <span className="hc-lock" aria-hidden="true">🔒</span>}
          {state === 'closed' && <span className="hc-spark" aria-hidden="true">✨</span>}
        </>
      )}
    </button>
  );
}

/* ── مسار فهيم: 28 محطة تتعرّج من الأسفل إلى القمة 🏆؛ كل حرف محلول يُكتب في محطته،
   وفهيم يقف على آخر محطة وصلها ويقفز إليها حين يتقدّم ── */
const STOP_X = (i) => 50 + 27 * Math.sin(i * 0.85);
const STOP_Y = (i) => 94 - (i + 1) * (88 / HUROOF_COUNT);
export function FaheemPath({ count, letters }) {
  const pts = [[50, 98.5], ...Array.from({ length: HUROOF_COUNT }, (_, i) => [STOP_X(i), STOP_Y(i)])];
  const line = (n) => pts.slice(0, n + 1).map(([x, y]) => `${x},${y}`).join(' ');
  const [fx, fy] = pts[Math.min(count, HUROOF_COUNT)];
  return (
    <div className="hc-path" role="img" aria-label={`مسار فهيم: ${count} من ${HUROOF_COUNT} محطة`}>
      <svg className="hc-path-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={line(HUROOF_COUNT)} className="hc-road" />
        {count > 0 && <polyline points={line(count)} className="hc-road-done" />}
      </svg>
      <span className="hc-top" aria-hidden="true">🏆</span>
      {pts.slice(1).map(([x, y], i) => (
        <span key={i} className={`hc-stop${i < count ? ' hc-stop-done' : ''}${i === HUROOF_COUNT - 1 ? ' hc-stop-last' : ''}`}
          style={{ left: `${x}%`, top: `${y}%` }} aria-hidden="true">
          {i < count ? letters[i] : ''}
        </span>
      ))}
      <span className="hc-fh-walk" style={{ left: `${fx}%`, top: `${fy}%` }} aria-hidden="true">
        <img key={count} src="/faheem.png" alt="" className="hc-fh-path" />
      </span>
      <span className="hc-count">{count}/{HUROOF_COUNT}</span>
    </div>
  );
}

/* ── لوحة حروف عربية على الشاشة (بالترتيب الأبجدي) — كثير من الأطفال بلا لوحة عربية في أجهزتهم ── */
const KB_ROWS = [
  ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ'],
  ['د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص'],
  ['ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق'],
  ['ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي'],
  ['أ', 'إ', 'آ', 'ء', 'ؤ', 'ئ', 'ة'],
];
export function ArabicKeyboard({ onKey, onDelete, disabled }) {
  return (
    <div className="hc-kb" role="group" aria-label="لوحة الحروف العربية" dir="rtl">
      {KB_ROWS.flat().map(ch => (
        <button key={ch} type="button" className="hc-key" disabled={disabled} onClick={() => onKey(ch)} aria-label={`حرف ${ch}`}>{ch}</button>
      ))}
      <button type="button" className="hc-key" disabled={disabled} onClick={() => onKey('ى')} aria-label="ألف مقصورة">ى</button>
      <button type="button" className="hc-key hc-key-space" disabled={disabled} onClick={() => onKey(' ')} aria-label="مسافة">مسافة</button>
      <button type="button" className="hc-key hc-key-del" disabled={disabled} onClick={onDelete} aria-label="امسح آخر حرف">⌫ امسح</button>
    </div>
  );
}

/* ── قصاصات الاحتفال ── */
const CONF_C = ['#E8B84B', '#7C5CD9', '#2ABB7A', '#E8578C', '#3B9BEF'];
export function Confetti({ burst }) {
  const [bits, setBits] = useState([]);
  useEffect(() => {
    if (!burst) return;
    const b = Array.from({ length: 34 }, (_, i) => ({ id: `${burst}-${i}`, left: Math.random() * 100, c: CONF_C[i % 5], d: Math.random() * .3, t: 1.3 + Math.random() * .8 }));
    setBits(b);
    const t = setTimeout(() => setBits([]), 2400);
    return () => clearTimeout(t);
  }, [burst]);
  return bits.map(b => (
    <span key={b.id} className="hc-conf" aria-hidden="true" style={{ left: `${b.left}vw`, background: b.c, animationDelay: `${b.d}s`, animationDuration: `${b.t}s` }} />
  ));
}

const lettersCount = (n) => (n === 1 ? 'حَرْفٌ وَاحِدٌ' : n === 2 ? 'حَرْفَانِ' : n <= 10 ? `${n} حُرُوفٍ` : `${n} حَرْفًا`);
/* شاشة لمس (جوال/آيباد، ولو بلوحة مفاتيح موصولة): لوحة الحروف على الشاشة هي الأساس ولا تُفتح لوحة الجهاز
   فوق النافذة — inputmode="none" لا يمنع الكتابة من لوحة مفاتيح حقيقية */
const isTouch = () => typeof window !== 'undefined'
  && (window.matchMedia?.('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0);

/* ── نافذة لغز فهيم: اللغز ← الكتابة ← التدقيق ← كشف الحرف ── */
/* عند الحلّ تُغلق النافذة وتظهر بطاقة الحرف التي صنعها المعلم مباشرة (onSolved) — بلا شاشة «أحسنت» منفصلة
   (اختيار الأستاذ محمد بعد صفحة التجربة 2026-10-25). verify: بديل لتدقيق الخادم (صفحة التجربة لا تسجّل شيئاً) */
export function RiddleSheet({
  letter, pos, settings, solvedCount, attempts, hintLevel, note,
  onAttempt, onHint, onSolved, onClose, onEdit, onPlay, verify,
}) {
  const pal = PALETTE[pos % PALETTE.length];
  const [value, setValue] = useState('');
  const [fb, setFb] = useState(note ? { kind: 'note', msg: note } : null);
  const [busy, setBusy] = useState(false);
  const [deviceKb, setDeviceKb] = useState(false);
  const [touch, setTouch] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = isTouch(); setTouch(t);
    if (!t) setTimeout(() => inputRef.current?.focus(), 80);   // الحاسوب: اكتب مباشرة
  }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const target = huroofTarget(letter);
  const show = displayAnswer(letter.word, letter.answer);
  const answerChars = [...normalizeArabic(letter.answer)];
  const revealAuto = settings.reveal_after > 0 && attempts >= settings.reveal_after;
  const level = Math.max(hintLevel, revealAuto ? 3 : 0, letter.riddle ? 0 : 1);   // بلا لغز: الصورة هي السؤال

  function type(ch) {
    setValue(v => (v + ch).slice(0, 40));
    if (fb?.kind !== 'note') setFb(null);
    if (!touch || deviceKb) inputRef.current?.focus();
  }
  function del() { setValue(v => [...v].slice(0, -1).join('')); setFb(null); }

  async function submit(e) {
    e?.preventDefault();
    if (busy) return;
    const r = checkSpelling(value, target, { allowAl: settings.accept_al });
    if (!r.ok) {
      setFb(r);
      if (r.kind !== 'empty') onAttempt();
      return;
    }
    setBusy(true);
    try {
      let j;
      if (verify) j = await verify(value);
      else {
        const res = await childFetch('/api/huroof/progress', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idx: letter.idx, answer: value, attempts, hints: hintLevel }),
        });
        j = await res.json().catch(() => ({}));
        if (!res.ok && !j.result) j = { net: true };
      }
      if (j.ok) {
        onPlay(letter.letter_audio_url);   // تسجيل المعلم لنطق الحرف إن وُجد
        setBusy(false);
        onSolved(j);
        return;
      }
      if (j.result) { setFb(j.result); onAttempt(); }
      else setFb({ kind: 'net', msg: 'تعذّر الحفظ الآن 🙈 حاول مرة أخرى' });
    } catch {
      setFb({ kind: 'net', msg: 'تعذّر الاتصال 🙈 حاول مرة أخرى' });
    }
    setBusy(false);
  }

  const picture = letter.image_url
    ? <img src={letter.image_url} alt="" className="hc-pic-img" />
    : <span className="hc-pic-emoji" aria-hidden="true">{letter.emoji}</span>;
  const tone = fb ? ({ custom: 'hc-fb-rule', note: 'hc-fb-note', net: 'hc-fb-soft', empty: 'hc-fb-soft', wrong: 'hc-fb-soft', close: 'hc-fb-soft', close_missing: 'hc-fb-soft', close_extra: 'hc-fb-soft', not_arabic: 'hc-fb-soft' }[fb.kind] || 'hc-fb-rule') : '';

  return (
    <>
      <div className="hf-backdrop" onClick={onClose} />
      <div className="hf-card hc-sheet" role="dialog" aria-modal="true" aria-label="لغز فهيم" style={{ '--pal': pal.main, '--pal-l': pal.light }}>
        <div className="hf-top">
          <span className="hc-title">🧩 لُغْزُ فَهِيمٍ <small>{solvedCount}/{HUROOF_COUNT}</small></span>
          <button className="hf-x" onClick={onClose} aria-label="إغلاق">✕</button>
        </div>

          <form className="hc-play" onSubmit={submit}>
            <div className="hc-fh-row">
              <img src="/faheem.png" alt="فهيم" className="hc-fh" />
              <div className="hc-bubble">
                <p className="hc-riddle">{letter.riddle || 'مَا اسْمُ هَذِهِ الصُّورَةِ؟ اكْتُبْهُ 👇'}</p>
                {letter.riddle_audio_url && (
                  <button type="button" className="hc-listen" onClick={() => onPlay(letter.riddle_audio_url)}>🔊 اسْمَعِ اللُّغْزَ</button>
                )}
              </div>
            </div>

            {level >= 1 && (
              <div className="hc-hint">
                <div className="hc-pic">{picture}</div>
                {level >= 2 && (
                  <div className="hc-hint-txt">
                    {level >= 3 ? (
                      <><span>اكْتُبْهَا هَكَذَا:</span><b className="hc-show">{show}</b></>
                    ) : (
                      <>
                        <span>تَبْدَأُ بِحَرْفِ «{answerChars[0]}»، وَفِيهَا {lettersCount(answerChars.filter(c => c !== ' ').length)}</span>
                        <span className="hc-boxes" aria-hidden="true">
                          {answerChars.map((c, i) => (c === ' ' ? <i key={i} className="hc-gap" /> : <i key={i}>{i === 0 ? c : ''}</i>))}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="hc-in-row">
              <input
                ref={inputRef} className="hc-in" value={value} dir="rtl" lang="ar"
                onChange={e => { setValue(e.target.value.slice(0, 40)); if (fb?.kind !== 'note') setFb(null); }}
                placeholder="اكْتُبِ الْكَلِمَةَ هُنَا…" aria-label="اكتب الكلمة"
                autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                inputMode={touch && !deviceKb ? 'none' : 'text'} enterKeyHint="done"
              />
            </div>

            {fb && (
              <div className={`hc-fb ${tone}`} role="status" aria-live="polite">
                <img src="/faheem.png" alt="" className="hc-fb-fh" aria-hidden="true" />
                <div><p>{fb.msg}</p>{fb.tip && <small>💡 {fb.tip}</small>}</div>
              </div>
            )}

            <ArabicKeyboard onKey={type} onDelete={del} disabled={busy} />
            {touch && (
              <button type="button" className="hc-devkb" onClick={() => { setDeviceKb(d => !d); setTimeout(() => inputRef.current?.focus(), 50); }}>
                {deviceKb ? '🔤 لوحة الحروف فقط' : '⌨️ أكتب بلوحة جهازي'}
              </button>
            )}

            <div className="hc-actions">
              <button type="submit" className="hc-btn hc-check" disabled={busy}>{busy ? '⏳ لَحْظَةً…' : '✅ تَحَقَّقْ'}</button>
              {settings.hints && level < 3 && (
                <button type="button" className="hc-btn hc-soft" onClick={onHint}>💡 سَاعِدْنِي</button>
              )}
            </div>
            {onEdit && <button type="button" className="hf-edit" onClick={onEdit}>✏️ تعديل هذا اللغز والإملاء (للمعلم)</button>}
          </form>
      </div>
    </>
  );
}

export const CHALLENGE_CSS = `
.hc-board { display:flex; gap:12px; align-items:stretch; }
.hc-grid { flex:1; min-width:0; display:grid; grid-template-columns:repeat(7, minmax(0,1fr)); gap:10px; align-content:start; }
@media (max-width: 560px) { .hc-grid { grid-template-columns:repeat(4, minmax(0,1fr)); gap:8px; } .hc-board { gap:8px; } }
.hc-card { position:relative; aspect-ratio:1 / 1.08; border-radius:16px; border:2.5px solid var(--pal); background:var(--pal-l);
  font-family:inherit; cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:4px;
  box-shadow:0 2px 8px rgba(0,0,0,.07); transition:transform .15s ease, box-shadow .2s; overflow:hidden; }
.hc-card:active { transform:scale(.95); }
.hc-closed { background:linear-gradient(150deg, var(--pal-l), #fff); border-style:dashed; }
.hc-q { font-family:var(--font-naskh), serif; font-size:clamp(1.8rem, 4.5vw, 2.6rem); font-weight:700; color:var(--pal); line-height:1; }
.hc-spark { position:absolute; top:5px; left:6px; font-size:.75rem; opacity:.7; }
.hc-current { background:#FFF8E6; border:3px solid #E8B84B; box-shadow:0 0 0 4px rgba(232,184,75,.25); animation:hcPulse 1.6s ease-in-out infinite; }
.hc-locked { opacity:.5; border-style:dashed; }
.hc-lock { position:absolute; bottom:4px; left:6px; font-size:.75rem; }
.hc-solved { background-color:var(--pal); background-image:linear-gradient(145deg, rgba(255,255,255,.14), rgba(0,0,0,.14)); color:#fff; border-style:solid; }
.hc-l { font-size:clamp(1.7rem, 4.6vw, 2.6rem); font-weight:900; line-height:1; text-shadow:0 2px 8px rgba(0,0,0,.2); }
.hc-n { font-size:.66rem; font-weight:700; opacity:.9; margin-top:4px; }
@media (max-width: 560px) { .hc-n { display:none; } }
.hc-ok { position:absolute; top:4px; left:6px; width:18px; height:18px; border-radius:50%; background:#fff; color:#1a7c40; font-size:.7rem; font-weight:900; display:grid; place-items:center; }
.hc-card:focus-visible, .hc-key:focus-visible, .hc-btn:focus-visible, .hc-in:focus-visible { outline:3px solid #1A2B4A; outline-offset:2px; }

.hc-path { position:relative; flex:0 0 118px; min-height:470px; border-radius:22px; background:linear-gradient(180deg, #FFF8E6, #EEF6FF); border:2px solid #EDE5D8; }
@media (max-width: 560px) { .hc-path { flex-basis:58px; min-height:440px; border-radius:16px; } }
.hc-path-svg { position:absolute; inset:0; width:100%; height:100%; }
.hc-road { fill:none; stroke:#D9CDB8; stroke-width:4; stroke-dasharray:2 6; stroke-linecap:round; vector-effect:non-scaling-stroke; }
.hc-road-done { fill:none; stroke:#E8B84B; stroke-width:5; stroke-linecap:round; stroke-linejoin:round; vector-effect:non-scaling-stroke; }
.hc-stop { position:absolute; width:22px; height:22px; transform:translate(-50%,-50%); border-radius:50%; background:#fff; border:2px dashed #CFC2AA;
  display:grid; place-items:center; font-family:var(--font-naskh), serif; font-size:.78rem; font-weight:700; color:#1A2B4A; line-height:1; }
.hc-stop-done { background:#E8B84B; border:2px solid #C99A2E; color:#1A2B4A; }
.hc-stop-last { border-color:#E8B84B; }
@media (max-width: 560px) { .hc-stop { width:14px; height:14px; font-size:0; border-width:1.5px; } }
.hc-top { position:absolute; top:0; left:50%; transform:translateX(-50%); font-size:1.4rem; }
@media (max-width: 560px) { .hc-top { font-size:1rem; } }
.hc-count { position:absolute; bottom:4px; left:50%; transform:translateX(-50%); background:#1A2B4A; color:#fff; border-radius:99px;
  padding:1px 8px; font-size:.72rem; font-weight:800; white-space:nowrap; font-variant-numeric:tabular-nums; }
@media (max-width: 560px) { .hc-count { font-size:.6rem; padding:1px 5px; } }
.hc-fh-walk { position:absolute; z-index:2; transform:translate(-50%,-92%); transition:left .9s cubic-bezier(.4,0,.2,1), top .9s cubic-bezier(.4,0,.2,1); pointer-events:none; }
.hc-fh-path { display:block; width:46px; height:auto; filter:drop-shadow(0 4px 6px rgba(26,43,74,.25)); animation:hcHop .9s ease; }
@media (max-width: 560px) { .hc-fh-path { width:34px; } }

.hc-sheet { gap:10px; }
.hc-title { font-weight:900; font-size:1.15rem; color:#1A2B4A; display:flex; align-items:center; gap:8px; }
.hc-title small { background:#FFF3D6; color:#8A6412; border-radius:99px; padding:2px 10px; font-size:.8rem; }
.hc-play { display:flex; flex-direction:column; gap:10px; }
.hc-fh-row { display:flex; align-items:flex-end; gap:8px; }
.hc-fh { width:62px; height:auto; flex-shrink:0; }
.hc-bubble { position:relative; flex:1; background:#F3EFFF; border:2px solid #E2D9FF; border-radius:20px 20px 20px 6px; padding:10px 14px; text-align:right; }
.hc-riddle { margin:0; font-family:var(--font-naskh), serif; font-weight:700; font-size:1.3rem; line-height:1.85; color:#1A2B4A; }
.hc-listen { margin-top:6px; min-height:44px; border:none; border-radius:12px; background:#7C5CD9; color:#fff; font-family:inherit; font-weight:800; font-size:.95rem; padding:6px 14px; cursor:pointer; }
.hc-hint { display:flex; align-items:center; gap:10px; background:#FFFBEB; border:2px dashed #E8B84B; border-radius:18px; padding:8px; }
.hc-pic { width:92px; height:92px; flex-shrink:0; border-radius:14px; background:#fff; overflow:hidden; display:grid; place-items:center; }
.hc-pic-img { width:100%; height:100%; object-fit:cover; }
.hc-pic-emoji { font-size:3.4rem; line-height:1; }
.hc-hint-txt { display:flex; flex-direction:column; gap:6px; font-weight:800; color:#1A2B4A; font-size:.95rem; line-height:1.6; }
.hc-show { font-family:var(--font-naskh), serif; font-size:2rem; color:var(--pal); line-height:1.4; }
.hc-boxes { display:flex; gap:4px; flex-wrap:wrap; direction:rtl; }
.hc-boxes i { width:30px; height:34px; border-radius:8px; border:2px solid var(--pal); background:#fff; display:grid; place-items:center; font-style:normal;
  font-family:var(--font-naskh), serif; font-size:1.3rem; font-weight:700; color:var(--pal); }
.hc-boxes i.hc-gap { width:10px; border:none; background:none; }
.hc-in { width:100%; box-sizing:border-box; min-height:64px; border:3px solid var(--pal-l); border-radius:18px; background:#fff; color:#1A2B4A;
  font-family:var(--font-naskh), serif; font-size:2rem; font-weight:700; text-align:center; padding:6px 12px; }
.hc-in:focus { border-color:var(--pal); outline:none; }
.hc-in::placeholder { font-size:1.1rem; color:#A0AEC0; font-weight:600; }
.hc-fb { display:flex; align-items:flex-start; gap:8px; border-radius:16px; padding:8px 12px; animation:hcIn .25s ease; }
.hc-fb p { margin:0; font-family:var(--font-naskh), serif; font-weight:700; font-size:1.12rem; line-height:1.8; color:#1A2B4A; }
.hc-fb small { display:block; font-size:.85rem; font-weight:700; color:#52627E; line-height:1.6; }
.hc-fb-fh { width:34px; height:auto; flex-shrink:0; }
.hc-fb-rule { background:#F3EFFF; border:2px solid #D9CCFF; }
.hc-fb-soft { background:#FFF6E7; border:2px solid #F1DFB8; }
.hc-fb-note { background:#E9F8F1; border:2px solid #BFE9D4; }
.hc-kb { display:grid; grid-template-columns:repeat(7, minmax(0,1fr)); gap:5px; }
.hc-key { min-height:46px; border:none; border-radius:12px; background:#F1F5F9; color:#1A2B4A; font-family:var(--font-naskh), serif;
  font-size:1.45rem; font-weight:700; cursor:pointer; box-shadow:0 3px 0 #D5DCE6; line-height:1; padding:0; }
.hc-key:active { transform:translateY(2px); box-shadow:0 1px 0 #D5DCE6; }
.hc-key-space { grid-column:span 3; font-family:inherit; font-size:.9rem; font-weight:800; }
.hc-key-del { grid-column:span 3; background:#FFF3D6; font-family:inherit; font-size:.95rem; font-weight:800; box-shadow:0 3px 0 #EAD39A; }
.hc-devkb { align-self:center; min-height:40px; border:none; background:none; color:#7C5CD9; font-family:inherit; font-weight:800; font-size:.85rem; cursor:pointer; text-decoration:underline; }
.hc-actions { display:grid; grid-template-columns:1.6fr 1fr; gap:8px; }
.hc-actions .hc-btn:only-child { grid-column:1 / -1; }
.hc-btn { min-height:56px; border-radius:16px; border:none; font-family:inherit; font-size:1.1rem; font-weight:900; cursor:pointer; padding:6px 12px; }
.hc-check, .hc-go { background:#E8B84B; color:#1A2B4A; box-shadow:0 5px 0 #C29530; }
.hc-check:active, .hc-go:active { transform:translateY(3px); box-shadow:0 2px 0 #C29530; }
.hc-soft { background:#fff; color:#7C5CD9; border:2px solid #E2D9FF; }
.hc-btn:disabled { opacity:.75; }
.hc-conf { position:fixed; top:-20px; width:10px; height:14px; border-radius:3px; z-index:1400; pointer-events:none; animation:hcFall 1.6s ease-in forwards; }
.hc-done-banner { margin:0 0 16px; text-align:center; background:linear-gradient(135deg,#1a7c40,#1A2B4A); color:#fff; border-radius:16px; padding:12px 16px; font-size:1rem; font-weight:800; line-height:1.8; animation:hfDown .3s ease; }
@keyframes hcPulse { 0%,100% { box-shadow:0 0 0 4px rgba(232,184,75,.25) } 50% { box-shadow:0 0 0 8px rgba(232,184,75,.12) } }
@keyframes hcHop { 0% { transform:translateY(0) } 40% { transform:translateY(-14px) } 100% { transform:translateY(0) } }
@keyframes hcIn { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:none } }
@keyframes hcFall { to { transform:translateY(105vh) rotate(540deg); } }
@media (prefers-reduced-motion: reduce) { .hc-current, .hc-fh-path, .hc-conf, .hc-fb { animation:none !important; } .hc-fh-walk { transition:none; } }
/* شاشات قصيرة (آيفون SE وأشباهه): نافذة أصغر قليلاً كي يبقى زر «تحقّق» قريباً — والمفاتيح تبقى ≥ 44 */
@media (max-height: 720px) {
  .hc-sheet { gap:7px; }
  .hc-play { gap:7px; }
  .hc-fh { width:46px; }
  .hc-riddle { font-size:1.12rem; line-height:1.7; }
  .hc-bubble { padding:6px 12px; }
  .hc-in { min-height:52px; font-size:1.7rem; }
  .hc-kb { gap:4px; }
  .hc-key { min-height:44px; font-size:1.3rem; }
  .hc-btn { min-height:50px; }
  .hc-pic { width:70px; height:70px; }
}
`;
