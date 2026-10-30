'use client';

import { useState } from 'react';
import styles from './HeroesPreview.module.css';

// A deliberately local prototype: no account writes, rewards, ownership or saved hero changes.
const ART = '/heroes/preview-v1/characters.webp';
const BOARD = '/heroes/preview-v1/concept-board.webp';
const EXPLORER = '/heroes/preview-v1/explorer.webp';
const HEROES = [
  { id: 'rashid', name: 'راشد', title: 'المستكشف', icon: '🧭', hello: 'كل كلمة جديدة مغامرة. هل نستكشف معًا؟', body: [240, 0, 370, 512], face: [1110, 355, 185, 180], happy: [1302, 355, 180, 180] },
  { id: 'mona', name: 'منى', title: 'المبدعة', icon: '🎨', hello: 'لديك أفكار جميلة! هيا نصنع حكاية معًا.', body: [925, 0, 345, 512], face: [385, 355, 180, 180], happy: [575, 355, 180, 180] },
  { id: 'finn', name: 'فِنّ', title: 'الفضولي', icon: '🌿', hello: 'أتساءل: ما الكلمة التي سنكتشفها اليوم؟', body: [130, 512, 500, 490], face: [1140, 805, 178, 180], happy: [1330, 805, 175, 180] },
  { id: 'faheem', name: 'فهيم', title: 'رفيقك الذكي', icon: '🐘', hello: 'أنا بجانبك. نتعلّم خطوة خطوة، ونفرح بكل محاولة.', body: [870, 525, 520, 470], face: [397, 805, 175, 180], happy: [580, 805, 175, 180] },
];
const WORLDS = [
  { id: 'garden', name: 'حديقة الكلمات', icon: '🌿', text: 'هنا تنمو كلماتنا، كلمة بعد كلمة.' },
  { id: 'library', name: 'ركن الحكايات', icon: '📚', text: 'كتاب صغير، وخيال كبير، وحكاية نكتبها معًا.' },
  { id: 'space', name: 'فضاء الاكتشاف', icon: '🪐', text: 'كل فكرة جديدة نجمة تضيء رحلتك.' },
];
const QUESTIONS = [
  { letter: 'م', options: [{ word: 'مَوْز', icon: '🍌', right: true }, { word: 'قَلَم', icon: '✏️' }, { word: 'بَيْت', icon: '🏠' }] },
  { letter: 'ب', options: [{ word: 'سَمَكَة', icon: '🐟' }, { word: 'تُفَّاح', icon: '🍎' }, { word: 'بَاب', icon: '🚪', right: true }] },
  { letter: 'س', options: [{ word: 'كِتَاب', icon: '📘' }, { word: 'سَيَّارَة', icon: '🚗', right: true }, { word: 'وَرْدَة', icon: '🌷' }] },
];

function Portrait({ hero, kind = 'body', outfit = 'daily', className = '' }) {
  const [x, y, w, h] = hero[kind];
  return <span className={`${styles.art} ${className}`} style={{ aspectRatio: `${w} / ${h}` }}>
    <img src={kind === 'body' ? (outfit === 'explorer' ? EXPLORER : ART) : BOARD} alt={`${hero.name} ${hero.title}${kind === 'body' && outfit === 'explorer' ? ' بإطلالة الاستكشاف' : ''}`} draggable="false" style={{ width: `${1536 / w * 100}%`, left: `${-x / w * 100}%`, top: `${-y / h * 100}%` }} />
  </span>;
}

