'use client';

import { useEffect, useRef, useState } from 'react';
import { displayNumber } from '../lib/display-number';
import styles from './LetterCatcherDuel.module.css';

function Avatar({ player, small = false }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [player?.avatar_url]);
  return <span className={`${styles.avatar} ${small ? styles.smallAvatar : ''}`} aria-hidden="true">
    {player?.avatar_url && !failed
      ? <img src={player.avatar_url} alt="" onError={() => setFailed(true)} />
      : <span>🧒</span>}
  </span>;
}

/** Only the current child's settled award travels; the other score changes quietly. */
export default function LetterCatcherDuelScores({ me, opponent, award = 0, awardKey, settled = false, motionEnabled = true }) {
  const targetScore = Math.max(0, Number(me?.score) || 0);
  const [shownScore, setShownScore] = useState(() => settled && Number(award) > 0 ? Math.max(0, targetScore - Number(award)) : targetScore);
  const [arrived, setArrived] = useState(false);
  const [reward, setReward] = useState(0);
  const stageRef = useRef(null);
  const counterRef = useRef(null);
  const rewardRef = useRef(null);
  const seenRef = useRef(new Set());

  useEffect(() => {
    const amount = Math.max(0, Number(award) || 0);
    let raf = 0, timer = 0, active = true;
    const star = rewardRef.current;
    const reduce = !motionEnabled || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setArrived(false);
    if (!settled || !amount || !awardKey || seenRef.current.has(awardKey)) {
      setShownScore(targetScore);
      setReward(0);
      if (star) star.style.opacity = '0';
      return undefined;
    }
    seenRef.current.add(awardKey);
    setShownScore(Math.max(0, targetScore - amount));
    setReward(amount);
    const began = performance.now();
    const finish = () => {
      if (!active) return;
      if (star) star.style.opacity = '0';
      setShownScore(targetScore);
      setArrived(true);
      timer = window.setTimeout(() => { if (active) { setReward(0); setArrived(false); } }, 520);
    };
    function frame(now) {
      if (!active || !star || !stageRef.current || !counterRef.current) return;
      const elapsed = now - began;
      const progress = Math.min(1, Math.max(0, (elapsed - (reduce ? 550 : 650)) / (reduce ? 1 : 650)));
      const ease = progress * progress * (3 - 2 * progress);
      const stage = stageRef.current.getBoundingClientRect();
      const target = counterRef.current.getBoundingClientRect();
      const dx = (target.left + target.width / 2 - (stage.left + stage.width / 2)) * ease;
      const dy = (target.top + target.height / 2 - (stage.top + 64)) * ease - Math.sin(progress * Math.PI) * 16;
      const appear = Math.min(1, elapsed / 200);
      star.style.opacity = String(appear * (1 - .25 * ease));
      star.style.transform = reduce ? 'none' : `translate(${dx}px, ${dy}px) scale(${(1 - .7 * ease) * (.75 + .25 * appear)})`;
      if (progress >= 1) { finish(); return; }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      active = false;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      if (star) { star.style.opacity = '0'; star.style.transform = 'none'; }
    };
  }, [awardKey, award, settled, targetScore, motionEnabled]);

  return <div className={styles.scoreArea} data-lc-duel-scores="">
    <div className={styles.players}>
      <div className={`${styles.player} ${styles.self}`} aria-label={`نقاط ${me?.name || 'اللاعب'}: ${displayNumber(shownScore)}`}>
        <Avatar player={me} />
        <div className={styles.playerName}><span>{me?.name || 'أنت'}</span><small>أنت</small></div>
        <div ref={counterRef} className={`${styles.total} ${arrived && motionEnabled ? styles.arrived : ''}`} data-lc-duel-own-score="">
          <bdi>{displayNumber(shownScore)}</bdi><span aria-hidden="true">⭐</span>
        </div>
        <div className={styles.scoreLabel}>نقاطك</div>
      </div>
      <div className={`${styles.player} ${styles.other}`} aria-label={`نقاط ${opponent?.name || 'صديقك'}: ${displayNumber(opponent?.score || 0)}`}>
        <Avatar player={opponent} small />
        <div className={styles.playerName}><span>{opponent?.name || 'صديقك'}</span></div>
        <div className={styles.total}><bdi>{displayNumber(opponent?.score || 0)}</bdi><span aria-hidden="true">⭐</span></div>
        <div className={styles.scoreLabel}>نقاط صديقك</div>
      </div>
    </div>
    <div ref={stageRef} className={styles.rewardStage} aria-hidden="true">
      <div ref={rewardRef} className={styles.reward} data-lc-duel-reward="">
        <span className={styles.bigStar}>⭐</span><b className={styles.plus}>+{displayNumber(reward)}</b>
      </div>
    </div>
    <span className={styles.srOnly} role="status" aria-live="polite">{arrived && reward ? `أحسنت! جمعت ${displayNumber(reward)} نقطة` : ''}</span>
  </div>;
}
