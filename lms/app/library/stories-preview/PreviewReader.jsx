'use client';
import { useEffect, useRef, useState } from 'react';
import { useStoryNarration, PageListenButton } from '../../../components/StoryNarration';
import DOMPurify from 'isomorphic-dompurify';
import styles from './preview.module.css';

export default function PreviewReader({ story, initialPage = 0, onPage, onClose, onFinish, storageAvailable = true }) {
  const [page, setPage] = useState(initialPage);
  const dialog = useRef(null), opener = useRef(null), text = useRef(null);
  const narration = useStoryNarration({ pageAudio: story.audio, visiblePages: [page] });
  const pauseAudio = () => dialog.current?.querySelector('audio')?.pause();
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose;
  useEffect(() => {
    opener.current = document.activeElement;
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    dialog.current?.focus(); const a = dialog.current?.querySelector('audio');
    const hide = () => { if (document.visibilityState !== 'visible') a?.pause(); };
    document.addEventListener('visibilitychange', hide);
    return () => { a?.pause(); document.body.style.overflow = previous; document.removeEventListener('visibilitychange', hide); opener.current?.focus?.(); };
  }, []);
  useEffect(() => { onPage(page); text.current?.scrollTo({ top: 0, behavior: 'instant' }); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = next => { pauseAudio(); setPage(next); };
  function keys(event) {
    if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); }
    if (event.key !== 'Tab') return;
    const all = [...dialog.current.querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')].filter(el => el.getClientRects().length);
    const first = all[0], last = all[all.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
  }
  return <div className={styles.readerOverlay} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className={styles.reader} role="dialog" aria-modal="true" aria-labelledby="preview-reader-title" tabIndex={-1} ref={dialog} onKeyDown={keys}>
      <div className={styles.readerHead}><div><span className={styles.eyebrow}>قارئ المعاينة · لا نقاط أو نتائج رسمية</span><h2 id="preview-reader-title">{story.title}</h2></div><button type="button" className={styles.closeButton} onClick={onClose} aria-label="أغلق قارئ المعاينة">✕</button></div>
      <p className={styles.readerNotice}>{storageAvailable ? 'موضع القراءة محفوظ مؤقتًا لهذا الطفل في هذا التبويب فقط.' : 'تعمل المعاينة الآن؛ قد لا يبقى موضع القراءة بعد تحديث الصفحة.'}</p>
      <div className={styles.readerProgress} aria-label={`الصفحة ${page + 1} من ${story.pages.length}`}><span style={{ width: `${(page + 1) / story.pages.length * 100}%` }} /></div>
      <div className={styles.readerBody} ref={text} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(story.pages[page], { FORBID_TAGS: ['audio', 'video', 'iframe', 'form', 'input', 'button'] }) }} />
      <div className={styles.readerAudio}>
        {narration.audioElement}
        <PageListenButton state={narration.stateOf(page)} onClick={() => narration.toggle(page)} pageNumber={page + 1} />
        {!story.audio[page] && <p className={styles.readerAudioNote}>لا يوجد تسجيل لهذه الصفحة.</p>}
      </div>
      <div className={styles.readerNav}><button type="button" disabled={page === 0} onClick={() => go(page - 1)}>→ السابقة</button><span dir="ltr">{page + 1} / {story.pages.length}</span>{page < story.pages.length - 1 ? <button type="button" onClick={() => go(page + 1)}>التالية ←</button> : <button type="button" className={styles.finishButton} onClick={() => { pauseAudio(); onFinish(); }}>أنهيت القراءة التجريبية ✓</button>}</div>
    </section>
  </div>;
}
