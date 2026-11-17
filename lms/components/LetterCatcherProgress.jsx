'use client';

import React from 'react';
import { displayNumber } from '../lib/display-number';

const pointsFormatter = new Intl.NumberFormat('en-US', { numberingSystem: 'latn', maximumFractionDigits: 0 });
const count = value => {
  const number = Number(displayNumber(value));
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
};

function Star({ size = 15 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" /></svg>;
}

/** Presentational only: completed counts finished questions, score counts correct answers. */
export default function LetterCatcherProgress({
  title = 'صَيَّادُ الْحُرُوفِ', category = '', totalPoints = 0, score = 0,
  completed = 0, total = 0, onBack, pointsPopupKey, showPointsPopup = false,
  pointsAward = 0, motionEnabled = true,
}) {
  const target = count(total);
  const done = Math.min(count(completed), target);
  const progress = target ? done / target : 0;
  const award = count(pointsAward);
  const points = displayNumber(pointsFormatter.format(count(totalPoints)));
  const counter = `أنجزت ${displayNumber(done)} من ${displayNumber(target)}`;
  const stops = Math.min(target, 6);

  return <header className="lc-progress" dir="rtl" data-motion={motionEnabled ? 'on' : 'off'}>
    <style>{styles}</style>
    <div className="lc-progress-top">
      <button type="button" className="lc-progress-back" onClick={onBack} aria-label="رجوع إلى المجموعات">
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </button>
      <div className="lc-progress-title" title={`${title}${category ? ` — ${category}` : ''}`}>
        {title}{category ? <span> — {category}</span> : null}
      </div>
      <div className="lc-progress-points-wrap">
        <span className="lc-progress-points" aria-label={`رصيد النجوم: ${points}`}>
          <bdi>{points}</bdi><Star />
        </span>
        {showPointsPopup && award > 0 ? <span key={pointsPopupKey} className="lc-progress-award" role="status" aria-label={`حصلت على ${displayNumber(award)} من النجوم`}>
          <bdi>+{displayNumber(award)}</bdi><Star size={13} />
        </span> : null}
      </div>
    </div>
    <div className="lc-progress-bottom">
      <span className="lc-progress-counter">أنجزت <bdi>{displayNumber(done)}</bdi> من <bdi>{displayNumber(target)}</bdi></span>
      <div className="lc-progress-trail" role="progressbar" aria-label="طريقك إلى الإنجاز" aria-valuemin={0} aria-valuemax={Math.max(1, target)} aria-valuenow={done} aria-valuetext={counter}>
        <div className="lc-progress-track" aria-hidden="true">
          <div className="lc-progress-rail" />
          <div className="lc-progress-fill" style={{ transform: `scaleX(${progress})` }} />
          {Array.from({ length: stops }, (_, index) => {
            const position = index / stops;
            return <i key={index} className={`lc-progress-stop${position <= progress ? ' is-done' : ''}`} style={{ right: `${position * 100}%` }} />;
          })}
          <div className="lc-progress-walker-motion" style={{ transform: `translate3d(-${progress * 100}%,0,0)` }}>
            <span className="lc-progress-walker"><Star size={14} /></span>
          </div>
        </div>
        <span className="lc-progress-trophy" aria-hidden="true">🏆</span>
      </div>
      <span className="lc-progress-score" aria-label={`إجابات صحيحة: ${displayNumber(count(score))}`} title="الإجابات الصحيحة">
        <Star size={12} /><bdi>{displayNumber(count(score))}</bdi>
      </span>
    </div>
  </header>;
}

const styles = `
.lc-progress{box-sizing:border-box;width:100%;flex-shrink:0;border:2px solid #fff;border-radius:24px;padding:6px 12px;background:rgba(255,255,255,.79);box-shadow:0 8px 22px rgba(26,43,74,.10);color:#1a2b4a;font-family:inherit}
.lc-progress-top{height:44px;display:flex;align-items:center;gap:9px;min-width:0}
.lc-progress-back{box-sizing:border-box;width:44px;height:44px;flex-shrink:0;display:grid;place-items:center;border:0;border-bottom:4px solid #111f38;border-radius:50%;background:#1a2b4a;color:#fff;cursor:pointer;padding:0;font:inherit;-webkit-tap-highlight-color:transparent}
.lc-progress-back:focus-visible{outline:3px solid #7c5cd9;outline-offset:3px}
.lc-progress-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:1.12rem;line-height:1.5;font-weight:900}
.lc-progress-title span{color:#4a5a75;font-weight:800}
.lc-progress-points-wrap{position:relative;flex-shrink:0}
.lc-progress-points{display:inline-flex;align-items:center;gap:5px;direction:ltr;white-space:nowrap;padding:5px 11px;border-radius:999px;background:#1a2b4a;color:#fff;font-size:1.1rem;font-weight:900;line-height:1.4;font-variant-numeric:tabular-nums}
.lc-progress-points svg{color:#e8b84b;flex-shrink:0}
.lc-progress-bottom{height:32px;display:flex;align-items:center;gap:8px;min-width:0}
.lc-progress-counter{flex-shrink:0;white-space:nowrap;font-size:.88rem;line-height:1.4;color:#586781}
.lc-progress-counter bdi{font-weight:900;color:#1a2b4a;font-variant-numeric:tabular-nums}
.lc-progress-trail{position:relative;height:32px;flex:1;min-width:0;overflow:hidden;direction:ltr;isolation:isolate}
.lc-progress-track{position:absolute;inset:0 13px 0 22px}
.lc-progress-rail,.lc-progress-fill{position:absolute;inset:13px 0 auto;height:6px;border-radius:999px}
.lc-progress-rail{background:#dce2e5;box-shadow:inset 0 1px 2px rgba(26,43,74,.08)}
.lc-progress-fill{background:linear-gradient(90deg,#efcf79,#e8b84b);transform-origin:right center;transition:transform .6s ease}
.lc-progress-stop{box-sizing:border-box;position:absolute;top:11px;width:10px;height:10px;border:2px solid #fff;border-radius:50%;background:#d7dfe2;transform:translateX(50%)}
.lc-progress-stop.is-done{background:#e8b84b}
.lc-progress-walker-motion{position:absolute;inset:0;transition:transform .6s ease;pointer-events:none}
.lc-progress-walker{box-sizing:border-box;position:absolute;right:0;top:3px;width:26px;height:26px;transform:translateX(50%);display:grid;place-items:center;border:2px solid #fff;border-radius:50%;background:#1a2b4a;color:#e8b84b;box-shadow:0 2px 4px rgba(26,43,74,.18)}
.lc-progress-trophy{position:absolute;left:0;top:1px;z-index:1;font-size:24px;line-height:30px;pointer-events:none}
.lc-progress-score{display:inline-flex;align-items:center;justify-content:center;gap:3px;min-width:25px;padding:2px 5px;border-radius:999px;background:rgba(255,255,255,.85);font-size:.82rem;font-weight:900;line-height:1.4;font-variant-numeric:tabular-nums}
.lc-progress-score svg{color:#e8b84b;flex-shrink:0}
.lc-progress-award{position:absolute;left:50%;top:25px;transform:translateX(-50%);display:inline-flex;align-items:center;gap:3px;direction:ltr;z-index:2;color:#b07f1e;font-size:.95rem;font-weight:900;white-space:nowrap;pointer-events:none;animation:lcProgressAward 1.1s ease-out both}
@keyframes lcProgressAward{from{opacity:1;transform:translate(-50%,0) scale(1.05)}to{opacity:0;transform:translate(-50%,-24px) scale(1)}}
@media(max-width:520px){.lc-progress{padding-inline:10px;border-radius:23px}.lc-progress-top{gap:7px}.lc-progress-title{font-size:1rem}.lc-progress-points{font-size:1rem;padding-inline:9px}.lc-progress-bottom{gap:6px}.lc-progress-counter,.lc-progress-score{font-size:.84rem}}
.lc-progress[data-motion=off] *{animation:none!important;transition:none!important}
@media(prefers-reduced-motion:reduce){.lc-progress *{animation:none!important;transition:none!important}}
`;
