'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import HeroAvatar3D from '../../../components/HeroAvatar3D';
import { childFetch } from '../../../lib/child-fetch';
import {
  ITEMS, HAIR, SLOT_LABEL, SKIN, HAIR_C, HIJAB_C, CLOTH_C, PANTS_C, SHOE_C,
  DEFAULT_LOOK, findItem, isOwned, unpaidItems, looksEqual, normalizeLook,
} from '../../../lib/hero-catalog';

/* استوديو الأبطال: الطفل يلبس بطله ثلاثي الأبعاد ويجرّب القطع مجاناً،
   ثم يشتريها بنجومه ويحفظه. الأسعار والملكية يتحقق منها الخادم دائماً. */

const TABS = [
  { id: 'clothes', name: 'مَلَابِسِي', em: '👕' },
  { id: 'gear',    name: 'مُعَدَّاتِي', em: '🛡️' },
  { id: 'head',    name: 'رَأْسِي',    em: '🧢' },
  { id: 'me',      name: 'شَكْلِي',    em: '🙂' },
  { id: 'pet',     name: 'رَفِيقِي',   em: '🐘' },
];
const LINES = ['أَنَا بَطَلُ الْحُرُوفِ! ⭐', 'هَيَّا نَتَعَلَّمْ مَعًا! 📚', 'شُكْرًا عَلَى مَلَابِسِي الْجَدِيدَةِ 😎', 'أَيْنَ الْمُغَامَرَةُ التَّالِيَةُ؟ 🚀'];
const CONFETTI_C = ['#E8B84B', '#7C5CD9', '#2ABB7A', '#E8578C', '#3B9BEF'];

