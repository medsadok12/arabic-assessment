'use client';
import{useEffect,useRef,useState}from'react';
import{Check,LockKeyhole}from'lucide-react';
import{displayNumber}from'../../../../../lib/display-number';
import{BODY_SCENE_PORTRAIT,BODY_SCENE_LANDSCAPE,BODY_SCENE_STATIONS,bodySceneLayout}from'../../../../../lib/picture-quest-body-scene';
import'./body-scene.css';
export default function BodyScene({topic,active,staff,embedded,preparing,entering,status,onChoose,onBegin,onPreview}){
 const root=useRef(null),[size,setSize]=useState(null);
 useEffect(()=>{const el=root.current;if(!el)return;const update=()=>{const next=bodySceneLayout(el.clientWidth,el.clientHeight);setSize(old=>old?.width===next.width&&old?.height===next.height&&old?.wide===next.wide?old:next);};update();const observer=new ResizeObserver(update);observer.observe(el);return()=>observer.disconnect();},[]);
 const wide=size?.wide===true,src=wide?BODY_SCENE_LANDSCAPE:BODY_SCENE_PORTRAIT;
 return <section ref={root} className={'pqb-scene'+(embedded?' pqb-embedded':'')+(wide?' pqb-wide':'')} style={{'--pqb-art':`url("${src}")`}} aria-label={'مراحل '+topic.title} aria-busy={preparing||entering}>
  <div className="pqb-canvas" style={size?{width:size.width,height:size.height}:undefined}>
   <img className="pqb-art" src={src} alt="" draggable={false} decoding="async"/>
   <h2 className="pqb-heading">{topic.title}</h2>
   <div className="pqb-stations" role="group" aria-label={'مراحل '+topic.title}>{topic.stages.map(s=>{const[x,y,diameter]=BODY_SCENE_STATIONS[wide?'landscape':'portrait'][s.stage];const locked=!staff&&!s.unlocked;return <button type="button" key={s.stage} className={'pqb-station'+(active.stage===s.stage?' current':'')+(s.completed?' completed':'')+(locked?' locked':'')} style={{left:x+'%',top:y+'%',width:size?Math.max(44,size.width*diameter/100):diameter+'%',height:size?Math.max(44,size.width*diameter/100):undefined}} disabled={preparing||entering||locked} aria-label={'المرحلة '+displayNumber(s.stage)+(s.completed?'، مكتملة':locked?'، مقفلة':'')} aria-pressed={active.stage===s.stage} onClick={()=>onChoose?.(s.stage)}>{s.completed?<span className="pqb-state" aria-hidden="true"><Check/></span>:locked?<span className="pqb-state" aria-hidden="true"><LockKeyhole/></span>:null}</button>})}</div>
   <div className="pqb-action"><p className="pqb-status" role="status">{status}</p><button type="button" className="pqb-go" disabled={preparing||entering||!staff&&(!active.ready||!active.unlocked)} onClick={()=>staff?(onPreview?onPreview():onBegin?.()):onBegin?.()}>{preparing?'نجهّز لعبتك…':staff?'معاينة المرحلة ←':!active.ready?'قيد التجهيز':active.completed?'راجع ←':active.resume?'واصل ←':'ابدأ ←'}</button></div>
  </div>
 </section>;
}
