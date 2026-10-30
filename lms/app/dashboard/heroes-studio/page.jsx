'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import HeroAvatar3D from '../../../components/HeroAvatar3D';
import HeroesPreview from '../../../components/HeroesPreview';
import { childFetch } from '../../../lib/child-fetch';
import {
  ITEMS, HAIR, SLOT_LABEL, HAIR_C, HIJAB_C, CLOTH_C, PANTS_C, SHOE_C, CHARACTERS, EMOTES, LEVELS, ACHIEVEMENTS, WEEKLY, SEASONS,
  DEFAULT_LOOK, findItem, isOwned, isSpecial, unpaidItems, looksEqual, normalizeLook, charOf, priceOf, seasonActive, itemKey,
} from '../../../lib/hero-catalog';

/* «عالم الأبطال»: الطفل يختار شخصيته ويلبسها ويجرّب القطع مجاناً، ثم يشتريها بنجومه.
   لكل شخصية حركة خاصة، وللبطل عوالم وهالات ومركبات، وبيضة تفقس بنجوم التعلّم، ومنصة تكبر مع مستواه،
   وأوسمة وألقاب من إنجازاته، وتحدٍّ أسبوعي بجائزة. الأسعار والملكية والتقدّم كلها من الخادم. */

const TABS = [
  { id: 'chars',   name: 'شَخْصِيَّتِي', em: '🦸' },
  { id: 'clothes', name: 'مَلَابِسِي',   em: '👕' },
  { id: 'gear',    name: 'مُعَدَّاتِي',  em: '🧞' },
  { id: 'magic',   name: 'سِحْرِي',      em: '✨' },
  { id: 'world',   name: 'عَالَمِي',     em: '🌍' },
  { id: 'me',      name: 'شَكْلِي',      em: '🎨' },
  { id: 'badges',  name: 'أَوْسِمَتِي',  em: '🏅' },
];
const CONFETTI_C = ['#E8B84B', '#7C5CD9', '#2ABB7A', '#E8578C', '#3B9BEF'];
const EMPTY = { owned: new Set(), points: 0, level: 0, earned: 0, letters: [], achievements: [], title: null, seasons: [], weekly: null, egg: { started: false, progress: 0, goal: 1, hatched: false } };
const labelOf = (key) => { const [s, id] = String(key).split(':'); const it = findItem(s, id); return it ? `${it.icon} ${it.name}` : ''; };

