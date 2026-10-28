'use client';
import { useEffect, useRef, useState } from 'react';
import StoryFlipBook from '../../../components/StoryFlipBook';
import styles from './preview.module.css';

// The actual original book, not a replacement renderer or a redesigned modal.
// Only external layout controls and temporary bookmark callbacks live here.
export default function PreviewReader({ story, initialPage = 0, onPage, onClose }) {
  const [ready, setReady] = useState(false), [wide, setWide] = useState(false);
  const [layout, setLayout] = useState('double');
  const current = useRef(initialPage), pageCallback = useRef(onPage);
  pageCallback.current = onPage;
  const heading = useRef(null), area = useRef(null);
  const mode = wide && layout === 'double' && story.pages.length > 1 ? 'spread' : 'default';
  useEffect(() => {
    const size = () => { setWide(window.innerWidth >= 640); setReady(true); };
    size(); window.scrollTo({ top: 0, behavior: 'instant' }); heading.current?.focus({ preventScroll: true });
    window.addEventListener('resize', size);
    const hide = () => { if (document.visibilityState !== 'visible') area.current?.querySelector('audio')?.pause(); };
    document.addEventListener('visibilitychange', hide);
    return () => { area.current?.querySelector('audio')?.pause(); window.removeEventListener('resize', size); document.removeEventListener('visibilitychange', hide); };
  }, []);
  const pageChanged = page => { current.current = page; pageCallback.current?.(page); };
  function changeLayout(next) { area.current?.querySelector('audio')?.pause(); setLayout(next); }
  return <main className={styles.bookPreview} dir="rtl">
    <div className={styles.bookPreviewBar}>
      <button type="button" className={styles.bookBack} onClick={onClose}>→ العودة إلى معاينة القصص</button>
      <p>الكتاب القديم نفسه · تجربة جانبية بلا نقاط أو إكمال رسمي</p>
    </div>
    <div className={styles.bookPreviewHeading}>
      <h1 ref={heading} tabIndex={-1}>{story.title}</h1>
      <div className={styles.bookLayout} aria-label="طريقة عرض الكتاب">
        <button type="button" aria-pressed={mode === 'default'} onClick={() => changeLayout('single')}>▯ صفحة واحدة</button>
        <button type="button" aria-pressed={mode === 'spread'} disabled={!wide || story.pages.length < 2} onClick={() => changeLayout('double')}>▯▯ صفحتان</button>
      </div>
      {!wide && <small>عرض الصفحتين متاح على الشاشة الواسعة؛ يحافظ الهاتف على وضوح الصفحة الواحدة.</small>}
    </div>
    <div className={`${styles.bookArea} ${mode === 'default' ? styles.singleBookArea : ''}`} ref={area}>
      {ready && <StoryFlipBook key={mode} pages={story.pages} pageAudio={story.audio} accent={story.accent || '#10b981'} mode={mode}
        isTeacher={true} read={false} loading={false} points={0} startPage={current.current} onPageChange={pageChanged} />}
    </div>
  </main>;
}
