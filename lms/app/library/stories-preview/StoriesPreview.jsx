'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { emptyStoryPreview, normalizeStoryPreview, previewResumePage, proposedStoryWorld, STORY_WORLDS } from '../../../lib/stories-preview-session';
import { childFetch, getActiveChildTab } from '../../../lib/child-fetch';
import styles from './preview.module.css';
const PreviewReader = dynamic(() => import('./PreviewReader'), { ssr: false });
const PreviewCelebration = dynamic(() => import('./PreviewCelebration'), { ssr: false });

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

export default function StoriesPreview({ stories, loadError = false, ownerId, isEditor = false }) {
  const [session, setSession] = useState(emptyStoryPreview);
  const [sessionScope, setSessionScope] = useState(null);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [world, setWorld] = useState('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [reader, setReader] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [opening, setOpening] = useState(null);
  const [openError, setOpenError] = useState('');
  const [draftNotes, setDraftNotes] = useState({});
  const [editorSaved, setEditorSaved] = useState(false);
  const sessionScopeRef = useRef(null), openTicket = useRef(0), controller = useRef(null), lastOpener = useRef(null);
  const scopeKey = () => ownerId ? `stories-preview:v2:${ownerId}:${getActiveChildTab() || 'self'}` : null;
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [onlyRead, setOnlyRead] = useState(false);
  const [completed, setCompleted] = useState(new Set());
  const [readingState, setReadingState] = useState('loading');
  const scope = useRef(null), request = useRef(0);
  useEffect(() => {
    function syncScope() {
      const key = scopeKey();
      if (sessionScopeRef.current === key && key) return;
      openTicket.current++; controller.current?.abort(); setReader(null); setCelebration(null); setOpening(null); setOpenError('');
      setOnlyRead(false); setOnlyFavorites(false); setWorld('all'); setDraftNotes({}); setEditorSaved(false);
      sessionScopeRef.current = key;
      let saved = emptyStoryPreview();
      try { if (key) saved = normalizeStoryPreview(JSON.parse(sessionStorage.getItem(key)), stories); }
      catch { setStorageAvailable(false); }
      setSession(saved); setSessionScope(key);
    }
    syncScope();
    window.addEventListener('focus', syncScope); document.addEventListener('visibilitychange', syncScope);
    return () => { openTicket.current++; controller.current?.abort(); window.removeEventListener('focus', syncScope); document.removeEventListener('visibilitychange', syncScope); };
  }, [ownerId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!sessionScope || sessionScope !== scopeKey()) return;
    try { sessionStorage.setItem(sessionScope, JSON.stringify(session)); }
    catch { setStorageAvailable(false); }
  }, [session, sessionScope]); // eslint-disable-line react-hooks/exhaustive-deps
  function changeSession(update) {
    if (!sessionScope || sessionScope !== scopeKey()) return;
    setSession(prev => update(prev));
  }
  const worldOf = story => session.notes[story.id]?.world || proposedStoryWorld(story);
  const blurbOf = story => session.notes[story.id]?.blurb || invitation(story);
  const bookmarks = stories.filter(s => session.bookmarks[s.id]).sort((a, b) => session.bookmarks[b.id].at - session.bookmarks[a.id].at);
  async function openStory(story, listen = false) {
    if (sessionScope !== scopeKey()) return;
    lastOpener.current = document.activeElement;
    controller.current?.abort(); const ac = new AbortController(); controller.current = ac;
    const ticket = ++openTicket.current, startedScope = scopeKey(); setOpening(story.id); setOpenError('');
    const timer = setTimeout(() => ac.abort(), 15000);
    try {
      const response = await childFetch(`/api/library/stories-preview/${encodeURIComponent(story.id)}`, { cache: 'no-store', signal: ac.signal });
      const result = await response.json();
      if (!response.ok || result.story?.id !== story.id || !Array.isArray(result.story.pages) || !result.story.pages.length || !Array.isArray(result.story.audio)) throw new Error();
      if (ticket !== openTicket.current || startedScope !== scopeKey()) return;
      const data = result.story, saved = session.bookmarks[story.id];
      const resumePage = previewResumePage(saved, data.version, data.pages.length);
      const firstAudio = data.audio.findIndex(Boolean);
      setReader({ ...data, initialPage: listen && firstAudio >= 0 ? firstAudio : resumePage });
    } catch { if (ticket === openTicket.current && startedScope === scopeKey()) setOpenError('تعذّر فتح الحكاية في المعاينة. حاول مرة أخرى.'); }
    finally { clearTimeout(timer); if (ticket === openTicket.current) setOpening(null); }
  }
  function closeReader() { setReader(null); lastOpener.current?.focus?.(); }
  function recordPage(page) {
    if (!reader) return;
    changeSession(s => ({ ...s, bookmarks: { ...s.bookmarks, [reader.id]: { page, total: reader.pages.length, version: reader.version, at: Date.now() } } }));
  }
  function finishPreview() {
    if (!reader || sessionScope !== scopeKey()) return;
    const story = reader;
    changeSession(s => { const next = { ...s.bookmarks }; delete next[story.id]; return { ...s, bookmarks: next, finished: [...new Set([...s.finished, story.id])] }; });
    setReader(null); setCelebration(story);
  }
  function toggleFavorite(story) { changeSession(s => ({ ...s, favorites: s.favorites.includes(story.id) ? s.favorites.filter(id => id !== story.id) : [...s.favorites, story.id] })); }
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
  const filtered = stories.filter(s => (world === 'all' || worldOf(s) === world) && (!onlyFavorites || session.favorites.includes(s.id)) && (level === 'all' || (Number(s.level) || 1) === level) && (!onlyRead || (completed.has(s.id) || session.finished.includes(s.id))) && tidy(s.title).includes(tidy(search).trim()));
  const chooseAll = () => { setSearch(''); setLevel('all'); setOnlyRead(false); setOnlyFavorites(false); setWorld('all'); };

  return <main className={styles.page} dir="rtl">
    <div className={styles.shell}>
      <div className={styles.previewBar}><span><i aria-hidden="true" /> معاينة جانبية لتصميم القصص</span><Link href="/library">العودة إلى المكتبة الحالية ←</Link></div>
      <header className={styles.hero}>
        <div className={styles.stars} aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span><span>·</span></div>
        <div className={styles.heroText}><span className={styles.kicker}>أكاديمية عارم · ركن الخيال</span><h1>حكاياتي<span>كلّ غلافٍ… بدايةُ مغامرة</span></h1><p>قصة تختارها، وكلمة تكتشفها، وخيال يكبر معك.</p><a href="#story-shelf" className={styles.heroButton}>اختر حكايتك <span aria-hidden="true">↓</span></a></div>
        <div className={styles.heroArt} aria-hidden="true"><span className={styles.moon} />{stories.slice(0, 2).map((s, i) => <div className={`${styles.littleBook} ${i ? styles.secondBook : ''}`} key={s.id}><Cover story={s} decorative /></div>)}<span className={styles.bookPlatform} /><span className={styles.artCaption}>هنا تبدأ الحكاية</span></div>
      </header>
      <div className={styles.note}><span aria-hidden="true">✦</span><p>معاينة فقط: استئناف القراءة والمفضّلة والنبذات والتصنيفات هنا مؤقتة لهذا الطفل في هذا التبويب. لا نقاط ولا تغيير في المكتبة الحالية.</p></div>
      {!storageAvailable && <p className={styles.statusNote} role="status">قد لا تبقى اختيارات المعاينة بعد تحديث الصفحة؛ لا يؤثر ذلك في حسابك.</p>}
      {bookmarks.length > 0 && <section className={styles.resumeCard} aria-label="أكمل حكايتي"><div><span className={styles.eyebrow}>علامة كتاب مؤقتة في المعاينة</span><h2>أكمل حكايتي</h2><p>«{bookmarks[0].title}» · الصفحة {session.bookmarks[bookmarks[0].id].page + 1} من {session.bookmarks[bookmarks[0].id].total}</p></div><button type="button" className={styles.heroButton} disabled={opening === bookmarks[0].id} onClick={() => openStory(bookmarks[0])}>أكمل من حيث توقفت ←</button></section>}
      <section id="story-shelf" className={styles.shelf} aria-labelledby="shelf-heading">
        <div className={styles.shelfHeading}><div><span className={styles.eyebrow}>افتح كتابًا… واكتشف عالمًا</span><h2 id="shelf-heading">أيّ حكاية ستختار اليوم؟</h2></div><span className={styles.count}>{stories.length} {stories.length === 1 ? 'قصة' : 'قصص'} في مكتبتك</span></div>
        <div className={styles.worldFilters} aria-label="عوالم القصص المقترحة"><button type="button" aria-pressed={world === 'all'} onClick={() => setWorld('all')}>🌍 كل العوالم</button>{STORY_WORLDS.map(w => <button type="button" key={w.id} aria-pressed={world === w.id} onClick={() => setWorld(w.id)}><span aria-hidden="true">{w.icon}</span> {w.name}</button>)}<small>تصنيفات مقترحة للمعاينة</small></div>
        <div className={styles.toolbar}>
          <div className={styles.filters} aria-label="تصفية القصص بحسب المستوى"><button type="button" aria-pressed={level === 'all'} onClick={() => setLevel('all')}>كل الحكايات</button>{levels.map(l => <button type="button" key={l} aria-pressed={level === l} onClick={() => setLevel(l)}>المستوى {l}</button>)}</div>
          <label className={styles.search}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg><input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن حكاية…" aria-label="ابحث عن حكاية" type="search" /></label>
        </div>
        <div className={styles.localFilters}><button type="button" aria-pressed={onlyFavorites} onClick={() => setOnlyFavorites(v => !v)}>♡ حكاياتي المفضّلة <span>{session.favorites.length}</span></button>{session.finished.length > 0 && <button type="button" aria-pressed={onlyRead} onClick={() => setOnlyRead(v => !v)}>✓ قرأتها في المعاينة <span>{session.finished.length}</span></button>}</div>
        {openError && <p className={styles.statusNote} role="alert">{openError}</p>}
        <div className={styles.resultLine}><p aria-live="polite">{loadError ? 'تعذّر تحميل الحكايات الآن.' : filtered.length === stories.length ? 'أغلفة جميلة، وحكايات أجمل. خذ وقتك في الاختيار.' : `تظهر الآن ${filtered.length} من ${stories.length} قصص.`}</p>{readingState === 'ready' && completed.size > 0 && <button type="button" aria-pressed={onlyRead} onClick={() => setOnlyRead(v => !v)}>✓ {onlyRead ? 'اعرض كل القصص' : 'قصص قرأتها'}</button>}</div>
        {readingState === 'unavailable' && <p className={styles.statusNote} role="status">تعذّر عرض حالة القراءة الآن؛ يمكنك اختيار قصة كالمعتاد.</p>}
        {loadError ? <div className={styles.empty}><span aria-hidden="true">📚</span><h3>حكاياتك تنتظرك</h3><p>تعذّر عرضها في هذه اللحظة. حاول تحديث الصفحة.</p><Link href="/library/stories-preview">أعد المحاولة ←</Link></div> : filtered.length ? <div className={styles.grid}>
          {filtered.map((story, index) => {
            const read = completed.has(story.id), demoRead = session.finished.includes(story.id), favorite = session.favorites.includes(story.id), bookmark = session.bookmarks[story.id];
            return <article className={styles.story} key={story.id}>
              <div className={styles.coverWrap}><button type="button" className={`${styles.cover} ${styles[`tone${index % 4}`]}`} aria-label={`عاين قصة ${story.title}`} onClick={() => openStory(story)} disabled={opening === story.id}><Cover story={story} /><span className={styles.level}>المستوى {Number(story.level) || 1}</span><span className={styles.spine} aria-hidden="true" /></button><button type="button" className={styles.favoriteButton} aria-label={`${favorite ? 'أزل' : 'أضف'} ${story.title} ${favorite ? 'من' : 'إلى'} المفضّلة التجريبية`} aria-pressed={favorite} onClick={() => toggleFavorite(story)}>{favorite ? '♥' : '♡'}</button></div>
              <div className={styles.storyText}><div className={styles.meta}><span><span aria-hidden="true">◷</span> حكاية {story.length || 'قصيرة'}</span><span>{STORY_WORLDS.find(w => w.id === worldOf(story))?.name}</span></div><h3>{story.title}</h3><span className={styles.blurbLabel}>{session.notes[story.id] ? 'نبذة المعلم · تجربة' : 'نبذة مقترحة للمعاينة'}</span><p>{blurbOf(story)}</p><div className={styles.storyStatuses}>{read && <span className={styles.localDone}>✓ قرأتها في المنصة</span>}{demoRead && <span className={styles.localDone}>✦ قرأتها في المعاينة</span>}{bookmark && <span>علامة عند الصفحة {bookmark.page + 1}</span>}</div><button type="button" className={styles.readButton} onClick={() => openStory(story)} disabled={opening === story.id}>{opening === story.id ? 'نفتح الحكاية…' : bookmark ? 'أكمل حكايتي' : demoRead || read ? 'أقرأها من جديد' : 'افتح الحكاية في المعاينة'}<span aria-hidden="true">←</span></button>{story.hasAudio && <button type="button" className={styles.listenButton} onClick={() => openStory(story, true)} disabled={opening === story.id}>🔊 استمع لتسجيل المعلم</button>}</div>
            </article>;
          })}
        </div> : <div className={styles.empty}><span aria-hidden="true">📖</span><h3>{stories.length ? 'لنبحث عن حكاية أخرى' : 'قريبًا… حكايات جديدة'}</h3><p>{stories.length ? 'جرّب عنوانًا آخر، أو استكشف كل المستويات.' : 'ستظهر القصص هنا عندما ينشرها معلمك.'}</p>{stories.length > 0 && <button type="button" onClick={chooseAll}>شاهد كل الحكايات ←</button>}</div>}
      </section>
      {isEditor && <details className={styles.editor} onToggle={e => { if (e.currentTarget.open) setEditorSaved(false); }}><summary>✏️ جرّب نبذة المعلم وتصنيف القصة</summary><p>تعديلات مؤقتة داخل المعاينة فقط. لن تُحفظ في القصص الأصلية أو لوحة إدارتها.</p>{stories.map(story => <div key={story.id} className={styles.editorRow}><h3>{story.title}</h3><label>نبذة مشوّقة للقصة<textarea maxLength={240} value={draftNotes[story.id]?.blurb ?? session.notes[story.id]?.blurb ?? invitation(story)} onChange={e => { setEditorSaved(false); setDraftNotes(s => ({ ...s, [story.id]: { blurb: e.target.value, world: s[story.id]?.world || worldOf(story) } })); }} /></label><label>عالم القصة<select value={draftNotes[story.id]?.world ?? worldOf(story)} onChange={e => { setEditorSaved(false); setDraftNotes(s => ({ ...s, [story.id]: { blurb: s[story.id]?.blurb ?? blurbOf(story), world: e.target.value } })); }}>{STORY_WORLDS.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label></div>)}<button type="button" className={styles.heroButton} onClick={() => { changeSession(s => ({ ...s, notes: { ...s.notes, ...draftNotes } })); setDraftNotes({}); setEditorSaved(true); }}>اعرض تعديلات المعاينة</button>{editorSaved && <p role="status">ظهرت تعديلاتك في هذه المعاينة فقط.</p>}</details>}
      <div className={styles.resetPreview}><span>كل اختيارات هذه التجربة مؤقتة، ويمكنك البدء من جديد.</span><button type="button" onClick={() => { if (sessionScope !== scopeKey()) return; setSession(emptyStoryPreview()); setDraftNotes({}); setEditorSaved(false); chooseAll(); }}>ابدأ المعاينة من جديد</button></div>
      {reader && <PreviewReader key={reader.id} story={reader} initialPage={reader.initialPage} onPage={recordPage} onClose={closeReader} onFinish={finishPreview} storageAvailable={storageAvailable} />}
      {celebration && <PreviewCelebration story={celebration} reflection={session.reflections[celebration.id] || ''} onReflection={value => changeSession(s => ({ ...s, reflections: { ...s.reflections, [celebration.id]: value } }))} onClose={() => { setCelebration(null); lastOpener.current?.focus?.(); }} />}
      <footer className={styles.footer}><span>ع</span><p>كل حكاية تقرؤها، تفتح في خيالك نافذة جديدة.</p><Link href="/library">المكتبة التعليمية ←</Link></footer>
    </div>
  </main>;
}