export default function HeroesStudio() {
  const heroRef = useRef(null);
  const bubbleT = useRef(null);
  const pageRef = useRef(null);
  const actRef = useRef(null);
  const audioRef = useRef(null);
  const stageRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [d, setD] = useState(EMPTY);
  const [look, setLook] = useState(DEFAULT_LOOK);
  const [saved, setSaved] = useState(null);
  const [tab, setTab] = useState('chars');
  const [busy, setBusy] = useState(null);
  const [bubble, setBubble] = useState('');
  const [note, setNote] = useState('');
  const [bump, setBump] = useState(0);
  const [confetti, setConfetti] = useState([]);
  const [shots, setShots] = useState({});
  const [photo, setPhoto] = useState(null);
  const [sound, setSound] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  function changePreview(next) {
    if (busy) return;
    audioRef.current?.pause();
    clearTimeout(bubbleT.current);
    setBubble('');
    setShowPreview(next);
  }

  const apply = useCallback((r) => {
    setD({
      owned: new Set(r.owned ?? []), points: r.points ?? 0, level: r.level ?? 0, earned: r.earned ?? 0,
      letters: r.letters ?? [], achievements: r.achievements ?? [], title: r.title ?? null, seasons: r.seasons ?? [],
      weekly: r.weekly ?? null, egg: r.egg ?? EMPTY.egg,
    });
  }, []);
  const reload = useCallback(() => childFetch('/api/hero-config').then(r => r.json()).then(r => { apply(r); return r; }), [apply]);

  useEffect(() => {
    try { setSound(localStorage.getItem('hero-sound') !== 'off'); } catch { /* تخزين محجوب */ }
    reload()
      .then(r => { if (r.look) { const l = normalizeLook(r.look); setLook(l); setSaved(l); } })
      .catch(() => {})
      .finally(() => setLoaded(true));
    return () => clearTimeout(bubbleT.current);
  }, [reload]);

  /* شريط الشراء ثابت أسفل الشاشة — نحجز تحته مساحة بقدر ارتفاعه الحالي */
  useEffect(() => {
    const act = actRef.current, pg = pageRef.current;
    if (!act || !pg) return;
    const ro = new ResizeObserver(() => pg.style.setProperty('--hs-act-h', `${act.offsetHeight}px`));
    ro.observe(act);
    return () => ro.disconnect();
  }, []);

  /* حلقة البيضة الذهبية تتبع تقدّم الطالب الحقيقي */
  useEffect(() => {
    if (ready && look.pet === 'egg') heroRef.current?.eggProgress(d.egg.started ? d.egg.progress / d.egg.goal : 0);
  }, [ready, look.pet, d.egg]);

  /* صور الشخصيات بملابس البطل الحالية — تُرسم فقط في تبويب «شخصيتي» وحين تتغير الملابس */
  const { char: _c, skin: _s, world: _w, pet: _p, mount: _m, aura: _a, ...outfit } = look;
  const outfitKey = JSON.stringify(outfit);
  useEffect(() => {
    if (!ready || tab !== 'chars') return;
    const id = setTimeout(() => setShots(heroRef.current?.portraits(look, 160) ?? {}), 60);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, tab, outfitKey]);

  function say(text, ms = 2400) {
    setBubble(text);
    clearTimeout(bubbleT.current);
    bubbleT.current = setTimeout(() => setBubble(''), ms);
  }
  function voice(charId, key) {
    if (!sound) return;
    try {
      const a = audioRef.current ?? (audioRef.current = new Audio());
      a.pause(); a.src = `/api/hero-voice?c=${charId}&k=${key}`; a.play().catch(() => {});
    } catch { /* لا صوت في هذا المتصفح */ }
  }
  function toggleSound() {
    const next = !sound; setSound(next);
    try { localStorage.setItem('hero-sound', next ? 'on' : 'off'); } catch { /* تخزين محجوب */ }
    if (!next) audioRef.current?.pause();
  }
  function celebrate() {
    const now = Date.now();
    const bits = Array.from({ length: 36 }, (_, i) => ({ id: `${now}-${i}`, left: Math.random() * 100, color: CONFETTI_C[i % 5], delay: Math.random() * .3, dur: 1.3 + Math.random() * .8 }));
    setConfetti(bits);
    setTimeout(() => setConfetti(c => (c[0]?.id === bits[0].id ? [] : c)), 2600);
  }

  /* قفل القطع الخاصة: ما يُكسب بإنجاز أو بتحدٍّ أو يفقس من البيضة */
  function lockedWhy(slot, it) {
    if (isOwned(slot, it.id, d.owned)) return null;
    if (it.hatch) return '🥚 هَذَا الرَّفِيقُ يَخْرُجُ مِنَ الْبَيْضَةِ الْغَامِضَةِ — ضَعْهَا فِي الْعُشِّ وَتَعَلَّمْ!';
    if (it.earn) { const a = ACHIEVEMENTS.find(x => x.id === it.earn); return `🏅 ${a?.how ?? 'أَكْمِلِ الْإِنْجَازَ'}`; }
    if (it.weekly) { const w = WEEKLY.find(x => x.reward === itemKey(slot, it.id)); return `📅 جَائِزَةُ تَحَدِّي الْأُسْبُوعِ: ${w?.text ?? ''}`; }
    return null;
  }
  const visible = (slot) => ITEMS[slot].filter(it => !it.season || seasonActive(it.season) || d.owned.has(itemKey(slot, it.id)));

  function wear(key, val, announce, move = 'jump') {
    if (look[key] === val) return;
    setLook(l => ({ ...l, [key]: val }));
    setNote('');
    if (announce) { say(announce); heroRef.current?.[move](); }
  }
  function pickItem(slot, it) {
    const why = lockedWhy(slot, it);
    if (why && isSpecial(it)) { say(why, 3600); return; }
    if (slot === 'char') {
      if (look.char === it.id) return;
      setLook(l => ({ ...l, char: it.id, skin: it.firstColor ?? 0 }));
      setNote(''); say(it.hello); heroRef.current?.wave(); voice(it.id, 'hello');
      return;
    }
    if (slot === 'world') return wear(slot, it.id, it.id === 'studio' ? null : `${it.icon} أَهْلًا بِكَ فِي ${it.name}!`);
    const back = slot === 'back';
    wear(slot, it.id, it.id === 'none' ? null : `${it.icon} ${it.name}!${back ? ' انْظُرْ إِلَى ظَهْرِي' : ''}`, back ? 'peek' : 'jump');
  }

  async function api(url, body, method = 'POST') {
    const res = await childFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(j.error || 'تَعَذَّرَ ذَلِكَ الْآنَ، حَاوِلْ مَرَّةً أُخْرَى'); e.data = j; throw e; }
    return j;
  }
  async function persist(next, msg, extra = {}) {
    await api('/api/hero-config', { look: next, preview_url: heroRef.current?.snapshot(160) ?? undefined, ...extra }, 'PATCH');
    setSaved(next);
    if (next.pet === 'egg' && !d.egg.started) reload().catch(() => {});
    if (msg) say(msg);
  }
  async function buy() {
    if (busy) return;
    const up = unpaidItems(look, d.owned);
    if (!up.length) return;
    setBusy('buy'); setNote('');
    const next = look;
    try {
      const r = await api('/api/hero-config/shop', { items: up.map(x => x.key) });
      setD(p => ({ ...p, points: r.points, owned: new Set([...p.owned, ...up.map(x => x.key)]) }));
      setBump(b => b + 1); celebrate(); heroRef.current?.jump();
      await persist(next, 'شُكْرًا! صِرْتُ أَجْمَلَ الْآنَ 😎');
    } catch (e) {
      if (typeof e.data?.points === 'number') setD(p => ({ ...p, points: e.data.points }));
      setNote(e.message);
    } finally { setBusy(null); }
  }
  async function save() {
    if (busy) return;
    setBusy('save'); setNote('');
    try { await persist(look, 'تَمَّ حِفْظُ بَطَلِكَ! 💾'); heroRef.current?.jump(); }
    catch (e) { setNote(e.message); }
    finally { setBusy(null); }
  }
  function undo() { setLook(saved ?? DEFAULT_LOOK); setNote(''); say('رَجَعْتُ كَمَا كُنْتُ 🙂'); }

  async function chooseTitle(id) {
    if (busy) return;
    setBusy('title'); setNote('');
    const base = saved ?? DEFAULT_LOOK;
    try {
      await api('/api/hero-config', { look: base, title: id }, 'PATCH');
      if (!saved) setSaved(base);
      setD(p => ({ ...p, title: id }));
      const a = ACHIEVEMENTS.find(x => x.id === id);
      if (a) { say(`${a.icon} لَقَبُكَ الْآنَ: ${a.title}!`); heroRef.current?.jump(); }
    } catch (e) { setNote(e.message); } finally { setBusy(null); }
  }
  async function startEgg() {
    if (busy) return;
    setBusy('egg'); setNote('');
    try {
      await api('/api/hero-config/egg', { action: 'start' });
      setLook(l => ({ ...l, pet: 'egg' })); setSaved(s => ({ ...(s ?? DEFAULT_LOOK), pet: 'egg' }));
      await reload();
      say('🥚 وَضَعْتَ الْبَيْضَةَ فِي الْعُشِّ! كُلُّ نَجْمَةٍ مِنَ التَّعَلُّمِ تُقَرِّبُهَا مِنَ الْفَقْسِ', 3600);
    } catch (e) { setNote(e.message); } finally { setBusy(null); }
  }
  async function hatch() {
    if (busy) return;
    setBusy('hatch'); setNote('');
    try {
      await api('/api/hero-config/egg', { action: 'hatch' });
      // على الجوال المتجر تحت البطل — نصعد إليه ليرى الطفل الفقس (والرسم يتوقف حين يختفي البطل)
      stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      say('الْبَيْضَةُ تَهْتَزُّ... 😮', 1800);
      let done = false;
      const hatched = () => {
        if (done) return; done = true;
        setD(p => ({ ...p, owned: new Set([...p.owned, 'pet:dragon']), egg: { ...p.egg, started: false, hatched: true } }));
        setLook(l => ({ ...l, pet: 'dragon' })); setSaved(s => ({ ...(s ?? DEFAULT_LOOK), pet: 'dragon' }));
        celebrate(); heroRef.current?.jump();
        say('🐉 فَقَسَتِ الْبَيْضَةُ! هَذَا تِنِّينُكَ الصَّغِيرُ', 3600);
      };
      heroRef.current?.hatch(hatched);
      setTimeout(hatched, 4000); // التنين صار له على الخادم — يظهر حتى لو لم يكتمل المشهد
    } catch (e) { setNote(e.message); } finally { setBusy(null); }
  }
  async function claim() {
    if (busy) return;
    setBusy('claim'); setNote('');
    try {
      const r = await api('/api/hero-config/claim', {});
      setD(p => ({ ...p, owned: new Set([...p.owned, r.reward]), weekly: { ...p.weekly, claimed: true } }));
      celebrate(); heroRef.current?.jump();
      say(`🎁 رَبِحْتَ ${labelOf(r.reward)}! الْبَسْهَا الْآنَ`, 3600);
    } catch (e) { setNote(e.message); } finally { setBusy(null); }
  }

  function move(m) {
    const C = charOf(look);
    if (m === 'special') { heroRef.current?.special(); say(`${C.special.icon} ${C.special.name}!`, 1800); voice(C.id, 'special'); return; }
    if (m === 'photo') {
      const a = ACHIEVEMENTS.find(x => x.id === d.title);
      const url = heroRef.current?.poster({ name: a ? `${C.name} — ${a.title}` : C.name });
      if (url) setPhoto(url); else say('تَعَذَّرَ الْتِقَاطُ الصُّورَةِ 🙈');
      return;
    }
    const em = EMOTES.find(x => x.id === m); heroRef.current?.emote(m); if (em) say(`${em.icon} ${em.name}!`, 1600);
  }
  async function sharePhoto() {
    try {
      const [head, b64] = photo.split(',');
      const bin = atob(b64), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: head.match(/:(.*?);/)?.[1] || 'image/png' });
      const file = new File([blob], 'بطلي.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'بَطَلِي فِي أَكَادِيمِيَّةِ عَارِمٍ', text: 'انْظُرُوا إِلَى بَطَلِي! ⭐' });
      else say('حَفِظْنَا الصُّورَةَ؟ اضْغَطْ «احْفَظِ الصُّورَةَ» ثُمَّ أَرْسِلْهَا 💌');
    } catch { /* أُلغيت المشاركة */ }
  }

  const C = charOf(look);
  const up = unpaidItems(look, d.owned);
  const lockedUp = up.filter(x => isSpecial(x.item));
  const sum = up.reduce((s, x) => s + x.item.price, 0);
  const changed = !saved || !looksEqual(look, saved);
  const titleA = ACHIEVEMENTS.find(x => x.id === d.title);
  const w = d.weekly, wDef = w && WEEKLY.find(x => x.id === w.id);
  const nextLv = Math.min(LEVELS.length - 1, d.level + 1);

  const chip = (slot, it) => {
    const sel = look[slot] === it.id, own = isOwned(slot, it.id, d.owned);
    if (!own && it.hatch) return <span className="hs-pr hs-cost">🥚 يَفْقِسُ</span>;
    if (!own && it.earn) return <span className="hs-pr hs-cost">🏅 بِالْإِنْجَازِ</span>;
    if (!own && it.weekly) return <span className="hs-pr hs-cost">📅 جَائِزَةٌ</span>;
    if (sel && !own) return <span className="hs-pr hs-try">👀 تُجَرِّبُهُ</span>;
    if (own) return <span className="hs-pr hs-own">{it.earn ? '🏅 كَسَبْتَهُ' : it.price || it.weekly || it.hatch ? '✓ لَدَيْكَ' : 'مَجَّانِيٌّ'}</span>;
    return <span className="hs-pr hs-cost">⭐ {it.price}{it.season ? ' · مَوْسِمِيٌّ' : ''}</span>;
  };
  const tiles = (slot, list = visible(slot)) => (
    <div className="hs-items">
      {list.map(it => (
        <button key={it.id} type="button" className={`hs-item${look[slot] === it.id ? ' hs-sel' : ''}${lockedWhy(slot, it) && isSpecial(it) ? ' hs-locked' : ''}`} onClick={() => pickItem(slot, it)} aria-pressed={look[slot] === it.id}>
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
  const group = (title, inner, sub) => <div className="hs-group"><h3>{title}</h3>{sub && <p className="hs-sub">{sub}</p>}{inner}</div>;
  const bar = (v, max) => <div className="hs-bar-p"><i style={{ width: `${Math.min(100, max ? v / max * 100 : 0)}%` }} /></div>;

  const weeklyCard = w && wDef && (
    <div className="hs-weekly">
      <div className="hs-weekly-top">
        <span className="hs-weekly-ic" aria-hidden="true">{wDef.icon}</span>
        <div className="hs-weekly-txt"><b>تَحَدِّي الْأُسْبُوعِ</b><span>{wDef.text}</span></div>
        <span className="hs-weekly-gift" title="الْجَائِزَةُ">{labelOf(w.reward)}</span>
      </div>
      {bar(w.progress, w.goal)}
      <div className="hs-weekly-foot">
        <span>{w.progress} / {w.goal} ⭐</span>
        {w.claimed ? <span className="hs-pr hs-own">✓ رَبِحْتَهَا</span>
          : w.progress >= w.goal ? <button type="button" className="hs-btn hs-buy hs-mini" onClick={claim} disabled={!!busy}>🎁 اسْتَلِمْ جَائِزَتَكَ</button>
            : <span className="hs-weekly-hint">تَتَجَدَّدُ كُلَّ اثْنَيْنِ</span>}
      </div>
    </div>
  );

  return (
    <div className="hs-page" ref={pageRef}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="hs-wrap">
        <div className="hs-bar">
          <Link href="/dashboard" className="hs-back" aria-label="الْعَوْدَةُ إِلَى لَوْحَتِي">→</Link>
          <h1>عَالَمُ الْأَبْطَالِ</h1>
          {!showPreview && <button type="button" className="hs-sound" onClick={toggleSound} aria-label={sound ? 'إِيقَافُ صَوْتِ الْبَطَلِ' : 'تَشْغِيلُ صَوْتِ الْبَطَلِ'}>{sound ? '🔊' : '🔇'}</button>}
          <div key={bump} className={`hs-points${bump ? ' hs-bump' : ''}`} aria-label={`رصيدك الفعلي: ${d.points}`} title="رصيدك الفعلي؛ لا يتغير في معاينة الأبطال الجدد">⭐ <span>{loaded ? d.points : '…'}</span></div>
        </div>

        <nav className="hs-preview-switch" aria-label="عرض عالم الأبطال">
          <button type="button" aria-pressed={!showPreview} disabled={!!busy} onClick={() => changePreview(false)}>أبطالي الحاليون</button>
          <button type="button" aria-pressed={showPreview} disabled={!!busy} onClick={() => changePreview(true)}>✨ جرّب الأبطال الجدد <small>معاينة</small></button>
        </nav>
        {showPreview && <HeroesPreview onReturn={() => changePreview(false)} />}

        <div hidden={showPreview}>
        <div className="hs-studio">
          <div className="hs-left">
            <section className="hs-stage" ref={stageRef}>
              {loaded ? (
                <HeroAvatar3D ref={heroRef} look={look} level={d.level} letters={d.letters} onReady={() => setReady(true)}
                  label="بَطَلُكَ ثُلَاثِيُّ الْأَبْعَادِ — اسْحَبْهُ لِتُدِيرَهُ، وَالْمِسْهُ لِيَقْفِزَ"
                  onTap={() => { const i = Math.floor(Math.random() * C.lines.length); say(C.lines[i]); voice(C.id, `l${i}`); }} />
              ) : (
                <div className="hs-loading">يُجَهِّزُ بَطَلَكَ…</div>
              )}
              <div className="hs-tag">{C.icon} {C.name}{titleA && <small>{titleA.icon} {titleA.title}</small>}</div>
              <div className={`hs-bubble${bubble ? ' hs-show' : ''}`} aria-live="polite">{bubble}</div>
              <div className="hs-drag">↔ اسْحَبْ لِتُدِيرَ بَطَلَكَ، وَالْمِسْهُ لِيَقْفِزَ</div>
            </section>
            <nav className="hs-moves" aria-label="حَرَكَاتُ الْبَطَلِ">
              <button type="button" className="hs-special" onClick={() => move('special')}><span aria-hidden="true">{C.special.icon}</span>{C.special.name}</button>
              {EMOTES.map(e => (
                <button key={e.id} type="button" className="hs-emote" onClick={() => move(e.id)} aria-label={e.name}><span aria-hidden="true">{e.icon}</span><small>{e.name}</small></button>
              ))}
              <button type="button" className="hs-emote hs-photo" onClick={() => move('photo')} aria-label="صُورَةُ الْبَطَلِ"><span aria-hidden="true">📸</span><small>صُورَتِي</small></button>
            </nav>
            {weeklyCard}
          </div>

          <section className="hs-panel">
            <nav className="hs-tabs" aria-label="أَقْسَامُ الِاسْتُودْيُو">
              {TABS.map(t => (
                <button key={t.id} type="button" className={`hs-tab${tab === t.id ? ' hs-on' : ''}`} onClick={() => setTab(t.id)} aria-pressed={tab === t.id}>
                  <span className="hs-em" aria-hidden="true">{t.em}</span>{t.name}
                  {t.id === 'badges' && w && !w.claimed && w.progress >= w.goal && <i className="hs-dot" aria-label="جَائِزَةٌ تَنْتَظِرُكَ" />}
                </button>
              ))}
            </nav>
            <div className="hs-opts">
              {tab === 'chars' && group('اخْتَرْ شَخْصِيَّتَكَ', (
                <div className="hs-items hs-chars">
                  {CHARACTERS.map(c => (
                    <button key={c.id} type="button" className={`hs-item hs-char${look.char === c.id ? ' hs-sel' : ''}`} onClick={() => pickItem('char', c)} aria-pressed={look.char === c.id}>
                      {shots[c.id] ? <img className="hs-shot" src={shots[c.id]} alt="" /> : <span className="hs-ic" aria-hidden="true">{c.icon}</span>}
                      <span className="hs-nm">{c.name}</span>
                      <span className="hs-move">{c.special.icon} {c.special.name}</span>
                      {chip('char', c)}
                    </button>
                  ))}
                </div>
              ), 'كُلُّ شَخْصِيَّةٍ تَلْبَسُ مَلَابِسَكَ وَمُعَدَّاتِكَ، وَلَهَا حَرَكَةٌ خَاصَّةٌ — جَرِّبْهَا مِنَ الزِّرِّ الذَّهَبِيِّ!')}
              {tab === 'clothes' && <>
                {group('الْقَمِيصُ', tiles('top'))}
                {['tee', 'hoodie', 'jersey'].includes(look.top) && group('لَوْنُ الْقَمِيصِ', swatches('topC', CLOTH_C))}
                {!['thobe', 'space'].includes(look.top) && group('السِّرْوَالُ', <>{tiles('bottom')}{swatches('pantsC', PANTS_C)}</>)}
                {group(SLOT_LABEL.head, tiles('head'))}
                {group(SLOT_LABEL.eyes, tiles('eyes'))}
              </>}
              {tab === 'gear' && <>
                {group(SLOT_LABEL.mount, tiles('mount'), 'يَطِيرُ بَطَلُكَ فَوْقَ مَرْكَبَتِهِ!')}
                {group(SLOT_LABEL.hand, tiles('hand'))}
                {group(SLOT_LABEL.back, tiles('back'))}
              </>}
              {tab === 'magic' && <>
                {group(SLOT_LABEL.aura, tiles('aura'), `هَالَةُ الْحُرُوفِ تُدِيرُ حَوْلَ بَطَلِكَ الْحُرُوفَ الَّتِي أَتْقَنْتَهَا: ${d.letters.length} مِنْ ٢٨`)}
                {group('رَفِيقِي', <>
                  {tiles('pet')}
                  {look.pet === 'egg' && !d.egg.hatched && (
                    <div className="hs-egg">
                      {!d.egg.started ? <>
                        <span>ضَعِ الْبَيْضَةَ فِي الْعُشِّ، وَكُلُّ نَجْمَةٍ تَكْسِبُهَا مِنَ الدُّرُوسِ وَالْأَلْعَابِ تُقَرِّبُهَا مِنَ الْفَقْسِ 🥚</span>
                        <button type="button" className="hs-btn hs-buy hs-mini" onClick={startEgg} disabled={!!busy}>🪺 ضَعْهَا فِي الْعُشِّ</button>
                      </> : d.egg.progress >= d.egg.goal ? <>
                        <span>الْبَيْضَةُ جَاهِزَةٌ! 🐣</span>
                        <button type="button" className="hs-btn hs-buy hs-mini" onClick={hatch} disabled={!!busy}>🐣 افْقِسِ الْبَيْضَةَ!</button>
                      </> : <>
                        {bar(d.egg.progress, d.egg.goal)}
                        <span>{d.egg.progress} / {d.egg.goal} ⭐ — الْعَبْ وَتَعَلَّمْ لِتَفْقِسَ!</span>
                      </>}
                    </div>
                  )}
                </>, 'الْبَيْضَةُ الْغَامِضَةُ تَفْقِسُ بِنُجُومِ التَّعَلُّمِ — مَاذَا سَيَخْرُجُ مِنْهَا؟')}
              </>}
              {tab === 'world' && <>
                {group(SLOT_LABEL.world, tiles('world'), 'بَطَلُكَ يَعِيشُ فِي عَالَمِهِ الْخَاصِّ')}
                {group('مِنَصَّتِي تَكْبُرُ مَعَ مُسْتَوَايَ', <>
                  <div className="hs-levels">
                    {LEVELS.map((l, i) => <div key={l.name} className={`hs-lv${d.level === i ? ' hs-sel' : ''}${i > d.level ? ' hs-dim' : ''}`}><span aria-hidden="true">{l.icon}</span>{l.name}</div>)}
                  </div>
                  {d.level < LEVELS.length - 1 ? <>{bar(d.earned % 1000, 1000)}<p className="hs-sub">بَقِيَتْ {1000 - (d.earned % 1000)} ⭐ لِتَصِلَ إِلَى {LEVELS[nextLv].icon} {LEVELS[nextLv].name}</p></>
                    : <p className="hs-sub">🏆 وَصَلْتَ إِلَى أَعْلَى مُسْتَوًى!</p>}
                </>)}
              </>}
              {tab === 'me' && <>
                {C.colors.length > 1 ? group(C.colorLabel, swatches('skin', C.colors)) : group(C.colorLabel, <p className="hs-hint">{C.icon} {C.name} لَوْنُهُ مُمَيَّزٌ دَائِمًا!</p>)}
                {C.id === 'kid' && <>
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
                {look.top !== 'space' && group('الْحِذَاءُ', swatches('shoeC', SHOE_C))}
              </>}
              {tab === 'badges' && <>
                {weeklyCard && group('تَحَدِّي الْأُسْبُوعِ', weeklyCard, 'جَائِزَتُهُ قِطْعَةٌ لَا تُشْتَرَى بِالنُّجُومِ')}
                {group('أَوْسِمَتِي وَأَلْقَابِي', (
                  <div className="hs-achs">
                    {ACHIEVEMENTS.map(a => {
                      const got = d.achievements.includes(a.id), cur = d.title === a.id;
                      return (
                        <div key={a.id} className={`hs-ach${got ? ' hs-got' : ''}`}>
                          <span className="hs-ach-ic" aria-hidden="true">{got ? a.icon : '🔒'}</span>
                          <div className="hs-ach-txt"><b>{a.title}</b><span>{a.how}</span></div>
                          {got && (cur
                            ? <button type="button" className="hs-pr hs-try hs-ach-btn" onClick={() => chooseTitle(null)} disabled={!!busy}>✨ لَقَبُكَ</button>
                            : <button type="button" className="hs-pr hs-own hs-ach-btn" onClick={() => chooseTitle(a.id)} disabled={!!busy}>اجْعَلْهُ لَقَبِي</button>)}
                        </div>
                      );
                    })}
                  </div>
                ), `كَسَبْتَ ${d.achievements.length} مِنْ ${ACHIEVEMENTS.length} — اللَّقَبُ يَظْهَرُ تَحْتَ اسْمِ بَطَلِكَ`)}
                {d.seasons.length > 0 && group('الْمَوْسِمُ الْآنَ', <p className="hs-hint">{SEASONS.filter(s => d.seasons.includes(s.id)).map(s => `${s.icon} ${s.name}`).join('، ')} — قِطَعُهُ فِي «سِحْرِي» لِوَقْتٍ مَحْدُودٍ!</p>)}
              </>}
            </div>
          </section>
        </div>

        <div className="hs-act" ref={actRef}><div className="hs-act-in">
          {up.length > 0 ? <>
            <div className="hs-trying">تُجَرِّبُ الْآنَ: {up.map(x => `${x.item.icon} ${x.item.name}`).join('، ')}</div>
            {lockedUp.length > 0 ? (
              <div className="hs-row">
                <button type="button" className="hs-btn hs-off" disabled>🔒 {lockedUp[0].item.icon} تُكْسَبُ وَلَا تُشْتَرَى</button>
                <button type="button" className="hs-btn hs-soft" onClick={undo} disabled={!!busy}>↩ تَرَاجَعْ</button>
              </div>
            ) : (
              <div className="hs-row">
                {d.points >= sum ? (
                  <button type="button" className="hs-btn hs-buy" onClick={buy} disabled={!!busy}>{busy === 'buy' ? '⏳ لَحْظَةً…' : `🛒 اشْتَرِ بِـ ${sum} ⭐`}</button>
                ) : (
                  <button type="button" className="hs-btn hs-off" disabled>🔒 يَنْقُصُكَ {sum - d.points} ⭐</button>
                )}
                <button type="button" className="hs-btn hs-soft" onClick={undo} disabled={!!busy}>↩ تَرَاجَعْ</button>
              </div>
            )}
            {lockedUp.length === 0 && d.points < sum && <div className="hs-trying">كُلُّ دَرْسٍ تُنْهِيهِ يَمْنَحُكَ نُجُومًا جَدِيدَةً 💪</div>}
          </> : changed ? (
            <button type="button" className="hs-btn hs-save" onClick={save} disabled={!!busy || !loaded}>{busy === 'save' ? '⏳ لَحْظَةً…' : '💾 احْفَظْ بَطَلِي'}</button>
          ) : (
            <button type="button" className="hs-btn hs-off" disabled>✅ بَطَلُكَ مَحْفُوظٌ</button>
          )}
          {note && <div className="hs-note" role="status">{note}</div>}
        </div></div>
        </div>
      </div>

      {photo && (
        <div className="hs-photo-modal" role="dialog" aria-label="صُورَةُ بَطَلِكَ" onClick={(e) => { if (e.target === e.currentTarget) setPhoto(null); }}>
          <div className="hs-photo-card">
            <img src={photo} alt="صُورَةُ بَطَلِكَ" />
            <div className="hs-row">
              <a className="hs-btn hs-buy" href={photo} download="بطلي.png">⬇️ احْفَظِ الصُّورَةَ</a>
              <button type="button" className="hs-btn hs-soft" onClick={sharePhoto}>💌 أَرْسِلْهَا</button>
            </div>
            <button type="button" className="hs-btn hs-off" onClick={() => setPhoto(null)}>✕ إِغْلَاقٌ</button>
          </div>
        </div>
      )}

      {confetti.map(c => (
        <span key={c.id} className="hs-confetti" aria-hidden="true"
          style={{ left: `${c.left}vw`, background: c.color, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s` }} />
      ))}
    </div>
  );
}

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
.hs-preview-switch { display: flex; flex-wrap: wrap; gap: 8px; padding: 5px; border: 1px solid #EDE5D8; background: #FAF7F2; border-radius: 18px; }
.hs-preview-switch button { flex: 1; min-width: 140px; min-height: 48px; border-radius: 13px; padding: 8px 12px; font-weight: 800; font-size: .88rem; }
.hs-preview-switch button[aria-pressed=true] { background: #E8B84B; color: #1A2B4A; box-shadow: 0 2px 7px #1A2B4A12; }
.hs-preview-switch small { display: inline-block; font-size: .66rem; padding: 1px 7px; border-radius: 20px; background: #1A2B4A; color: #fff; margin-inline-start: 4px; }
.hs-preview-switch button:disabled { opacity: .6; cursor: wait; }

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
/* ===== عالم الأبطال: الحركات، التحدّي الأسبوعي، البيضة، المنصة، الأوسمة، الصورة ===== */
.hs-left { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
@media (min-width: 900px) {
  .hs-left { height: max(440px, min(640px, calc(100vh - 110px - var(--hs-act-h)))); }
  .hs-left .hs-stage { height: auto; flex: 1 1 auto; min-height: 280px; }
}
.hs-sound { width: 48px; height: 48px; flex: 0 0 auto; border-radius: 50%; background: var(--hs-card) !important; box-shadow: 0 3px 10px rgba(26,43,74,.08); font-size: 1.35rem; display: grid; place-items: center; }
.hs-tag { border-radius: 18px; text-align: center; }
.hs-tag small { display: block; font-family: var(--hs-ui); font-size: .78rem; font-weight: 800; color: var(--hs-gold); line-height: 1.5; }
.hs-hint, .hs-sub { margin: -4px 0 0; font-family: var(--hs-story); font-size: .98rem; line-height: 1.7; color: var(--hs-soft); }

/* سبعة تبويبات: صف واحد على الشاشة الواسعة، وصفّان على الجوال */
.hs-tabs { grid-template-columns: repeat(7, minmax(0, 1fr)); }
.hs-tab { position: relative; font-size: .84rem; }
@media (max-width: 559px) { .hs-tabs { grid-template-columns: repeat(4, minmax(0, 1fr)); } .hs-tab { min-height: 62px; } }
.hs-dot { position: absolute; top: 6px; left: 8px; width: 12px; height: 12px; border-radius: 50%; background: var(--hs-gold); box-shadow: 0 0 0 3px #fff; animation: hsPulse 1.2s ease-in-out infinite; }

/* الشخصيات بصورها الحقيقية */
.hs-chars .hs-char { padding-top: 4px; min-height: 150px; }
.hs-shot { width: 92px; height: 92px; object-fit: contain; display: block; margin: 0 auto -4px; }
.hs-move { font-size: .74rem; font-weight: 800; color: var(--hs-violet); line-height: 1.4; text-align: center; }
.hs-item.hs-locked { opacity: .72; }
.hs-item.hs-locked::after { content: '🔒'; position: absolute; top: 6px; left: 8px; font-size: .9rem; }

/* شريط الحركات: الحركة الخاصة + الرقصات + الصورة */
/* كل الحركات ظاهرة بلا تمرير: الحركة الخاصة ثم خمسة أزرار؛ على الجوال الخاصة في صف وحدها */
.hs-moves { display: grid; grid-template-columns: auto repeat(5, minmax(0, 1fr)); gap: 8px; padding: 2px 2px 6px; }
@media (max-width: 559px) { .hs-moves { grid-template-columns: repeat(5, minmax(0, 1fr)); } .hs-special { grid-column: 1 / -1; justify-content: center; } }
.hs-special { display: flex; align-items: center; gap: 8px; min-height: 60px; padding: 6px 18px; border-radius: 20px; background: linear-gradient(135deg, #FFD978, #E8B84B) !important; color: var(--hs-ink); font-weight: 900; font-size: 1.05rem; box-shadow: 0 5px 0 #C29530; white-space: nowrap; }
.hs-special span { font-size: 1.6rem; }
.hs-special:active { transform: translateY(3px); box-shadow: 0 2px 0 #C29530; }
.hs-emote { min-width: 0; min-height: 60px; border-radius: 18px; background: var(--hs-card) !important; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; box-shadow: 0 3px 10px rgba(26,43,74,.08); }
.hs-emote span { font-size: 1.45rem; line-height: 1.2; }
.hs-emote small { font-size: .68rem; font-weight: 800; color: var(--hs-soft); line-height: 1.25; text-align: center; padding: 0 2px; }
.hs-emote:active { transform: scale(.94); }
.hs-emote.hs-photo { background: var(--hs-ink) !important; }
.hs-photo small { color: #fff; }

/* تحدّي الأسبوع */
.hs-weekly { background: linear-gradient(135deg, #F3EFFF, #FFF8E6); border: 2px solid #E6DDFF; border-radius: 22px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
.hs-weekly-top { display: flex; align-items: center; gap: 10px; }
.hs-weekly-ic { font-size: 1.9rem; line-height: 1; }
.hs-weekly-txt { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.hs-weekly-txt b { font-weight: 900; font-size: 1rem; }
.hs-weekly-txt span { font-family: var(--hs-story); font-size: .98rem; line-height: 1.7; color: var(--hs-soft); }
.hs-weekly-gift { flex: 0 0 auto; background: var(--hs-card); border-radius: 14px; padding: 4px 10px; font-weight: 800; font-size: .85rem; box-shadow: 0 2px 8px rgba(26,43,74,.06); }
.hs-weekly-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; font-weight: 800; font-variant-numeric: tabular-nums; }
.hs-weekly-hint { font-size: .85rem; color: var(--hs-soft); }
.hs-group .hs-weekly { border: none; padding: 0; background: none; }
.hs-bar-p { height: 14px; border-radius: 99px; background: #EDE7FA; overflow: hidden; }
.hs-bar-p i { display: block; height: 100%; min-width: 6px; border-radius: 99px; background: linear-gradient(90deg, #FFD24A, #E8B84B); transition: width .5s ease; }
.hs-mini { min-height: 50px; width: auto; font-size: 1rem; padding: 6px 16px; }

/* البيضة الغامضة */
.hs-egg { display: flex; flex-direction: column; align-items: stretch; gap: 10px; background: #FFF8E6; border-radius: 18px; padding: 12px 14px; font-family: var(--hs-story); font-weight: 700; line-height: 1.8; }
.hs-egg .hs-mini { align-self: center; font-family: var(--hs-ui); }

/* منصة المستوى */
.hs-levels { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
.hs-lv { min-height: 66px; border-radius: 16px; background: #F7F8FC; border: 3px solid transparent; font-weight: 800; font-size: .78rem; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.hs-lv span { font-size: 1.35rem; line-height: 1.3; }
.hs-lv.hs-sel { border-color: var(--hs-violet); background: #F3EFFF; }
.hs-lv.hs-dim { opacity: .45; }

/* الأوسمة والألقاب */
.hs-achs { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; }
@media (min-width: 560px) and (max-width: 899px), (min-width: 1040px) { .hs-achs { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.hs-ach { display: flex; align-items: center; gap: 10px; background: #F7F8FC; border-radius: 18px; padding: 10px 12px; min-height: 72px; }
.hs-ach.hs-got { background: #EFFAF5; box-shadow: inset 0 0 0 2px #CDEFDF; }
.hs-ach-ic { font-size: 1.8rem; line-height: 1; flex: 0 0 auto; }
.hs-ach:not(.hs-got) .hs-ach-ic { filter: grayscale(1); opacity: .6; }
.hs-ach-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.hs-ach-txt b { font-weight: 900; font-size: .98rem; }
.hs-ach-txt span { font-family: var(--hs-story); font-size: .9rem; line-height: 1.6; color: var(--hs-soft); }
.hs-ach-btn { flex: 0 0 auto; min-height: 44px; padding: 6px 12px !important; font-size: .85rem; white-space: nowrap; }

/* صورة البطل */
.hs-photo-modal { position: fixed; inset: 0; z-index: 400; background: rgba(26,43,74,.55); display: grid; place-items: center; padding: 16px; overflow-y: auto; }
.hs-photo-card { background: #fff; border-radius: 24px; padding: 14px; max-width: min(420px, 100%); width: 100%; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 20px 50px rgba(0,0,0,.3); }
.hs-photo-card img { width: 100%; max-height: 62vh; object-fit: contain; border-radius: 16px; display: block; }
.hs-photo-card .hs-row a { text-decoration: none; }
@keyframes hsPulse { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.3) } }
`;
