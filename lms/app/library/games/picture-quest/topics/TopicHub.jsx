'use client';
import{useCallback,useEffect,useMemo,useRef,useState}from'react';
import Link from'next/link';
import{childFetch,getActiveChildTab}from'../../../../../lib/child-fetch';
import{displayNumber}from'../../../../../lib/display-number';
import TopicPlay from'./TopicPlay';
import{createQuestImagePreparer}from'../../../../../lib/picture-quest-image-ready';
import StaffTopicPreview from'./StaffTopicPreview';
import JourneyMap from'./JourneyMap';
import StageEntrance from'./StageEntrance';
import JourneyArt from'./JourneyArt';
import{createTopicNavigation}from'../../../../../lib/picture-quest-navigation';
import{invalidateTopicCatalog,topicCatalogIsFresh}from'../../../../../lib/picture-quest-catalog-freshness';
import WorldCard,{worldStyle,currentStage}from'./WorldCard';
import'./topics.css';
import'./worlds.css';
import'./focus.css';

const PAGE_SIZE=8;
export default function TopicHub({staff,initialCatalog=null}){
 const[catalog,setCatalog]=useState(null),[error,setError]=useState(''),[refreshError,setRefreshError]=useState(''),[selection,setSelection]=useState(null),[tick,setTick]=useState(0),[child,setChild]=useState(()=>getActiveChildTab()),[topicId,setTopicId]=useState(null),[stageId,setStageId]=useState(null),[menu,setMenu]=useState(false),[page,setPage]=useState(0),[exitRequest,setExitRequest]=useState(0);
 const initialChild=useRef(child),[visibleSelection,setVisibleSelection]=useState(null);
 const imagePreparer=useMemo(()=>createQuestImagePreparer(),[child]);
 useEffect(()=>()=>imagePreparer.dispose(),[imagePreparer]);
 const pendingGate=useRef(null),mapPosition=useRef(null),playingRef=useRef(false),navigation=useRef(null),viewRef=useRef(null),selectionChild=useRef(child),back=useRef(null),menuButton=useRef(null),menuBox=useRef(null),worldButtons=useRef(new Map()),focusDetail=useRef(false),restoreTopic=useRef(null);
 const data=catalog?.child===child?catalog.value:null;
 const playing=!!(selection&&data&&selectionChild.current===child);playingRef.current=playing;
 const gameVisible=playing&&visibleSelection===selection;
 const gameReady=useCallback(()=>setVisibleSelection(viewRef.current?.selection),[]);
 useEffect(()=>{if(gameVisible)return;document.documentElement.classList.add('pqw-focus');return()=>document.documentElement.classList.remove('pqw-focus')},[gameVisible]);
 useEffect(()=>{const focus=()=>setChild(getActiveChildTab());window.addEventListener('focus',focus);return()=>window.removeEventListener('focus',focus)},[]);
 // Keep this child's last confirmed catalog visible while refreshing after play.
 // No shared/localStorage cache: a child switch must never reuse another balance.
 useEffect(()=>{let live=true;const controller=new AbortController();setError('');setRefreshError('');
  // Hydrate only after checking the per-tab child. An SSR cookie can belong to
  // a sibling in another tab; never show that catalog or reuse it for a switch.
  const seed=tick===0&&child===initialChild.current&&initialCatalog&&(child===null||initialCatalog.child===child)?initialCatalog:null;
  if(seed){setCatalog({child,value:seed.value});if(topicCatalogIsFresh(seed.loadedAt))return()=>{live=false;controller.abort()};}
  childFetch('/api/games/picture-quest/topics',{cache:'no-store',signal:controller.signal}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error);if(live&&getActiveChildTab()===child&&!playingRef.current)setCatalog({child,value:d})}).catch(e=>{if(live&&e.name!=='AbortError'&&getActiveChildTab()===child){if(data||seed)setRefreshError('تعذّر تحديث التقدّم.');else setError(e.message)}});return()=>{live=false;controller.abort()}},[tick,child]);
 useEffect(()=>{
  setMenu(false);setPage(0);mapPosition.current=null;selectionChild.current=child;viewRef.current=null;
  const nav=createTopicNavigation(window,{child,shouldConfirm:()=>playingRef.current&&!staff,onExitRequest:()=>{setVisibleSelection(viewRef.current?.selection);setExitRequest(n=>n+1)},onChange:view=>{
   const previous=viewRef.current;
   if(previous?.selection&&!view.selection){invalidateTopicCatalog();setTick(n=>n+1);}
   if(previous?.topicId&&!view.topicId)restoreTopic.current=previous.topicId;
   if(view.topicId&&!view.selection)focusDetail.current=true;
   viewRef.current=view;setSelection(view.selection);setTopicId(view.topicId);setStageId(view.stageId);setMenu(false);
  }});navigation.current=nav;
  return()=>{nav.dispose();navigation.current=null;};
 },[child,staff]);
 useEffect(()=>{if(playing)return;if(focusDetail.current&&topicId&&back.current){back.current.focus({preventScroll:true});focusDetail.current=false;}else if(!topicId&&restoreTopic.current){worldButtons.current.get(restoreTopic.current)?.focus({preventScroll:true});restoreTopic.current=null;}},[topicId,data,playing]);
 useEffect(()=>{if(!menu)return;menuBox.current?.querySelector('a,button:not(:disabled)')?.focus({preventScroll:true});const outside=e=>{if(!menuBox.current?.contains(e.target)&&!menuButton.current?.contains(e.target))setMenu(false)};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside)},[menu]);
 const worldFinished=useCallback(id=>{pendingGate.current={id,child:getActiveChildTab()};},[]);
 const gateDone=useCallback(()=>{pendingGate.current=null;},[]);
 const exit=useCallback(()=>navigation.current?.confirmExit(),[]);
 function openTopic(id,stage=null){if(playingRef.current)return;const t=data?.topics.find(t=>t.id===id);if(!staff&&t?.unlocked===false)return;navigation.current?.openTopic(id,stage);}
 function closeTopic(){navigation.current?.back();}
 function beginStage(next){if(playingRef.current)return;selectionChild.current=child;setMenu(false);navigation.current?.begin(next);}
 function onMenuKey(e){if(e.key==='Escape'){e.preventDefault();setMenu(false);menuButton.current?.focus()}if(e.key==='Tab'){const items=[...menuBox.current.querySelectorAll('a,button:not(:disabled)')],at=items.indexOf(document.activeElement);if(items.length){e.preventDefault();items[(at+(e.shiftKey?-1:1)+items.length)%items.length].focus()}}}
 const game=playing&&(staff?<StaffTopicPreview key={child} selection={selection} exitRequest={exitRequest} onExit={exit} onReady={gameReady} imagePreparer={imagePreparer}/>:<TopicPlay key={child} selection={selection} settings={data.settings} exitRequest={exitRequest} onExit={exit} onWorldComplete={worldFinished} onReady={gameReady} imagePreparer={imagePreparer}/>);
 const topic=data?.topics.find(t=>t.id===topicId),active=topic&&(topic.stages.find(s=>s.stage===stageId)||currentStage(topic));
 const showProgress=data?.settings.controls?.progress!==false,showScore=data?.settings.controls?.score!==false;
 const final=data?.final,canFinal=!!final?.unlocked&&!!final?.ready;
 const resumeFinal=!!(final?.resume&&canFinal&&data.resume?.topicId==='final');
 const resumeTopic=resumeFinal?null:data?.topics.find(t=>t.id===data.resume?.topicId&&t.stages.some(s=>s.stage===data.resume.stage&&s.resume))||data?.topics.find(t=>t.stages.some(s=>s.resume));
 const resumeStage=resumeTopic&&(resumeTopic.stages.find(s=>s.stage===data.resume?.stage&&s.resume)||resumeTopic.stages.find(s=>s.resume));
 const entries=[...(data?.topics||[]).map(t=>({topic:t})),...(final?.enabled?[{final:true}]:[])],pages=Math.max(1,Math.ceil(entries.length/PAGE_SIZE)),safePage=Math.min(page,pages-1),visible=entries.slice(safePage*PAGE_SIZE,(safePage+1)*PAGE_SIZE);
 const stageStatus=active&&(active.completed?'مكتملة ✓':!active.ready?'قيد التجهيز':showProgress&&active.resume?'وصلت إلى '+displayNumber(active.index)+' من '+displayNumber(active.target):'');
 const entranceScreen=!!data?.enabled&&!error&&data.journeyEnabled!==false&&data.entranceEnabled!==false&&!!(topic&&active);
 const mapScreen=!!data?.enabled&&!error&&data.journeyEnabled!==false&&!(topic&&active);
 const finalStatus=!final?.unlocked?'أكمل العوالم لفتحه':!final.ready?'كلمات التحدّي قيد التجهيز':final.completed?'أكملت التحدّي ✓':'التحدّي جاهز لك';
 return <>{game&&<div className={!gameVisible?'pqw-preparing-game':''} inert={!gameVisible?'':undefined} aria-hidden={!gameVisible}>{game}</div>}{!gameVisible&&<div className={'pqw-focus-screen pqw pqf'+(data?.journeyEnabled!==false?' pqj':'')+(mapScreen?' pqj-map-screen':'')+(entranceScreen?' pqj-entrance-screen':'')+(data?.hubDepthEnabled===false?' pqw-flat':'')+(data?.settings.animate===false?' pqw-no-motion':'')} dir="rtl">
  <div className="pqf-window">
   <header className="pqf-header">{topic||playing?<button ref={back} type="button" className="pqf-back" onClick={closeTopic}>→ العوالم</button>:<Link className="pqf-back" href="/library" aria-label="العودة إلى المكتبة">{mapScreen?<><span className="pqj-back-short">→ رجوع</span><span className="pqj-back-full">← المكتبة</span></>:<>← المكتبة</>}</Link>}<h1>{topic?.title||'اختر عالمك'}</h1><button ref={menuButton} disabled={playing} type="button" className="pqf-more" onClick={()=>setMenu(x=>!x)} aria-expanded={menu} aria-controls="pqw-options" aria-label="خيارات إضافية">⋯</button></header>
   {menu&&<div ref={menuBox} id="pqw-options" className="pqf-menu" role="dialog" aria-label="خيارات إضافية" onKeyDown={onMenuKey}>{data&&!staff&&showScore&&Number.isFinite(data.points)&&<span className="pqf-score">⭐ {displayNumber(data.points)} نقطة</span>}{data?.reviewEnabled&&<button type="button" disabled={staff||!data.reviewCount} onClick={()=>beginStage({topicId:'review',stage:1})}>✦ المراجعة</button>}<Link href="/library/games/picture-quest?classic=1">التدريب الأصلي</Link>{staff&&<Link href={'/library/games/picture-quest/topics/manage'+(topic?'?topic='+topic.id+'&stage='+active.stage:'')}>✎ تحرير التدريب</Link>}<Link href="/library">العودة للمكتبة</Link></div>}
   {refreshError&&data&&<div role="status" className="pqf-refresh-error">{refreshError} <button type="button" onClick={()=>setTick(n=>n+1)}>أعد المحاولة</button></div>}
   {error?<div className="pqf-message" role="alert"><p>{error}</p><button type="button" className="pqf-go" onClick={()=>setTick(x=>x+1)}>أعد المحاولة</button></div>:!data?<div className="pqf-message" role="status">نجهّز العوالم…</div>:!data.enabled?<div className="pqf-message"><p>التدريب متوقف حاليًا.</p><Link href="/library">العودة للمكتبة</Link></div>:entranceScreen?<StageEntrance key={topic.id} data={data} topic={topic} active={active} staff={staff} preparing={playing} imagePreparer={imagePreparer} celebrate={pendingGate.current?.id===topic.id&&pendingGate.current?.child===child} onCelebrationDone={gateDone} onChoose={stage=>navigation.current?.chooseStage(stage)} onBegin={beginStage}/>:topic&&active?<section className="pqf-view pqf-topic" aria-label={'مراحل '+topic.title}>
    <div className="pqf-hero"><div className="pqf-emblem" style={worldStyle(topic.id)} aria-hidden="true">{data.journeyEnabled!==false?<JourneyArt topic={topic}/>:topic.emoji||'✦'}</div></div>
    <div className="pqf-stage-area"><h2>المرحلة {displayNumber(active.stage)}</h2><div className="pqf-path" role="group" aria-label={'مراحل '+topic.title}>{topic.stages.map(s=><button type="button" key={s.stage} className={'pqf-step'+(s.completed?' completed':'')} disabled={playing||!staff&&!s.unlocked} aria-pressed={s.stage===active.stage} onClick={()=>navigation.current?.chooseStage(s.stage)} aria-label={'المرحلة '+displayNumber(s.stage)+'، '+displayNumber(s.target)+' كلمات'+(s.completed?'، مكتملة':!s.unlocked?'، مقفلة':'')}><b aria-hidden="true">{s.completed?'✓':s.unlocked||staff?displayNumber(s.stage):'🔒'}</b><small>{displayNumber(s.target)} كلمات</small></button>)}</div></div>
    <div className="pqf-action"><p className="pqf-status" role="status">{stageStatus}</p>{staff?<button type="button" className="pqf-go" onClick={()=>beginStage({topicId:topic.id,stage:active.stage})}>معاينة المرحلة ←</button>:<button type="button" className="pqf-go" disabled={playing||!active.ready||!active.unlocked} onClick={()=>beginStage({topicId:topic.id,stage:active.stage})}>{playing?'نجهّز لعبتك…':!active.ready?'قيد التجهيز':active.completed?'راجع ←':active.resume?'واصل ←':'ابدأ ←'}</button>}</div>
   </section>:data.journeyEnabled!==false?<JourneyMap key={child||'self'} data={data} staff={staff} onOpen={openTopic} onFinal={()=>beginStage({topicId:'final',stage:4})} positionRef={mapPosition} worldButtons={worldButtons}/>:<section className="pqf-view pqf-world-view" aria-label="العوالم"><div className="pqf-grid">{visible.map(entry=>entry.topic?<WorldCard compact key={entry.topic.id} topic={{...entry.topic,unlocked:staff||entry.topic.unlocked}} showProgress={false} onOpen={openTopic} ref={el=>{if(el)worldButtons.current.set(entry.topic.id,el);else worldButtons.current.delete(entry.topic.id)}}/>:staff?<button key="final" type="button" className="pqw-world pqf-world pqf-challenge" style={worldStyle('final')} onClick={()=>beginStage({topicId:'final',stage:4})}><span className="pqw-icon" aria-hidden="true">🏆</span><strong>الأذكياء</strong></button>:<button key="final" type="button" className="pqw-world pqf-world pqf-challenge" style={worldStyle('final')} disabled={!canFinal} onClick={()=>beginStage({topicId:'final',stage:4})} aria-label={'تحدّي الأذكياء، '+finalStatus}><span className="pqw-icon" aria-hidden="true">🏆</span><strong>الأذكياء {!canFinal&&<small aria-hidden="true">🔒</small>}</strong></button>)}</div>
    {!entries.length&&<p className="pqf-status">العوالم قيد التجهيز.</p>}
    {pages>1&&<nav className="pqf-pages" aria-label="صفحات العوالم"><button type="button" disabled={safePage===0} onClick={()=>setPage(safePage-1)} aria-label="العوالم السابقة">→</button><span>{displayNumber(safePage+1)} / {displayNumber(pages)}</span><button type="button" disabled={safePage===pages-1} onClick={()=>setPage(safePage+1)} aria-label="العوالم التالية">←</button></nav>}
    {!staff&&(resumeFinal||resumeTopic&&resumeStage)&&<button type="button" className="pqf-go pqf-resume" onClick={()=>resumeFinal?beginStage({topicId:'final',stage:4}):openTopic(resumeTopic.id,resumeStage.stage)}>واصل {resumeFinal?'الأذكياء':resumeTopic.title} ←</button>}
   </section>}
  </div>
 </div>}</>;
}
