'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Check, Heart, Lightbulb, ScanSearch, Undo2, Volume2, VolumeX, RotateCcw, Settings } from 'lucide-react';
import { childFetch } from '../../../lib/child-fetch';
import { cleanWord, lettersOf, playableDiscover } from '../../../lib/discover-objects';
import { useElementWidth, fitTileSize, compactTileStyle } from '../../../lib/fit-tiles';
import Scene from './Scene';
import { createDiscoverAudio } from '../../../lib/discover-objects-audio';
import { normalizeDiscoverSound } from '../../../lib/discover-objects-sounds';
import './discover.css';

export default function Game({ initialContent, staff }) {
  const [content, setContent] = useState(initialContent);
  const contentRef = useRef(initialContent);
  const [index, setIndex] = useState(0), [stage, setStage] = useState('find');
  const [selectedScene, setSelectedScene] = useState('');
  const [picked, setPicked] = useState([]), [completed, setCompleted] = useState([]);
  const [message, setMessage] = useState('انظر جيّدًا… واضغط على ما وجدته.');
  const [hinted, setHinted] = useState(0), [busy, setBusy] = useState(false), [saveNote, setSaveNote] = useState('');
  const [retryBody, setRetryBody] = useState(null), [loadError, setLoadError] = useState('');
  const [muted, setMuted] = useState(false);
  const [rowEl, setRowEl] = useState(null);
  const width = useElementWidth(rowEl);
  const audioRef = useRef(null), lock = useRef(false);
  const config = content?.config;
  const sounds = useMemo(() => normalizeDiscoverSound(config?.sounds) || normalizeDiscoverSound(), [config?.sounds]);
  const allEntries = useMemo(() => config ? playableDiscover(config) : [], [config]);
  const sceneChoices = useMemo(() => config ? config.scenes.filter(s => allEntries.some(e => e.scene.id === s.id)) : [], [config, allEntries]);
  const activeSceneId = sceneChoices.some(s => s.id === selectedScene) ? selectedScene : sceneChoices[0]?.id;
  const entries = useMemo(() => allEntries.filter(e => e.scene.id === activeSceneId), [allEntries, activeSceneId]);
  const completedInScene = completed.filter(id => entries.some(e => e.round.id === id));
  const entry = entries[index], round = entry?.round, scene = entry?.scene;
  const wordLetters = useMemo(() => lettersOf(round?.word), [round?.word]);
  const bank = useMemo(() => wordLetters.map((letter, id) => ({ letter, id })).reverse(), [wordLetters]);
  const word = picked.map(i => bank[i].letter).join('');
  const tileSize = fitTileSize(width, wordLetters.length, cleanWord(round?.word).split(' ').length, { max: 52, min: 8, tileGap: 4, wordGap: 10 });
  const compact = cleanWord(round?.word).includes(' ') || wordLetters.length > 5;
  const stopAudio = () => audioRef.current?.stop();
  const audioAllowed = !!config && (config.enabled || staff) && !!entry && stage !== 'finish';
  useEffect(() => { const player = createDiscoverAudio(); audioRef.current = player; return () => player.destroy(); }, []);
  useEffect(() => { audioRef.current?.configure(sounds); }, [sounds]);
  useEffect(() => { audioRef.current?.setMuted(muted); }, [muted]);
  useEffect(() => { const visible = () => audioRef.current?.setVisible(audioAllowed && document.visibilityState === 'visible'); visible(); document.addEventListener('visibilitychange', visible); return () => document.removeEventListener('visibilitychange', visible); }, [audioAllowed]);
  function resetRound() { audioRef.current?.reset(); setPicked([]); setStage('find'); setHinted(0); setRetryBody(null); setSaveNote(''); setMessage('انظر جيّدًا… واضغط على ما وجدته.'); }
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch(`/api/discover-objects?t=${Date.now()}`, { cache: 'no-store' });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        if (!alive) return;
        if (!contentRef.current || contentRef.current.version !== j.version) {
          stopAudio(); setContent(j); setSelectedScene(''); setIndex(0); setStage('find'); setPicked([]); setCompleted([]); setRetryBody(null); setHinted(0);
          setMessage(contentRef.current ? 'أضاف المعلم اكتشافات جديدة! لنبدأ رحلتنا.' : 'انظر جيّدًا… واضغط على ما وجدته.');
          contentRef.current = j;
        }
        setLoadError('');
      } catch (e) { if (alive && !contentRef.current) setLoadError(e.message || 'فهيم يجهّز الحديقة. افتحها مرة أخرى.'); }
    }
    const visible = () => { if (document.visibilityState === 'visible') load(); };
    load(); const timer = setInterval(visible, 60000); document.addEventListener('visibilitychange', visible); window.addEventListener('focus', visible);
    return () => { alive = false; clearInterval(timer); document.removeEventListener('visibilitychange', visible); window.removeEventListener('focus', visible); stopAudio(); };
  }, []);
  function play() {
    audioRef.current?.playClue(round?.audio);
  }
  async function finishRound(sentence) {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    const body = { roundId: round.id, found: round.target, word: config.build ? (word || cleanWord(round.word)) : '', sentence, version: content.version };
    setRetryBody(body);
    try {
      const r = await childFetch('/api/discover-objects/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error);
      if (contentRef.current?.version !== body.version) return;
      setCompleted(p => p.includes(round.id) ? p : [...p, round.id]); setStage('round'); setRetryBody(null);
      setMessage(config.successMessage);
      setSaveNote(j.preview ? 'تجربة المعلم: لا تُضاف نقاط ولا نتائج للطلاب.' : j.skipped ? 'سبق حفظ هذا الاكتشاف. يمكنك الاستمتاع به مجدّدًا دون تكرار مكافأته.' : j.awarded ? `حُفظ إنجازك وأُضيفت ${j.awarded} نجوم إلى رصيدك.` : 'حُفظ إنجازك، أحسنت!');
    } catch (e) { setMessage(e.message || 'إنجازك ينتظرك. جرّب حفظه مرة أخرى.'); }
    finally { lock.current = false; setBusy(false); }
  }
  function afterFind() { if (config.build) setStage('build'); else if (config.read) setStage('read'); else finishRound(undefined); }
  function pickObject(id) {
    if (stage !== 'find' || busy) return;
    if (id !== round.target) return setMessage(config.retryMessage);
    audioRef.current?.discovered(round.wordAudio || ''); setMessage('رائع! وجدتَ الشيء المطلوب. لنكمل اكتشافنا.'); afterFind();
  }
  function checkWord() {
    if (word !== cleanWord(round.word).replace(/ /g, '')) return setMessage(`كلُّ الحروف معك! جرّب ترتيبًا آخر. أوّلُ حرفٍ هو «${wordLetters[0]}».`);
    setMessage('أحسنت! ركّبتَ الكلمة. اقرأ الجمل واختر المناسبة.');
    if (config.read) setStage('read'); else finishRound(undefined);
  }
  function help() {
    setHinted(n => n + 1);
    setMessage(stage === 'find' ? (round.hint || `أوّلُ حرفٍ من الكلمة هو «${wordLetters[0]}».`) : stage === 'build' ? `لنرتّب «${round.word}» معًا. أوّلُ حرفٍ هو «${wordLetters[0]}».` : 'فكّر في معنى كلّ جملة: أيّها يصف ما نفعله بهذا الشيء؟');
  }
  const progress = entries.length ? completedInScene.length / entries.length * 100 : 0;
  const back = <div className="wd-back"><Link href="/library">← المكتبة التعليمية</Link>{staff && <Link className="wd-manage-link" href="/library/discover-objects/manage"><Settings size={17} /> لوحة تحكم التدريب</Link>}</div>;
  if (!config) return <div id="word-detective">{back}<p className="wd-empty" role="status">{loadError || 'فهيم يجهّز اكتشافاتك…'}</p></div>;
  if ((!config.enabled && !staff) || !entry) return <div id="word-detective">{back}<p className="wd-empty">{!config.enabled ? 'هذا التدريب يستريح قليلًا. اكتشف نشاطًا آخر من المكتبة.' : 'اكتشافات جديدة في الطريق، عد قريبًا!'}</p></div>;
  const target = scene.objects.find(o => o.id === round.target);
  const found = entries.filter(e => e.scene.id === scene.id && completed.includes(e.round.id)).map(e => e.round.target);
  const stepList = [['find', 'أكتشف'], ...(config.build ? [['build', 'أركّب']] : []), ...(config.read ? [['read', 'أفهم']] : [])];
  return <div id="word-detective" dir="rtl" onPointerDownCapture={() => audioRef.current?.unlock()} onKeyDownCapture={() => audioRef.current?.unlock()}>{back}<div className="wd-app">
    <header className="wd-header"><div className="wd-brand"><span className="wd-mark"><ScanSearch /></span><div><span className="wd-overline">مغامرات فهيم</span><h1>{config.title}</h1></div></div><div className="wd-stars" aria-label="نجوم إنجازات الجولة"><span>★</span><strong>{completedInScene.length * config.pointsPerRound}</strong><span>/ {entries.length * config.pointsPerRound}</span></div></header>
    <div className="wd-audio-row"><p className="wd-subtitle">{config.subtitle}</p><button type="button" className="wd-sound-toggle" aria-pressed={muted} onClick={() => setMuted(v => !v)}>{muted ? <VolumeX /> : <Volume2 />}{muted ? 'تشغيل الصوت' : 'كتم الصوت'}</button></div><div className="wd-journey"><div><span className="wd-place">{scene.title}</span><span className="wd-count">اللغز {index + 1} من {entries.length}</span></div><div className="wd-progress" role="progressbar" aria-label="الألغاز المكتملة" aria-valuemin={0} aria-valuemax={entries.length} aria-valuenow={completedInScene.length}><span style={{ width: `${progress}%` }} /></div></div>
    {sceneChoices.length > 1 && <div className="wd-scene-select"><label htmlFor="wd-scene-choice">اختر مشهدك</label><select id="wd-scene-choice" value={activeSceneId} onChange={e => { setSelectedScene(e.target.value); setIndex(0); resetRound(); }}>{sceneChoices.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select><span>{sceneChoices.length} عوالم للاستكشاف</span></div>}
    {stage === 'finish' ? <section id="wd-finish"><div className="wd-final-spark">✦</div><h2>أنت مُحقّقُ كلماتٍ رائع!</h2><p>{config.successMessage}</p><div className="wd-final-stars">★ ★ ★<span>{completedInScene.length * config.pointsPerRound} نجوم اكتشاف</span></div><div className="wd-final-words">{entries.map(e => <span key={e.round.id}>{e.round.word}</span>)}</div><button type="button" className="wd-primary" onClick={() => { setIndex(0); setCompleted(p => p.filter(id => !entries.some(e => e.round.id === id))); resetRound(); }}><RotateCcw /> ألعب من جديد</button></section> : <>
    <div className="wd-steps">{stepList.map(([k, label], n) => <span key={k} className={stage === k ? 'active' : stage === 'round' || stepList.findIndex(x => x[0] === stage) > n ? 'done' : ''}><b>{n + 1}</b>{label}</span>)}</div>
    <div className="wd-play-area"><aside className="wd-guide"><div className="wd-friend"><img className="wd-faheem" src="/faheem.png" alt="فهيم" /><div><span>دليلك الصغير</span><strong>أنا فهيم، ومعك نكتشف!</strong></div></div><div className="wd-clue"><span>{stage === 'find' ? 'اقرأ الدليل، ثم ابحث في المشهد' : stage === 'build' ? 'المرحلة الثانية · أركّب' : stage === 'round' ? 'اكتمل الاكتشاف' : 'أقرأ وأفهم'}</span><h2>{stage === 'find' ? round.clue : stage === 'build' ? 'لنرتّب حروفَ الكلمة معًا.' : stage === 'round' ? config.successMessage : 'أيُّ جملةٍ تناسبُ ما اكتشفناه؟'}</h2></div>
    {stage === 'find' && round.audio && <button type="button" className="wd-help" onClick={play}><Volume2 /> أستمع إلى الدليل</button>}
    {stage !== 'find' && round.wordAudio && <button type="button" className="wd-help" onClick={() => audioRef.current?.playWord(round.wordAudio)}><Volume2 /> أسمع الكلمة</button>}
    <div className={`wd-feedback${stage === 'round' ? ' success' : ''}`} aria-live="polite">{message}</div>
    {retryBody && !busy && <button type="button" className="wd-primary" onClick={() => finishRound(retryBody.sentence)}>حفظ الإنجاز من جديد</button>}
    {config.hints && stage !== 'round' && <button type="button" className="wd-help" onClick={help}><Lightbulb /> أعطني دليلًا آخر</button>}
    <div className="wd-pocket"><span>اكتشافاتي</span><div>{entries.filter(e => e.scene.id === scene.id).slice(0, 8).map(e => <span key={e.round.id} className={completed.includes(e.round.id) ? 'found' : ''}>{completed.includes(e.round.id) ? lettersOf(e.round.word)[0] : '؟'}</span>)}</div></div></aside>
    <main className="wd-stage">
    {stage === 'find' && <section><Scene scene={scene} onPick={pickObject} found={found} highlighted={hinted > 1 ? round.target : null} disabled={busy} /><div className="wd-scene-foot">اضغط على الشيء الذي يناسب الدليل</div></section>}
    {stage === 'build' && <section id="wd-build"><span className="wd-work-label">ورشة الكلمات</span><div className="wd-found-object">{target?.image ? <img src={target.image} alt={target.label} /> : wordLetters[0]}</div><h2>لنُرَكِّبْ {config.showWord || hinted ? <>كلمة <span>{round.word}</span></> : 'اسم الشيء الذي وجدناه'}</h2><p>اضغط الحروف بالترتيب، من اليمين إلى اليسار.</p><div className={`wd-slots${compact ? ' compact' : ''}`} ref={setRowEl} aria-label="حروف الكلمة">{cleanWord(round.word).split(' ').map((group, gi, groups) => { const offset = groups.slice(0, gi).join('').length; return <span className="wd-word-group" key={gi}>{[...group].map((_, i) => <span key={i} className={`wd-slot${picked[offset + i] !== undefined ? ' filled' : ''}`} style={compact ? compactTileStyle(tileSize) : undefined}>{picked[offset + i] !== undefined ? bank[picked[offset + i]].letter : ''}</span>)}</span>; })}</div><div className="wd-letter-bank">{bank.map((b, i) => <button type="button" key={b.id} className={picked.includes(i) ? 'used' : ''} disabled={picked.includes(i) || busy} onClick={() => { if (!picked.includes(i) && picked.length < bank.length) setPicked(p => [...p, i]); }}>{b.letter}</button>)}</div><div className="wd-build-actions"><button className="wd-secondary" type="button" disabled={!picked.length || busy} onClick={() => setPicked(p => p.slice(0, -1))}><Undo2 /> أتراجع</button><button className="wd-primary" type="button" disabled={picked.length !== bank.length || busy} onClick={checkWord}>هذه كلمتي <Check /></button></div></section>}
    {stage === 'read' && <section id="wd-read"><span className="wd-work-label">أقرأ وأفهم</span><div className="wd-read-illustration"><BookOpen /></div><h2>أيُّ جملةٍ تناسبُ «{round.word}»؟</h2><div id="wd-sentences">{round.sentences.map((s, i) => <button key={i} type="button" disabled={busy} onClick={() => { if (i === round.correct) finishRound(i); else setMessage(config.retryMessage); }}>{s}</button>)}</div></section>}
    {stage === 'round' && <section id="wd-round"><div className="wd-win-icon">★</div><span className="wd-work-label">اكتشاف يستحق الفرح!</span><h2>كشفتَ سرَّ «{round.word}»!</h2><p>{saveNote}</p><div className="wd-earned">{config.pointsPerRound} نجوم اكتشاف</div><button className="wd-primary" type="button" onClick={() => { if (index + 1 < entries.length) { setIndex(i => i + 1); resetRound(); } else { stopAudio(); setStage('finish'); } }}>{index + 1 < entries.length ? 'إلى اللغز التالي' : 'شاهد إنجازك'} <ArrowLeft /></button></section>}
    </main></div></>}
    <footer className="wd-footer"><span><Heart /> على مهلك… التعلّم مغامرة، وليس سباقًا.</span>{staff && <span>معاينة المعلم · بلا نقاط أو نتائج</span>}</footer>
  </div></div>;
}