export default function HeroesPreview({ onReturn }) {
  const [selected, setSelected] = useState('rashid');
  const [names, setNames] = useState({});
  const [panel, setPanel] = useState('hero');
  const [worldId, setWorldId] = useState('garden');
  const [frame, setFrame] = useState('gold');
  const [outfit, setOutfit] = useState('daily');
  const [message, setMessage] = useState('');
  const [mood, setMood] = useState('body');
  const [motion, setMotion] = useState(0);
  const [question, setQuestion] = useState(0);
  const [answer, setAnswer] = useState(null);
  const [complete, setComplete] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const hero = HEROES.find(h => h.id === selected);
  const world = WORLDS.find(w => w.id === worldId);
  const name = names[selected]?.trim() || hero.name;
  const q = QUESTIONS[question];

  function choose(h) { setSelected(h.id); setMessage(h.hello); setMood('body'); setMotion(0); }
  function react(kind) {
    setMood(outfit === 'daily' ? (kind === 'celebrate' ? 'happy' : 'face') : 'body'); setMotion(n => n + 1);
    setMessage(kind === 'celebrate' ? 'أحسنت! كل خطوة صغيرة تستحق أن نفرح بها.' : `${name} يحيّيك! جاهز لمغامرة جديدة؟`);
  }
  function pick(option) {
    if (answer === true || complete) return;
    setAnswer(!!option.right);
    setMessage(option.right ? `رائع! «${option.word}» تبدأ بحرف «${q.letter}».` : 'قريب! انظر إلى أول حرف في كل كلمة، وجرّب مرة أخرى.');
    setMood(outfit === 'daily' ? (option.right ? 'happy' : 'face') : 'body');
    if (option.right) setMotion(n => n + 1);
  }
  function next() {
    if (answer !== true) return;
    if (question === QUESTIONS.length - 1) { setComplete(true); setMessage('أنهيت مهمة المعاينة! أضف شجرة الكلمات إلى عالمك.'); }
    else { setQuestion(n => n + 1); setAnswer(null); setMessage('خطوة جميلة! هيا نكتشف كلمة أخرى.'); }
  }
  function restart() { setQuestion(0); setAnswer(null); setComplete(false); setMessage('نبدأ من جديد! خذ وقتك واستمتع.'); setMood('body'); }

  return <section className={styles.preview} aria-labelledby="heroes-preview-title">
    <div className={styles.intro}>
      <div><span className={styles.eyebrow}>تصوّر جديد · تجربة داخل عالم الأبطال</span><h2 id="heroes-preview-title">بطل يشبه خيالك، ورفيق يحبّ التعلّم معك</h2><p>اختر رفيقك، سمِّه، وابنِ معه أول حكاية.</p></div>
      <span className={styles.seal} aria-hidden="true">ع<span>أبطال عارم</span></span>
    </div>
    <p className={styles.disclosure}>معاينة للتجربة فقط؛ اختياراتك هنا مؤقتة ولا تغيّر بطلك المحفوظ أو مشترياتك أو رصيدك. الشخصيات رسوم تفاعلية، وليست نماذج ثلاثية الأبعاد قابلة للدوران بعد.</p>

    <div className={styles.layout}>
      <div className={styles.sceneColumn}>
        <div className={`${styles.scene} ${styles[world.id]} ${styles[frame]}`}>
          <div className={styles.sceneTop}><span>{world.icon} {world.name}</span><span>رفيق التعلّم</span></div>
          <div className={styles.orbit} aria-hidden="true"><span>✦</span><span>ب</span><span>م</span><span>✧</span></div>
          <button type="button" key={`${hero.id}-${mood}-${motion}`} className={`${styles.character} ${motion ? styles.bounce : ''}`} style={{ '--character-width': `${335 * hero[mood][2] / hero[mood][3]}px`, '--character-mobile-width': `${265 * hero[mood][2] / hero[mood][3]}px` }} onClick={() => react('hello')} aria-label={`المس ${name} ليحيّيك`}>
            <Portrait hero={hero} kind={mood} outfit={outfit} />
          </button>
          {complete && <span className={styles.tree} aria-label="شجرة الكلمات المكتسبة في المعاينة">🌳</span>}
          <div className={styles.nameplate}><strong>{name}</strong><span>{hero.icon} {hero.title}</span></div>
        </div>
        <div className={styles.bubble} role="status" aria-live="polite">{message || hero.hello}</div>
        <div className={styles.reactions}>
          <button type="button" onClick={() => react('hello')}>👋 حيّني</button>
          <button type="button" onClick={() => react('celebrate')}>✨ احتفل معي</button>
          <button type="button" onClick={() => { setMood('body'); setMotion(0); setMessage(hero.hello); }}>🧍 الشكل الكامل</button>
        </div>
      </div>

      <div className={styles.controls}>
        <nav className={styles.tabs} aria-label="تجربة الأبطال الجدد">
          {[['hero', '🦸', 'بطلي'], ['world', '🌍', 'عالمي'], ['mission', '🧩', 'مهمتي']].map(([id, icon, title]) => <button type="button" key={id} aria-pressed={panel === id} onClick={() => setPanel(id)}><span aria-hidden="true">{icon}</span>{title}</button>)}
        </nav>

        {panel === 'hero' && <div className={styles.card}>
          <div className={styles.sectionHeading}><div><h3>من سيرافقك اليوم؟</h3><p>أربعة أصدقاء، ولكلٍّ حكاية.</p></div><span aria-hidden="true">✦</span></div>
          <div className={styles.heroes}>
            {HEROES.map(h => <button type="button" key={h.id} className={styles.heroOption} onClick={() => choose(h)} aria-pressed={h.id === selected} aria-label={`اختر ${h.name}`}><Portrait hero={h} kind="face" /><strong>{h.name}</strong><small>{h.title}</small><span className={styles.selected}>{h.id === selected ? '✓ رفيقي الآن' : 'جرّبني'}</span></button>)}
          </div>
          <label className={styles.nameInput}>ماذا تحب أن تسمّي بطلك؟<input value={names[selected] || ''} onChange={e => setNames(n => ({ ...n, [selected]: e.target.value }))} maxLength={24} placeholder={hero.name} autoComplete="off" /></label>
          <fieldset className={styles.outfits}><legend>إطلالة رفيقي</legend>{[['daily', '🎨', 'إطلالتي اليومية'], ['explorer', '🧭', 'رحلة استكشاف']].map(([id, icon, label]) => <button type="button" key={id} aria-pressed={outfit === id} onClick={() => { setOutfit(id); setMood('body'); setMotion(0); setMessage(id === 'explorer' ? 'حقيبتي جاهزة! ما الكلمة التي سنكتشفها معًا؟' : hero.hello); }}><span aria-hidden="true">{icon}</span>{label}{outfit === id && ' ✓'}</button>)}</fieldset>
          <fieldset className={styles.frames}><legend>لون إطار بطلي</legend>{[['gold', 'ذهبي'], ['navy', 'كحلي'], ['cream', 'كريمي']].map(([id, label]) => <button type="button" key={id} className={styles[id]} aria-pressed={frame === id} onClick={() => setFrame(id)}>{frame === id && '✓ '}{label}</button>)}</fieldset>
          <div className={styles.tailor}><span aria-hidden="true">👕</span><p><b>الملابس والمعدات</b><br />جرّبنا هنا إطلالتين مرسومتين. الملابس والقطع ثلاثية الأبعاد تظل في متجرك الحالي.</p><button type="button" onClick={onReturn}>جرّب المتجر الحالي ←</button></div>
        </div>}

        {panel === 'world' && <div className={styles.card}>
          <div className={styles.sectionHeading}><div><h3>عالم صغير، وخيال كبير</h3><p>اختر المكان الذي تحب أن يرافقك فيه بطلك.</p></div></div>
          <div className={styles.worlds}>{WORLDS.map(w => <button type="button" key={w.id} className={styles[w.id]} onClick={() => { setWorldId(w.id); setMessage(w.text); }} aria-pressed={w.id === worldId}><span aria-hidden="true">{w.icon}</span><strong>{w.name}</strong><small>{w.text}</small></button>)}</div>
          <div className={styles.reward}><span aria-hidden="true">{complete ? '🌳' : '🌱'}</span><div><h4>{complete ? 'شجرة الكلمات تزيّن عالمك!' : 'أول زينة لعالمك: شجرة الكلمات'}</h4><p>{complete ? 'كسبتها داخل هذه المعاينة بعد إكمال المهمة.' : 'أكمل المهمة القصيرة، وشاهد شجرتك بجانب البطل.'}</p></div></div>
          <button type="button" className={styles.primary} onClick={() => setPanel('mission')}>{complete ? '🧩 شاهد مهمتي' : 'هيا نزرع أول شجرة ←'}</button>
        </div>}

        {panel === 'mission' && <div className={styles.card}>
          <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>مهمة توضيحية · بلا نقاط رسمية</span><h3>اكتشف حرف البداية مع {name}</h3></div><span aria-hidden="true">🧩</span></div>
          <div className={styles.progress} aria-label={`${complete ? 3 : question + (answer === true ? 1 : 0)} من 3 كلمات`}><span style={{ width: `${(complete ? 3 : question + (answer === true ? 1 : 0)) / 3 * 100}%` }} /></div>
          {complete ? <div className={styles.done}><span aria-hidden="true">🌳</span><h4>ثلاث كلمات… وشجرة جديدة!</h4><p>أحسنت! رفيقك يفرح بمحاولتك، وعالمك صار أجمل.</p><p className={styles.small}>إنجاز تجريبي؛ لا يُضاف إلى تقرير الطالب أو أوسمته الفعلية.</p><button type="button" className={styles.primary} onClick={() => setPanel('world')}>شاهد شجرتي في عالمي ←</button><button type="button" className={styles.secondary} onClick={restart}>جرّب المهمة من جديد</button></div>
          : <><p className={styles.questionCount}>الكلمة {question + 1} من 3 · خذ وقتك</p><h4 className={styles.question}>أيّ كلمة تبدأ بحرف <span>{q.letter}</span>؟</h4><div className={styles.answers}>{q.options.map(option => <button type="button" key={option.word} disabled={answer === true} onClick={() => pick(option)} className={answer === true && option.right ? styles.correct : ''}><span aria-hidden="true">{option.icon}</span><strong>{option.word}</strong>{answer === true && option.right && <small>✓ أحسنت</small>}</button>)}</div><p className={styles.feedback} role="status">{answer === true ? '✓ وجدتها! هيا نكمل رحلتنا.' : answer === false ? 'قريب! جرّب كلمة أخرى، رفيقك ينتظرك.' : 'انظر إلى أول حرف، ثم اختر الكلمة.'}</p>{answer === true && <button type="button" className={styles.primary} onClick={next}>{question === 2 ? '🌳 أكمل المهمة وأضف الشجرة' : 'الكلمة التالية ←'}</button>}</>}
        </div>}
        <button type="button" className={styles.boardToggle} aria-expanded={showBoard} onClick={() => setShowBoard(v => !v)}>{showBoard ? 'إخفاء لوحة التصاميم' : '🖼️ شاهد لوحة التصاميم كاملة'}</button>
      </div>
    </div>
    {showBoard && <figure className={styles.board}><img src={BOARD} alt="لوحة تصاميم راشد ومنى وفِنّ وفهيم، مع الملامح الكاملة وتعبيرات الفرح" loading="lazy" /><figcaption>التصوّر البصري للشخصيات الجديدة · للمراجعة قبل الاعتماد</figcaption></figure>}
    <div className={styles.footer}><span>🌱 نكبر بالتعلّم، ونفرح بالمحاولة.</span><button type="button" onClick={onReturn}>العودة إلى أبطالي الحاليين ←</button></div>
  </section>;
}
