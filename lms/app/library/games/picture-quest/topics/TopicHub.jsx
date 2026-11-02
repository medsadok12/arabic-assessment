'use client';
import{useCallback,useEffect,useRef,useState}from'react';
import Link from'next/link';
import{childFetch,getActiveChildTab}from'../../../../../lib/child-fetch';
import{displayNumber}from'../../../../../lib/display-number';
import TopicPlay from'./TopicPlay';
import WorldCard,{worldStyle,currentStage}from'./WorldCard';
import'./topics.css';
import'./worlds.css';
import'./focus.css';

const PAGE_SIZE=8;
export default function TopicHub({staff}){
 const[data,setData]=useState(null),[error,setError]=useState(''),[selection,setSelection]=useState(null),[tick,setTick]=useState(0),[child,setChild]=useState(()=>getActiveChildTab()),[topicId,setTopicId]=useState(null),[stageId,setStageId]=useState(null),[menu,setMenu]=useState(false),[page,setPage]=useState(0);
 const selectionChild=useRef(child),back=useRef(null),menuButton=useRef(null),menuBox=useRef(null),worldButtons=useRef(new Map()),focusDetail=useRef(false),restoreTopic=useRef(null);
 const playing=!!(selection&&data&&selectionChild.current===child);
 useEffect(()=>{if(playing)return;document.documentElement.classList.add('pqw-focus');return()=>document.documentElement.classList.remove('pqw-focus')},[playing]);
 useEffect(()=>{const focus=()=>setChild(getActiveChildTab());window.addEventListener('focus',focus);return()=>window.removeEventListener('focus',focus)},[]);
 useEffect(()=>{let live=true;setError('');setData(null);childFetch('/api/games/picture-quest/topics',{cache:'no-store'}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(live)setData(d)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[tick,child]);
 useEffect(()=>{setSelection(null);setTopicId(null);setStageId(null);setMenu(false);setPage(0)},[child]);
 useEffect(()=>{if(playing)return;if(focusDetail.current&&topicId&&back.current){back.current.focus({preventScroll:true});focusDetail.current=false;}else if(!topicId&&restoreTopic.current){worldButtons.current.get(restoreTopic.current)?.focus({preventScroll:true});restoreTopic.current=null;}},[topicId,data,playing]);
 useEffect(()=>{if(!menu)return;menuBox.current?.querySelector('a,button:not(:disabled)')?.focus({preventScroll:true});const outside=e=>{if(!menuBox.current?.contains(e.target)&&!menuButton.current?.contains(e.target))setMenu(false)};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[menu]);
 const exit=useCallback(()=>{setSelection(null);setStageId(null);setTick(x=>x+1)},[]);
 function openTopic(id,stage=null){focusDetail.current=true;setTopicId(id);setStageId(stage);setMenu(false);}
 function closeTopic(){restoreTopic.current=topicId;setTopicId(null);setStageId(null);setMenu(false);}
 function beginStage(next){selectionChild.current=child;setMenu(false);setSelection(next);}
 function onMenuKey(e){if(e.key==='Escape'){e.preventDefault();setMenu(false);menuButton.current?.focus()}if(e.key==='Tab'){const items=[...menuBox.current.querySelectorAll('a,button:not(:disabled)')],at=items.indexOf(document.activeElement);if(items.length){e.preventDefault();items[(at+(e.shiftKey?-1:1)+items.length)%items.length].focus()}}}
 if(playing)return <TopicPlay key={child} selection={selection} settings={data.settings} onExit={exit}/>;
 const topic=data?.topics.find(t=>t.id===topicId),active=topic&&(topic.stages.find(s=>s.stage===stageId)||currentStage(topic));
 const showProgress=data?.settings.controls?.progress!==false,showScore=data?.settings.controls?.score!==false;
 const final=data?.final,canFinal=!!final?.unlocked&&!!final?.ready;
 const resumeFinal=!!(final?.resume&&canFinal&&data.resume?.topicId==='final');
 const resumeTopic=resumeFinal?null:data?.topics.find(t=>t.id===data.resume?.topicId&&t.stages.some(s=>s.stage===data.resume.stage&&s.resume))||data?.topics.find(t=>t.stages.some(s=>s.resume));
 const resumeStage=resumeTopic&&(resumeTopic.stages.find(s=>s.stage===data.resume?.stage&&s.resume)||resumeTopic.stages.find(s=>s.resume));
 const entries=[...(data?.topics||[]).map(t=>({topic:t})),...(final?.enabled?[{final:true}]:[])],pages=Math.max(1,Math.ceil(entries.length/PAGE_SIZE)),safePage=Math.min(page,pages-1),visible=entries.slice(safePage*PAGE_SIZE,(safePage+1)*PAGE_SIZE);
 const stageStatus=active&&(active.completed?'مكتملة ✓':!active.ready?'قيد التجهيز':showProgress&&active.resume?'وصلت إلى '+displayNumber(active.index)+' من '+displayNumber(active.target):'');
 const finalStatus=!final?.unlocked?'أكمل العوالم لفتحه':!final.ready?'كلمات التحدّي قيد التجهيز':final.completed?'أكملت التحدّي ✓':'التحدّي جاهز لك';
 return <div className={'pqw-focus-screen pqw pqf'+(data?.hubDepthEnabled===false?' pqw-flat':'')+(data?.settings.animate===false?' pqw-no-motion':'')} dir="rtl">
  <div className="pqf-window">
   <header className="pqf-header">{topic?<button ref={back} type="button" className="pqf-back" onClick={closeTopic}>→ العوالم</button>:<Link className="pqf-back" href="/library">← المكتبة</Link>}<h1>{topic?.title||'اختر عالمك'}</h1><button ref={menuButton} type="button" className="pqf-more" onClick={()=>setMenu(x=>!x)} aria-expanded={menu} aria-controls="pqw-options" aria-label="خيارات إضافية">⋯</button></header>
   {menu&&<div ref={menuBox} id="pqw-options" className="pqf-menu" role="dialog" aria-label="خيارات إضافية" onKeyDown={onMenuKey}>{data&&!staff&&showScore&&Number.isFinite(data.points)&&<span className="pqf-score">⭐ {displayNumber(data.points)} نقطة</span>}{data?.reviewEnabled&&<button type="button" disabled={staff||!data.reviewCount} onClick={()=>beginStage({topicId:'review',stage:1})}>✦ المراجعة</button>}<Link href="/library/games/picture-quest?classic=1">التدريب الأصلي</Link>{staff&&<Link href={'/library/games/picture-quest/topics/manage'+(topic?'?topic='+topic.id+'&stage='+active.stage:'')}>✎ تحرير التدريب</Link>}<Link href="/library">العودة للمكتبة</Link></div>}
   {error?<div className="pqf-message" role="alert"><p>{error}</p><button type="button" className="pqf-go" onClick={()=>setTick(x=>x+1)}>أعد المحاولة</button></div>:!data?<div className="pqf-message" role="status">نجهّز العوالم…</div>:!data.enabled?<div className="pqf-message"><p>التدريب متوقف حاليًا.</p><Link href="/library">العودة للمكتبة</Link></div>:topic&&active?<section className="pqf-view pqf-topic" aria-label={'مراحل '+topic.title}>
    <div className="pqf-hero"><div className="pqf-emblem" style={worldStyle(topic.id)} aria-hidden="true">{topic.emoji||'✦'}</div></div>
    <div className="pqf-stage-area"><h2>المرحلة {displayNumber(active.stage)}</h2><div className="pqf-path" role="group" aria-label={'مراحل '+topic.title}>{topic.stages.map(s=><button type="button" key={s.stage} className={'pqf-step'+(s.completed?' completed':'')} disabled={!staff&&!s.unlocked} aria-pressed={s.stage===active.stage} onClick={()=>setStageId(s.stage)} aria-label={'المرحلة '+displayNumber(s.stage)+'، '+displayNumber(s.target)+' كلمات'+(s.completed?'، مكتملة':!s.unlocked?'، مقفلة':'')}><b aria-hidden="true">{s.completed?'✓':s.unlocked||staff?displayNumber(s.stage):'🔒'}</b><small>{displayNumber(s.target)} كلمات</small></button>)}</div></div>
    <div className="pqf-action"><p className="pqf-status" role="status">{stageStatus}</p>{staff?<Link className="pqf-go" href={'/library/games/picture-quest/topics/manage?topic='+topic.id+'&stage='+active.stage}>معاينة المرحلة ←</Link>:<button type="button" className="pqf-go" disabled={!active.ready||!active.unlocked} onClick={()=>beginStage({topicId:topic.id,stage:active.stage})}>{!active.ready?'قيد التجهيز':active.completed?'راجع ←':active.resume?'واصل ←':'ابدأ ←'}</button>}</div>
   </section>:<section className="pqf-view pqf-world-view" aria-label="العوالم"><div className="pqf-grid">{visible.map(entry=>entry.topic?<WorldCard compact key={entry.topic.id} topic={entry.topic} showProgress={false} onOpen={openTopic} ref={el=>{if(el)worldButtons.current.set(entry.topic.id,el);else worldButtons.current.delete(entry.topic.id)}}/>:staff?<Link key="final" className="pqw-world pqf-world pqf-challenge" style={worldStyle('final')} href="/library/games/picture-quest/topics/manage"><span className="pqw-icon" aria-hidden="true">🏆</span><strong>الأذكياء</strong></Link>:<button key="final" type="button" className="pqw-world pqf-world pqf-challenge" style={worldStyle('final')} disabled={!canFinal} onClick={()=>beginStage({topicId:'final',stage:4})} aria-label={'تحدّي الأذكياء، '+finalStatus}><span className="pqw-icon" aria-hidden="true">🏆</span><strong>الأذكياء {!canFinal&&<small aria-hidden="true">🔒</small>}</strong></button>)}</div>
    {!entries.length&&<p className="pqf-status">العوالم قيد التجهيز.</p>}
    {pages>1&&<nav className="pqf-pages" aria-label="صفحات العوالم"><button type="button" disabled={safePage===0} onClick={()=>setPage(safePage-1)} aria-label="العوالم السابقة">→</button><span>{displayNumber(safePage+1)} / {displayNumber(pages)}</span><button type="button" disabled={safePage===pages-1} onClick={()=>setPage(safePage+1)} aria-label="العوالم التالية">←</button></nav>}
    {!staff&&(resumeFinal||resumeTopic&&resumeStage)&&<button type="button" className="pqf-go pqf-resume" onClick={()=>resumeFinal?beginStage({topicId:'final',stage:4}):openTopic(resumeTopic.id,resumeStage.stage)}>واصل {resumeFinal?'الأذكياء':resumeTopic.title} ←</button>}
   </section>}
  </div>
 </div>;
}
