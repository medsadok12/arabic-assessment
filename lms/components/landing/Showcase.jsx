'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { SAMPLE_GAME_WORDS, SAMPLE_REPORT_SKILLS } from './content';
import { stripDia, getLetterForm, toContextual } from '../../lib/letter-forms';
import { speakArabic } from '../../lib/speak-arabic';
import { calcScore, WHEEL_PREVIEW_TARGET } from '../../lib/word-wheel';
import WheelSVG from '../WordWheelSVG';

/* ════════════════════════════════════════════════════════════════
   «معاينة من داخل المنصة» — ثلاث معاينات حيّة لا صور ثابتة:
   1) الصفحة الأولى من قصة حقيقية مشارَكة بصوتها المسجَّل فعلاً
   2) جولة مصغّرة من لعبة صيّاد الحروف بكلماتها وصورها وأصواتها الحقيقية،
      وبنفس شكلها: سماع الكلمة عند حلّها، وكشفها بألوان قوس قزح ونجوم
   3) عجلة حقيقية من المرحلة الأولى في «عجلة الكلمات» بنفس رسمها
   4) نموذج مصغّر من تقرير PDF بنفس تصميمه ومهاراته (أرقام توضيحية)
════════════════════════════════════════════════════════════════ */

/* قصة بطلها فهيم (ماسكوت الأكاديمية) تُقدَّم بهويته البنفسجية: شارة بوجهه على
   الصورة، والعنوان واسم البطل بلونه — القسم 2.4 في CLAUDE.md */
export function isFaheemStory(title) {
  return stripDia(title).replace(/ـ/g, '').includes('فهيم');
}

// صفحة أولى طويلة تُقرأ كصفحة كتاب: نص أصغر قليلاً بمحاذاة السطر، فوق ورقة بيضاء
const LONG_PAGE_CHARS = 110;

function StoryPreview({ story, c, faheem }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => () => audioRef.current?.pause(), []);

  // التشغيل داخل معالج اللمسة نفسه — شرط سفاري على آيباد/آيفون (القسم 16)
  const toggle = () => {
    let a = audioRef.current;
    if (!a) {
      a = new Audio(story.audio);
      a.ontimeupdate = () => setProgress(a.duration ? a.currentTime / a.duration : 0);
      a.onended = () => { setPlaying(false); setProgress(0); };
      a.onpause = () => setPlaying(false);
      a.onplay = () => setPlaying(true);
      audioRef.current = a;
    }
    if (a.paused) a.play().catch(() => setPlaying(false));
    else a.pause();
  };

  const title = story?.title || c.fallbackTitle;
  // المقاطع العريضة في المحرر (اسم البطل مثلاً) تُبرَز هنا كما أرادها المعلم
  const parts = story?.parts?.length ? story.parts : [{ t: story?.text || c.fallbackText, em: false }];
  const long  = parts.reduce((n, p) => n + p.t.length, 0) > LONG_PAGE_CHARS;

  return (
    <div className="v2s-story">
      <div className="v2s-story-media">
        {story?.image
          ? <img src={story.image} alt="" className="v2s-story-img" loading="lazy" />
          : <div className="v2s-story-img v2s-story-emoji" aria-hidden="true">🐱</div>}
        {faheem && (
          <span className="v2s-hero">
            <Image src="/faheem.png" alt="" width={80} height={102} className="v2s-hero-pic" />
            {c.heroBadge}
          </span>
        )}
      </div>
      <p className="v2s-story-title">{title}</p>
      <p className={`v2s-story-text${long ? ' long' : ''}`} lang="ar" dir="rtl">
        {parts.map((p, i) => (p.em
          ? <mark key={i} className="v2s-em">{p.t}</mark>
          : <Fragment key={i}>{p.t}</Fragment>))}
      </p>
      {story?.audio && (
        <button type="button" className={`v2s-listen${playing ? ' playing' : ''}`} onClick={toggle}>
          <span className="v2s-listen-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
          <span className="v2s-listen-label">{playing ? c.pause : c.listen}</span>
        </button>
      )}
      {story?.href && <a href={story.href} className="v2s-link">{c.readAll}</a>}
    </div>
  );
}

/* ألوان مبهجة لأزرار الحروف — طلب الأستاذ محمد: ما يخص الصغار بألوان مبهجة */
const OPTION_COLORS = [
  { bg: '#e0f2fe', bd: '#38bdf8', fg: '#075985' },   // سماوي
  { bg: '#fce7f3', bd: '#f472b6', fg: '#9d174d' },   // وردي
  { bg: '#fef3c7', bd: '#f59e0b', fg: '#92400e' },   // ليموني
];
// نفس نجوم كشف الكلمة في اللعبة
const SPARKS = [
  { em: '✨', an: 'v2gSpark0', delay: '0ms',   fs: '1.3rem' },
  { em: '⭐', an: 'v2gSpark1', delay: '80ms',  fs: '1.1rem' },
  { em: '💫', an: 'v2gSpark2', delay: '50ms',  fs: '1.2rem' },
  { em: '🌟', an: 'v2gSpark3', delay: '130ms', fs: '1.1rem' },
  { em: '✨', an: 'v2gSpark4', delay: '30ms',  fs: '1.4rem' },
  { em: '⭐', an: 'v2gSpark5', delay: '100ms', fs: '1rem' },
];

const fullWord = (w) => w.word.replace('_', w.missing);

