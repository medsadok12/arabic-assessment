'use client';

import React, { useEffect, useId, useRef } from 'react';
import { displayNumber } from '../../../../lib/display-number';
import { isLcStageUnlocked, lcStageDone } from '../../../../lib/letter-catcher-stages';
import styles from './_stage-picker.module.css';

const wordLabel = count => count >= 3 && count <= 10 ? 'كلمات' : 'كلمة';

function StageLock() {
  return <svg width="23" height="26" viewBox="0 0 24 28" fill="none" aria-hidden="true"><path d="M6 12V8a6 6 0 0 1 12 0v4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /><rect x="2" y="11" width="20" height="15" rx="4" fill="currentColor" /><path d="M12 17v4" stroke="#FAF7F2" strokeWidth="3" strokeLinecap="round" /></svg>;
}

export default function LetterCatcherStagePicker({
  category, stages = [], progress = {}, isTeacher = false, busy = false, pending = false, status = null,
  progressLoading = false, progressError = false, onSelect, onBack, onRetryProgress,
}) {
  const headingId = useId();
  const descriptionId = useId();
  const panelRef = useRef(null);
  const backRef = useRef(null);
  const latest = useRef({ busy, onBack });
  latest.current = { busy, onBack };
  const loading = !isTeacher && progressLoading;
  const failed = !isTeacher && progressError;
  const available = !loading && !failed;
  const nextStage = available ? stages.find(stage => !lcStageDone(stage, progress) && (isTeacher || isLcStageUnlocked(stage, stages, progress))) : null;
  const completed = available ? stages.filter(stage => lcStageDone(stage, progress)).length : 0;

  useEffect(() => {
    const panel = panelRef.current;
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controls = () => [...panel.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(node => node.getClientRects().length > 0);
    const focusFirst = () => (backRef.current?.disabled ? panel : backRef.current)?.focus();
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!latest.current.busy) latest.current.onBack?.();
      }
      if (event.key !== 'Tab') return;
      const elements = controls();
      const first = elements[0], last = elements.at(-1);
      if (!first) { event.preventDefault(); panel.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !elements.includes(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !elements.includes(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    const onFocus = event => { if (!panel.contains(event.target)) focusFirst(); };
    focusFirst();
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocus);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocus);
      if (previous?.isConnected && typeof previous.focus === 'function') previous.focus();
    };
  }, []);

  return <div className={styles.overlay} data-lc-stage-picker="" dir="rtl">
    <section ref={panelRef} className={`${styles.panel} game-font`} role="dialog" aria-modal="true" aria-labelledby={headingId} aria-describedby={descriptionId} tabIndex={-1} aria-busy={busy || loading}>
      <header className={styles.header}>
        <button ref={backRef} type="button" className={styles.back} aria-label="العودة إلى العوالم" disabled={busy} onClick={() => { if (!busy) onBack?.(); }}>
          <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
        </button>
        <div className={styles.heading}><span>مراحل عالم</span><h2 id={headingId}>{displayNumber(category)}</h2></div>
        <span className={styles.count} aria-label={available ? `${displayNumber(completed)} من ${displayNumber(stages.length)} مراحل مكتملة` : 'نستعد للمراحل'}><bdi>{available ? displayNumber(completed) : '…'}</bdi><span aria-hidden="true">/</span><bdi>{displayNumber(stages.length)}</bdi></span>
      </header>

      <div className={styles.body}>
        <p id={descriptionId} className={styles.instructions}>{isTeacher ? 'اختر مرحلة لمعاينتها.' : 'أكمل كل مرحلة لتفتح المرحلة التالية.'}</p>
        {status}
        {loading && <p className={styles.notice} role="status">لحظة… نستعيد مراحل مغامرتك.</p>}
        {failed && <div className={styles.notice} role="status"><p>مراحل مغامرتك محفوظة. لنحاول عرضها من جديد.</p><button type="button" className={styles.retry} disabled={busy} onClick={() => { if (!busy) onRetryProgress?.(); }}>حاول مرة أخرى</button></div>}
        {!stages.length && available && <p className={styles.notice}>نجهّز كلمات هذا العالم لنبدأ المغامرة.</p>}

        {stages.length > 0 && <ol className={styles.path} aria-label={`مراحل ${displayNumber(category)}`}>
          {stages.map(stage => {
            const done = available && lcStageDone(stage, progress);
            const unlocked = available && (isTeacher || isLcStageUnlocked(stage, stages, progress));
            const current = nextStage?.id === stage.id;
            const number = displayNumber(stage.number);
            const count = displayNumber(stage.total);
            const status = !available ? 'نستعد للعب' : done ? 'مرحلة مكتملة' : !unlocked ? 'أكمل المرحلة السابقة أولًا' : current ? stage.number === 1 ? 'ابدأ هنا' : 'تابع من هنا' : 'جاهزة للعب';
            return <li key={stage.id} className={`${styles.row} ${done ? styles.completed : ''} ${unlocked ? styles.unlocked : styles.locked}`}>
              <button type="button" className={`${styles.stage} ${current ? styles.current : ''}`} data-lc-stage={stage.id} data-stage-number={stage.number} data-unlocked={unlocked} data-complete={done} aria-label={`المرحلة ${number}، ${count} ${wordLabel(stage.total)}، ${status}`} aria-current={current ? 'step' : undefined} disabled={busy || pending || !unlocked} onClick={() => { if (!busy && !pending && unlocked) onSelect?.(stage); }}>
                <span className={styles.stageNumber} aria-hidden="true">{number}{done && <span className={styles.check}>✓</span>}{!unlocked && !loading && !failed && <span className={styles.lock}><StageLock /></span>}</span>
                <span className={styles.stageCopy}><strong>المرحلة <bdi>{number}</bdi></strong><span><bdi>{count}</bdi> {wordLabel(stage.total)}</span><span className={styles.status}>{available ? status : 'نستعد للعب'}</span></span>
                {unlocked && <svg className={styles.arrow} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m14 5-7 7 7 7" /></svg>}
              </button>
            </li>;
          })}
        </ol>}
      </div>
      <footer className={styles.footer} aria-live="polite">{busy ? 'لحظة… نجهّز لك المرحلة.' : available && stages.length > 0 && completed === stages.length ? 'أحسنت! أكملت مراحل هذا العالم.' : 'كل خطوة تقرّبك من الإنجاز.'}</footer>
    </section>
  </div>;
}