export default function HeroesStudio() {
  const heroRef = useRef(null);
  const bubbleT = useRef(null);
  const pageRef = useRef(null);
  const actRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [owned, setOwned] = useState(() => new Set());
  const [points, setPoints] = useState(0);
  const [look, setLook] = useState(DEFAULT_LOOK);
  const [saved, setSaved] = useState(null);
  const [tab, setTab] = useState('clothes');
  const [busy, setBusy] = useState(null);
  const [bubble, setBubble] = useState('');
  const [note, setNote] = useState('');
  const [bump, setBump] = useState(0);
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    childFetch('/api/hero-config')
      .then(r => r.json())
      .then(d => {
        setOwned(new Set(d.owned ?? []));
        setPoints(d.points ?? 0);
        if (d.look) { const l = normalizeLook(d.look); setLook(l); setSaved(l); }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
    return () => clearTimeout(bubbleT.current);
  }, []);

  /* شريط الشراء ثابت أسفل الشاشة — نحجز تحته مساحة بقدر ارتفاعه الحالي فلا يغطي القطع */
  useEffect(() => {
    const act = actRef.current, pg = pageRef.current;
    if (!act || !pg) return;
    const ro = new ResizeObserver(() => pg.style.setProperty('--hs-act-h', `${act.offsetHeight}px`));
    ro.observe(act);
    return () => ro.disconnect();
  }, []);

  function say(text) {
    setBubble(text);
    clearTimeout(bubbleT.current);
    bubbleT.current = setTimeout(() => setBubble(''), 2400);
  }

  function wear(key, val, announce, move = 'jump') {
    if (look[key] === val) return;
    setLook(l => ({ ...l, [key]: val }));
    setNote('');
    if (announce) { say(announce); heroRef.current?.[move](); }
  }

  function pickItem(slot, it) {
    const back = slot === 'back';
    wear(slot, it.id, it.id === 'none' ? null : `${it.icon} ${it.name}!${back ? ' انْظُرْ إِلَى ظَهْرِي' : ''}`, back ? 'peek' : 'jump');
  }

  function celebrate() {
    const now = Date.now();
    const bits = Array.from({ length: 36 }, (_, i) => ({
      id: `${now}-${i}`, left: Math.random() * 100, color: CONFETTI_C[i % 5],
      delay: Math.random() * .3, dur: 1.3 + Math.random() * .8,
    }));
    setConfetti(bits);
    setTimeout(() => setConfetti(c => (c[0]?.id === bits[0].id ? [] : c)), 2600);
  }

  async function persist(next, msg) {
    const res = await childFetch('/api/hero-config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ look: next, preview_url: heroRef.current?.snapshot(160) ?? undefined }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || 'تعذّر حفظ بطلك، حاول مرة أخرى');
    setSaved(next);
    if (msg) say(msg);
  }

  async function buy() {
    if (busy) return;
    const up = unpaidItems(look, owned);
    if (!up.length) return;
    setBusy('buy'); setNote('');
    const next = look;
    try {
      const res = await childFetch('/api/hero-config/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: up.map(x => x.key) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (typeof d.points === 'number') setPoints(d.points);
        throw new Error(d.error || 'تعذّر إتمام الشراء، حاول مرة أخرى');
      }
      setOwned(prev => new Set([...prev, ...up.map(x => x.key)]));
      setPoints(d.points);
      setBump(b => b + 1);
      celebrate();
      heroRef.current?.jump();
      await persist(next, 'شُكْرًا! صِرْتُ أَجْمَلَ الْآنَ 😎');
    } catch (e) {
      setNote(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (busy) return;
    setBusy('save'); setNote('');
    try {
      await persist(look, 'تَمَّ حِفْظُ بَطَلِكَ! 💾');
      heroRef.current?.jump();
    } catch (e) {
      setNote(e.message);
    } finally {
      setBusy(null);
    }
  }

  function undo() {
    setLook(saved ?? DEFAULT_LOOK);
    setNote('');
    say('رَجَعْتُ كَمَا كُنْتُ 🙂');
  }

  const up = unpaidItems(look, owned);
  const sum = up.reduce((s, x) => s + x.item.price, 0);
  const changed = !saved || !looksEqual(look, saved);

  const chip = (slot, it) => {
    const sel = look[slot] === it.id, own = isOwned(slot, it.id, owned);
    if (sel && !own) return <span className="hs-pr hs-try">👀 تُجَرِّبُهُ</span>;
    if (own) return <span className="hs-pr hs-own">{it.price ? '✓ لَدَيْكَ' : 'مَجَّانِيٌّ'}</span>;
    return <span className="hs-pr hs-cost">⭐ {it.price}</span>;
  };
  const tiles = (slot) => (
    <div className="hs-items">
      {ITEMS[slot].map(it => (
        <button key={it.id} type="button" className={`hs-item${look[slot] === it.id ? ' hs-sel' : ''}`} onClick={() => pickItem(slot, it)} aria-pressed={look[slot] === it.id}>
          <span className="hs-ic" aria-hidden="true">{it.icon}</span>
          <span className="hs-nm">{it.name}</span>
          {chip(slot, it)}
        </button>
      ))}
    </div>
  );
  const swatches = (key, list) => (
    <div className="hs-swatches">
      {list.map((c, i) => (
        <button key={c} type="button" className={`hs-sw${look[key] === i ? ' hs-sel' : ''}`} style={{ background: c }}
          onClick={() => wear(key, i, null)} aria-label={`لَوْنٌ ${i + 1}`} aria-pressed={look[key] === i} />
      ))}
    </div>
  );
  const group = (title, inner) => <div className="hs-group"><h3>{title}</h3>{inner}</div>;

  return (
    <div className="hs-page" ref={pageRef}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="hs-wrap">
        <div className="hs-bar">
          <Link href="/dashboard" className="hs-back" aria-label="الْعَوْدَةُ إِلَى لَوْحَتِي">→</Link>
          <h1>اِسْتُودْيُو الْأَبْطَالِ</h1>
          <div key={bump} className={`hs-points${bump ? ' hs-bump' : ''}`} aria-label={`نُجُومُكَ: ${points}`}>⭐ <span>{loaded ? points : '…'}</span></div>
        </div>

        <div className="hs-studio">
          <section className="hs-stage">
            {loaded ? (
              <HeroAvatar3D ref={heroRef} look={look} label="بَطَلُكَ ثُلَاثِيُّ الْأَبْعَادِ — اسْحَبْهُ لِتُدِيرَهُ، وَالْمِسْهُ لِيَقْفِزَ"
                onTap={() => say(LINES[Math.floor(Math.random() * LINES.length)])} />
            ) : (
              <div className="hs-loading">يُجَهِّزُ بَطَلَكَ…</div>
            )}
            <div className="hs-tag">⭐ بَطَلِي</div>
            <div className={`hs-bubble${bubble ? ' hs-show' : ''}`} aria-live="polite">{bubble}</div>
            <div className="hs-drag">↔ اسْحَبْ لِتُدِيرَ بَطَلَكَ، وَالْمِسْهُ لِيَقْفِزَ</div>
          </section>

          <section className="hs-panel">
            <nav className="hs-tabs" aria-label="أَقْسَامُ الِاسْتُودْيُو">
              {TABS.map(t => (
                <button key={t.id} type="button" className={`hs-tab${tab === t.id ? ' hs-on' : ''}`} onClick={() => setTab(t.id)} aria-pressed={tab === t.id}>
                  <span className="hs-em" aria-hidden="true">{t.em}</span>{t.name}
                </button>
              ))}
            </nav>
            <div className="hs-opts">
              {tab === 'clothes' && <>
                {group('الْقَمِيصُ', tiles('top'))}
                {['tee', 'hoodie', 'jersey'].includes(look.top) && group('لَوْنُ الْقَمِيصِ', swatches('topC', CLOTH_C))}
                {!['thobe', 'space'].includes(look.top) && group('السِّرْوَالُ', <>{tiles('bottom')}{swatches('pantsC', PANTS_C)}</>)}
                {look.top !== 'space' && group('الْحِذَاءُ', swatches('shoeC', SHOE_C))}
              </>}
              {tab === 'gear' && <>{group(SLOT_LABEL.hand, tiles('hand'))}{group(SLOT_LABEL.back, tiles('back'))}</>}
              {tab === 'head' && <>{group(SLOT_LABEL.head, tiles('head'))}{group(SLOT_LABEL.eyes, tiles('eyes'))}</>}
              {tab === 'me' && <>
                {group('لَوْنُ الْبَشَرَةِ', swatches('skin', SKIN))}
                {group('الشَّعْرُ', (
                  <div className="hs-items">
                    {HAIR.map(h => (
                      <button key={h.id} type="button" className={`hs-item${look.hair === h.id ? ' hs-sel' : ''}`} onClick={() => wear('hair', h.id, null)} aria-pressed={look.hair === h.id}>
                        <span className="hs-ic" aria-hidden="true">{h.icon}</span><span className="hs-nm">{h.name}</span><span className="hs-pr hs-own">مَجَّانِيٌّ</span>
                      </button>
                    ))}
                  </div>
                ))}
                {look.hair === 'hijab' ? group('لَوْنُ الْحِجَابِ', swatches('hijabC', HIJAB_C)) : group('لَوْنُ الشَّعْرِ', swatches('hairC', HAIR_C))}
              </>}
              {tab === 'pet' && group(SLOT_LABEL.pet, tiles('pet'))}
            </div>
          </section>
        </div>

        <div className="hs-act" ref={actRef}><div className="hs-act-in">
          {up.length > 0 ? <>
            <div className="hs-trying">تُجَرِّبُ الْآنَ: {up.map(x => `${x.item.icon} ${x.item.name}`).join('، ')}</div>
            <div className="hs-row">
              {points >= sum ? (
                <button type="button" className="hs-btn hs-buy" onClick={buy} disabled={!!busy}>
                  {busy === 'buy' ? '⏳ لَحْظَةً…' : `🛒 اشْتَرِ بِـ ${sum} ⭐`}
                </button>
              ) : (
                <button type="button" className="hs-btn hs-off" disabled>🔒 يَنْقُصُكَ {sum - points} ⭐</button>
              )}
              <button type="button" className="hs-btn hs-soft" onClick={undo} disabled={!!busy}>↩ تَرَاجَعْ</button>
            </div>
            {points < sum && <div className="hs-trying">كُلُّ دَرْسٍ تُنْهِيهِ يَمْنَحُكَ نُجُومًا جَدِيدَةً 💪</div>}
          </> : changed ? (
            <button type="button" className="hs-btn hs-save" onClick={save} disabled={!!busy || !loaded}>
              {busy === 'save' ? '⏳ لَحْظَةً…' : '💾 احْفَظْ بَطَلِي'}
            </button>
          ) : (
            <button type="button" className="hs-btn hs-off" disabled>✅ بَطَلُكَ مَحْفُوظٌ</button>
          )}
          {note && <div className="hs-note" role="status">{note}</div>}
        </div></div>
      </div>

      {confetti.map(c => (
        <span key={c.id} className="hs-confetti" aria-hidden="true"
          style={{ left: `${c.left}vw`, background: c.color, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s` }} />
      ))}
    </div>
  );
}

/* تخطيط: منصة البطل ← تبويبات ← قطع بالنجوم ← شريط شراء/حفظ ثابت أسفل الشاشة.
   على الشاشة الواسعة: المنصة يميناً والمتجر يساراً. */
const CSS = `
.hs-page {
  --hs-ink: #1A2B4A; --hs-soft: #52627E; --hs-gold: #E8B84B; --hs-violet: #7C5CD9; --hs-green: #2ABB7A;
  --hs-card: #FFFFFF; --hs-line: #E1E7F1; --hs-sand: #FFF6E7; --hs-act-h: 96px;
  --hs-ui: var(--font-cairo), 'Cairo', 'Tajawal', system-ui, sans-serif;
  --hs-story: var(--font-naskh), 'Noto Naskh Arabic', 'Amiri', serif;
  min-height: 100vh; direction: rtl; color: var(--hs-ink); font-family: var(--hs-ui);
  background: linear-gradient(180deg, #E7F1FF 0%, #F3EEFF 40%, var(--hs-sand) 100%);
  -webkit-tap-highlight-color: transparent;
}
/* الاستوديو صفحة كاملة بلا شريط تنقل سفلي — نلغي حشوة الجسم المخصصة له على الجوال */
body:has(.hs-page) { padding-bottom: 0; background: var(--hs-sand, #FFF6E7); }
:where(.hs-page) button { font: inherit; color: inherit; cursor: pointer; border: none; background: none; }
.hs-page button:focus-visible, .hs-back:focus-visible { outline: 3px solid var(--hs-violet); outline-offset: 2px; }
.hs-wrap { max-width: 1100px; margin: 0 auto; padding: 14px max(16px, env(safe-area-inset-right, 0px)) calc(var(--hs-act-h) + 16px) max(16px, env(safe-area-inset-left, 0px)); display: flex; flex-direction: column; gap: 14px; }
.hs-bar { display: flex; align-items: center; gap: 10px; }
.hs-back { width: 48px; height: 48px; flex: 0 0 auto; border-radius: 50%; background: var(--hs-card); box-shadow: 0 3px 10px rgba(26,43,74,.08); font-size: 1.3rem; display: grid; place-items: center; color: var(--hs-ink); text-decoration: none; }
.hs-bar h1 { margin: 0; flex: 1; font-size: 1.35rem; font-weight: 900; }
.hs-points { display: flex; align-items: center; gap: 6px; background: var(--hs-card); border-radius: 99px; padding: 8px 14px; font-weight: 900; font-size: 1.12rem; box-shadow: 0 3px 10px rgba(26,43,74,.08); font-variant-numeric: tabular-nums; }
.hs-bump { animation: hsBump .55s ease; }

.hs-studio { display: grid; gap: 14px; }
.hs-stage { position: relative; height: clamp(340px, 52vh, 470px); border-radius: 32px; overflow: hidden; background: radial-gradient(circle at 50% 30%, #FFFFFF 0%, #EEF0FF 46%, #DCD3FF 100%); box-shadow: 0 12px 30px rgba(26,43,74,.12); }
/* الشاشة الواسعة: البطل ثابت يميناً والمتجر يساراً يُمرَّر وحده (تبويباته تبقى ظاهرة) */
@media (min-width: 900px) {
  .hs-studio { grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); align-items: start; }
  .hs-stage, .hs-panel { height: max(440px, min(640px, calc(100vh - 110px - var(--hs-act-h)))); }
  .hs-panel { overflow-y: auto; overscroll-behavior: contain; padding: 0 2px 8px; scrollbar-width: thin; }
  .hs-tabs { position: sticky; top: 0; z-index: 2; background: linear-gradient(180deg, #F3EEFF 80%, rgba(243,238,255,0)); padding-bottom: 8px; }
}
.hs-loading { position: absolute; inset: 0; display: grid; place-items: center; font-weight: 800; color: var(--hs-soft); }
.hs-tag { position: absolute; top: 12px; right: 12px; background: var(--hs-ink); color: #fff; border-radius: 99px; padding: 6px 14px; font-family: var(--hs-story); font-weight: 700; font-size: 1.05rem; pointer-events: none; }
.hs-drag { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); background: rgba(255,255,255,.85); border-radius: 99px; padding: 5px 14px; font-weight: 800; font-size: .9rem; color: var(--hs-soft); white-space: nowrap; pointer-events: none; }
.hs-bubble { position: absolute; top: 56px; left: 50%; transform: translateX(-50%) scale(.9); max-width: min(320px, 86%); width: max-content; background: var(--hs-card); border-radius: 18px; padding: 8px 16px; font-family: var(--hs-story); font-size: 1.15rem; line-height: 1.8; text-align: center; box-shadow: 0 6px 18px rgba(26,43,74,.15); opacity: 0; pointer-events: none; transition: opacity .2s, transform .2s; }
.hs-bubble.hs-show { opacity: 1; transform: translateX(-50%) scale(1); }

.hs-panel { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.hs-tabs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; padding: 2px; }
.hs-tab { min-height: 70px; padding: 6px 2px; border-radius: 18px; background: var(--hs-card); font-weight: 800; font-size: .9rem; white-space: nowrap; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; box-shadow: 0 3px 10px rgba(26,43,74,.06); }
.hs-em { font-size: 1.55rem; line-height: 1.2; }
.hs-tab.hs-on { background: var(--hs-ink); color: #fff; }
.hs-opts { display: flex; flex-direction: column; gap: 12px; }
.hs-group { background: var(--hs-card); border-radius: 24px; padding: 12px 12px 14px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 4px 14px rgba(26,43,74,.06); }
.hs-group h3 { margin: 0; font-size: 1.05rem; font-weight: 800; color: var(--hs-soft); }
.hs-items { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
@media (min-width: 560px) and (max-width: 899px), (min-width: 1040px) { .hs-items { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.hs-item { position: relative; min-height: 118px; border-radius: 18px; background: #F7F8FC; border: 3px solid transparent; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 8px 6px; transition: transform .12s; }
.hs-item:active { transform: scale(.96); }
.hs-item.hs-sel { border-color: var(--hs-violet); background: #F3EFFF; }
.hs-ic { font-size: 2.1rem; line-height: 1.2; }
.hs-nm { font-family: var(--hs-story); font-weight: 700; font-size: .98rem; line-height: 1.5; text-align: center; }
.hs-pr { font-size: .82rem; font-weight: 800; border-radius: 99px; padding: 1px 9px; }
.hs-cost { background: #FFF3D6; color: #8A6412; }
.hs-own { background: #E9F8F1; color: #1E8A5B; }
.hs-try { background: #EFEAFF; color: var(--hs-violet); }
.hs-swatches { display: flex; flex-wrap: wrap; gap: 10px; }
.hs-sw { width: 46px; height: 46px; border-radius: 50%; border: 4px solid #fff; box-shadow: 0 0 0 2px var(--hs-line); }
.hs-sw.hs-sel { box-shadow: 0 0 0 3px var(--hs-violet); transform: scale(1.06); }

.hs-act { position: fixed; left: 0; right: 0; bottom: 0; z-index: 50; padding: 18px max(16px, env(safe-area-inset-right, 0px)) calc(12px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px)); background: linear-gradient(180deg, rgba(255,246,231,0) 0%, var(--hs-sand) 30%); pointer-events: none; }
.hs-act-in { max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 8px; pointer-events: auto; }
.hs-trying { font-family: var(--hs-story); font-size: 1.02rem; line-height: 1.8; color: var(--hs-soft); text-align: center; }
.hs-note { font-family: var(--hs-story); font-size: 1.02rem; line-height: 1.8; text-align: center; background: #FFF3D6; color: #6B4E12; border-radius: 14px; padding: 6px 12px; }
.hs-row { display: grid; grid-template-columns: 1.6fr 1fr; gap: 10px; }
.hs-btn { min-height: 58px; width: 100%; border-radius: 18px; font-weight: 900; font-size: 1.12rem; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 6px 12px; }
.hs-buy { background: var(--hs-gold); color: var(--hs-ink); box-shadow: 0 6px 0 #C29530; }
.hs-buy:active { transform: translateY(3px); box-shadow: 0 3px 0 #C29530; }
.hs-save { background: var(--hs-green); color: #fff; box-shadow: 0 6px 0 #1E9462; }
.hs-save:active { transform: translateY(3px); box-shadow: 0 3px 0 #1E9462; }
.hs-soft { background: var(--hs-card); color: var(--hs-violet); box-shadow: 0 3px 10px rgba(26,43,74,.08); }
.hs-off { background: #EEF1F6; color: var(--hs-soft); cursor: default; }
.hs-btn:disabled { opacity: .85; }
.hs-confetti { position: fixed; top: -20px; width: 10px; height: 14px; border-radius: 3px; z-index: 300; pointer-events: none; animation: hsFall 1.6s ease-in forwards; }
@keyframes hsBump { 0%, 100% { transform: scale(1) } 40% { transform: scale(1.16) } }
@keyframes hsFall { to { transform: translateY(105vh) rotate(540deg); } }
@media (prefers-reduced-motion: reduce) { .hs-page *, .hs-confetti { animation: none !important; transition: none !important; } }
`;
