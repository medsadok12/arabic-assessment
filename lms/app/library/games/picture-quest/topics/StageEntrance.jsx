'use client';
import{useEffect,useRef,useState}from'react';
import Link from'next/link';
import{Check,LockKeyhole}from'lucide-react';
import{displayNumber}from'../../../../../lib/display-number';
import JourneyArt from'./JourneyArt';
import'./journey.css';
import'./entrance.css';

const ROAD='M300 0 C300 55 480 35 480 100 C480 190 380 170 300 171 C225 172 120 170 120 100';
export default function StageEntrance({data,topic,active,staff=false,embedded=false,onChoose,onBegin,onPreview}){
 const [entering,setEntering]=useState(false),pending=useRef(false),timer=useRef(null);
 const scenery=data.journeyScenery!==false,path=data.journeyPath!==false,effects=data.journeyEffects!==false&&data.settings.animate!==false;
 useEffect(()=>{pending.current=false;setEntering(false);return()=>{clearTimeout(timer.current);pending.current=false}},[topic.id,active.stage,effects,active.ready,active.unlocked]);
 function begin(){
  if(pending.current||!active.ready||!active.unlocked)return;
  const selection={topicId:topic.id,stage:active.stage};pending.current=true;
  if(!effects||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){onBegin?.(selection);return;}
  setEntering(true);
  timer.current=setTimeout(()=>{onBegin?.(selection)},320);
 }
 const status=active.completed?'مكتملة ✓':!active.ready?'قيد التجهيز':data.settings.controls?.progress!==false&&active.resume?'وصلت إلى '+displayNumber(active.index)+' من '+displayNumber(active.target):'';
 return <section className={'pqe'+(scenery?' pqe-scenery':'')+(entering?' pqe-entering':'')+(embedded?' pqe-embedded':'')+(data.hubDepthEnabled===false?' pqe-flat':'')} aria-label={'مراحل '+topic.title} aria-busy={entering}>
  {scenery&&<div className="pqe-landscape" aria-hidden="true"><i className="pqe-land pqe-land-left"/><i className="pqe-land pqe-land-right"/><i className="pqe-land pqe-land-bottom"/>{[[20,'tree-left'],[21,'tree-right'],[22,'flowers-left'],[23,'rocks-right'],[22,'flower-small']].map(([art,place])=><span key={place} className={'pqe-prop pqe-'+place}><JourneyArt index={art}/></span>)}</div>}
  <h2 className="pqe-heading">{topic.title}</h2>
  <div className="pqe-content">
   <div className="pqe-gate" aria-hidden="true"><JourneyArt topic={topic}/></div>
   <div className="pqe-route pqf-path" role="group" aria-label={'مراحل '+topic.title}>
    {path&&<svg className="pqe-road" viewBox="0 0 600 234" preserveAspectRatio="none" aria-hidden="true"><path d={ROAD} className="pqe-road-shadow" transform="translate(0 4)"/><path d={ROAD} className="pqe-road-fill"/><path d={ROAD} className="pqe-road-dots"/></svg>}
    {topic.stages.map(s=><button type="button" key={s.stage} className={'pqe-station pqf-step pqe-station-'+s.stage+(s.stage===active.stage?' current':'')+(s.completed?' completed':'')} disabled={entering||!staff&&!s.unlocked} aria-pressed={s.stage===active.stage} onClick={()=>onChoose?.(s.stage)} aria-label={'المرحلة '+displayNumber(s.stage)+'، '+displayNumber(s.target)+' كلمات'+(s.completed?'، مكتملة':!s.unlocked?'، مقفلة':'')}><b className="pqe-disc" aria-hidden="true">{displayNumber(s.stage)}{s.completed?<span className="pqe-state"><Check/></span>:!staff&&!s.unlocked?<span className="pqe-state"><LockKeyhole/></span>:null}</b><small>{displayNumber(s.target)} {s.target===15?'كلمة':'كلمات'}</small></button>)}
   </div>
   <div className="pqe-action pqf-action"><p className="pqe-status pqf-status" role="status">{status}</p>{staff?embedded?<button type="button" className="pqe-go pqf-go" onClick={onPreview}>معاينة المرحلة ←</button>:<Link className="pqe-go pqf-go" href={'/library/games/picture-quest/topics/manage?topic='+encodeURIComponent(topic.id)+'&stage='+active.stage}>معاينة المرحلة ←</Link>:<button type="button" className="pqe-go pqf-go" disabled={entering||!active.ready||!active.unlocked} onClick={begin}>{!active.ready?'قيد التجهيز':active.completed?'راجع ←':active.resume?'واصل ←':'ابدأ ←'}</button>}</div>
  </div>
 </section>;
}