function WordPicture({ w }) {
  const [err, setErr] = useState(false);
  if (w.image && !err) return <img src={w.image} alt="" className="v2g-img" onError={() => setErr(true)} />;
  return <div className="v2g-img v2g-emoji" aria-hidden="true">{w.emoji || '❓'}</div>;
}

function WordTiles({ w }) {
  const letters = stripDia(fullWord(w));
  const mi = stripDia(w.word.split('_')[0]).length;
  return (
    <div className="v2g-word" dir="rtl" aria-label={w.word.replace('_', '؟')}>
      {[...letters].map((ch, i) => (i === mi
        ? <span key={i} className="v2g-tile v2g-blank">؟</span>
        : <span key={i} className="v2g-tile">{toContextual(ch, getLetterForm(letters, i))}</span>))}
    </div>
  );
}

function GamePreview({ c, words }) {
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState('idle');   // idle | wrong | right
  const [wrongPicks, setWrongPicks] = useState([]);
  const [score, setScore] = useState(0);          // كلمات حُلّت من أول محاولة
  const [shakeKey, setShakeKey] = useState(0);
  const [popKey, setPopKey] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const audioRef = useRef(null);

  // مشغّل صوت واحد للعبة كلها — لا عنصر لكل كلمة (كل عنصر يُبقي اتصالاً مفتوحاً)
  const ensureAudio = () => {
    let a = audioRef.current;
    if (!a) {
      a = new Audio();
      a.preload = 'auto';
      a.onplay = () => setPlaying(true);
      a.onended = () => setPlaying(false);
      a.onpause = () => setPlaying(false);
      audioRef.current = a;
    }
    return a;
  };

  const stopSound = () => {
    audioRef.current?.pause();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setPlaying(false);
  };
  useEffect(() => () => stopSound(), []);

  // تجهيز صوت الكلمة الظاهرة فقط، كي يُسمع فور الإجابة الصحيحة
  useEffect(() => {
    const cur = words[idx];
    if (!cur?.audio) return;
    const a = ensureAudio();
    if (a.src !== cur.audio) a.src = cur.audio;
  }, [idx, words]);

  // يُستدعى من داخل اللمسة نفسها — شرط سفاري على آيباد/آيفون (القسم 16)
  const playWord = (word) => {
    stopSound();
    if (word.audio) {
      const a = ensureAudio();
      if (a.src !== word.audio) a.src = word.audio;
      a.currentTime = 0;
      a.play().catch(() => setPlaying(false));
    } else {
      speakArabic(fullWord(word), { onStart: () => setPlaying(true), onEnd: () => setPlaying(false) });
    }
  };

  const w = words[idx];
  const isLast = idx + 1 >= words.length;

  const pick = (letter) => {
    if (status === 'right' || wrongPicks.includes(letter)) return;
    if (letter !== w.missing) {
      setWrongPicks([...wrongPicks, letter]);
      setStatus('wrong');
      setShakeKey(k => k + 1);
      return;
    }
    setStatus('right');
    if (wrongPicks.length === 0) { setScore(s => s + 1); setPopKey(k => k + 1); }
    playWord(w);
  };

  const next = () => {
    stopSound();
    if (isLast) { setDone(true); return; }
    setIdx(idx + 1); setStatus('idle'); setWrongPicks([]); setShakeKey(0);
  };
  const restart = () => {
    stopSound();
    setIdx(0); setStatus('idle'); setWrongPicks([]); setScore(0); setPopKey(0); setShakeKey(0); setDone(false);
  };

  if (done) {
    const stars = Math.max(1, Math.min(3, score));
    return (
      <div className="v2g v2g-done">
        <div className="v2g-card">
          <div className="v2g-trophy" aria-hidden="true">🏆</div>
          <div className="v2g-stars" aria-hidden="true">{'⭐'.repeat(stars)}</div>
          <p className="v2g-done-title">{c.doneTitle}</p>
          <p className="v2g-done-score">{score} / {words.length}</p>
          <p className="v2g-done-msg">{c.doneMsg[stars - 1]}</p>
          <button type="button" className="v2g-again" onClick={restart}>{c.again}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="v2g">
      <div className="v2g-head">
        <span className="v2g-score">
          ✨ {score}
          {popKey > 0 && <span key={popKey} className="v2g-pop" aria-hidden="true">+1 ⭐</span>}
        </span>
        <span className="v2g-bar" aria-hidden="true">
          <span style={{ width: `${((idx + (status === 'right' ? 1 : 0)) / words.length) * 100}%` }} />
        </span>
        <span className="v2g-count">{idx + 1} / {words.length}</span>
      </div>

      <div className="v2g-card">
        <WordPicture key={idx} w={w} />

        {status === 'right' ? (
          <div className="v2g-reveal-wrap">
            {SPARKS.map((p, i) => (
              <span key={i} className="v2g-spark" style={{ fontSize: p.fs, animation: `${p.an} .9s ${p.delay} cubic-bezier(.25,.46,.45,.94) both` }} aria-hidden="true">{p.em}</span>
            ))}
            <div className="v2g-reveal">
              <span className="v2g-reveal-label">{c.right}</span>
              <span className="v2g-reveal-word" dir="rtl" lang="ar">{fullWord(w)}</span>
            </div>
          </div>
        ) : (
          <>
            <p className="v2g-prompt">{c.prompt}</p>
            <div key={shakeKey} className={`v2g-word-wrap${shakeKey ? ' v2g-shake' : ''}`}><WordTiles w={w} /></div>
          </>
        )}

        <div className="v2g-opts">
          {w.options.map((o, i) => {
            const col = OPTION_COLORS[i % OPTION_COLORS.length];
            const isRight = status === 'right' && o === w.missing;
            const faded = (status === 'right' && o !== w.missing) || wrongPicks.includes(o);
            return (
              <button
                key={o} type="button" onClick={() => pick(o)} aria-label={o}
                disabled={status === 'right' || wrongPicks.includes(o)}
                className={`v2g-opt${isRight ? ' right' : ''}${faded ? ' faded' : ''}`}
                style={isRight ? undefined : { '--opt-bg': col.bg, '--opt-bd': col.bd, '--opt-fg': col.fg }}
              >{o}</button>
            );
          })}
        </div>

        {status === 'wrong' && <p className="v2g-hint" aria-live="polite">{c.wrong}</p>}

        {status === 'right' && (
          <div className="v2g-actions">
            <button type="button" className={`v2g-replay${playing ? ' playing' : ''}`} onClick={() => playWord(w)}>{c.replay}</button>
            <button type="button" className="v2g-next" onClick={next}>{isLast ? c.finish : c.next}</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ألوان مبهجة لكلمات العجلة المكتشفة */
const CHIP_COLORS = [
  { bg: '#e0f2fe', bd: '#7dd3fc', fg: '#075985' },
  { bg: '#fce7f3', bd: '#f9a8d4', fg: '#9d174d' },
  { bg: '#dcfce7', bd: '#86efac', fg: '#166534' },
  { bg: '#ede9fe', bd: '#c4b5fd', fg: '#5b21b6' },
];

function WheelPreview({ c, wheels }) {
  const [wi, setWi] = useState(0);
  const [picked, setPicked] = useState([]);
  const [found, setFound] = useState([]);
  const [score, setScore] = useState(0);
  const [msg, setMsg] = useState(null);           // { text, type: good | tip | hint }
  const [shakeKey, setShakeKey] = useState(0);
  const [fly, setFly] = useState(null);           // { word, key }
  const [done, setDone] = useState(false);
  const msgTimer = useRef(null);
  const doneTimer = useRef(null);

  useEffect(() => () => {
    clearTimeout(msgTimer.current); clearTimeout(doneTimer.current);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const w = wheels[wi % wheels.length];
  const all = [...w.letters, w.center];
  const target = Math.min(WHEEL_PREVIEW_TARGET, w.words.length);

  const say = (text, type, ms = 2200) => {
    clearTimeout(msgTimer.current);
    setMsg({ text, type });
    if (ms) msgTimer.current = setTimeout(() => setMsg(null), ms);
  };
  const nudge = (text) => { setShakeKey(k => k + 1); say(text, 'tip'); };

  const tap = (letter) => { if (!done) setPicked(p => [...p, letter]); };

  const submit = () => {
    if (done) return;
    const word = picked.join('');
    if (word.length < 3) return nudge(c.short);
    if (!word.includes(w.center)) return nudge(c.needCenter.replace('{c}', w.center));
    if (found.includes(word)) return nudge(c.dup);
    if (!w.words.includes(word)) return nudge(c.notInList);
    const pts = calcScore(word, all);
    const next = [...found, word];
    setFound(next); setScore(s => s + pts); setPicked([]);
    setFly({ word, key: Date.now() });
    speakArabic(word);                       // داخل اللمسة نفسها — كما في اللعبة
    say(c.good.replace('{p}', pts), 'good');
    if (next.length >= target) doneTimer.current = setTimeout(() => setDone(true), 1300);
  };

  // تلميح: أول حرف من أقصر كلمة لم تُكتشف بعد
  const hint = () => {
    const left = w.words.filter(x => !found.includes(x)).sort((a, b) => a.length - b.length);
    if (!left.length) return;
    const h = left[0];
    say(`${c.hintText} ${h[0]} ${Array(h.length - 1).fill('_').join(' ')}`, 'hint', 4500);
  };

  const nextWheel = () => {
    clearTimeout(doneTimer.current);
    setWi(i => i + 1); setPicked([]); setFound([]); setScore(0); setMsg(null); setFly(null); setShakeKey(0); setDone(false);
  };

  const head = (
    <div className="v2w-head">
      <span className="v2w-title">🎡 {c.title}</span>
      <span className="v2w-score">✨ {score}</span>
    </div>
  );

  if (done) {
    return (
      <div className="v2w">
        {head}
        <div className="v2w-card v2w-done">
          <div className="v2g-trophy" aria-hidden="true">🏆</div>
          <div className="v2g-stars" aria-hidden="true">⭐⭐⭐</div>
          <p className="v2w-done-title">{c.doneTitle.replace('{n}', found.length)}</p>
          <div className="v2w-chips">
            {found.map((f, i) => {
              const col = CHIP_COLORS[i % CHIP_COLORS.length];
              return <span key={f} className="v2w-chip" style={{ background: col.bg, borderColor: col.bd, color: col.fg }}>{f}</span>;
            })}
          </div>
          <p className="v2w-done-score"><small>{c.points}</small>✨ {score}</p>
          <p className="v2w-done-more">{c.doneMore}</p>
          <button type="button" className="v2g-again" onClick={nextWheel}>{c.again}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="v2w">
      {head}
      <div className="v2w-card">
        <div className="v2w-goal">
          <span>{c.goal.replace('{n}', target)}</span>
          <span className="v2w-goal-stars" aria-label={`${found.length} / ${target}`}>
            {Array.from({ length: target }, (_, i) => (
              <span key={i} className={i < found.length ? 'on' : ''}>{i < found.length ? '⭐' : '☆'}</span>
            ))}
          </span>
        </div>

        <div className="v2w-wheel">
          {fly && (
            <div key={fly.key} className="v2w-fly-wrap" aria-hidden="true">
              {SPARKS.map((p, i) => (
                <span key={i} className="v2g-spark" style={{ fontSize: p.fs, animation: `${p.an} .9s ${p.delay} cubic-bezier(.25,.46,.45,.94) both` }}>{p.em}</span>
              ))}
              <span className="v2w-fly">{fly.word}</span>
            </div>
          )}
          <WheelSVG letters={w.letters} center={w.center} selectedLetters={picked} onLetterClick={tap} />
        </div>

        <div key={shakeKey} className={`v2w-input${shakeKey ? ' v2w-shake' : ''}${picked.length ? '' : ' empty'}`} aria-live="polite">
          {picked.length ? picked.join('') : c.placeholder}
        </div>

        <p className={`v2w-msg ${msg?.type || ''}`} aria-live="polite">{msg?.text || ' '}</p>

        <div className="v2w-controls">
          <button type="button" className="v2w-ctrl" onClick={() => setPicked(p => p.slice(0, -1))}>{c.del}</button>
          <button type="button" className="v2w-ctrl v2w-confirm" onClick={submit}>{c.confirm}</button>
          <button type="button" className="v2w-ctrl" onClick={() => setPicked([])}>{c.clear}</button>
        </div>

        <div className="v2w-foot">
          <button type="button" className="v2w-hint" onClick={hint}>{c.hint}</button>
          <div className="v2w-chips">
            {found.map((f, i) => {
              const col = CHIP_COLORS[i % CHIP_COLORS.length];
              return <span key={f} className="v2w-chip" style={{ background: col.bg, borderColor: col.bd, color: col.fg }}>{f}</span>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportPreview({ c }) {
  const overall = Math.round(SAMPLE_REPORT_SKILLS.reduce((s, k) => s + k.pct, 0) / SAMPLE_REPORT_SKILLS.length);
  return (
    <div className="v2s-report" dir="rtl" lang="ar">
      <span className="v2s-sample">{c.sample}</span>
      <div className="v2s-rep-head">
        <span className="v2s-rep-logo">ع</span>
        <span>{c.header}</span>
      </div>
      <div className="v2s-rep-body">
        <div className="v2s-rep-top">
          <span className="v2s-rep-student">{c.student}</span>
          <div className="v2s-rep-score">
            <b>{overall}%</b>
            <span>{c.grade} ⭐⭐⭐</span>
            <small>{c.level}</small>
          </div>
        </div>
        <p className="v2s-rep-h">{c.skillsTitle}</p>
        {SAMPLE_REPORT_SKILLS.map(s => {
          const color = s.pct >= 80 ? '#2e7d32' : s.pct >= 60 ? '#e65100' : '#c62828';
          return (
            <div key={s.name} className="v2s-rep-skill">
              <div className="v2s-rep-skill-row"><span>{s.name}</span><b style={{ color }}>{s.pct}%</b></div>
              <div className="v2s-rep-bar"><span style={{ width: `${s.pct}%`, background: color }} /></div>
            </div>
          );
        })}
        <div className="v2s-rep-rec">
          <b>{c.recTitle}</b>
          <p>{c.rec}</p>
        </div>
      </div>
    </div>
  );
}

export default function Showcase({ c, story, gameWords, wheels }) {
  const faheem = !!story && isFaheemStory(story.title);
  const items = [
    { key: 'story',  meta: c.story,  body: <StoryPreview story={story} c={c.story} faheem={faheem} />, variant: faheem ? 'faheem' : null },
    { key: 'game',   meta: c.game,   body: <GamePreview c={c.game} words={gameWords?.length ? gameWords : SAMPLE_GAME_WORDS} /> },
    ...(wheels?.length ? [{ key: 'wheel', meta: c.wheel, body: <WheelPreview c={c.wheel} wheels={wheels} /> }] : []),
    { key: 'report', meta: c.report, body: <ReportPreview c={c.report} /> },
  ];

  return (
    <section className="v2-show" id="showcase">
      <style dangerouslySetInnerHTML={{ __html: SHOWCASE_CSS }} />
      <div className="container">
        <h2 className="v2-h2">{c.showTitle}</h2>
        <p className="v2-sub">{c.showSub}</p>
        <div className="v2s-grid">
          {items.map(it => (
            <figure key={it.key} className="v2s-card">
              <span className="v2s-tag">{it.meta.tag}</span>
              <div className={`v2s-frame v2s-frame--${it.key}${it.variant ? ` v2s-frame--${it.variant}` : ''}`}>{it.body}</div>
              <figcaption className="v2s-caption">{it.meta.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

const SHOWCASE_CSS = `
  .v2-show{ background:#F4EFE6; padding:80px 0; }
  .v2s-grid{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:22px; align-items:stretch; max-width:1040px; margin:0 auto; }
  .v2s-card{ margin:0; background:#fff; border-radius:22px; padding:18px 18px 20px; display:flex; flex-direction:column; gap:14px;
    border:1.5px solid rgba(26,43,74,.08); box-shadow:0 2px 6px rgba(26,43,74,.05),0 10px 30px rgba(26,43,74,.08); min-width:0; }
  .v2s-tag{ align-self:flex-start; background:#FAF7F2; border:1.5px solid #EDE5D8; color:#1A2B4A; font-weight:800; font-size:.82rem; border-radius:999px; padding:5px 12px; }
  .v2s-frame{ flex:1; background:#FAF7F2; border-radius:16px; padding:16px; display:flex; flex-direction:column; justify-content:center; min-height:380px; }
  .v2s-caption{ font-size:.86rem; color:var(--muted); line-height:1.7; margin:0; }

  /* القصة */
  .v2s-story{ display:flex; flex-direction:column; align-items:center; gap:12px; text-align:center; width:100%; max-width:420px; margin:0 auto; }
  .v2s-story-media{ position:relative; width:100%; }
  .v2s-story-img{ width:100%; max-height:170px; object-fit:cover; border-radius:14px; display:block; }
  .v2s-story-emoji{ height:150px; display:flex; align-items:center; justify-content:center; font-size:4rem; background:#EDE5D8; }
  .v2s-story-title{ margin:0; font-weight:800; color:#1A2B4A; font-size:.95rem; }
  .v2s-story-text{ margin:0; white-space:pre-line; font-size:1.35rem; line-height:1.9; color:#1e293b; font-weight:600; }
  /* صفحة أولى طويلة: ورقة كتاب بيضاء، نص بمحاذاة السطر وحجم مريح لقراءة الطفل */
  .v2s-story-text.long{ width:100%; box-sizing:border-box; text-align:start; font-size:1.06rem; line-height:1.95;
    background:#fff; border:1.5px solid #EDE5D8; border-radius:16px; padding:10px 16px; box-shadow:0 2px 8px rgba(26,43,74,.05); }
  .v2s-em{ color:#1A2B4A; font-weight:900; background:linear-gradient(transparent 58%, #FBE8C4 58%); border-radius:3px; padding:0 2px; }

  /* قصة فهيم — هويته البنفسجية (#7C5CD9): ظل خلفية لطيف، شارة بوجهه، والعنوان واسمه بلونه */
  .v2s-frame--faheem{ background:linear-gradient(165deg,#F3EEFF 0%,#FAF7F2 62%); }
  .v2s-frame--faheem .v2s-story-img{ aspect-ratio:16/10; max-height:210px; border-radius:16px; box-shadow:0 10px 24px rgba(95,63,196,.18); }
  .v2s-hero{ position:absolute; bottom:-16px; inset-inline-start:14px; display:inline-flex; align-items:center; gap:7px;
    background:#7C5CD9; color:#fff; border:3px solid #fff; border-radius:999px; padding-block:3px; padding-inline:3px 14px;
    font-weight:800; font-size:.85rem; line-height:1; box-shadow:0 6px 16px rgba(124,92,217,.35); }
  .v2s-hero-pic{ width:34px; height:34px; border-radius:50%; background:#EFE9FB; object-fit:cover; object-position:50% 14%; }
  .v2s-frame--faheem .v2s-story-title{ margin-top:12px; color:#5f3fc4; font-weight:900; font-size:1.02rem; }
  .v2s-frame--faheem .v2s-story-text.long{ border-color:#E3D9F9; }
  .v2s-frame--faheem .v2s-em{ color:#5f3fc4; background:linear-gradient(transparent 58%, #E3D9F9 58%); }
  .v2s-listen{ position:relative; overflow:hidden; border:none; cursor:pointer; min-height:50px; min-width:170px; padding:0 24px;
    border-radius:16px; background:#E8B84B; color:#1A2B4A; font:inherit; font-weight:800; font-size:1rem;
    box-shadow:0 5px 0 #b8892a, 0 8px 18px rgba(26,43,74,.18); transition:transform .1s, box-shadow .1s; }
  .v2s-listen:active{ transform:translateY(4px); box-shadow:0 1px 0 #b8892a, 0 3px 8px rgba(26,43,74,.18); }
  .v2s-listen.playing{ background:#1A2B4A; color:#fff; box-shadow:0 5px 0 #0d1a30, 0 8px 18px rgba(26,43,74,.25); }
  .v2s-listen-fill{ position:absolute; inset:0 auto 0 0; background:rgba(232,184,75,.35); transition:width .25s linear; }
  .v2s-listen-label{ position:relative; }
  .v2s-link{ color:#1A2B4A; font-weight:800; font-size:.9rem; text-decoration:underline; text-underline-offset:4px; }

  /* اللعبة — بنفس شكل «صيّاد الحروف»: خلفية بنفسجية مبهجة وبطاقة بيضاء */
  .v2s-frame--game{ background:linear-gradient(135deg,#5b4fc4 0%,#7c3aed 50%,#9c3ec4 100%); padding:12px; }
  .v2g{ display:flex; flex-direction:column; gap:10px; width:100%; max-width:420px; margin:0 auto; }
  .v2g-head{ display:flex; align-items:center; gap:8px; color:#fff; }
  .v2g-score{ position:relative; flex-shrink:0; background:rgba(255,255,255,.2); border-radius:20px; padding:3px 12px; font-weight:800; font-size:.9rem; }
  .v2g-pop{ position:absolute; top:-26px; left:50%; transform:translateX(-50%); color:#fbbf24; font-weight:900; font-size:1rem; white-space:nowrap;
    pointer-events:none; text-shadow:0 1px 6px rgba(0,0,0,.45); animation:v2gFloatUp 1.1s ease forwards; }
  .v2g-bar{ flex:1; height:8px; background:rgba(255,255,255,.25); border-radius:4px; overflow:hidden; }
  .v2g-bar span{ display:block; height:100%; background:#fbbf24; border-radius:4px; transition:width .4s; }
  .v2g-count{ flex-shrink:0; font-size:.82rem; font-weight:700; opacity:.85; }
  .v2g-card{ background:#fff; border-radius:20px; padding:16px 12px; display:flex; flex-direction:column; align-items:center; gap:12px;
    box-shadow:0 14px 34px rgba(0,0,0,.25); text-align:center; }
  .v2g-img{ width:110px; height:110px; object-fit:contain; border-radius:16px; display:block; }
  .v2g-emoji{ background:#f5f3ff; display:flex; align-items:center; justify-content:center; font-size:3.6rem; }
  .v2g-prompt{ margin:0; font-weight:800; color:#7c3aed; font-size:.92rem; }
  .v2g-word{ display:flex; gap:5px; justify-content:center; width:100%; }
  .v2g-tile{ flex:0 1 44px; min-width:30px; height:54px; display:inline-flex; align-items:center; justify-content:center; border-radius:10px;
    background:#f5f3ff; border:2px solid #ede9fe; font-size:1.75rem; font-weight:700; color:#1a1a2e; }
  .v2g-blank{ border:3px dashed #7c3aed; background:#eef3fc; color:#7c3aed; }
  .v2g-word-wrap{ width:100%; }
  .v2g-shake{ animation:v2gShake .45s cubic-bezier(.36,.07,.19,.97) both; }
  .v2g-opts{ display:grid; grid-template-columns:repeat(3,minmax(0,68px)); gap:12px; justify-content:center; width:100%; padding-bottom:5px; }
  .v2g-opt{ aspect-ratio:1; border-radius:18px; border:2.5px solid var(--opt-bd); background:var(--opt-bg); color:var(--opt-fg);
    font:inherit; font-size:1.9rem; font-weight:800; cursor:pointer; box-shadow:0 5px 0 var(--opt-bd);
    transition:transform .1s, box-shadow .1s, opacity .2s; }
  .v2g-opt:active:not(:disabled){ transform:translateY(4px); box-shadow:0 1px 0 var(--opt-bd); }
  .v2g-opt.right{ background:linear-gradient(135deg,#4ade80,#22c55e); border-color:#16a34a; color:#fff; box-shadow:0 5px 0 #15803d;
    animation:v2gPop .45s cubic-bezier(.34,1.56,.64,1); }
  .v2g-opt.faded{ opacity:.35; cursor:default; }
  .v2g-hint{ margin:0; background:#fff7e6; color:#b45309; border-radius:12px; padding:7px 14px; font-weight:800; font-size:.9rem; }
  .v2g-reveal-wrap{ position:relative; padding:4px 0 6px; }
  .v2g-spark{ position:absolute; top:50%; left:50%; line-height:1; pointer-events:none; }
  .v2g-reveal{ display:inline-flex; flex-direction:column; align-items:center; background:linear-gradient(135deg,#f0fdf4,#dcfce7);
    border-radius:24px; padding:8px 24px 10px; border:2.5px solid #86efac;
    animation:v2gGlow 1.8s .4s ease-in-out infinite, v2gReveal .55s cubic-bezier(.34,1.56,.64,1) both; }
  .v2g-reveal-label{ font-size:.8rem; font-weight:800; color:#15803d; }
  .v2g-reveal-word{ font-size:2.4rem; font-weight:900; line-height:1.45;
    background:linear-gradient(90deg,#f59e0b,#10b981,#3b82f6,#8b5cf6,#f59e0b); background-size:300% auto;
    -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;
    animation:v2gShimmer 2.5s .55s linear infinite, v2gFloat 2.8s .55s ease-in-out infinite; }
  .v2g-actions{ display:flex; gap:10px; width:100%; }
  .v2g-replay, .v2g-next, .v2g-again{ border:none; cursor:pointer; min-height:48px; border-radius:14px; font:inherit; font-weight:800; font-size:.95rem; }
  .v2g-replay{ flex:1; background:#e0f2fe; color:#075985; box-shadow:0 4px 0 #7dd3fc; }
  .v2g-replay.playing{ animation:v2gPulse 1s ease-in-out infinite; }
  .v2g-next{ flex:1; background:#7c3aed; color:#fff; box-shadow:0 4px 0 #5b21b6; }
  .v2g-replay:active, .v2g-next:active{ transform:translateY(3px); box-shadow:none; }
  .v2g-done .v2g-card{ padding:22px 14px; gap:6px; }
  .v2g-trophy{ font-size:3.4rem; line-height:1; animation:v2gBounce 1.6s ease-in-out infinite; }
  .v2g-stars{ font-size:1.8rem; letter-spacing:4px; animation:v2gReveal .6s cubic-bezier(.34,1.56,.64,1) both; }
  .v2g-done-title{ margin:0; font-size:1.5rem; font-weight:900; color:#1a1a2e; }
  .v2g-done-score{ margin:0; font-size:2.4rem; font-weight:900; color:#F5A623; line-height:1.2; }
  .v2g-done-msg{ margin:0 0 8px; font-weight:700; color:#475569; font-size:.92rem; }
  .v2g-again{ width:100%; color:#fff; background:linear-gradient(135deg,#f59e0b,#f97316); box-shadow:0 4px 16px rgba(245,158,11,.4); }

  @keyframes v2gFloatUp{ 0%{ opacity:1; transform:translate(-50%,0) scale(1.25) } 70%{ opacity:1 } 100%{ opacity:0; transform:translate(-50%,-40px) scale(.9) } }
  @keyframes v2gReveal{ 0%{ opacity:0; transform:scale(.15) rotate(-10deg); filter:blur(12px) } 55%{ transform:scale(1.18) rotate(2deg); filter:blur(0) }
    75%{ transform:scale(.95) rotate(-1deg) } 100%{ opacity:1; transform:scale(1) rotate(0) } }
  @keyframes v2gFloat{ 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-5px) } }
  @keyframes v2gShimmer{ 0%{ background-position:200% center } 100%{ background-position:-200% center } }
  @keyframes v2gGlow{ 0%,100%{ box-shadow:0 0 18px 2px rgba(34,197,94,.22),0 6px 28px rgba(0,0,0,.1) } 50%{ box-shadow:0 0 36px 8px rgba(34,197,94,.38),0 8px 32px rgba(0,0,0,.12) } }
  @keyframes v2gShake{ 0%,100%{ transform:translateX(0) } 20%{ transform:translateX(-7px) } 40%{ transform:translateX(7px) } 60%{ transform:translateX(-5px) } 80%{ transform:translateX(5px) } }
  @keyframes v2gPop{ 0%{ transform:scale(.8) } 60%{ transform:scale(1.15) } 100%{ transform:scale(1) } }
  @keyframes v2gPulse{ 0%,100%{ transform:scale(1) } 50%{ transform:scale(1.05) } }
  @keyframes v2gBounce{ 0%,100%{ transform:translateY(0) } 50%{ transform:translateY(-8px) } }
  @keyframes v2gSpark0{ 0%{opacity:0;transform:translate(0,0) scale(0)} 50%{opacity:1;transform:translate(-58px,-38px) scale(1.4)} 100%{opacity:0;transform:translate(-80px,-60px) scale(0)} }
  @keyframes v2gSpark1{ 0%{opacity:0;transform:translate(0,0) scale(0)} 50%{opacity:1;transform:translate(55px,-46px) scale(1.4)} 100%{opacity:0;transform:translate(78px,-68px) scale(0)} }
  @keyframes v2gSpark2{ 0%{opacity:0;transform:translate(0,0) scale(0)} 50%{opacity:1;transform:translate(-45px,44px) scale(1.2)} 100%{opacity:0;transform:translate(-64px,66px) scale(0)} }
  @keyframes v2gSpark3{ 0%{opacity:0;transform:translate(0,0) scale(0)} 50%{opacity:1;transform:translate(58px,40px) scale(1.3)} 100%{opacity:0;transform:translate(80px,62px) scale(0)} }
  @keyframes v2gSpark4{ 0%{opacity:0;transform:translate(0,0) scale(0)} 50%{opacity:1;transform:translate(0,-60px) scale(1.5)} 100%{opacity:0;transform:translate(0,-85px) scale(0)} }
  @keyframes v2gSpark5{ 0%{opacity:0;transform:translate(0,0) scale(0)} 50%{opacity:1;transform:translate(-30px,50px) scale(1.2)} 100%{opacity:0;transform:translate(-44px,72px) scale(0)} }
  @media (prefers-reduced-motion: reduce){ .v2g *{ animation:none !important; } .v2g-spark{ display:none; } }

  /* عجلة الكلمات — بنفس ألوان اللعبة الذهبية البرتقالية */
  .v2s-frame--wheel{ background:linear-gradient(135deg,#92400E 0%,#B45309 40%,#D97706 100%); padding:12px; }
  .v2w{ display:flex; flex-direction:column; gap:10px; width:100%; max-width:420px; margin:0 auto; }
  .v2w-head{ display:flex; align-items:center; justify-content:space-between; gap:8px; color:#fff; }
  .v2w-title{ font-weight:900; font-size:.95rem; }
  .v2w-score{ background:rgba(255,255,255,.2); border-radius:20px; padding:3px 12px; font-weight:800; font-size:.9rem; }
  .v2w-card{ background:#fff; border-radius:20px; padding:12px 12px 14px; display:flex; flex-direction:column; align-items:center; gap:9px;
    box-shadow:0 14px 34px rgba(0,0,0,.25); text-align:center; }
  .v2w-goal{ display:flex; align-items:center; justify-content:space-between; gap:8px; width:100%; font-weight:800; color:#92400E; font-size:.9rem; }
  .v2w-goal-stars{ display:flex; gap:3px; font-size:1.15rem; line-height:1; color:#F59E0B; }
  .v2w-goal-stars .on{ animation:v2gPop .45s cubic-bezier(.34,1.56,.64,1); }
  .v2w-wheel{ position:relative; width:100%; max-width:270px; }
  .v2w-fly-wrap{ position:absolute; top:46%; left:50%; z-index:2; pointer-events:none; }
  .v2w-fly{ position:absolute; top:0; left:0; white-space:nowrap; font-size:1.9rem; font-weight:900; color:#059669;
    text-shadow:0 2px 0 #fff, 0 0 12px #fff; animation:v2wFly .95s ease-out forwards; }
  .v2w-input{ width:100%; min-height:54px; display:flex; align-items:center; justify-content:center; padding:4px 12px;
    border:2.5px solid #FDE68A; border-radius:14px; font-size:1.8rem; font-weight:900; color:#92400E; line-height:1.2; }
  .v2w-input.empty{ font-size:1rem; font-weight:700; color:#B9A27A; }
  .v2w-shake{ animation:v2gShake .45s cubic-bezier(.36,.07,.19,.97) both; }
  .v2w-msg{ margin:0; min-height:1.6em; font-weight:800; font-size:.88rem; line-height:1.6; }
  .v2w-msg.good{ color:#059669; } .v2w-msg.tip{ color:#b45309; } .v2w-msg.hint{ color:#0369a1; }
  .v2w-controls{ display:flex; gap:8px; width:100%; }
  .v2w-ctrl{ flex:1; min-height:46px; border:1.5px solid #E5E7EB; border-radius:12px; background:#F9FAFB; color:#374151;
    font:inherit; font-weight:800; font-size:.9rem; cursor:pointer; }
  .v2w-confirm{ flex:1.6; border:none; color:#fff; background:linear-gradient(135deg,#F59E0B,#D97706); box-shadow:0 4px 0 #B45309; }
  .v2w-ctrl:active{ transform:translateY(2px); }
  .v2w-confirm:active{ box-shadow:0 1px 0 #B45309; }
  .v2w-foot{ display:flex; align-items:center; gap:8px; width:100%; flex-wrap:wrap; }
  .v2w-hint{ border:none; cursor:pointer; min-height:40px; padding:0 14px; border-radius:12px; background:#e0f2fe; color:#075985;
    font:inherit; font-weight:800; font-size:.85rem; box-shadow:0 3px 0 #7dd3fc; }
  .v2w-chips{ display:flex; flex-wrap:wrap; gap:6px; justify-content:center; flex:1; }
  .v2w-chip{ border:1.5px solid; border-radius:20px; padding:3px 12px; font-weight:800; font-size:.95rem; animation:v2gPop .4s ease-out; }
  .v2w-done{ padding:22px 14px; gap:8px; }
  .v2w-done-title{ margin:0; font-size:1.2rem; font-weight:900; color:#1a1a2e; }
  .v2w-done-score{ margin:0; font-size:2rem; font-weight:900; color:#D97706; line-height:1.2; }
  .v2w-done-score small{ display:block; font-size:.82rem; font-weight:800; color:#92400E; }
  .v2w-done-more{ margin:0 0 6px; font-weight:700; color:#475569; font-size:.88rem; }
  @keyframes v2wFly{ 0%{ opacity:1; transform:translate(-50%,-50%) scale(1) } 100%{ opacity:0; transform:translate(-50%,-130%) scale(1.35) } }
  @media (prefers-reduced-motion: reduce){ .v2w *{ animation:none !important; } .v2w .v2g-spark, .v2w-fly-wrap{ display:none; } }

  /* التقرير */
  .v2s-report{ width:100%; max-width:400px; margin:0 auto; position:relative; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 6px 22px rgba(26,43,74,.14); font-family:'Tajawal',sans-serif; }
  .v2s-sample{ display:block; text-align:center; background:#FFFBF0; color:#8a6a1e; font-size:.7rem; font-weight:800; padding:5px 8px; border-bottom:1px solid #E8B84B; }
  .v2s-rep-head{ background:linear-gradient(135deg,#1a1052,#2d1b69); color:#fff; padding:14px; display:flex; flex-direction:column; align-items:center; gap:4px; font-weight:800; font-size:.82rem; }
  .v2s-rep-logo{ color:#d4952a; font-size:1.6rem; font-family:serif; line-height:1; }
  .v2s-rep-body{ padding:12px 14px 14px; display:flex; flex-direction:column; gap:7px; }
  .v2s-rep-top{ display:flex; gap:8px; align-items:stretch; }
  .v2s-rep-student{ flex:1.3; background:#f5f7fa; border-radius:8px; padding:8px; font-size:.72rem; color:#334155; display:flex; align-items:center; }
  .v2s-rep-score{ flex:1; background:#1a1052; color:#fff; border-radius:8px; padding:6px; display:flex; flex-direction:column; align-items:center; gap:1px; }
  .v2s-rep-score b{ font-size:1.3rem; line-height:1.1; } .v2s-rep-score span{ font-size:.62rem; font-weight:700; } .v2s-rep-score small{ font-size:.6rem; opacity:.9; }
  .v2s-rep-h{ margin:4px 0 0; font-weight:800; font-size:.74rem; color:#1a1052; border-bottom:1.5px solid #e0e0e0; padding-bottom:4px; }
  .v2s-rep-skill-row{ display:flex; justify-content:space-between; font-size:.68rem; font-weight:700; color:#333; margin-bottom:2px; }
  .v2s-rep-bar{ background:#e0e0e0; height:6px; border-radius:6px; overflow:hidden; }
  .v2s-rep-bar span{ display:block; height:100%; border-radius:6px; }
  .v2s-rep-rec{ background:#e8f5e9; border-right:3px solid #2e7d32; border-radius:8px; padding:7px 9px; margin-top:3px; }
  .v2s-rep-rec b{ color:#2e7d32; font-size:.7rem; } .v2s-rep-rec p{ margin:2px 0 0; font-size:.66rem; line-height:1.6; color:#333; }

  @media (max-width:640px){
    .v2-show{ padding:56px 0; }
    .v2s-grid{ grid-template-columns:minmax(0,1fr); gap:18px; }
    .v2s-frame{ min-height:0; }
  }
`;
