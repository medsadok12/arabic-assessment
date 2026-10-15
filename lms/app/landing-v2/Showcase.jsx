'use client';
import { useEffect, useRef, useState } from 'react';
import { SAMPLE_GAME_WORDS, SAMPLE_REPORT_SKILLS, MEDIAL } from './content';

/* ════════════════════════════════════════════════════════════════
   «معاينة من داخل المنصة» — ثلاث معاينات حيّة لا صور ثابتة:
   1) الصفحة الأولى من قصة حقيقية مشارَكة بصوتها المسجَّل فعلاً
   2) جولة مصغّرة من لعبة صيّاد الحروف يلعبها ولي الأمر بنفسه
   3) نموذج مصغّر من تقرير PDF بنفس تصميمه ومهاراته (أرقام توضيحية)
════════════════════════════════════════════════════════════════ */

function StoryPreview({ story, c }) {
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
  const text  = story?.text  || c.fallbackText;

  return (
    <div className="v2s-story">
      {story?.image
        ? <img src={story.image} alt="" className="v2s-story-img" loading="lazy" />
        : <div className="v2s-story-img v2s-story-emoji" aria-hidden="true">🐱</div>}
      <p className="v2s-story-title">{title}</p>
      <p className="v2s-story-text" lang="ar" dir="rtl">{text}</p>
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

function GamePreview({ c }) {
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState('idle');   // idle | right | wrong
  const [wrongPick, setWrongPick] = useState(null);
  const [done, setDone] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const w = SAMPLE_GAME_WORDS[idx];
  const pick = (letter) => {
    if (status === 'right') return;
    if (letter !== w.answer) { setStatus('wrong'); setWrongPick(letter); return; }
    setStatus('right'); setWrongPick(null);
    timer.current = setTimeout(() => {
      if (idx + 1 >= SAMPLE_GAME_WORDS.length) { setDone(true); return; }
      setIdx(idx + 1); setStatus('idle');
    }, 1100);
  };
  const restart = () => { setIdx(0); setStatus('idle'); setWrongPick(null); setDone(false); };

  if (done) {
    return (
      <div className="v2s-game v2s-game-done">
        <div className="v2s-game-emoji" aria-hidden="true">🏆</div>
        <p className="v2s-feedback right">{c.done}</p>
        <button type="button" className="v2s-again" onClick={restart}>{c.again}</button>
      </div>
    );
  }

  return (
    <div className="v2s-game">
      <div className="v2s-dots" aria-hidden="true">
        {SAMPLE_GAME_WORDS.map((_, i) => <span key={i} className={i < idx ? 'on' : i === idx ? 'cur' : ''} />)}
      </div>
      <div className="v2s-game-emoji" aria-hidden="true">{w.emoji}</div>
      <p className="v2s-prompt">{c.prompt}</p>
      <div className="v2s-word" dir="rtl" aria-label={w.word}>
        <span className="v2s-tile">{w.before}</span>
        <span className={`v2s-tile v2s-blank${status === 'right' ? ' right' : ''}`}>
          {status === 'right' ? MEDIAL(w.answer) : ''}
        </span>
        <span className="v2s-tile">{w.after}</span>
      </div>
      <div className="v2s-opts">
        {w.options.map(o => (
          <button
            key={o} type="button" onClick={() => pick(o)}
            className={`v2s-opt${status === 'right' && o === w.answer ? ' right' : ''}${status === 'wrong' && o === wrongPick ? ' wrong' : ''}`}
          >{o}</button>
        ))}
      </div>
      <p className={`v2s-feedback ${status}`} aria-live="polite">
        {status === 'right' ? c.right : status === 'wrong' ? c.wrong : ' '}
      </p>
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

export default function Showcase({ c, story }) {
  const items = [
    { key: 'story',  meta: c.story,  body: <StoryPreview story={story} c={c.story} /> },
    { key: 'game',   meta: c.game,   body: <GamePreview c={c.game} /> },
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
              <div className="v2s-frame">{it.body}</div>
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
  .v2s-grid{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:22px; align-items:stretch; }
  .v2s-card{ margin:0; background:#fff; border-radius:22px; padding:18px 18px 20px; display:flex; flex-direction:column; gap:14px;
    border:1.5px solid rgba(26,43,74,.08); box-shadow:0 2px 6px rgba(26,43,74,.05),0 10px 30px rgba(26,43,74,.08); min-width:0; }
  .v2s-tag{ align-self:flex-start; background:#FAF7F2; border:1.5px solid #EDE5D8; color:#1A2B4A; font-weight:800; font-size:.82rem; border-radius:999px; padding:5px 12px; }
  .v2s-frame{ flex:1; background:#FAF7F2; border-radius:16px; padding:16px; display:flex; flex-direction:column; justify-content:center; min-height:380px; }
  .v2s-caption{ font-size:.86rem; color:var(--muted); line-height:1.7; margin:0; }

  /* القصة */
  .v2s-story{ display:flex; flex-direction:column; align-items:center; gap:12px; text-align:center; }
  .v2s-story-img{ width:100%; max-height:170px; object-fit:cover; border-radius:14px; display:block; }
  .v2s-story-emoji{ height:150px; display:flex; align-items:center; justify-content:center; font-size:4rem; background:#EDE5D8; }
  .v2s-story-title{ margin:0; font-weight:800; color:#1A2B4A; font-size:.95rem; }
  .v2s-story-text{ margin:0; white-space:pre-line; font-size:1.35rem; line-height:1.9; color:#1e293b; font-weight:600; }
  .v2s-listen{ position:relative; overflow:hidden; border:none; cursor:pointer; min-height:50px; min-width:170px; padding:0 24px;
    border-radius:16px; background:#E8B84B; color:#1A2B4A; font:inherit; font-weight:800; font-size:1rem;
    box-shadow:0 5px 0 #b8892a, 0 8px 18px rgba(26,43,74,.18); transition:transform .1s, box-shadow .1s; }
  .v2s-listen:active{ transform:translateY(4px); box-shadow:0 1px 0 #b8892a, 0 3px 8px rgba(26,43,74,.18); }
  .v2s-listen.playing{ background:#1A2B4A; color:#fff; box-shadow:0 5px 0 #0d1a30, 0 8px 18px rgba(26,43,74,.25); }
  .v2s-listen-fill{ position:absolute; inset:0 auto 0 0; background:rgba(232,184,75,.35); transition:width .25s linear; }
  .v2s-listen-label{ position:relative; }
  .v2s-link{ color:#1A2B4A; font-weight:800; font-size:.9rem; text-decoration:underline; text-underline-offset:4px; }

  /* اللعبة */
  .v2s-game{ display:flex; flex-direction:column; align-items:center; gap:12px; text-align:center; }
  .v2s-game-done{ justify-content:center; min-height:300px; }
  .v2s-dots{ display:flex; gap:6px; }
  .v2s-dots span{ width:22px; height:6px; border-radius:6px; background:#EDE5D8; }
  .v2s-dots span.on{ background:#2ABB7A; } .v2s-dots span.cur{ background:#E8B84B; }
  .v2s-game-emoji{ width:96px; height:96px; border-radius:20px; background:#fff; display:flex; align-items:center; justify-content:center; font-size:3.4rem; }
  .v2s-prompt{ margin:0; font-weight:700; color:#475569; font-size:.92rem; }
  .v2s-word{ display:flex; gap:6px; justify-content:center; }
  .v2s-tile{ display:inline-flex; align-items:center; justify-content:center; min-width:48px; height:58px; padding:0 6px; border-radius:12px;
    background:#fff; border:2px solid #EDE5D8; font-size:2rem; font-weight:700; color:#1A2B4A; }
  .v2s-blank{ border:3px dashed #E8B84B; background:#FFFBF0; }
  .v2s-blank.right{ border:3px solid #2ABB7A; background:#e9f8f0; color:#1a6b38; }
  .v2s-opts{ display:grid; grid-template-columns:repeat(3,64px); gap:10px; }
  .v2s-opt{ height:64px; border-radius:16px; border:2px solid #e5e7eb; background:#fff; font:inherit; font-size:1.8rem; font-weight:700; color:#1A2B4A; cursor:pointer; transition:transform .12s, background .15s; }
  .v2s-opt:active{ transform:scale(.94); }
  .v2s-opt.right{ background:#e9f8f0; border-color:#2ABB7A; color:#1a6b38; }
  .v2s-opt.wrong{ background:#FFFBF0; border-color:#E8B84B; animation:v2sShake .35s; }
  @keyframes v2sShake{ 25%{ transform:translateX(-4px) } 75%{ transform:translateX(4px) } }
  .v2s-feedback{ margin:0; min-height:1.5em; font-weight:800; font-size:.95rem; }
  .v2s-feedback.right{ color:#1f9a63; } .v2s-feedback.wrong{ color:#8a6a1e; }
  .v2s-again{ border:none; cursor:pointer; min-height:48px; padding:0 22px; border-radius:14px; background:#E8B84B; color:#1A2B4A; font:inherit; font-weight:800; }

  /* التقرير */
  .v2s-report{ position:relative; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 6px 22px rgba(26,43,74,.14); font-family:'Tajawal',sans-serif; }
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

  @media (max-width:1023px){ .v2s-grid{ grid-template-columns:repeat(2,minmax(0,1fr)); } }
  @media (max-width:640px){
    .v2-show{ padding:56px 0; }
    .v2s-grid{ grid-template-columns:minmax(0,1fr); gap:18px; }
    .v2s-frame{ min-height:0; }
  }
`;
