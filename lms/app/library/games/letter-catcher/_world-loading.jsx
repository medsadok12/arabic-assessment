import Link from 'next/link';
import styles from './_world-loading.module.css';

/** Keep the real world artwork gated while Fahim welcomes the learner. */
export default function LetterCatcherWorldLoading({ failed = false, welcome = true, motion = true, onRetry }) {
  return <section className={styles.card} data-lc-world-loading="" data-welcome={welcome} data-motion={welcome && motion && !failed} dir="rtl" aria-labelledby="lc-world-loading-title">
    <h1 id="lc-world-loading-title" className={styles.title}>صيّاد الحروف</h1>
    {welcome && <div className={styles.portrait}>
      <span className={styles.halo} aria-hidden="true" />
      <img className={styles.fahim} src="/faheem-loading-sm.webp" alt="فهيم يرحّب بك" width="279" height="208" fetchPriority="high" decoding="async" />
    </div>}
    <div role="status" aria-live="polite" aria-atomic="true">
      {welcome && <p className={styles.greeting}>أهلًا بك يا بطل!</p>}
      <p className={styles.message}>{failed ? 'لنعرض عوالمك من جديد.' : welcome ? 'نجهّز عوالمك… لنلعب معًا.' : 'لحظة… نجهّز عوالمك.'}</p>
    </div>
    {!failed && <span className={styles.dots} aria-hidden="true"><i /><i /><i /></span>}
    {failed && <button type="button" className={styles.retry} onClick={onRetry}>حاول مرة أخرى</button>}
    <Link href="/library" className={styles.back}>العودة إلى المكتبة</Link>
  </section>;
}
