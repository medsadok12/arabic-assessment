'use client';
import { useEffect, useRef } from 'react';
import styles from './preview.module.css';
export default function PreviewCelebration({ story, reflection, onReflection, onClose }) {
  const box = useRef(null);
  useEffect(() => {
    const opener = document.activeElement, prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; box.current?.focus();
    return () => { document.body.style.overflow = prev; opener?.focus?.(); };
  }, []);
  function keys(e) {
    if (e.key === 'Escape') onClose();
    if (e.key !== 'Tab') return;
    const fields = [...box.current.querySelectorAll('button,input')], first = fields[0], last = fields[fields.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === box.current)) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || document.activeElement === box.current)) { e.preventDefault(); first?.focus(); }
  }
  return <div className={styles.readerOverlay}><section className={styles.celebration} role="dialog" aria-modal="true" aria-labelledby="preview-celebration-title" ref={box} tabIndex={-1} onKeyDown={keys}>
    <span className={styles.celebrationIcon} aria-hidden="true">📖 ✦</span><span className={styles.eyebrow}>احتفال داخل المعاينة فقط</span><h2 id="preview-celebration-title">حكاية قرأتها… وخيال أصبح أوسع!</h2><p>أحسنت! وصلت إلى نهاية «{story.title}» في هذه التجربة.</p><label className={styles.reflection}>أيّ شخصية أحببت؟ <small>سؤال اختياري، بلا تقييم</small><input maxLength={160} value={reflection} onChange={e => onReflection(e.target.value)} placeholder="أحببت شخصية… لأنها…" /></label><p className={styles.readerNotice}>لم نضف نقاطًا أو إنجازًا إلى حسابك. هذه استجابة شخصية، وليست اختبارًا لفهم القصة.</p><button type="button" className={styles.heroButton} onClick={onClose}>العودة إلى حكاياتي ←</button>
  </section></div>;
}
