'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { childFetch, getActiveChildTab } from '../../../lib/child-fetch';
import styles from './preview.module.css';

const tidy = value => String(value || '').normalize('NFKD').replace(/[\u064b-\u065f\u0670\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').toLowerCase();
function invitation(story) {
  const title = tidy(story.title);
  if (title.includes('مريم') && title.includes('زهر')) return 'زهرة صغيرة، وأسئلة كثيرة… ما الحكاية التي تخبئها مريم؟';
  if (title.includes('فهيم')) return 'رافق فهيم، وافتح باب الحكاية. أيّ كلمات جديدة ستكتشف؟';
  if (title.includes('راشد')) return 'تعرّف إلى راشد، واكتشف حكايته كلمةً بعد كلمة.';
  return 'وراء هذا الغلاف حكاية تنتظرك… افتحها، ودع خيالك يكمل الرحلة.';
}
function safeCover(url) { return typeof url === 'string' && /^(https?:\/\/|\/[^/])/.test(url) ? url : ''; }
function Cover({ story, decorative = false }) {
  const [failed, setFailed] = useState(false);
  const src = safeCover(story.cover_image_url);
  return src && !failed ? <img src={src} alt={decorative ? '' : `غلاف قصة ${story.title}`} loading="lazy" onError={() => setFailed(true)} />
    : <span className={styles.coverFallback} role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : `قصة ${story.title}`}><span aria-hidden="true">{story.icon || '📖'}</span><b>{story.title}</b></span>;
}

export default function StoriesPreview({ stories, loadError = false }) {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [onlyRead, setOnlyRead] = useState(false);
  const [completed, setCompleted] = useState(new Set());
  const [readingState, setReadingState] = useState('loading');
  const scope = useRef(null), request = useRef(0);
  const levels = useMemo(() => [...new Set(stories.map(s => Number(s.level) || 1))].sort((a, b) => a - b), [stories]);
  useEffect(() => {
    let active = true;
    async function refresh() {
      const child = getActiveChildTab(), ticket = ++request.current;
      if (scope.current !== child) { setCompleted(new Set()); setReadingState('loading'); setOnlyRead(false); scope.current = child; }
      try {
        const r = await childFetch('/api/library/stories-preview/progress', { cache: 'no-store' });
        const j = await r.json();
        if (!r.ok || !Array.isArray(j.completed)) throw new Error();
        if (active && ticket === request.current && child === getActiveChildTab()) { setCompleted(new Set(j.completed)); setReadingState(j.preview ? 'preview' : 'ready'); }
      } catch { if (active && ticket === request.current && child === getActiveChildTab()) setReadingState('unavailable'); }
    }
    refresh();
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', visible); document.addEventListener('visibilitychange', visible);
    return () => { active = false; request.current++; window.removeEventListener('focus', visible); document.removeEventListener('visibilitychange', visible); };
  }, []);
  const filtered = stories.filter(s => (level === 'all' || (Number(s.level) || 1) === level) && (!onlyRead || completed.has(s.id)) && tidy(s.title).includes(tidy(search).trim()));
  const chooseAll = () => { setSearch(''); setLevel('all'); setOnlyRead(false); };

  return <main className={styles.page} dir="rtl">
    <div className={styles.shell}>
      <div className={styles.previewBar}><span><i aria-hidden="true" /> معاينة جانبية لتصميم القصص</span><Link href="/library">العودة إلى المكتبة الحالية ←</Link></div>
      <header className={styles.hero}>
        <div className={styles.stars} aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span><span>·</span></div>
        <div className={styles.heroText}><span className={styles.kicker}>أكاديمية عارم · ركن الخيال</span><h1>حكاياتي<span>كلّ غلافٍ… بدايةُ مغامرة</span></h1><p>قصة تختارها، وكلمة تكتشفها، وخيال يكبر معك.</p><a href="#story-shelf" className={styles.heroButton}>اختر حكايتك <span aria-hidden="true">↓</span></a></div>
        <div className={styles.heroArt} aria-hidden="true"><span className={styles.moon} />{stories.slice(0, 2).map((s, i) => <div className={`${styles.littleBook} ${i ? styles.secondBook : ''}`} key={s.id}><Cover story={s} decorative /></div>)}<span className={styles.bookPlatform} /><span className={styles.artCaption}>هنا تبدأ الحكاية</span></div>
      </header>
      <div className={styles.note}><span aria-hidden="true">✦</span><p>تصوّر جديد للعرض فقط. القصص والأغلفة من مكتبتك الحالية، ولم نغيّر محتواها أو نقاطها.</p></div>
      <section id="story-shelf" className={styles.shelf} aria-labelledby="shelf-heading">
        <div className={styles.shelfHeading}><div><span className={styles.eyebrow}>افتح كتابًا… واكتشف عالمًا</span><h2 id="shelf-heading">أيّ حكاية ستختار اليوم؟</h2></div><span className={styles.count}>{stories.length} {stories.length === 1 ? 'قصة' : 'قصص'} في مكتبتك</span></div>
        <div className={styles.toolbar}>
          <div className={styles.filters} aria-label="تصفية القصص بحسب المستوى"><button type="button" aria-pressed={level === 'all'} onClick={() => setLevel('all')}>كل الحكايات</button>{levels.map(l => <button type="button" key={l} aria-pressed={level === l} onClick={() => setLevel(l)}>المستوى {l}</button>)}</div>
          <label className={styles.search}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن حكاية…" aria-label="ابحث عن حكاية" type="search" /></label>
        </div>
        <div className={styles.resultLine}><p aria-live="polite">{loadError ? 'تعذّر تحميل الحكايات الآن.' : filtered.length === stories.length ? 'أغلفة جميلة، وحكايات أجمل. خذ وقتك في الاختيار.' : `تظهر الآن ${filtered.length} من ${stories.length} قصص.`}</p>{readingState === 'ready' && completed.size > 0 && <button type="button" aria-pressed={onlyRead} onClick={() => setOnlyRead(v => !v)}>✓ {onlyRead ? 'اعرض كل القصص' : 'قصص قرأتها'}</button>}</div>
        {readingState === 'unavailable' && <p className={styles.statusNote} role="status">تعذّر عرض حالة القراءة الآن؛ يمكنك اختيار قصة كالمعتاد.</p>}
        {loadError ? <div className={styles.empty}><span aria-hidden="true">📚</span><h3>حكاياتك تنتظرك</h3><p>تعذّر عرضها في هذه اللحظة. حاول تحديث الصفحة.</p><Link href="/library/stories-preview">أعد المحاولة ←</Link></div> : filtered.length ? <div className={styles.grid}>
          {filtered.map((story, index) => {
            const read = completed.has(story.id), url = `/library/stories/${encodeURIComponent(story.slug || story.id)}`;
            return <article className={styles.story} key={story.id}>
              <Link href={url} className={`${styles.cover} ${styles[`tone${index % 4}`]}`} aria-label={`اقرأ قصة ${story.title}`} prefetch={false}><Cover story={story} /><span className={styles.level}>المستوى {Number(story.level) || 1}</span>{read && <span className={styles.readBadge}>✓ قرأتها</span>}<span className={styles.spine} aria-hidden="true" /></Link>
              <div className={styles.storyText}><div className={styles.meta}><span><span aria-hidden="true">◷</span> حكاية {story.length || 'قصيرة'}</span><span>قراءة وخيال</span></div><h3>{story.title}</h3><p>{invitation(story)}</p><Link href={url} className={styles.readButton} prefetch={false}>{read ? 'أقرأها من جديد' : 'افتح الحكاية'}<span aria-hidden="true">←</span></Link></div>
            </article>;
          })}
        </div> : <div className={styles.empty}><span aria-hidden="true">📖</span><h3>{stories.length ? 'لنبحث عن حكاية أخرى' : 'قريبًا… حكايات جديدة'}</h3><p>{stories.length ? 'جرّب عنوانًا آخر، أو استكشف كل المستويات.' : 'ستظهر القصص هنا عندما ينشرها معلمك.'}</p>{stories.length > 0 && <button type="button" onClick={chooseAll}>شاهد كل الحكايات ←</button>}</div>}
      </section>
      <footer className={styles.footer}><span>ع</span><p>كل حكاية تقرؤها، تفتح في خيالك نافذة جديدة.</p><Link href="/library">المكتبة التعليمية ←</Link></footer>
    </div>
  </main>;
}
